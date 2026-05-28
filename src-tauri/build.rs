use std::fs;
use std::path::Path;

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
    // 兜底 3：icons/*
    //
    // tauri-build 在 windows-msvc 上会通过 winresource 读取 icons/icon.ico
    // 来生成 .res 资源文件。零字节 ICO 会导致 winresource panic，所以这里
    // 写入一份最小合法的 1x1 32bpp ICO（70 字节）作为占位。
    //
    // 其他平台的 .png / .icns 在 `cargo check` / `cargo clippy` 阶段不会
    // 被读取（仅 bundle 阶段才用），零字节占位足够通过编译。
    //
    // 真实图标须用 `pnpm tauri icon assets/brand/logo.svg` 生成并提交。
    // ------------------------------------------------------------------
    let icons_dir = Path::new("icons");
    if !icons_dir.exists() {
        fs::create_dir_all(icons_dir).expect("failed to create icons directory");
    }

    let ico_path = icons_dir.join("icon.ico");
    if !ico_path.exists() {
        // 1x1 32bpp transparent ICO（70 字节）
        // 结构：ICONDIR(6) + ICONDIRENTRY(16) + BITMAPINFOHEADER(40) + BGRA(4) + AND mask(4)
        const PLACEHOLDER_ICO: [u8; 70] = [
            // ICONDIR
            0x00, 0x00, // reserved
            0x01, 0x00, // type ICO
            0x01, 0x00, // count 1
            // ICONDIRENTRY
            0x01, // width 1
            0x01, // height 1
            0x00, // colors in palette
            0x00, // reserved
            0x01, 0x00, // planes 1
            0x20, 0x00, // bit count 32
            0x30, 0x00, 0x00, 0x00, // bytes in resource (48)
            0x16, 0x00, 0x00, 0x00, // offset to image (22)
            // BITMAPINFOHEADER
            0x28, 0x00, 0x00, 0x00, // header size 40
            0x01, 0x00, 0x00, 0x00, // width 1
            0x02, 0x00, 0x00, 0x00, // height 2 (image + AND mask)
            0x01, 0x00, // planes 1
            0x20, 0x00, // bit count 32
            0x00, 0x00, 0x00, 0x00, // compression none
            0x08, 0x00, 0x00, 0x00, // image size 8
            0x00, 0x00, 0x00, 0x00, // x ppm
            0x00, 0x00, 0x00, 0x00, // y ppm
            0x00, 0x00, 0x00, 0x00, // colors used
            0x00, 0x00, 0x00, 0x00, // colors important
            // pixel data: single fully transparent BGRA pixel
            0x00, 0x00, 0x00, 0x00, // BGRA (0,0,0,0)
            // AND mask (4 bytes, all zeros = use color directly)
            0x00, 0x00, 0x00, 0x00,
        ];
        fs::write(&ico_path, PLACEHOLDER_ICO)
            .expect("failed to create placeholder icons/icon.ico");
        println!("cargo:warning=icons/icon.ico not found, wrote 1x1 transparent placeholder. Run `pnpm tauri icon assets/brand/logo.svg` to generate real icons.");
    }

    for placeholder in ["icon.icns", "icon.png", "32x32.png", "128x128.png", "128x128@2x.png"] {
        let p = icons_dir.join(placeholder);
        if !p.exists() {
            // 这些图标只在 bundle 阶段被读取，cargo check / clippy 不会触达，
            // 所以零字节占位即可。
            let _ = fs::write(&p, "");
        }
    }

    tauri_build::build()
}
