/**
 * 错误隔离包装器：让单个模块崩溃不会传染到其他模块。
 *
 * @module src-injected/utils/safe-call
 * @see docs/ARCHITECTURE.md §4.2 优雅失败策略
 *
 * 合规约束：
 *   - 不修改函数返回值；不静默吞掉非 Error 抛出物
 *   - 错误转交给 logger.error（受合规策略约束，不会上传敏感正文）
 *
 * 不变量：
 *   - safeCall(fn) 永远不抛
 *   - 同步函数返回 fallback；异步函数返回 Promise<fallback>
 */

import { createLogger } from './logger';

const log = createLogger('utils:safe-call');

/** 把 unknown 错误统一收敛为 Error 对象。 */
export function asError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(String(err));
  }
}

/**
 * 同步包装：执行 fn；若抛错则记录并返回 fallback。
 *
 * @param source 业务来源标签，例如 'enhancer:mermaid:init'
 * @param fn    待保护函数
 * @param fallback 抛错时返回的回退值
 */
export function safeCall<T>(source: string, fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (err) {
    log.error(`[${source}] sync failure:`, asError(err));
    return fallback;
  }
}

/**
 * 异步包装：行为等同 safeCall，但等待 Promise。
 * 若 fn 抛错或 Promise reject，都返回 fallback。
 */
export async function safeCallAsync<T>(
  source: string,
  fn: () => T | Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    log.error(`[${source}] async failure:`, asError(err));
    return fallback;
  }
}

/**
 * 把任意函数包装为「永不抛错」的版本，签名保持透明。
 *
 * 适合给第三方库（如 Mermaid 内部回调）注册时使用，
 * 避免它们的内部异常向上冒泡进 chat.deepseek.com 的栈。
 */
export function wrapSafe<TArgs extends unknown[], TRet>(
  source: string,
  fn: (...args: TArgs) => TRet,
  fallback: TRet,
): (...args: TArgs) => TRet {
  return function safeWrapped(...args: TArgs): TRet {
    try {
      return fn(...args);
    } catch (err) {
      log.error(`[${source}] callback failure:`, asError(err));
      return fallback;
    }
  };
}
