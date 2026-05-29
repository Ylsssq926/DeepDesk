use std::collections::BTreeMap;
use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

fn main() {
    // ------------------------------------------------------------------
    // 兜底 1：dist-injected/bundle.js
    // include_str! 在文件不存在时会编译失败。开发阶段该文件可能尚未生成
    // （需 `pnpm build:inject`），此处创建空文件兜底。
    // ------------------------------------------------------------------
    let inject_dir = Path::new("dist-injected");
    let inject_file = inject_dir.join("bundle.js");

    if !inject_dir.exists() {
        fs::create_dir_all(inject_dir).expect("failed to create dist-injected directory");
    }

    if !inject_file.exists() {
        fs::write(&inject_file, "").expect("failed to create empty bundle.js");
        println!("cargo:warning=dist-injected/bundle.js not found, created empty placeholder. Run `pnpm build:inject` to generate the real inject script.");
    }

    // 当注入脚本变化时重新编译
    println!("cargo:rerun-if-changed=dist-injected/bundle.js");

    // ------------------------------------------------------------------
    // 兜底 2：../dist/index.html
    // tauri::generate_context! 会校验 frontendDist 路径存在，否则 proc-macro
    // panic。CI 跑 cargo check / clippy 时不一定执行 `pnpm build`，因此用
    // 占位 HTML 兜底；正式构建时 `pnpm build` 会覆盖。
    // ------------------------------------------------------------------
    let dist_dir = Path::new("../dist");
    let dist_index = dist_dir.join("index.html");
    if !dist_dir.exists() {
        fs::create_dir_all(dist_dir).expect("failed to create ../dist directory");
    }
    if !dist_index.exists() {
        fs::write(
            &dist_index,
            "<!doctype html><meta charset=utf-8><title>DeepDesk placeholder</title>",
        )
        .expect("failed to create placeholder ../dist/index.html");
        println!("cargo:warning=../dist/index.html not found, created placeholder. Run `pnpm build` to generate the real frontend bundle.");
    }

    // ------------------------------------------------------------------
    // icons/* — 从品牌 SVG 渲染全套真实图标
    //
    // 输出（覆写）：
    //   icons/icon.png            256x256 RGBA（trayIcon 用）
    //   icons/icon.ico            16/24/32/48/64/256 多尺寸（Windows）
    //   icons/icon.icns           32/64/128/256/512/1024（macOS）
    //   icons/32x32.png           Tauri bundle.icon 数组成员
    //   icons/128x128.png         同上
    //   icons/128x128@2x.png      同上（实为 256x256）
    //
    // cargo:rerun-if-changed 让 cargo 在 SVG 改动时自动重渲染。
    // 任何渲染步骤失败都会退化为最小合法占位（1x1 透明 RGBA PNG +
    // 70 字节 ICO + 零字节 ICNS / 其他 PNG），保证 CI 永不 panic。
    // ------------------------------------------------------------------
    let icons_dir = Path::new("icons");
    if !icons_dir.exists() {
        fs::create_dir_all(icons_dir).expect("failed to create icons directory");
    }

    let svg_path = PathBuf::from("../assets/brand/logo.svg");
    println!("cargo:rerun-if-changed={}", svg_path.display());

    if let Err(err) = render_brand_icons(&svg_path, icons_dir) {
        println!(
            "cargo:warning=DeepDesk icon rendering failed: {err}. Falling back to minimal placeholders."
        );
        ensure_icon_placeholders(icons_dir);
    }

    tauri_build::build()
}

// ===================================================================
// SVG → 全套真实图标
// ===================================================================

/// 标准 PNG 输出列表：(像素尺寸, 文件名)。
const PNG_SIZES: &[(u32, &str)] = &[
    (32, "32x32.png"),
    (128, "128x128.png"),
    (256, "128x128@2x.png"),
    (256, "icon.png"),
];
const ICO_SIZES: &[u32] = &[16, 24, 32, 48, 64, 256];
const ICNS_SIZES: &[u32] = &[32, 64, 128, 256, 512, 1024];

