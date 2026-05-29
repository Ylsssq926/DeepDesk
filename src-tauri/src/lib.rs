//! DeepDesk 桌面客户端 — Rust 后端入口
//!
//! 详细架构见 `docs/ARCHITECTURE.md`。

mod account;
mod commands;
mod db;
mod error_page;
mod injector;
mod shortcuts;
mod tray;
mod windows;

use tracing_subscriber::{fmt, EnvFilter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化结构化日志：可通过 RUST_LOG 环境变量调级
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(false)
        .compact()
        .init();

    tracing::info!(
        "DeepDesk starting up — version {}",
        env!("CARGO_PKG_VERSION")
    );

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::get_app_version,
        ])
        .setup(|app| {
            // 1. 创建主窗口（加载 chat.deepseek.com）
            windows::init(app)?;

            // 2. 初始化系统托盘
            tray::init(app)?;

            // 3. 注册全局快捷键（默认 Cmd/Ctrl+Shift+K 唤起主窗口）
            shortcuts::init(app)?;

            tracing::info!("setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
