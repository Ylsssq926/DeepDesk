/**
 * DeepDesk 注入脚本入口。
 *
 * 运行环境：在 chat.deepseek.com WebView 创建时通过 Tauri
 * `initialization_script` 注入，先于页面 JS 执行。
 *
 * 详细架构见 docs/ARCHITECTURE.md §3.3 / §4.2 - §4.13。
 *
 * 注意事项（合规底线）：
 *   - 不抓取 DOM 业务数据（仅缓存自身请求结果用于本地搜索/导出）
 *   - 不修改 DeepSeek 自己的请求体 / headers
 *   - 不绕过 PoW / 限流 / 反滥用机制
 *   - 不模拟登录或代理协议
 */

declare global {
  interface Window {
    __DEEPSEEK_DESKTOP__?: {
      version: string;
      initialized: boolean;
      _errors: unknown[];
    };
  }
}

const VERSION = '0.1.0';

(() => {
  // 防重复注入
  if (window.__DEEPSEEK_DESKTOP__) {
    console.warn('[DeepDesk] inject script already loaded');
    return;
  }

  window.__DEEPSEEK_DESKTOP__ = {
    version: VERSION,
    initialized: false,
    _errors: [],
  };

  try {
    // TODO: 后续按架构 §4.9 - §4.13 加载子模块
    //   - SSE 拦截器
    //   - Mermaid 渲染
    //   - Slash 命令选择器
    //   - 失败兜底
    //   - 沉浸式 CSS 注入
    //   - Thinking 链折叠

    window.__DEEPSEEK_DESKTOP__.initialized = true;
    console.info(`[DeepDesk] inject script v${VERSION} ready (skeleton mode)`);
  } catch (err) {
    window.__DEEPSEEK_DESKTOP__._errors.push(err);
    console.error('[DeepDesk] inject script init failed', err);
  }
})();

export {};
