/**
 * 调试指示点（Debug Indicator）增强。
 *
 * @module src-injected/enhancers/debug-indicator
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 *
 * 用途：
 *   - 在 chat.deepseek.com 右下角注入一个柔和呼吸的小圆点，
 *     作为开发者 / 调试人员的可视确认信号——「注入脚本已经成功加载并运行」。
 *   - 普通用户默认看不到。仅当 URL 含 `?deepdesk-debug=1` 或
 *     `localStorage.__DEEPSEEK_DEBUG__ === '1'` 时才会显示。
 *
 * 合规约束：
 *   - 不抓取 DOM 业务数据；仅 append 一个独立的、与宿主页隔离的 Shadow DOM 容器
 *   - 不发起网络请求；不修改任何 chat.deepseek.com 的样式 / 脚本 / 请求
 *   - 即便启用，也通过 Shadow DOM 完全隔离样式，不会影响 chat.deepseek.com 布局
 *
 * 不变量：
 *   - 默认禁用（feature flag）
 *   - 重复 init() 幂等：内部通过 createShadowHost(id) 自带去重
 *   - dispose() 把 shadow host 完整移除
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag, setFlag } from '../utils/feature-flag';
import { createShadowHost, getShadowHost } from '../core/shadow-host';
import { runtime } from '../core/runtime';

const NAME = 'debug-indicator' as const;
const SHADOW_ID = 'debug-indicator';
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, false);

/**
 * 判断是否应当激活指示点。
 *
 * 触发条件（任一成立即激活）：
 *   - URL 查询参数 `?deepdesk-debug=1`
 *   - localStorage `__DEEPSEEK_DEBUG__` 为 '1'
 */
function shouldActivate(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('deepdesk-debug') === '1') return true;
  } catch {
    /* swallow URL parse errors */
  }
  try {
    if (window.localStorage?.getItem('__DEEPSEEK_DEBUG__') === '1') return true;
  } catch {
    /* localStorage 在某些隔离上下文下可能抛错，安全忽略 */
  }
  return false;
}

// 模块加载即评估：若用户已用 ?deepdesk-debug=1 / __DEEPSEEK_DEBUG__ 触发，
// 主动把 feature flag 翻为 true，让 index.ts 的 scheduleEnhancers 走标准流程把 init 跑起来。
// 这样设计的好处：保留与其他 enhancer 一致的注册 / 状态机，避免 init 被 isEnabled 过滤掉。
if (shouldActivate()) {
  setFlag(NAME, true);
}

/** 在 ShadowRoot 内构建小圆点 + tooltip 的 DOM 结构。 */
function buildIndicator(version: string): { style: string; node: HTMLElement } {
  // 注：所有样式封装在 ShadowRoot 内，不会泄露 / 不会受 chat.deepseek.com 样式干扰。
  const style = `
    :host { all: initial; }
    .wrap {
      position: fixed;
      right: 12px;
      bottom: 12px;
      width: 8px;
      height: 8px;
      pointer-events: auto;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: linear-gradient(135deg, oklch(0.55 0.15 215), oklch(0.72 0.13 200));
      box-shadow: 0 0 6px oklch(0.62 0.14 210 / 0.55);
      animation: dd-breath 2.4s ease-in-out infinite;
      cursor: default;
    }
    @keyframes dd-breath {
      0%, 100% { opacity: 0.55; transform: scale(0.92); }
      50%      { opacity: 1;    transform: scale(1.08); }
    }
    .tip {
      position: absolute;
      right: 14px;
      bottom: 14px;
      white-space: nowrap;
      padding: 4px 8px;
      font-size: 11px;
      line-height: 1.4;
      color: #fff;
      background: rgba(20, 22, 28, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      opacity: 0;
      transform: translateY(2px);
      transition: opacity 120ms ease, transform 120ms ease;
      pointer-events: none;
    }
    .wrap:hover .tip {
      opacity: 1;
      transform: translateY(0);
    }
  `;

  const wrap = document.createElement('div');
  wrap.className = 'wrap';
  wrap.setAttribute('role', 'status');
  wrap.setAttribute('aria-label', `DeepDesk v${version} 注入已激活`);

  const dot = document.createElement('div');
  dot.className = 'dot';

  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.textContent = `DeepDesk v${version} · 注入已激活`;

  wrap.appendChild(dot);
  wrap.appendChild(tip);
  return { style, node: wrap };
}

export const debugIndicatorEnhancer: Enhancer = {
  name: NAME,
  // 等 DOM 就绪再挂载，确保 document.body 可用
  when: 'dom-ready',
  defaultEnabled: false,
  init() {
    // 此 enhancer 由 index.ts 的 scheduleEnhancers 调用：
    // 仅当 feature flag 为 true 才会进来。flag 由两条路径置 true：
    //   1) 模块加载时 shouldActivate() 命中（URL / localStorage）
    //   2) 用户在设置 / 通过 feature-flag:set 远程打开
    // 两种情况都需要挂载 DOM，无需再次校验。
    if (!document.body) {
      log.warn('document.body missing; skip mount');
      return;
    }
    if (getShadowHost(SHADOW_ID)) {
      log.debug('shadow host already exists; skip remount');
      return;
    }
    const handle = createShadowHost(SHADOW_ID);
    // host 默认 pointer-events: none（避免阻断页面交互），
    // 内部 .wrap 通过 pointer-events: auto 单独打开 hover 区域
    handle.host.style.pointerEvents = 'none';

    const { style, node } = buildIndicator(runtime.version);
    handle.appendStyle(style);
    handle.root.appendChild(node);
    log.info(`indicator mounted (v${runtime.version})`);
  },
  dispose() {
    const handle = getShadowHost(SHADOW_ID);
    if (handle) handle.dispose();
  },
};
