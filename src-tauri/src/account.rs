//! 账号会话目录管理。
//!
//! 按 PRD §1.6 合规约束：仅管理本地 WebView 数据存储路径，
//! 不修改、拦截或转发任何用户请求与凭据。
//!
//! MVP 阶段仅有 "default" 一个账号；V2 引入多账号时仅需扩展此模块的接口。
//! 不变量：每个 account_id 对应一个独立的 WebView 数据目录（Cookie / LocalStorage / IndexedDB）。

use std::path::PathBuf;
use tauri::Manager;

/// 默认账号 ID。MVP 阶段所有会话数据存储在此 ID 对应的目录下。
pub const DEFAULT_ACCOUNT_ID: &str = "default";

/// 获取指定账号的 WebView 数据存储目录。
///
/// 路径格式：`<app_data_dir>/webview-data/<account_id>/`
///
/// # Examples
///
/// ```no_run
/// let path = account::get_data_directory(app.handle(), "default");
/// // macOS:   ~/Library/Application Support/app.deepdesk.unofficial/webview-data/default/
/// // Windows: %APPDATA%\app.deepdesk.unofficial\webview-data\default\
/// // Linux:   ~/.local/share/app.deepdesk.unofficial/webview-data/default/
/// ```
///
/// # Panics
///
/// 如果无法解析 app_data_dir（理论上不会发生，Tauri 保证此路径可用）。
pub fn get_data_directory(app: &tauri::AppHandle, account_id: &str) -> PathBuf {
    let base = app
        .path()
        .app_data_dir()
        .expect("app_data_dir should be resolvable");
    base.join("webview-data").join(account_id)
}
