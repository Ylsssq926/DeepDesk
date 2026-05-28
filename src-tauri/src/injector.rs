//! 注入脚本管理。
//!
//! 负责将编译后的前端注入脚本（`dist-injected/bundle.js`）嵌入到
//! chat.deepseek.com WebView 的 `initialization_script` 中。
//!
//! ## 设计决策
//!
//! 使用编译期 `include_str!` 而非运行时文件读取，原因：
//! - 性能：避免每次窗口创建时的 I/O 开销
//! - 单文件分发：注入脚本随二进制一起打包，无需额外文件
//! - 完整性：编译期即确定内容，无运行时篡改风险
//!
//! ## 容错
//!
//! 开发阶段 `dist-injected/bundle.js` 可能尚未生成（需 `pnpm build:inject`），
//! 此时返回空字符串并输出 warn 日志，不阻塞应用启动。
//!
//! TODO（按架构 §4.2 / §4.9-4.13）：
//!   - 支持远程下发新版注入脚本（应对 DeepSeek 网页改版）
//!   - 注入脚本完整性校验（防 MITM）

/// 获取指定账号的注入脚本内容。
///
/// MVP 阶段 `_account_id` 未使用（所有账号共享同一注入脚本）。
/// V2 可按账号加载不同配置。
///
/// # Returns
///
/// 注入脚本的 JavaScript 字符串。若脚本文件不存在则返回空字符串。
pub fn get_inject_script(_account_id: &str) -> String {
    // 编译期尝试嵌入注入脚本。
    // 使用 option_env! 检测是否设置了 DEEPDESK_INJECT_SCRIPT 环境变量来指定路径，
    // 否则使用默认的 include 路径。
    //
    // 由于 include_str! 在文件不存在时会编译失败，我们用条件编译 + 空字符串兜底。
    let script = include_inject_script();

    if script.is_empty() {
        tracing::warn!(
            "inject script is empty — dist-injected/bundle.js may not exist yet. \
             Run `pnpm build:inject` to generate it."
        );
    } else {
        tracing::info!("inject script loaded ({} bytes)", script.len());
    }

    script.to_string()
}

/// 编译期嵌入注入脚本，文件不存在时返回空字符串。
///
/// 技术说明：`include_str!` 在文件不存在时会导致编译失败，
/// 因此我们提供一个空的 fallback 文件，并在 build.rs 中确保路径存在。
fn include_inject_script() -> &'static str {
    // 先尝试读取 dist-injected/bundle.js
    // 如果文件不存在，build.rs 会创建一个空文件确保编译通过
    include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/dist-injected/bundle.js"))
}
