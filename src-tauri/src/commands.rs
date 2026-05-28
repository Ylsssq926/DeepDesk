//! Tauri command handlers — 前端 invoke 入口。
//!
//! 命名约定（详见 `docs/ARCHITECTURE.md` §5）：
//!   - 简单的应用元数据：`get_*` / `set_*`
//!   - 副作用调用：动词开头（`save_message` / `search_history` / `toggle_quick_window`）

/// 健康检查 — 前端可调用此命令验证 IPC 通路。
#[tauri::command]
pub fn ping() -> &'static str {
    "pong"
}

/// 返回应用版本（来自 Cargo.toml）。
#[tauri::command]
pub fn get_app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}
