//! 全局快捷键。
//!
//! 默认 Cmd/Ctrl+Shift+K：把主窗口拉到最前并聚焦（“呼出”热键）。
//! 刻意不做“再按一次隐藏”——隐藏窗口会让用户找不到窗口、误以为程序退出，
//! 体验不佳。需要隐藏 / 最小化时走系统窗口控件或托盘菜单即可。
//!
//! TODO（按 PRD）：
//!   - 用户可在设置自定义快捷键
//!   - 冲突检测与降级
//!   - macOS 引导用户授权“辅助功能”权限
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

    let summon_shortcut = Shortcut::new(Some(modifiers), Code::KeyK);

    app.global_shortcut()
        .on_shortcut(summon_shortcut, move |_app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                summon_main_window(&app_handle);
            }
        })?;

    tracing::info!("registered global shortcut: {:?}", summon_shortcut);
    Ok(())
}

/// 把主窗口拉到最前并聚焦。
///
/// 行为（无论窗口当前是隐藏、最小化还是已在前台）：
///   1. 若隐藏则显示
///   2. 若最小化则取消最小化
///   3. 抢占前台并聚焦
///
/// 不隐藏窗口：这是“呼出”而非“开关”，避免用户按键后窗口消失而困惑。
fn summon_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if !window.is_visible().unwrap_or(true) {
            let _ = window.show();
        }
        if window.is_minimized().unwrap_or(false) {
            let _ = window.unminimize();
        }
        let _ = window.set_focus();
    }
}
