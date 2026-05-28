/**
 * 中央 MutationObserver 调度器：所有 enhancer 共享一个 observer。
 *
 * @module src-injected/core/observer
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构 / §4.9 Mermaid 渲染注入
 *
 * 合规约束：
 *   - 不读取节点的 textContent / innerText 用于业务采集
 *   - predicate / handler 由 enhancer 提供，但仅在「找到我们关心的容器」时回调
 *
 * 不变量：
 *   - 全局只创建一个 MutationObserver，避免 chat.deepseek.com 频繁 DOM 抖动时触发
 *     N 个 observer 同时跑导致主线程卡顿
 *   - 单个 handler 抛错不影响其他订阅者（safeCall 包裹）
 *   - 节流默认 50ms，单次 flush 最多处理一个微批次
 *   - 所有订阅者通过 unobserve(handle) 取消（幂等）
 */

import { createLogger } from '../utils/logger';
import { wrapSafe } from '../utils/safe-call';

const log = createLogger('core:observer');

/** 订阅者句柄。 */
export interface ObserveHandle {
  /** 唯一编号。 */
  readonly id: number;
  /** 取消订阅；幂等。 */
  cancel(): void;
}

/** 订阅者节点接受过滤器。返回 true 表示对此节点感兴趣。 */
export type NodePredicate = (node: Node) => boolean;

/** 命中节点的处理器。 */
export type NodeHandler = (node: Node) => void;

interface Subscription {
  id: number;
  predicate: NodePredicate;
  handler: NodeHandler;
  /** 是否已取消。取消后下次 flush 跳过。 */
  cancelled: boolean;
}

let nextId = 1;
const subs: Subscription[] = [];

let observer: MutationObserver | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const queuedNodes = new Set<Node>();

/** 节流间隔。 */
const FLUSH_INTERVAL_MS = 50;

/**
 * 启动中央 observer。重复调用幂等。
 *
 * 必须在 DOMContentLoaded 之后调用，因为需要 document.body 存在。
 */
export function startObserver(): void {
  if (observer) return;
  if (!document.body) {
    // 偶发：注入脚本太早执行；等到 body 出现后再启动
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    return;
  }

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      // childList 是最常见 case；attributes / characterData 不在中央调度器关注范围
      if (m.type !== 'childList') continue;
      m.addedNodes.forEach((n) => queuedNodes.add(n));
    }
    schedule();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  log.info('central MutationObserver started');
}

/** 停止 observer，主要供 dispose 流程使用。 */
export function stopObserver(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  queuedNodes.clear();
}

/**
 * 订阅 DOM 节点新增事件。
 *
 * @param predicate 过滤器：决定哪些节点会触发 handler
 * @param handler   命中节点的处理器
 */
export function observe(predicate: NodePredicate, handler: NodeHandler): ObserveHandle {
  const sub: Subscription = {
    id: nextId++,
    predicate: wrapSafe('core:observer:predicate', predicate, false),
    handler: wrapSafe('core:observer:handler', handler, undefined as void),
    cancelled: false,
  };
  subs.push(sub);
  return {
    id: sub.id,
    cancel(): void {
      sub.cancelled = true;
    },
  };
}

/** 反订阅别名，便于 enhancer 使用。 */
export function unobserve(handle: ObserveHandle): void {
  handle.cancel();
}

function schedule(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

function flush(): void {
  if (queuedNodes.size === 0) return;

  // 拷贝一份待处理集合，并清理已取消订阅
  const nodes = Array.from(queuedNodes);
  queuedNodes.clear();
  for (let i = subs.length - 1; i >= 0; i -= 1) {
    if (subs[i]!.cancelled) subs.splice(i, 1);
  }

  for (const node of nodes) {
    for (const sub of subs) {
      if (sub.cancelled) continue;
      if (sub.predicate(node)) sub.handler(node);
    }
  }
}
