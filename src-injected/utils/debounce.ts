/**
 * 防抖 / 节流 / 一次性触发的小工具集合，供 observer 与 enhancer 使用。
 *
 * @module src-injected/utils/debounce
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 *
 * 合规约束：
 *   - 纯函数式工具，不接触任何用户业务数据
 *
 * 不变量：
 *   - 包装后的函数保持参数透传
 *   - cancel() 之后不再触发未到期的回调
 */

/** 取消句柄。 */
export interface CancelHandle {
  cancel(): void;
}

/**
 * 防抖：连续触发时只在最后一次后 wait ms 执行一次。
 *
 * @param wait 单位 ms
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): ((...args: TArgs) => void) & CancelHandle {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;

  const wrapped = (...args: TArgs): void => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) fn(...lastArgs);
      lastArgs = null;
    }, wait);
  };

  (wrapped as ((...args: TArgs) => void) & CancelHandle).cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
  };

  return wrapped as ((...args: TArgs) => void) & CancelHandle;
}

/**
 * 节流：固定时间窗口内只允许触发一次（leading + trailing）。
 *
 * @param wait 单位 ms
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): ((...args: TArgs) => void) & CancelHandle {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: TArgs | null = null;

  const invoke = (args: TArgs): void => {
    lastCall = Date.now();
    fn(...args);
  };

  const wrapped = (...args: TArgs): void => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke(args);
    } else {
      pendingArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          if (pendingArgs) {
            const a = pendingArgs;
            pendingArgs = null;
            invoke(a);
          }
        }, remaining);
      }
    }
  };

  (wrapped as ((...args: TArgs) => void) & CancelHandle).cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pendingArgs = null;
    lastCall = 0;
  };

  return wrapped as ((...args: TArgs) => void) & CancelHandle;
}

/** 包装为「最多执行一次」的函数。后续调用直接返回首次结果。 */
export function once<TArgs extends unknown[], TRet>(
  fn: (...args: TArgs) => TRet,
): (...args: TArgs) => TRet {
  let called = false;
  let cached: TRet;
  return (...args: TArgs): TRet => {
    if (!called) {
      called = true;
      cached = fn(...args);
    }
    return cached;
  };
}

/**
 * 利用 requestIdleCallback（缺失时降级为 setTimeout）。
 * 返回一个可被 cancel 的 handle。
 */
export function whenIdle(fn: () => void, timeoutMs = 1000): CancelHandle {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof w.requestIdleCallback === 'function') {
    const id = w.requestIdleCallback(fn, { timeout: timeoutMs });
    return {
      cancel: () => w.cancelIdleCallback?.(id),
    };
  }
  const t = setTimeout(fn, 0);
  return { cancel: () => clearTimeout(t) };
}
