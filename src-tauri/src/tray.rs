//! 系统托盘。
//!
//! TODO（按 PRD M-02 后续迭代）：
//!   - 新建对话 / 最近 5 个对话 / 设置入口
//!   - 关闭主窗口时默认最小化到托盘
//!   - macOS 自动 invert 单色图标
//!   - Linux 检测并提示 GNOME 用户安装 AppIndicator 扩展

use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_shell::ShellExt;

/// 官方 Web 入口（仅作为外链快捷方式，本进程仍只在主窗口加载该域名）。
const OFFICIAL_URL: &str = "https://chat.deepseek.com";
/// 项目 GitHub 仓库地址。
const GITHUB_URL: &str = "https://github.com/Ylsssq926/DeepDesk";

pub fn init(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let app_handle = app.handle().clone();

    // ── 菜单项 ──────────────────────────────────────────────────────────
    let toggle_window =
        MenuItemBuilder::with_id("toggle_window", "显示 / 隐藏主窗口").build(app)?;
    let open_official =
        MenuItemBuilder::with_id("open_official", "打开 chat.deepseek.com").build(app)?;
    let open_github = MenuItemBuilder::with_id("open_github", "打开 GitHub 仓库").build(app)?;
    let show_about = MenuItemBuilder::with_id("show_about", "关于 DeepDesk").build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&toggle_window)
        .item(&open_official)
        .item(&open_github)
        .separator()
        .item(&show_about)
        .separator()
        .item(&quit)
        .build()?;

    // show_menu_on_left_click 仅在 macOS / Windows 上可用，
    // Linux 走系统托盘协议（GTK / appindicator），左键行为由桌面环境决定。
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    let builder = TrayIconBuilder::with_id("main")
        .tooltip("DeepDesk · Unofficial")
        .menu(&menu)
        .icon(app.default_window_icon().unwrap().clone())
        .show_menu_on_left_click(false);

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
        "open_official" => open_external(app, OFFICIAL_URL),
        "open_github" => open_external(app, GITHUB_URL),
        "show_about" => show_about_dialog(app),
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

/// 在系统默认浏览器打开外部 URL。
///
/// NOTE: `Shell::open` 自 tauri-plugin-shell 2.1.0 起被标记为 deprecated，
/// 官方推荐迁移到 `tauri-plugin-opener`。在引入新依赖之前，这里保留对
/// 现有 plugin 的调用，并显式 allow 以避免 `-D warnings` 失败。后续按
/// PRD 路线图统一切换到 opener 时一并清理。
#[allow(deprecated)]
fn open_external(app: &AppHandle, url: &str) {
    if let Err(err) = app.shell().open(url, None) {
        tracing::error!("failed to open external url {url}: {err}");
    }
}

/// 弹出"关于 DeepDesk"对话框。`show` 为非阻塞异步调用，闭包只做日志记录。
fn show_about_dialog(app: &AppHandle) {
    let body = format!(
        "DeepDesk\n\
         v{version} · alpha\n\
         \n\
         Unofficial desktop client for chat.deepseek.com\n\
         非官方第三方桌面客户端\n\
         \n\
         © 2026 Ylsssq926 and DeepDesk Contributors\n\
         Licensed under AGPL-3.0\n\
         \n\
         github.com/Ylsssq926/DeepDesk",
        version = env!("CARGO_PKG_VERSION"),
    );

    app.dialog()
        .message(body)
        .title("关于 DeepDesk")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::Ok)
        .show(|_| {
            tracing::debug!("about dialog dismissed");
        });
}
