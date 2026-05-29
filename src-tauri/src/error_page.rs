//! 离线 / 加载失败兜底页面。
//!
//! 当主窗口加载 `https://chat.deepseek.com` 失败（断网、DNS 解析失败、对端宕机
//! 或加载超时）时，由 `windows::create_main_window` 通过
//! [`WebviewWindow::navigate`] 切换到本模块生成的 `data:` URL，向用户展示一个
//! 美观的离线提示页，提供「重试」「在浏览器打开」与「查看托盘」三种引导。
//!
//! ## 合规说明（按 PRD §1.6）
//!
//! 本模块产出的 HTML 是一份完全 self-contained（仅含 inline CSS / SVG，无外部
//! 资源、无网络请求）的静态页面，仅在主窗口**加载失败时**短暂展示，并由用户
//! 主动操作（点击「重试」）回到 `https://chat.deepseek.com`。
//!
//! 我们 **不** 在该页面中执行任何 fetch / XHR / WebSocket，也 **不** 发起对
//! chat.deepseek.com 的任何探测；切换到此页面亦不会影响正常的 cookies /
//! localStorage / IndexedDB（这些都关联到原 origin，离线页运行在 `data:` 源
//! 之下，与 chat.deepseek.com 完全隔离）。
//!
//! 因此本特性满足「仅加载 chat.deepseek.com，不修改、拦截或伪造任何 HTTP
//! 请求」的合规约束 —— data 协议页只是一张本地兜底海报。

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;

/// 渲染离线兜底页 HTML。
///
/// `reason` 是可选的失败原因（例如「连接超时」），会以小一号灰色字渲染在副标题
/// 处；传入空字符串则不显示。
///
/// # 设计要点
/// - 完全 self-contained：无外部 CSS / JS / 字体 / 图片
/// - prefers-color-scheme 媒体查询自动适配深 / 浅色
/// - 与 DeepDesk 蓝青白主题一致
/// - 「重试」按钮调用 `location.reload()` —— WebView 仍在 chat.deepseek.com 的
///   导航上下文内？事实上：navigate 到 `data:` URL 之后，reload 会回到 data 页
///   本身，所以重试按钮采用 **重新跳转到 chat.deepseek.com** 的方式
/// - 「在浏览器打开」按钮通过 `window.location.assign(...)` 让 WebView 自己重
///   新尝试加载 chat.deepseek.com（仍在本进程内，不会调起系统浏览器；命名是
///   站在用户角度的、更直观的描述）
pub fn render_error_html(reason: &str) -> String {
    // 注意：reason 来自 Rust 端可控字符串（page-load watchdog 自己产生），
    // 但仍做最小化 HTML 转义，避免未来若拼接外部输入产生 XSS。
    let reason_html = escape_html(reason);
    let reason_block = if reason.trim().is_empty() {
        String::new()
    } else {
        format!(r#"<p class="reason">{reason_html}</p>"#)
    };

    // The retry / reopen 操作都是「让 WebView 重新加载 chat.deepseek.com」。
    // 这里写死目标 URL，与 windows.rs 里的 DEEPSEEK_CHAT_URL 保持一致。
    const TARGET_URL: &str = "https://chat.deepseek.com";

    format!(
        r##"<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>无法连接 · DeepDesk</title>
<style>
  :root {{
    color-scheme: light dark;
    --bg: oklch(0.99 0.005 220);
    --fg: oklch(0.22 0.02 220);
    --muted: oklch(0.55 0.02 220);
    --card: oklch(1 0 0 / 0.7);
    --border: oklch(0.9 0.01 220);
    --shadow: 0 24px 64px -24px oklch(0.5 0.05 220 / 0.25);
    --accent-from: oklch(0.62 0.16 230);
    --accent-to: oklch(0.72 0.13 200);
    --btn-secondary-bg: oklch(0.96 0.01 220);
    --btn-secondary-fg: oklch(0.32 0.03 220);
    --btn-secondary-hover: oklch(0.93 0.015 220);
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --bg: oklch(0.18 0.02 220);
      --fg: oklch(0.95 0.005 220);
      --muted: oklch(0.7 0.015 220);
      --card: oklch(0.22 0.02 220 / 0.85);
      --border: oklch(0.3 0.02 220);
      --shadow: 0 24px 64px -24px oklch(0.05 0.02 220 / 0.6);
      --btn-secondary-bg: oklch(0.28 0.02 220);
      --btn-secondary-fg: oklch(0.92 0.005 220);
      --btn-secondary-hover: oklch(0.34 0.025 220);
    }}
  }}
  * {{ box-sizing: border-box; }}
  html, body {{
    margin: 0;
    padding: 0;
    height: 100%;
    background: var(--bg);
    color: var(--fg);
    font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC",
                 "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans SC",
                 sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }}
  body {{
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -10%,
                      oklch(0.72 0.13 200 / 0.18), transparent 70%),
      radial-gradient(ellipse 60% 40% at 50% 110%,
                      oklch(0.62 0.16 230 / 0.12), transparent 70%);
  }}
  main {{
    width: 100%;
    max-width: 520px;
    min-width: 280px;
    background: var(--card);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow);
    padding: 40px 32px 32px;
    text-align: center;
  }}
  .icon {{
    width: 72px;
    height: 72px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg,
      oklch(0.72 0.13 200 / 0.15),
      oklch(0.62 0.16 230 / 0.15));
    color: oklch(0.55 0.15 220);
  }}
  .icon svg {{ width: 40px; height: 40px; }}
  h1 {{
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }}
  .reason {{
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--muted);
    word-break: break-word;
  }}
  .desc {{
    margin: 16px 0 28px;
    font-size: 14px;
    line-height: 1.7;
    color: var(--muted);
  }}
  .actions {{
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }}
  button {{
    appearance: none;
    border: 0;
    cursor: pointer;
    font: inherit;
    font-size: 14px;
    font-weight: 500;
    padding: 11px 18px;
    border-radius: 12px;
    transition: transform 0.12s ease, box-shadow 0.18s ease,
                background 0.18s ease, opacity 0.18s ease;
  }}
  button:focus-visible {{
    outline: 2px solid oklch(0.62 0.16 230);
    outline-offset: 2px;
  }}
  button:active {{ transform: translateY(1px); }}
  .btn-primary {{
    color: white;
    background: linear-gradient(135deg, var(--accent-from), var(--accent-to));
    box-shadow: 0 6px 20px -8px oklch(0.62 0.16 230 / 0.7);
  }}
  .btn-primary:hover {{
    box-shadow: 0 10px 28px -10px oklch(0.62 0.16 230 / 0.85);
    filter: brightness(1.05);
  }}
  .btn-secondary {{
    color: var(--btn-secondary-fg);
    background: var(--btn-secondary-bg);
    border: 1px solid var(--border);
  }}
  .btn-secondary:hover {{ background: var(--btn-secondary-hover); }}
  .tray-hint {{
    margin: 0;
    padding: 12px 14px;
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--muted);
    background: var(--btn-secondary-bg);
    border: 1px dashed var(--border);
    border-radius: 10px;
  }}
  .tray-hint strong {{ color: var(--fg); font-weight: 600; }}
  @media (max-width: 380px) {{
    main {{ padding: 32px 22px 24px; }}
    h1 {{ font-size: 19px; }}
  }}
