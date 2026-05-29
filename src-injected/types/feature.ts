/**
 * 注入脚本通用功能模块（Enhancer / Interceptor）的类型契约。
 *
 * @module src-injected/types/feature
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 *
 * 合规约束：
 *   - 仅定义接口形状，不涉及任何业务数据采集
 *   - 与 chat.deepseek.com DOM 结构完全解耦
 *
 * 不变量：
 *   - 每个 enhancer 的生命周期是幂等的：init() 与 dispose() 可被重复调用而不抛错
 *   - enhancer 之间不互相依赖，崩溃彼此隔离（由 utils/safe-call 与 core/runtime 保证）
 */

/** Enhancer / Interceptor 的运行状态机。 */
export type EnhancerStatus =
  | 'pending'
  | 'ready'
  | 'failed'
  | 'disabled';

/** Enhancer 名称——也用作 feature flag 的 key 与日志 prefix。 */
export type EnhancerName =
  | 'immersive'
  | 'mermaid'
  | 'slash-menu'
  | 'thinking'
  | 'auto-retry'
  | 'debug-indicator'
  | 'probe'
  | 'fetch-interceptor'
  | 'xhr-interceptor';

/**
 * 单个注入功能模块的统一接口。
 *
 * 由各 enhancer 文件实现并向 runtime 注册。
 */
export interface Enhancer {
  /** 唯一名称，对应 feature flag key。 */
  readonly name: EnhancerName;
  /**
   * 启动时机。
   * - 'immediate'：随注入脚本同步启动（必须用于 monkey-patch fetch / XHR）
   * - 'dom-ready'：等待 DOMContentLoaded
   * - 'load'：等待 window.load
   * - 'idle'：等待 requestIdleCallback（fallback：setTimeout 0）
   */
  readonly when: 'immediate' | 'dom-ready' | 'load' | 'idle';
  /**
   * 是否默认启用。某些高风险增强（如 auto-retry）可以默认 false，
   * 由用户在设置页主动开启。
   */
  readonly defaultEnabled: boolean;
  /**
   * 初始化逻辑。**不应抛出**——内部错误请走 runtime.report(err)。
   * 即便不慎抛出，调用方（index.ts）也会用 safeCall 包裹隔离。
   */
  init(): void | Promise<void>;
  /**
   * 释放逻辑（解绑 listener、断开 observer、移除 shadow host 等）。
   * 远程热更新或测试场景会调用。
   */
  dispose?(): void | Promise<void>;
}

/** runtime 内部记录的错误条目。 */
export interface ErrorRecord {
  /** 来源模块名，如 'enhancer:mermaid' / 'core:bridge'。 */
  source: string;
  message: string;
  /** 堆栈（如有）。 */
  stack?: string;
  /** 上报时间（ms）。 */
  at: number;
}
