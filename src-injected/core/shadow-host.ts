/**
 * Shadow DOM 容器工厂：用于注入我们自己的 UI（toast、Slash 菜单、Mermaid 渲染等）
 * 而不污染 chat.deepseek.com 的全局样式与脚本。
 *
 * @module src-injected/core/shadow-host
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构 / §4.10 Slash 命令架构
 *
 * 合规约束：
 *   - 注入容器附在 document.body 末尾，不修改宿主页 DOM 上下文
 *   - 容器内的样式经由 ShadowRoot 隔离，不会泄漏出去；同样宿主样式也不会渗入
 *
 * 不变量：
 *   - 同名 host 重复创建幂等：返回已有 ShadowRoot
 *   - dispose() 把 host 节点完整移除
 *   - 默认使用 'closed' 模式以避免页面脚本越界访问
 */

import { createLogger } from '../utils/logger';

const log = createLogger('core:shadow-host');

/** 我们所有 shadow host 的统一前缀。 */
const HOST_ID_PREFIX = 'deepdesk-host-';

/** 注册表：id → host element。 */
const hosts = new Map<string, HTMLElement>();
/** 注册表：id → root（closed 模式下外部无法 reach，所以我们自己持有）。 */
const roots = new Map<string, ShadowRoot>();

export interface ShadowHostHandle {
  readonly id: string;
  readonly host: HTMLElement;
  readonly root: ShadowRoot;
  /** 在 shadow root 内追加 CSS（多次调用累积）。 */
  appendStyle(css: string): void;
  /** 移除 host 节点；幂等。 */
  dispose(): void;
}

/**
 * 创建一个 Shadow DOM 容器。
 *
 * @param id   语义标识，比如 'toast' / 'slash-menu' / 'mermaid-overlay'
 * @param mode shadow root 模式（默认 closed）
 */
export function createShadowHost(
  id: string,
  mode: 'open' | 'closed' = 'closed',
): ShadowHostHandle {
  const fullId = `${HOST_ID_PREFIX}${id}`;
  const existed = hosts.get(fullId);
  if (existed) {
    const root = roots.get(fullId);
    if (root) return makeHandle(fullId, existed, root);
    log.warn(`host ${fullId} exists but root is missing, recreating`);
    existed.remove();
    hosts.delete(fullId);
    roots.delete(fullId);
  }

  const host = document.createElement('div');
  host.id = fullId;
  // 完全脱离正常布局，避免影响宿主页 layout
  host.style.cssText = [
    'all: initial',
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 0',
    'height: 0',
    'pointer-events: none',
    'z-index: 2147483646',
  ].join(';');
  // host 自身不响应事件，只让其内部具体 UI 显式打开 pointer-events
  host.setAttribute('data-deepdesk-host', id);
  host.setAttribute('aria-hidden', 'true');

  const target = document.body ?? document.documentElement;
  target.appendChild(host);

  const root = host.attachShadow({ mode });
  hosts.set(fullId, host);
  roots.set(fullId, root);
  log.debug(`created shadow host: ${fullId}`);

  return makeHandle(fullId, host, root);
}

/** 获取已创建的 host（如有）。 */
export function getShadowHost(id: string): ShadowHostHandle | null {
  const fullId = `${HOST_ID_PREFIX}${id}`;
  const host = hosts.get(fullId);
  const root = roots.get(fullId);
  if (!host || !root) return null;
  return makeHandle(fullId, host, root);
}

function makeHandle(fullId: string, host: HTMLElement, root: ShadowRoot): ShadowHostHandle {
  return {
    id: fullId,
    host,
    root,
    appendStyle(css: string) {
      const el = document.createElement('style');
      el.textContent = css;
      root.appendChild(el);
    },
    dispose() {
      try {
        host.remove();
      } catch (err) {
        log.warn(`dispose host ${fullId} failed:`, err);
      }
      hosts.delete(fullId);
      roots.delete(fullId);
    },
  };
}