fn render_brand_icons(svg_path: &Path, icons_dir: &Path) -> Result<(), String> {
    let raw_svg = fs::read_to_string(svg_path)
        .map_err(|e| format!("failed to read {}: {e}", svg_path.display()))?;
    // usvg 0.45 (svgtypes 0.15) 不识别 CSS Color 4 的 oklch()，这里先把所有
    // oklch(...) 替换成等价的 #RRGGBB sRGB hex 再交给 usvg 解析。
    let normalized_svg = preprocess_svg_colors(&raw_svg);

    let opts = resvg::usvg::Options::default();
    let tree = resvg::usvg::Tree::from_str(&normalized_svg, &opts)
        .map_err(|e| format!("usvg parse error: {e}"))?;

    // 收集所有需要的尺寸（PNG + ICO + ICNS），每个尺寸只渲染一次，编码
    // 成 RGBA8 PNG 字节流；ICO / ICNS 拼装时复用同一份字节流。
    let mut sizes: Vec<u32> = PNG_SIZES
        .iter()
        .map(|(s, _)| *s)
        .chain(ICO_SIZES.iter().copied())
        .chain(ICNS_SIZES.iter().copied())
        .collect();
    sizes.sort_unstable();
    sizes.dedup();

    let mut rendered: BTreeMap<u32, Vec<u8>> = BTreeMap::new();
    for size in sizes {
        let png_bytes = render_to_png(&tree, size)?;
        rendered.insert(size, png_bytes);
    }

    // 1) 独立 PNG。
    for &(size, name) in PNG_SIZES {
        let bytes = rendered
            .get(&size)
            .ok_or_else(|| format!("missing rendered size {size} for {name}"))?;
        fs::write(icons_dir.join(name), bytes)
            .map_err(|e| format!("failed to write {name}: {e}"))?;
    }

    // 2) ICO。
    let ico_bytes = build_ico(&rendered)?;
    fs::write(icons_dir.join("icon.ico"), &ico_bytes)
        .map_err(|e| format!("failed to write icon.ico: {e}"))?;

    // 3) ICNS。
    let icns_bytes = build_icns(&rendered)?;
    fs::write(icons_dir.join("icon.icns"), &icns_bytes)
        .map_err(|e| format!("failed to write icon.icns: {e}"))?;

    Ok(())
}

/// 把 SVG 树渲染成 RGBA8 PNG 字节（`size` × `size`，居中等比适配）。
fn render_to_png(tree: &resvg::usvg::Tree, size: u32) -> Result<Vec<u8>, String> {
    let mut pixmap = tiny_skia::Pixmap::new(size, size)
        .ok_or_else(|| format!("failed to allocate {size}x{size} pixmap"))?;

    let svg_size = tree.size();
    let scale_x = size as f32 / svg_size.width();
    let scale_y = size as f32 / svg_size.height();
    let scale = scale_x.min(scale_y);
    let tx = (size as f32 - svg_size.width() * scale) * 0.5;
    let ty = (size as f32 - svg_size.height() * scale) * 0.5;
    let transform = tiny_skia::Transform::from_row(scale, 0.0, 0.0, scale, tx, ty);

    let mut pixmap_mut = pixmap.as_mut();
    resvg::render(tree, transform, &mut pixmap_mut);

    // tiny-skia 内部存的是预乘 RGBA；encode_png 会反预乘并输出标准
    // ColorType::Rgba PNG，正好满足 tauri-codegen / ico::IconImage::read_png /
    // icns::Image::read_png 的期望。
    pixmap
        .encode_png()
        .map_err(|e| format!("png encode failed at size {size}: {e}"))
}

fn build_ico(rendered: &BTreeMap<u32, Vec<u8>>) -> Result<Vec<u8>, String> {
    let mut dir = ico::IconDir::new(ico::ResourceType::Icon);
    for &size in ICO_SIZES {
        let png = rendered
            .get(&size)
            .ok_or_else(|| format!("missing rendered size {size} for ICO"))?;
        let image = ico::IconImage::read_png(Cursor::new(png))
            .map_err(|e| format!("ico read_png({size}) failed: {e}"))?;
        let entry = ico::IconDirEntry::encode(&image)
            .map_err(|e| format!("ico encode({size}) failed: {e}"))?;
        dir.add_entry(entry);
    }
    let mut buf = Vec::new();
    dir.write(&mut buf)
        .map_err(|e| format!("ico write failed: {e}"))?;
    Ok(buf)
}

