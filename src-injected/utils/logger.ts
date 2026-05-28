/**
 * 注入脚本专用日志工具。
 *
 * @module src-injected/utils/logger
 * @see docs/ARCHITECTURE.md §4.2 优雅失败策略 / §10.1 容错降级
 *
 * 合规约束：
 *   - 严禁通过日志通道上传任何用户对话内容、prompt 内容、剪贴板内容、
 *     截图 OCR 文本（参见 docs/PRD.md §1.6 合规底线）
 *   - 默认仅 error 级别会经 bridge 上报到 Tauri 主进程；info / warn / debug 仅落本地 console
 *   - 上报的 error 会被截断到固定长度，避免泄露大段文本
 *
 * 不变量：
 *   - logger 在 bridge 尚未就绪时不可调用 emit；自动降级为 console
 *   - prefix 格式固定为 `[DeepDesk:<module>]`，便于 DevTools 过滤
 */

import type { ErrorRecord } from '../types/feature';

/** 单条错误消息向后端上报时的最大长度（字符）。 */
const MAX_REPORT_MESSAGE_LEN = 1024;

/** 日志级别。 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 日志上传策略，可被 feature flag 调整。 */
export interface LoggerPolicy {
  /** 是否把 error 级别上报到 Tauri 主进程（默认 true）。 */
  reportErrorsToHost: boolean;
  /** 是否把 warn 级别也上报（默认 false）。 */
  reportWarnsToHost: boolean;
  /** 单条上报最大长度。 */
  maxReportLen: number;
}

const DEFAULT_POLICY: LoggerPolicy = {
  reportErrorsToHost: true,
  reportWarnsToHost: false,
  maxReportLen: MAX_REPORT_MESSAGE_LEN,
};

/** 上报回调签名，由 runtime 装配；初始值为 noop。 */
type ReportFn = (record: ErrorRecord) => void;
let reporter: ReportFn = () => {
  /* noop until runtime wires it up */
};

/** 由 core/runtime 在启动期注入：把 logger 输出的 error 转交给 runtime.report。 */
export function setLogReporter(fn: ReportFn): void {
  reporter = fn;
}

let policy: LoggerPolicy = { ...DEFAULT_POLICY };

/** 修改全局日志策略（仅供 bootstrap 与设置同步使用）。 */
export function setLoggerPolicy(next: Partial<LoggerPolicy>): void {
  policy = { ...policy, ...next };
}

function clip(message: string): string {
  if (message.length <= policy.maxReportLen) return message;
  return `${message.slice(0, policy.maxReportLen)}…[truncated]`;
}

function format(module: string, level: LogLevel, parts: unknown[]): unknown[] {
  return [`[DeepDesk:${module}]`, `(${level})`, ...parts];
}

/**
 * 创建一个绑定模块名的 logger。
 *
 * 用法：`const log = createLogger('core:bridge'); log.info('ready')`
 */
export function createLogger(module: string): {
  debug: (...parts: unknown[]) => void;
  info: (...parts: unknown[]) => void;
  warn: (...parts: unknown[]) => void;
  error: (...parts: unknown[]) => void;
} {
  return {
    debug(...parts) {
      // debug 只在控制台显示，永不上报
      // eslint-disable-next-line no-console
      console.debug(...format(module, 'debug', parts));
    },
    info(...parts) {
      // eslint-disable-next-line no-console
      console.info(...format(module, 'info', parts));
    },
    warn(...parts) {
      // eslint-disable-next-line no-console
      console.warn(...format(module, 'warn', parts));
      if (policy.reportWarnsToHost) {
        reporter({
          source: module,
          message: clip(parts.map(safeStringify).join(' ')),
          at: Date.now(),
        });
      }
    },
    error(...parts) {
      // eslint-disable-next-line no-console
      console.error(...format(module, 'error', parts));
      if (!policy.reportErrorsToHost) return;
      const err = parts.find((p): p is Error => p instanceof Error);
      reporter({
        source: module,
        message: clip(parts.map(safeStringify).join(' ')),
        stack: err?.stack,
        at: Date.now(),
      });
    },
  };
}

/**
 * 安全地把任意值转字符串（避免循环引用导致 JSON.stringify 抛错）。
 * 同时屏蔽函数体（防止泄漏代码上下文）。
 */
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === 'function') return `[Function:${value.name || 'anonymous'}]`;
  try {
    const seen = new WeakSet<object>();
    const replacer = (_key: string, val: unknown): unknown => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val as object)) return '[Circular]';
        seen.add(val as object);
      }
      return val;
    };
    return JSON.stringify(value, replacer as (key: string, value: unknown) => unknown);
  } catch {
    return Object.prototype.toString.call(value);
  }
}
