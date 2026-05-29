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
use crate::error_page;
use crate::injector;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// DeepSeek Chat 的 URL。
const DEEPSEEK_CHAT_URL: &str = "https://chat.deepseek.com";

/// User-Agent 字符串。与 tauri.conf.json 中保持一致。
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) DeepDesk/0.1.0 Chrome/131.0.0.0 Safari/537.36";

/// ⚠️ 临时（alpha 注入诊断）：硬编码自检脚本。
///
/// 不依赖任何 bundle 内容。只要 Tauri 在 chat.deepseek.com 上执行了
/// initialization_script，页面顶部就出现红色诊断条，并报告 bundle 是否执行。
/// 用于判定"注入完全没生效"还是"bundle 内部出错"。诊断完成后删除。
const INJECT_DIAGNOSTIC_SCRIPT: &str = r#"
(function () {
  try {
    var mount = function () {
      try {
        if (!document.body) { return; }
        if (document.getElementById('deepdesk-diag')) { return; }
        var bar = document.createElement('div');
        bar.id = 'deepdesk-diag';
        var bundleRan = !!(window.__DEEPSEEK_DESKTOP__);
        bar.textContent = '🔴 DeepDesk 注入诊断：Tauri initialization_script 已执行'
          + ' · bundle ' + (bundleRan ? '已运行' : '未运行/出错')
          + ' · 点击关闭';
        bar.style.cssText = [
          'position:fixed','top:0','left:0','right:0','z-index:2147483647',
          'background:#d9342b','color:#fff',
          'font:600 13px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif',
          'text-align:center','padding:6px 12px','cursor:pointer'
        ].join(';');
        bar.addEventListener('click', function () { bar.remove(); });
        document.body.appendChild(bar);
      } catch (e) {}
    };
    if (document.body) { mount(); }
    else { document.addEventListener('DOMContentLoaded', mount); }
    // 兜底：页面 SPA 渲染较晚时，延迟再尝试挂一次
    setTimeout(mount, 1500);
    setTimeout(mount, 4000);
  } catch (e) {}
})();
"#;

/// 主窗口加载 chat.deepseek.com 的超时阈值。
///
/// 一旦 `PageLoadEvent::Started` 触发后超过此时长仍未收到 `Finished`，
/// 认为加载失败，切换到本地兜底页。
///
/// 取值偏保守（15 秒），避免在国内网络短暂抖动时误伤慢速但仍可用的连接。
const PAGE_LOAD_TIMEOUT: Duration = Duration::from_secs(15);

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

    // 加载 watchdog：每次发生导航（Started）会自增 generation；Finished 时与
    // 当前 generation 比较，匹配则成功。窗口构建后 spawn 一个后台任务在
    // PAGE_LOAD_TIMEOUT 之后回查：若 generation 仍是 Started 时记录的值且
    // 状态仍未完成，则视为加载失败，导航到兜底 data: URL。
    //
    // 用 Arc<AtomicU64> 同时承担：
    //   - 低 63 位：当前 generation 序号
    //   - 最高位（GEN_FINISHED_BIT）：当前 generation 是否已 Finished
    // 这样 Started/Finished/超时回调可以无锁互通。
    let load_state = Arc::new(AtomicU64::new(0));
    let load_state_for_handler = load_state.clone();

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
    .data_directory(data_dir)
    .on_page_load(move |window, payload| {
        on_page_load_event(&window, payload, &load_state_for_handler);
    });

    // ⚠️ 临时（alpha 注入诊断）：一段不依赖 bundle 的硬编码自检脚本。
    // 目的：隔离"Tauri 注入机制是否工作"与"bundle 内部是否出错"。
    // 只要 Tauri 在远程页面执行了 initialization_script，页面顶部就会出现一条
    // 红色诊断条；条上还会报告 bundle 是否已执行（window.__DEEPSEEK_DESKTOP__）。
    // 诊断完成后删除本段。
    builder = builder.initialization_script(INJECT_DIAGNOSTIC_SCRIPT);

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

/// `load_state` 的最高位：若被设置则表示当前 generation 已经 Finished。
const GEN_FINISHED_BIT: u64 = 1 << 63;
/// 提取 generation 序号（去掉 finished 标志位）。
const GEN_MASK: u64 = !GEN_FINISHED_BIT;

/// 处理 `on_page_load` 回调。
///
/// 关键不变量：
/// - `Started` → 新 generation = 旧 generation + 1（不带 finished bit）
/// - `Finished` → 在当前 generation 上置 finished bit（仅当当前导航是
///   chat.deepseek.com 主页时才视为成功；否则仍触发 watchdog 兜底）
/// - 每次 Started 后 spawn 一个超时任务：到期若 generation 未变且未 Finished
///   就执行兜底导航
fn on_page_load_event(
    window: &tauri::WebviewWindow,
    payload: tauri::webview::PageLoadPayload<'_>,
    load_state: &Arc<AtomicU64>,
) {
    use tauri::webview::PageLoadEvent;

    match payload.event() {
        PageLoadEvent::Started => {
            let url = payload.url().to_string();

            // data: URL 是兜底页本身，不应触发 watchdog（避免无限套娃）
            if url.starts_with("data:") {
                tracing::debug!("page-load Started for fallback page, watchdog skipped");
                return;
            }

            // 自增 generation，清掉 finished bit
            let prev = load_state.load(Ordering::Acquire);
            let new_gen = (prev & GEN_MASK).wrapping_add(1) & GEN_MASK;
            load_state.store(new_gen, Ordering::Release);
            tracing::info!("page-load Started [gen={}] {}", new_gen, url);

            // spawn watchdog
            let app_handle = window.app_handle().clone();
            let load_state = load_state.clone();
            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(PAGE_LOAD_TIMEOUT).await;
                let state = load_state.load(Ordering::Acquire);
                let still_pending =
                    (state & GEN_MASK) == new_gen && (state & GEN_FINISHED_BIT) == 0;
                if !still_pending {
                    return;
                }
                tracing::warn!(
                    "page-load watchdog fired [gen={}] — navigating to fallback page",
                    new_gen
                );
                if let Some(window) = app_handle.get_webview_window("main") {
                    navigate_to_fallback(&window, "加载超时（15 秒未完成）");
                }
            });
        }
        PageLoadEvent::Finished => {
            let url = payload.url().to_string();

            // 如果 Finished 的是 data: 兜底页，不计入「成功」—— 用户在兜底页
            // 上点击重试时仍然要走完整的 Started → 超时检查流程。
            if url.starts_with("data:") {
                tracing::debug!("page-load Finished on fallback page");
                return;
            }

            let prev = load_state.fetch_or(GEN_FINISHED_BIT, Ordering::AcqRel);
            tracing::info!("page-load Finished [gen={}] {}", prev & GEN_MASK, url);
        }
    }
}

/// 把窗口导航到兜底 data: URL。
///
/// 错误仅记录日志而不向上抛出 —— 此函数在异步回调里调用，调用方无处可处理。
fn navigate_to_fallback(window: &tauri::WebviewWindow, reason: &str) {
    let data_url = error_page::build_error_data_url(reason);
    match data_url.parse() {
        Ok(parsed) => {
            if let Err(e) = window.navigate(parsed) {
                tracing::error!("failed to navigate to fallback page: {e}");
            }
        }
        Err(e) => {
            // 理论不可能，data: URL 由我们自己构造
            tracing::error!("failed to parse fallback data URL: {e}");
        }
    }
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