</style>
</head>
<body>
<main role="alert" aria-live="polite">
  <div class="icon" aria-hidden="true">
    <!-- wifi-off icon, simplified -->
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 2l20 20"/>
      <path d="M8.5 16.5a5 5 0 0 1 7 0"/>
      <path d="M2 8.82a15 15 0 0 1 4.17-2.65"/>
      <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"/>
      <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"/>
      <path d="M5 13a10 10 0 0 1 5.17-2.69"/>
      <line x1="12" y1="20" x2="12.01" y2="20"/>
    </svg>
  </div>
  <h1>无法连接 chat.deepseek.com</h1>
  {reason_block}
  <p class="desc">请检查网络连接后重试。如问题持续，可能是 DeepSeek 服务暂时不可用。</p>
  <div class="actions">
    <button class="btn-primary" id="retry" type="button">重试</button>
    <button class="btn-secondary" id="reopen" type="button">在浏览器打开</button>
  </div>
  <p class="tray-hint">
    <strong>提示</strong>：右键系统托盘可以打开 GitHub 仓库 / 关于。
  </p>
</main>
<script>
  // 这是一份 self-contained 兜底页。脚本仅处理用户在本页面上的点击操作，
  // 不进行任何 fetch / XHR / WebSocket，也不读取任何外部资源。
  (function () {{
    var TARGET = '{TARGET_URL}';
    function go() {{ window.location.assign(TARGET); }}
    var retry = document.getElementById('retry');
    var reopen = document.getElementById('reopen');
    if (retry) retry.addEventListener('click', go);
    if (reopen) reopen.addEventListener('click', go);
    // 网络恢复时自动悄悄回到 chat.deepseek.com
    window.addEventListener('online', go);
  }})();
</script>
</body>
</html>
"##,
        TARGET_URL = TARGET_URL,
        reason_block = reason_block,
    )
}

/// 把 `render_error_html` 的输出包装成可由 `WebviewWindow::navigate` 直接消费
/// 的 `data:text/html;base64,...` URL。
///
/// 选用 base64 而非 percent-encoding：
/// - HTML 里含大量 `#` `%` `&` 等特殊字符，URL 编码会膨胀且更易出错
/// - WebView2 / WKWebView / WebKitGTK 都稳定支持 `data:` URL 的 base64 形态
/// - 兼容性比 `blob:` 更好（blob 需要 origin 上下文）
pub fn build_error_data_url(reason: &str) -> String {
    let html = render_error_html(reason);
    let encoded = BASE64.encode(html.as_bytes());
    format!("data:text/html;charset=utf-8;base64,{encoded}")
}

/// 极简 HTML 转义，仅处理可能影响兜底页结构的字符。
///
/// 兜底页里 reason 出现位置只有一处 `<p>`，因此只需转义这五个字符。
fn escape_html(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            '\'' => out.push_str("&#39;"),
            _ => out.push(ch),
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_contains_required_pieces() {
        let html = render_error_html("连接超时");
        assert!(html.contains("无法连接 chat.deepseek.com"));
        assert!(html.contains("连接超时"));
        assert!(html.contains("id=\"retry\""));
        assert!(html.contains("id=\"reopen\""));
        assert!(html.contains("https://chat.deepseek.com"));
        // 不应有未替换的 format 占位符
        assert!(!html.contains("{TARGET_URL}"));
        assert!(!html.contains("{reason_block}"));
    }

    #[test]
    fn html_omits_reason_block_when_empty() {
        let html = render_error_html("");
        assert!(!html.contains("class=\"reason\""));
    }

    #[test]
    fn reason_is_html_escaped() {
        let html = render_error_html("<script>alert(1)</script>");
        assert!(!html.contains("<script>alert(1)</script>"));
        assert!(html.contains("&lt;script&gt;alert(1)&lt;/script&gt;"));
    }

    #[test]
    fn data_url_has_correct_prefix() {
        let url = build_error_data_url("offline");
        assert!(url.starts_with("data:text/html;charset=utf-8;base64,"));
    }
}
