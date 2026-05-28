/**
 * 注入脚本全局运行时（lifecycle、错误聚合、enhancer 状态登记）。
 *
 * @module src-injected/core/runtime
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构
 * @see docs/ARCHITECTURE.md §10.1 chat.deepseek.com 改版导致注入失效
 *
 * 合规约束：
 *   - 错误堆栈 / 日志通过 logger 走 reporter 上报，不携带用户对话 / prompt 文本
 *   - 不暴露任何 API 用于读取 chat.deepseek.com 业务 DOM
 *
 * 不变量：
 *   - 单例模式：同一页面内 Runtime 只存在一个实例（防重复加载由 index.ts 兜底）
 *   - register / setStatus 是幂等的：重复以同名注册会更新状态而非新增
 *   - report() 永不抛错；上报通道挂掉时仅落 console
 */

import type { EnhancerName, EnhancerStatus, ErrorRecord } from '../types/feature';
import { createLogger, setLogReporter } from '../utils/logger';

const log = createLogger('core:runtime');

/** 单条 enhancer 注册记录。 */
interface EnhancerRecord {
  name: string;
  status: EnhancerStatus;
  /** init 的入口函数引用，用于热更新或诊断（不会被外部调用）。 */
  init?: () => void | Promise<void>;
}

class RuntimeImpl {
  /** 注入脚本版本（由 esbuild define 注入，缺省占位）。 */
  readonly version: string;
  /** 启动时间戳（ms）。 */
  readonly startedAt: number;
  /** enhancer 状态表（key = name）。 */
  readonly enhancerStatuses = new Map<string, EnhancerStatus>();
  /** 内部错误日志（最多保留 N 条，避免内存膨胀）。 */
  readonly errors: ErrorRecord[] = [];

  /** 错误环形缓冲容量。 */
  private readonly maxErrors = 200;

  /** 已注册的 enhancer 入口表（仅供诊断）。 */
  private readonly enhancers = new Map<string, EnhancerRecord>();

  /** 上报通道，由 bridge 装配。在尚未就绪时仅本地保留。 */
  private hostReporter: ((rec: ErrorRecord) => void) | null = null;

  constructor() {
    // 由 esbuild 在 build 时通过 define 注入（如未配置 define，typeof 安全返回 'undefined'）
    this.version =
      typeof __BUILD_VERSION__ === 'string' && __BUILD_VERSION__
        ? __BUILD_VERSION__
        : '0.0.0-dev';
    this.startedAt = Date.now();

    // logger 的 error 通过此处的 report 集中聚合
    setLogReporter((rec) => this.report(rec));
  }

  /**
   * 注册或更新某个 enhancer / interceptor 的状态。
   *
   * @param name 模块名
   * @param init 初始化函数（仅用于诊断保存，不会被自动调用）
   */
  register(name: EnhancerName | string, init?: () => void | Promise<void>): void {
    if (!this.enhancers.has(name)) {
      this.enhancers.set(name, { name, status: 'pending', init });
      this.enhancerStatuses.set(name, 'pending');
    } else if (init) {
      const existed = this.enhancers.get(name);
      if (existed) existed.init = init;
    }
  }

  /** 切换 enhancer 状态。未注册者会自动登记为 pending → next。 */
  setStatus(name: EnhancerName | string, status: EnhancerStatus): void {
    if (!this.enhancers.has(name)) this.register(name);
    this.enhancers.get(name)!.status = status;
    this.enhancerStatuses.set(name, status);
    log.debug(`enhancer status: ${name} → ${status}`);
  }

  /** 集中错误处理。落本地 + 转交主进程 reporter（如已就绪）。 */
  report(record: ErrorRecord): void {
    try {
      this.errors.push(record);
      if (this.errors.length > this.maxErrors) {
        this.errors.splice(0, this.errors.length - this.maxErrors);
      }
      this.hostReporter?.(record);
    } catch {
      // 上报通道本身不应再让我们抛错
    }
  }

  /** 由 bridge 在准备就绪后注入到 runtime 的 reporter。 */
  setHostReporter(fn: (rec: ErrorRecord) => void): void {
    this.hostReporter = fn;
    // 把启动期已积压的错误一次性 flush 出去
    for (const rec of this.errors) {
      try {
        fn(rec);
      } catch {
        /* swallow */
      }
    }
  }

  /** 浅快照（暴露给 window.__DEEPSEEK_DESKTOP__ 用于 DevTools 调试）。 */
  snapshot(): {
    version: string;
    startedAt: number;
    enhancerStatuses: Record<string, EnhancerStatus>;
    errorCount: number;
  } {
    return {
      version: this.version,
      startedAt: this.startedAt,
      enhancerStatuses: Object.fromEntries(this.enhancerStatuses.entries()),
      errorCount: this.errors.length,
    };
  }
}

/** 单例。 */
export const runtime = new RuntimeImpl();

/** 类型导出，便于 enhancer 注解参数。 */
export type Runtime = RuntimeImpl;

// 由 esbuild 注入；这里给 TS 类型补丁。
// 注：`declare global { var }` 是 TypeScript 声明全局变量的标准写法，
// no-var 规则不适用于声明空间，因此无需 eslint-disable。
declare global {
  var __BUILD_VERSION__: string;
}
