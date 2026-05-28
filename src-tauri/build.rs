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
        fs::write(&ico_path, PLACEHOLDER_ICO).expect("failed to create placeholder icons/icon.ico");
        println!("cargo:warning=icons/icon.ico not found, wrote 1x1 transparent placeholder. Run `pnpm tauri icon assets/brand/logo.svg` to generate real icons.");
    }

    // 1x1 transparent RGBA PNG used by trayIcon.iconPath. tauri-codegen will
    // panic if the PNG is not RGBA (ColorType::Rgba), so we synthesize one on
    // the fly using a stored-deflate block plus a real CRC32. No heavyweight
    // image dependency required.
    let png_path = icons_dir.join("icon.png");
    if !png_path.exists() {
        let png = build_placeholder_rgba_png();
        fs::write(&png_path, &png).expect("failed to create placeholder icons/icon.png");
        println!("cargo:warning=icons/icon.png not found, wrote 1x1 RGBA placeholder. Run `pnpm tauri icon assets/brand/logo.svg` to generate real icons.");
    }

    for placeholder in ["icon.icns", "32x32.png", "128x128.png", "128x128@2x.png"] {
        let p = icons_dir.join(placeholder);
        if !p.exists() {
            // 这些图标只在 bundle 阶段被读取，cargo check / clippy 不会触达，
            // 所以零字节占位即可。
            let _ = fs::write(&p, "");
        }
    }

    tauri_build::build()
}

/// Build a minimal 1x1 fully-transparent RGBA PNG (color type 6) suitable
/// for tauri-codegen's strict RGBA check. The PNG uses a stored (level 0)
/// deflate block so we don't need a real compressor in build time.
fn build_placeholder_rgba_png() -> Vec<u8> {
    let mut out = Vec::with_capacity(80);

    // PNG signature
    out.extend_from_slice(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR: width=1, height=1, bit_depth=8, color_type=6 (RGBA),
    // compression=0, filter=0, interlace=0
    let mut ihdr = Vec::with_capacity(13);
    ihdr.extend_from_slice(&1u32.to_be_bytes()); // width
    ihdr.extend_from_slice(&1u32.to_be_bytes()); // height
    ihdr.push(8); // bit_depth
    ihdr.push(6); // color_type RGBA
    ihdr.push(0); // compression
    ihdr.push(0); // filter
    ihdr.push(0); // interlace
    write_chunk(&mut out, b"IHDR", &ihdr);

    // IDAT: zlib-wrapped stored deflate block carrying one filter byte +
    // four RGBA bytes (all zeros, fully transparent).
    let raw: [u8; 5] = [0; 5];
    let zlib = build_zlib_stored_block(&raw);
    write_chunk(&mut out, b"IDAT", &zlib);

    // IEND (no payload)
    write_chunk(&mut out, b"IEND", &[]);

    out
}

/// Append a single PNG chunk: length (BE u32) + 4-byte type + data + CRC32 of
/// (type + data).
fn write_chunk(out: &mut Vec<u8>, chunk_type: &[u8; 4], data: &[u8]) {
    out.extend_from_slice(&(data.len() as u32).to_be_bytes());
    out.extend_from_slice(chunk_type);
    out.extend_from_slice(data);

    let mut hasher = crc32fast::Hasher::new();
    hasher.update(chunk_type);
    hasher.update(data);
    out.extend_from_slice(&hasher.finalize().to_be_bytes());
}

/// Wrap `data` in a zlib stream containing a single non-compressed
/// (BTYPE=00) deflate block. RFC 1951 stored block + RFC 1950 zlib
/// header/footer.
fn build_zlib_stored_block(data: &[u8]) -> Vec<u8> {
    let len = data.len();
    assert!(len <= u16::MAX as usize, "stored block payload too large");
    let mut out = Vec::with_capacity(2 + 5 + len + 4);

    // zlib header: CMF=0x78 (deflate, 32K window), FLG=0x01 (FCHECK adjust;
    // 0x7801 satisfies (CMF*256 + FLG) % 31 == 0).
    out.extend_from_slice(&[0x78, 0x01]);

    // BFINAL=1, BTYPE=00 (stored). For a stored block the next byte is
    // aligned, so bit-packing is irrelevant — just emit the byte.
    out.push(0x01);
    out.extend_from_slice(&(len as u16).to_le_bytes());
    out.extend_from_slice(&(!(len as u16)).to_le_bytes());
    out.extend_from_slice(data);

    // adler32 of uncompressed data, big-endian.
    out.extend_from_slice(&adler32(data).to_be_bytes());
    out
}

/// RFC 1950 adler32 over `data`.
fn adler32(data: &[u8]) -> u32 {
    const MOD_ADLER: u32 = 65521;
    let mut a: u32 = 1;
    let mut b: u32 = 0;
    for &byte in data {
        a = (a + u32::from(byte)) % MOD_ADLER;
        b = (b + a) % MOD_ADLER;
    }
    (b << 16) | a
}
