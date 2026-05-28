use std::fs;
use std::path::Path;

fn main() {
    // 确保 dist-injected/bundle.js 存在，否则 include_str! 会编译失败。
    // 开发阶段该文件可能尚未生成（需 `pnpm build:inject`），此处创建空文件兜底。
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

    tauri_build::build()
}
