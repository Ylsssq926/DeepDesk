/**
 * XMLHttpRequest monkey-patch 骨架：仅提供「响应观察钩子」入口，不修改请求。
 *
 * @module src-injected/interceptors/xhr
 * @see docs/ARCHITECTURE.md §4.3 SSE 流拦截与对话存档
 *
 * 合规约束：
 *   - 不修改 open / setRequestHeader / send 的参数
 *   - 不重写响应数据；只在 readyState=4 时回调 hook 让其读取（与 fetch 拦截器对偶）
 *   - 不绕过 PoW / 限流；所有 hook 仅观察
 *
 * 不变量：
 *   - 原始 XHR 引用在模块加载时立即捕获并保存
 *   - install() 幂等
 *   - hook 抛错被 safeCall 隔离
 *
 * 备注：
 *   chat.deepseek.com 的核心 chat completion 走 fetch SSE，XHR 仅用于少量元请求；
 *   这里保留骨架以便后续在不影响合规的前提下做诊断（如重试统计），不做任何业务采集。
 */

import { createLogger } from '../utils/logger';
import { isEnabled, registerFlag } from '../utils/feature-flag';
import { runtime } from '../core/runtime';

const log = createLogger('interceptor:xhr');
const FLAG = 'xhr-interceptor';
// 默认禁用：当前阶段没有具体业务需求，避免不必要的全局 patch
registerFlag(FLAG, false);

/** XHR 请求快照。 */
export interface XHRSnapshot {
  url: string;
  method: string;
  status: number;
  /** ms 时间戳。 */
  startedAt: number;
  /** ms 时间戳；hooks 收到时已为完成时刻。 */
  finishedAt: number;
}

/** XHR 响应钩子签名。 */
export type XHRResponseHook = (snap: XHRSnapshot) => void;

const hooks: { id: number; match: (s: XHRSnapshot) => boolean; fn: XHRResponseHook }[] = [];
let nextHookId = 1;
let installed = false;

interface PatchedXHR extends XMLHttpRequest {
  /** 我们额外塞进 XHR 实例的元数据（避免污染原对象语义）。 */
  __dd?: { url: string; method: string; startedAt: number };
}

/** 安装 XHR 拦截。幂等。 */
export function installXHRInterceptor(): void {
  if (installed) return;
  if (!isEnabled(FLAG)) {
    runtime.setStatus('xhr-interceptor', 'disabled');
    log.info('XHR interceptor disabled by flag');
    return;
  }
  const Xhr = window.XMLHttpRequest;
  if (typeof Xhr !== 'function') {
    log.warn('XMLHttpRequest unavailable; skip patching');
    runtime.setStatus('xhr-interceptor', 'failed');
    return;
  }

  const originalOpen = Xhr.prototype.open;
  const originalSend = Xhr.prototype.send;

  Xhr.prototype.open = function patchedOpen(
    this: PatchedXHR,
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ): void {
    this.__dd = {
      url: typeof url === 'string' ? url : url.href,
      method: method.toUpperCase(),
      startedAt: Date.now(),
    };
    // 透传所有原始参数；TS 限制下用 apply 避免遗漏 async / user / password
    return originalOpen.apply(this, [method, url, ...rest] as unknown as Parameters<XMLHttpRequest['open']>);
  };

  Xhr.prototype.send = function patchedSend(
    this: PatchedXHR,
    body?: Document | XMLHttpRequestBodyInit | null,
  ): void {
    const notify = (): void => {
      if (!this.__dd) return;
      const snap: XHRSnapshot = {
        url: this.__dd.url,
        method: this.__dd.method,
        status: this.status,
        startedAt: this.__dd.startedAt,
        finishedAt: Date.now(),
      };
      for (const hook of hooks) {
        try {
          if (hook.match(snap)) hook.fn(snap);
        } catch (err) {
          log.warn(`hook ${hook.id} threw:`, err);
        }
      }
    };

    const onLoadEnd = (): void => {
      this.removeEventListener('loadend', onLoadEnd);
      try {
        notify();
      } catch (err) {
        log.warn('xhr notify failed:', err);
      }
    };
    this.addEventListener('loadend', onLoadEnd);
    return originalSend.call(this, body);
  };

  installed = true;
  runtime.setStatus('xhr-interceptor', 'ready');
  log.info('XHR interceptor installed');
}

/** 注册 XHR 响应观察 hook。返回反订阅函数。 */
export function onXhrComplete(
  match: (s: XHRSnapshot) => boolean,
  fn: XHRResponseHook,
): () => void {
  const id = nextHookId++;
  hooks.push({ id, match, fn });
  return () => {
    const idx = hooks.findIndex((h) => h.id === id);
    if (idx >= 0) hooks.splice(idx, 1);
  };
}
