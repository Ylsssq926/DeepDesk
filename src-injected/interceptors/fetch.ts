/**
 * fetch monkey-patch 骨架：仅提供「响应钩子注册机制」，不修改请求体。
 *
 * @module src-injected/interceptors/fetch
 * @see docs/ARCHITECTURE.md §4.3 SSE 流拦截与对话存档
 *
 * 合规约束（极其重要）：
 *   - **不**修改 request：headers / body / method / url 全部透传
 *   - **不**对 response 做任何修改后再返回给页面
 *   - **不**绕过 PoW / 限流 / 反滥用机制
 *   - 仅在响应完成后，按用户允许的范围对「自身请求结果」做克隆并交给 hook 处理
 *
 * 不变量：
 *   - 原始 fetch 引用在模块加载时立即捕获并保存（防止页面后续 monkey-patch 影响我们）
 *   - 单次请求最多被 hook 处理一次（按 hook 自身判定）
 *   - hook 抛错被 safeCall 隔离，绝不影响 fetch 调用方拿到 response
 *   - install() 幂等，重复调用直接返回
 */

import { createLogger } from '../utils/logger';
import { isEnabled, registerFlag } from '../utils/feature-flag';
import { runtime } from '../core/runtime';

const log = createLogger('interceptor:fetch');

/** 响应 hook 注册项。 */
interface ResponseHook {
  id: number;
  /** 命中条件：返回 true 才会触发 handler。 */
  match: (req: NormalizedRequest) => boolean;
  /** 处理器：拿到 cloned response（页面侧已经在消费原 response）。 */
  handler: (req: NormalizedRequest, clonedResponse: Response) => void | Promise<void>;
  /** 一次性 hook（极少需要）。 */
  once?: boolean;
}

/** 给 hook 提供的请求快照。 */
export interface NormalizedRequest {
  url: string;
  method: string;
  /** 原始 RequestInit（如有）。我们不修改它，但 hook 可能需要读 body 用于关联。 */
  init: RequestInit | undefined;
  /** 触发时刻（ms）。 */
  startedAt: number;
}

const hooks: ResponseHook[] = [];
let nextHookId = 1;
let installed = false;

/** Feature flag 名称（默认启用：作为日志层是基础设施）。 */
const FLAG = 'fetch-interceptor';
registerFlag(FLAG, true);

/**
 * 安装 fetch monkey-patch。幂等。
 *
 * 必须在页面 JS 执行前调用——这一前提由 Tauri `initialization_script` 保证。
 */
export function installFetchInterceptor(): void {
  if (installed) return;
  if (!isEnabled(FLAG)) {
    log.info('fetch interceptor disabled by flag');
    runtime.setStatus('fetch-interceptor', 'disabled');
    return;
  }
  if (typeof window.fetch !== 'function') {
    log.warn('window.fetch is not a function; skip patching');
    runtime.setStatus('fetch-interceptor', 'failed');
    return;
  }

  const originalFetch = window.fetch.bind(window);
  installed = true;

  window.fetch = async function patchedFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const req = normalizeRequest(input, init);
    // 网络错误等直接抛回给页面，不打扰（重试由专门的 enhancer 实现）
    const response = await originalFetch(input, init);

    // 仅在有 hook 命中时才克隆，避免对 chat.deepseek.com 的所有请求都做无意义 clone
    const matched = pickMatchingHooks(req);
    if (matched.length === 0) return response;

    let cloned: Response | null = null;
    try {
      cloned = response.clone();
    } catch (err) {
      log.warn('response.clone() failed; skip hooks for this request:', err);
      return response;
    }

    // 异步处理，永不阻塞调用方
    queueMicrotask(() => {
      for (const hook of matched) {
        try {
          const ret = hook.handler(req, cloned!.clone());
          if (ret && typeof (ret as Promise<void>).then === 'function') {
            (ret as Promise<void>).catch((err) =>
              log.warn(`hook ${hook.id} async failure:`, err),
            );
          }
        } catch (err) {
          log.warn(`hook ${hook.id} sync failure:`, err);
        }
        if (hook.once) removeHook(hook.id);
      }
    });

    return response;
  };

  runtime.setStatus('fetch-interceptor', 'ready');
  log.info('fetch interceptor installed');
}

/**
 * 注册响应 hook。返回反订阅函数。
 */
export function onResponse(
  match: ResponseHook['match'],
  handler: ResponseHook['handler'],
  options?: { once?: boolean },
): () => void {
  const hook: ResponseHook = {
    id: nextHookId++,
    match,
    handler,
    once: options?.once,
  };
  hooks.push(hook);
  return () => removeHook(hook.id);
}

function removeHook(id: number): void {
  const idx = hooks.findIndex((h) => h.id === id);
  if (idx >= 0) hooks.splice(idx, 1);
}

function pickMatchingHooks(req: NormalizedRequest): ResponseHook[] {
  const matched: ResponseHook[] = [];
  for (const hook of hooks) {
    try {
      if (hook.match(req)) matched.push(hook);
    } catch (err) {
      log.warn(`hook ${hook.id} match() threw:`, err);
    }
  }
  return matched;
}

function normalizeRequest(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): NormalizedRequest {
  let url: string;
  let method: string;
  if (typeof input === 'string') {
    url = input;
    method = init?.method ?? 'GET';
  } else if (input instanceof URL) {
    url = input.href;
    method = init?.method ?? 'GET';
  } else {
    url = input.url;
    method = init?.method ?? input.method ?? 'GET';
  }
  return {
    url,
    method: method.toUpperCase(),
    init,
    startedAt: Date.now(),
  };
}
