//! DeepDesk 桌面客户端 — Rust 后端入口
//!
//! 详细架构见 `docs/ARCHITECTURE.md`。

mod commands;
mod db;
mod injector;
mod shortcuts;
mod tray;
mod windows;

use tauri::Manager;
use tracing_subscriber::{fmt, EnvFilter};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化结构化日志：可通过 RUST_LOG 环境变量调级
    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
        .with_target(false)
        .compact()
        .init();

    tracing::info!("DeepDesk starting up — version {}", env!("CARGO_PKG_VERSION"));

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
            // 应用 vibrancy / mica（macOS / Windows）
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_vibrancy(
                        &window,
                        NSVisualEffectMaterial::HudWindow,
                        None,
                        Some(12.0),
                    );
                }
            }

            #[cfg(target_os = "windows")]
            {
                use window_vibrancy::apply_mica;
                if let Some(window) = app.get_webview_window("main") {
                    let _ = apply_mica(&window, Some(true));
                }
            }

            // 初始化系统托盘
            tray::init(app)?;

            // 注册全局快捷键（默认 Cmd/Ctrl+Shift+K 唤起主窗口）
            shortcuts::init(app)?;

            tracing::info!("setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
