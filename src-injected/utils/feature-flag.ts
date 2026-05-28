/**
 * 注入脚本侧的功能开关（feature flag）store。
 *
 * @module src-injected/utils/feature-flag
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 *
 * 合规约束：
 *   - flag 仅控制「是否启用某个增强功能」，不携带任何用户业务数据
 *   - 后续与 Tauri 后端 settings 同步时，仅同步 flag 名称与布尔值
 *
 * 不变量：
 *   - 默认值由各 enhancer 自身的 defaultEnabled 决定
 *   - setFlag 不会自动持久化；持久化由主进程完成（注入脚本只是消费者）
 *   - 监听器抛错由 safeCall 兜底，不影响其他订阅者
 */

import { createLogger } from './logger';
import { wrapSafe } from './safe-call';

const log = createLogger('utils:feature-flag');

/** flag 变更回调签名。 */
export type FlagListener = (name: string, enabled: boolean) => void;

const flags = new Map<string, boolean>();
const listeners = new Set<FlagListener>();

/**
 * 注册一组初始 flag。重复注册会被忽略（避免 enhancer 在热更新时互相覆盖）。
 */
export function registerFlag(name: string, defaultEnabled: boolean): void {
  if (!flags.has(name)) flags.set(name, defaultEnabled);
}

/** 读取 flag。未注册的 flag 默认 false（fail-closed）。 */
export function isEnabled(name: string): boolean {
  return flags.get(name) ?? false;
}

/** 设置 flag 并广播给监听者。 */
export function setFlag(name: string, enabled: boolean): void {
  const prev = flags.get(name);
  if (prev === enabled) return;
  flags.set(name, enabled);
  log.info(`flag changed: ${name} = ${enabled}`);
  for (const fn of listeners) {
    wrapSafe('utils:feature-flag:listener', fn, undefined as void)(name, enabled);
  }
}

/** 批量同步（来自后端 settings:updated）。仅修改已注册的 flag。 */
export function syncFlags(payload: Record<string, boolean> | undefined): void {
  if (!payload) return;
  for (const [name, enabled] of Object.entries(payload)) {
    if (!flags.has(name)) continue;
    setFlag(name, enabled);
  }
}

/** 订阅 flag 变更。返回反订阅函数。 */
export function onFlagChange(fn: FlagListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 调试 / 上报用：读取当前所有 flag 快照。 */
export function snapshot(): Readonly<Record<string, boolean>> {
  return Object.fromEntries(flags.entries());
}
