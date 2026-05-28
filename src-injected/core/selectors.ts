/**
 * chat.deepseek.com DOM 选择器多版本兜底清单。
 *
 * @module src-injected/core/selectors
 * @see docs/ARCHITECTURE.md §10.1 chat.deepseek.com 改版导致注入失效
 *
 * 合规约束（必读）：
 *   - 本模块**仅用于 UI 增强目的**：在已知容器内挂载我们自己的 Shadow DOM 子树，
 *     或在用户输入框上添加 Slash 监听等
 *   - **绝不**用于读取 chat.deepseek.com 业务数据（消息正文、用户名、Token、cookie 等）
 *   - 任何抓取业务文本的需求都应改为基于「我们自己捕获到的请求/响应」（见 interceptors/）
 *
 * 不变量：
 *   - 选择器列表从新版到旧版排列；findFirst 自上而下尝试
 *   - 命中率统计仅在内存中维护，由 bridge 上报，不持久化
 *   - 每个选择器名称对应一个固定语义（见 SelectorName）
 */

import type { InjectSelectorMissPayload } from '../types/messages';
import { bridge } from './bridge';
import { createLogger } from '../utils/logger';

const log = createLogger('core:selectors');

/** 已知选择器语义名（对增强功能有意义的 DOM 锚点）。 */
export type SelectorName =
  | 'chatInput'
  | 'messageList'
  | 'sidebar'
  | 'sendButton'
  | 'codeBlock'
  | 'mermaidCodeBlock'
  | 'thinkingBlock';

/**
 * 选择器版本化清单：每个 name 对应一个有序数组（新版在前）。
 *
 * 注意：这里保存的字符串只是 querySelector 模板，并不会主动扫描业务文本。
 */
const SELECTORS: Readonly<Record<SelectorName, readonly string[]>> = {
  chatInput: [
    '[data-testid="chat-input"]',
    'textarea[placeholder*="Send a message"]',
    'textarea[placeholder*="发送消息"]',
    '.chat-input textarea',
    '#chat-input',
  ],
  messageList: [
    '[data-testid="message-list"]',
    '[role="log"][aria-label*="message"]',
    '.message-list',
    'main [class*="messages-container"]',
  ],
  sidebar: [
    'nav[aria-label="Sidebar"]',
    'nav[class*="sidebar"]',
    'aside[class*="sidebar"]',
    '.sidebar',
  ],
  sendButton: [
    '[data-testid="send-button"]',
    'button[aria-label*="Send"]',
    'button[aria-label*="发送"]',
  ],
  codeBlock: ['pre > code'],
  mermaidCodeBlock: [
    'pre > code.language-mermaid',
    'pre > code[class*="language-mermaid"]',
    'pre[data-language="mermaid"] > code',
  ],
  thinkingBlock: [
    '[data-testid="thinking-chain"]',
    'div[class*="thinking-chain"]',
    'div[class*="reasoning"]',
  ],
};

/** 每个选择器名的命中 / 未命中累计计数。 */
interface SelectorMetrics {
  hits: number;
  misses: number;
  /** 最近一次命中时使用的 fallback 索引（0 = 最新版）。 */
  lastHitIndex: number;
}

const metrics: Record<SelectorName, SelectorMetrics> = Object.fromEntries(
  (Object.keys(SELECTORS) as SelectorName[]).map((k) => [
    k,
    { hits: 0, misses: 0, lastHitIndex: -1 },
  ]),
) as Record<SelectorName, SelectorMetrics>;

/**
 * 在 root 内尝试所有版本，返回第一个命中的元素；全部失败返回 null。
 *
 * @param name SelectorName
 * @param root 默认 document，可指定子树
 */
export function findFirst(name: SelectorName, root: ParentNode = document): Element | null {
  const list = SELECTORS[name];
  for (let i = 0; i < list.length; i += 1) {
    const sel = list[i]!;
    let el: Element | null = null;
    try {
      el = root.querySelector(sel);
    } catch (err) {
      log.warn(`invalid selector "${sel}" for ${name}:`, err);
      continue;
    }
    if (el) {
      const m = metrics[name];
      m.hits += 1;
      m.lastHitIndex = i;
      // selector miss 监控只在「整体未命中」时上报；命中数低概率采样上报
      if (i > 0 && (m.hits & 0x3f) === 0) {
        emitMetric(name, true);
      }
      return el;
    }
  }
  metrics[name].misses += 1;
  // 频繁未命中是改版信号，每 16 次未命中上报一次（避免噪声）
  if ((metrics[name].misses & 0x0f) === 0) {
    emitMetric(name, false);
  }
  return null;
}

/** 多元素版。返回第一个命中模板下的所有匹配元素。 */
export function findAll(name: SelectorName, root: ParentNode = document): Element[] {
  const list = SELECTORS[name];
  for (let i = 0; i < list.length; i += 1) {
    const sel = list[i]!;
    try {
      const els = root.querySelectorAll(sel);
      if (els.length > 0) {
        const m = metrics[name];
        m.hits += 1;
        m.lastHitIndex = i;
        return Array.from(els);
      }
    } catch (err) {
      log.warn(`invalid selector "${sel}" for ${name}:`, err);
    }
  }
  metrics[name].misses += 1;
  return [];
}

/** 暴露指标供 DevTools / runtime.snapshot 使用。 */
export function getMetrics(): Readonly<Record<SelectorName, SelectorMetrics>> {
  return metrics;
}

function emitMetric(name: SelectorName, hit: boolean): void {
  const payload: InjectSelectorMissPayload = {
    name,
    hit,
    totalHits: metrics[name].hits,
    totalMisses: metrics[name].misses,
  };
  void bridge.emit('inject:selector-miss', payload);
}
