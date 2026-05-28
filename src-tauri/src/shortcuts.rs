//! 全局快捷键。
//!
//! TODO（按 PRD M-01）：
//!   - 默认 Cmd/Ctrl+Shift+K 唤起 / 隐藏主窗口
//!   - 用户可在设置自定义
//!   - 冲突检测与降级
//!   - macOS 引导用户授权"辅助功能"权限
//!   - Linux Wayland 限制说明

use tauri::Manager;
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

/// 默认快捷键：Cmd/Ctrl + Shift + K
pub fn init(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();

    // 平台差异：macOS 用 Super（Cmd），其他用 Control
    #[cfg(target_os = "macos")]
    let modifiers = Modifiers::SUPER | Modifiers::SHIFT;
    #[cfg(not(target_os = "macos"))]
    let modifiers = Modifiers::CONTROL | Modifiers::SHIFT;

    let toggle_shortcut = Shortcut::new(Some(modifiers), Code::KeyK);

    app.global_shortcut()
        .on_shortcut(toggle_shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                toggle_main_window(&app_handle);
            }
        })?;

    tracing::info!("registered global shortcut: {:?}", toggle_shortcut);
    Ok(())
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }
}