fn build_icns(rendered: &BTreeMap<u32, Vec<u8>>) -> Result<Vec<u8>, String> {
    let mut family = icns::IconFamily::new();
    for &size in ICNS_SIZES {
        let png = rendered
            .get(&size)
            .ok_or_else(|| format!("missing rendered size {size} for ICNS"))?;
        let image = icns::Image::read_png(Cursor::new(png))
            .map_err(|e| format!("icns read_png({size}) failed: {e}"))?;
        // add_icon 会根据图像尺寸自动选 OSType（icp4 / ic07 / ic08 / ic09 /
        // ic10 / ic14 等）。我们提供的 32/64/128/256/512/1024 全部受支持。
        family
            .add_icon(&image)
            .map_err(|e| format!("icns add_icon({size}) failed: {e}"))?;
    }
    let mut buf = Vec::new();
    family
        .write(&mut buf)
        .map_err(|e| format!("icns write failed: {e}"))?;
    Ok(buf)
}

// ===================================================================
// SVG color normalization：oklch(L C H[ /A]) → #RRGGBB[AA]
//
// 算法：OKLab → linear sRGB → gamma-encoded sRGB
// (Björn Ottosson, https://bottosson.github.io/posts/oklab/)
// ===================================================================

fn preprocess_svg_colors(svg: &str) -> String {
    const NEEDLE: &str = "oklch(";
    let mut out = String::with_capacity(svg.len());
    let mut rest = svg;
    while let Some(pos) = rest.find(NEEDLE) {
        out.push_str(&rest[..pos]);
        let after = &rest[pos + NEEDLE.len()..];
        if let Some(end_pos) = after.find(')') {
            let inside = &after[..end_pos];
            if let Some(hex) = oklch_args_to_hex(inside) {
                out.push_str(&hex);
                rest = &after[end_pos + 1..];
                continue;
            }
        }
        // 解析失败：保留原文 "oklch(" 然后从下一个字节继续扫描，避免死循环。
        out.push_str(&rest[pos..pos + NEEDLE.len()]);
        rest = after;
    }
    out.push_str(rest);
    out
}

/// 解析 `oklch(L C H[ /A])` 括号内部，返回 `#RRGGBB` 或 `#RRGGBBAA`。
fn oklch_args_to_hex(args: &str) -> Option<String> {
    let (main, alpha_raw) = match args.split_once('/') {
        Some((a, b)) => (a, Some(b)),
        None => (args, None),
    };
    let mut nums = main
        .split(|c: char| c.is_whitespace() || c == ',')
        .filter(|s| !s.is_empty());
    let l: f32 = nums.next()?.parse().ok()?;
    let c: f32 = nums.next()?.parse().ok()?;
    let h: f32 = nums.next()?.parse().ok()?;
    if nums.next().is_some() {
        return None;
    }

    let alpha_val = if let Some(raw) = alpha_raw {
        let trimmed = raw.trim();
        let (num_str, is_percent) = match trimmed.strip_suffix('%') {
            Some(rest) => (rest, true),
            None => (trimmed, false),
        };
        let v: f32 = num_str.parse().ok()?;
        Some(if is_percent {
            (v / 100.0).clamp(0.0, 1.0)
        } else {
            v.clamp(0.0, 1.0)
        })
    } else {
        None
    };

    let (r, g, b) = oklch_to_srgb8(l, c, h);
    Some(match alpha_val {
        Some(a) => {
            let a8 = (a * 255.0 + 0.5) as u8;
            format!("#{r:02X}{g:02X}{b:02X}{a8:02X}")
        }
        None => format!("#{r:02X}{g:02X}{b:02X}"),
    })
}

