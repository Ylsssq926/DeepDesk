//! 系统托盘。
//!
//! TODO（按 PRD M-02）：
//!   - 托盘菜单：显示/隐藏主窗口 / 新建对话 / 最近 5 个对话 / 设置 / 关于 / 退出
//!   - 关闭主窗口时默认最小化到托盘
//!   - macOS 自动 invert 单色图标
//!   - Linux 检测并提示 GNOME 用户安装 AppIndicator 扩展

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn init(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();

    // 简化菜单：先支持 显示/隐藏主窗口 + 退出
    let toggle_window =
        MenuItemBuilder::with_id("toggle_window", "显示 / 隐藏主窗口").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&toggle_window)
        .separator()
        .item(&quit)
        .build()?;

    // menu_on_left_click 仅在 macOS / Windows 上可用，
    // Linux 走系统托盘协议（GTK / appindicator），左键行为由桌面环境决定。
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    let builder = TrayIconBuilder::with_id("main")
        .tooltip("DeepDesk · Unofficial")
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        .menu_on_left_click(false);

    #[cfg(target_os = "linux")]
    let builder = TrayIconBuilder::with_id("main")
        .tooltip("DeepDesk · Unofficial")
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone());

    let _tray = builder
        .on_menu_event(move |app, event| handle_menu(app, event.id().as_ref()))
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                ..
            } = event
            {
                let app_handle = tray.app_handle();
                toggle_main_window(app_handle);
            }
        })
        .build(app)?;

    let _ = app_handle;
    Ok(())
}

fn handle_menu(app: &AppHandle, id: &str) {
    match id {
        "toggle_window" => toggle_main_window(app),
        "quit" => {
            tracing::info!("quit requested via tray");
            app.exit(0);
        }
        other => {
            tracing::warn!("unknown tray menu item: {other}");
        }
    }
}

fn toggle_main_window(app: &AppHandle) {
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
