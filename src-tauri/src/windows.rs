//! 多窗口管理。
//!
//! 负责程序化创建所有应用窗口。M-01 阶段仅创建主窗口（加载 chat.deepseek.com）。
//!
//! ## 架构说明（按 ARCHITECTURE.md §4.1）
//!
//! - 主窗口：直接加载 `https://chat.deepseek.com`，不经过本地 React dist
//! - 增强 UI（设置、知识库、浮窗）：独立窗口加载本地 React dist（V0.2+）
//! - Cookie 持久化：通过 `data_directory` 指定独立存储路径，按 account_id 隔离
//!
//! ## 合规约束（按 PRD §1.6）
//!
//! 仅加载 chat.deepseek.com，不修改、拦截或伪造任何 HTTP 请求。
//! User-Agent 中明确标识 DeepDesk 客户端身份。

use crate::account;
use crate::injector;
use tauri::{WebviewUrl, WebviewWindowBuilder};

/// DeepSeek Chat 的 URL。
const DEEPSEEK_CHAT_URL: &str = "https://chat.deepseek.com";

/// User-Agent 字符串。与 tauri.conf.json 中保持一致。
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) DeepDesk/0.1.0 Chrome/131.0.0.0 Safari/537.36";

/// 初始化所有应用窗口。
///
/// 当前仅创建主窗口。后续里程碑会在此添加设置窗口等。
///
/// # Errors
///
/// 窗口创建失败时返回错误（通常是 WebView 运行时不可用）。
pub fn init(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    create_main_window(app)?;
    tracing::info!("main window created — loading {}", DEEPSEEK_CHAT_URL);
    Ok(())
}

/// 创建主窗口，加载 chat.deepseek.com。
///
/// 按 PRD §1.6 合规约束：仅加载 chat.deepseek.com，不修改请求。
fn create_main_window(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let data_dir = account::get_data_directory(app.handle(), account::DEFAULT_ACCOUNT_ID);

    // 确保数据目录存在
    std::fs::create_dir_all(&data_dir)?;
    tracing::info!("webview data directory: {}", data_dir.display());

    // 获取注入脚本
    let inject_script = injector::get_inject_script(account::DEFAULT_ACCOUNT_ID);

    // 构建主窗口 — 基础配置
    let mut builder = WebviewWindowBuilder::new(
        app,
        "main",
        WebviewUrl::External(DEEPSEEK_CHAT_URL.parse().unwrap()),
    )
    .title("DeepDesk · Unofficial")
    .inner_size(1200.0, 800.0)
    .min_inner_size(800.0, 600.0)
    .center()
    .resizable(true)
    .focused(true)
    .user_agent(USER_AGENT)
    .data_directory(data_dir);

    // 注入脚本（即使为空也安全）
    if !inject_script.is_empty() {
        builder = builder.initialization_script(&inject_script);
    }

    // 平台特定窗口装饰配置
    // macOS: 使用原生装饰 + overlay title bar style（traffic light 内嵌）
    // 注：transparent(true) 需要 Tauri `macos-private-api` feature，会牵连
    // 上架审核与代码签名，MVP 暂不开启；macOS 视觉效果由 vibrancy 负责。
    #[cfg(target_os = "macos")]
    {
        builder = builder
            .decorations(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .shadow(true);
    }

    // Windows: 原生装饰栏，M-01 阶段先简单可用
    // TODO（V0.2）：通过注入脚本叠加自定义 titlebar
    #[cfg(target_os = "windows")]
    {
        builder = builder.decorations(true).shadow(true);
    }

    // Linux: 原生装饰栏
    #[cfg(target_os = "linux")]
    {
        builder = builder.decorations(true);
    }

    let window = builder.build()?;

    // 应用 vibrancy / mica 效果
    apply_vibrancy(&window);

    Ok(())
}

/// 应用窗口 vibrancy / mica 效果。
#[allow(unused_variables)]
fn apply_vibrancy(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        let _ = apply_vibrancy(window, NSVisualEffectMaterial::HudWindow, None, Some(12.0));
        tracing::info!("applied macOS vibrancy effect");
    }

    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::apply_mica;
        let _ = apply_mica(window, Some(true));
        tracing::info!("applied Windows mica effect");
    }
}

/// 创建设置窗口（加载本地 React dist 的 /settings 路由）。
///
/// TODO（按 PRD M-03 / ARCHITECTURE §4.7）：
///   - 独立 WebviewWindow 加载本地 dist
///   - 窗口大小：800x600，可调整
///   - 单例模式：如果已存在则 focus 而非重复创建
#[allow(dead_code)]
pub fn create_settings_window(_app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    // TODO: 实现设置窗口创建
    // let url = WebviewUrl::App("settings".into());
    // WebviewWindowBuilder::new(app, "settings", url)
    //     .title("DeepDesk · 设置")
    //     .inner_size(800.0, 600.0)
    //     .center()
    //     .build()?;
    tracing::info!("create_settings_window: not yet implemented");
    Ok(())
}