/// OKLCH (L 0..1, C 0..0.4, H deg) → 8-bit sRGB 三元组。
///
/// 矩阵系数取自 Björn Ottosson 的 OKLab 参考实现，刻意保留高位有效数字以
/// 贴近原始常量；f32 会自然截断到可表示精度，故抑制 excessive_precision。
#[allow(clippy::excessive_precision)]
fn oklch_to_srgb8(l: f32, c: f32, h_deg: f32) -> (u8, u8, u8) {
    let h_rad = h_deg.to_radians();
    let a = c * h_rad.cos();
    let b = c * h_rad.sin();

    // OKLab → 立方根 LMS
    let l_ = l + 0.396_337_78 * a + 0.215_803_76 * b;
    let m_ = l - 0.105_561_35 * a - 0.063_854_17 * b;
    let s_ = l - 0.089_484_18 * a - 1.291_485_5 * b;

    let l_lin = l_ * l_ * l_;
    let m_lin = m_ * m_ * m_;
    let s_lin = s_ * s_ * s_;

    // linear LMS → linear sRGB
    let r = 4.076_741_7 * l_lin - 3.307_711_6 * m_lin + 0.230_969_94 * s_lin;
    let g = -1.268_438_0 * l_lin + 2.609_757_4 * m_lin - 0.341_319_4 * s_lin;
    let b_lin = -0.004_196_086_3 * l_lin - 0.703_418_6 * m_lin + 1.707_614_7 * s_lin;

    (
        linear_to_srgb_u8(r),
        linear_to_srgb_u8(g),
        linear_to_srgb_u8(b_lin),
    )
}

fn linear_to_srgb_u8(x: f32) -> u8 {
    let x = x.clamp(0.0, 1.0);
    let v = if x <= 0.003_130_8 {
        12.92 * x
    } else {
        1.055 * x.powf(1.0 / 2.4) - 0.055
    };
    (v.clamp(0.0, 1.0) * 255.0 + 0.5) as u8
}

// ===================================================================
// 兜底占位（仅当 SVG 渲染整体失败时才走，保证 CI 永不 panic）
// ===================================================================

fn ensure_icon_placeholders(icons_dir: &Path) {
    // 1x1 透明 RGBA PNG，由 `png` crate 生成（保证 ColorType::Rgba 通过
    // tauri-codegen 校验）。
    let placeholder_png = build_placeholder_rgba_png();

    for &(_, name) in PNG_SIZES {
        let path = icons_dir.join(name);
        if let Err(e) = fs::write(&path, &placeholder_png) {
            println!(
                "cargo:warning=failed to write placeholder {}: {e}",
                path.display()
            );
        }
    }

    // 70 字节最小合法 1x1 32bpp 透明 ICO（winresource 不会 panic）。
    const PLACEHOLDER_ICO: [u8; 70] = [
        // ICONDIR
        0x00, 0x00, 0x01, 0x00, 0x01, 0x00, // ICONDIRENTRY
        0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00, 0x30, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00,
        0x00, // BITMAPINFOHEADER
        0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x01, 0x00, 0x20,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // BGRA + AND mask
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];
    let ico_path = icons_dir.join("icon.ico");
    if let Err(e) = fs::write(&ico_path, PLACEHOLDER_ICO) {
        println!(
            "cargo:warning=failed to write placeholder {}: {e}",
            ico_path.display()
        );
    }

    // ICNS 仅在 macOS bundle 阶段读取；cargo check / clippy 不会触达。
    // 留零字节文件避免后续构建阶段报"找不到文件"。
    let icns_path = icons_dir.join("icon.icns");
    if !icns_path.exists() {
        let _ = fs::write(&icns_path, b"");
    }
}

/// 用 `png` crate 构造一个最小的 1x1 全透明 RGBA PNG。
fn build_placeholder_rgba_png() -> Vec<u8> {
    let mut buf = Vec::with_capacity(80);
    {
        let mut encoder = png::Encoder::new(&mut buf, 1, 1);
        encoder.set_color(png::ColorType::Rgba);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder
            .write_header()
            .expect("png encoder write_header must succeed for 1x1 RGBA");
        writer
            .write_image_data(&[0, 0, 0, 0])
            .expect("png writer must accept 4 bytes for 1x1 RGBA");
    }
    buf
}
