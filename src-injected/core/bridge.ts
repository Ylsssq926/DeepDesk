/**
 * 与 Tauri 主进程通信的桥接层（事件 emit/listen + command invoke）。
 *
 * @module src-injected/core/bridge
 * @see docs/ARCHITECTURE.md §3.3 注入脚本 / §5 IPC 协议
 *
 * 合规约束：
 *   - 仅作为通道；上层调用方须自行确保 payload 不携带敏感对话内容
 *   - 在普通浏览器（无 Tauri 环境）下自动降级为 console.log，不抛错
 *
 * 不变量：
 *   - bridge.emit / bridge.listen / bridge.invoke 永不抛
 *   - waitForReady 最多等待 5s，超时后进入 degraded 模式
 *   - listen 返回的反订阅函数是幂等的
 */

import type {
  FeatureFlagSetPayload,
  InjectEmitEvent,
  InjectListenEvent,
  InjectModuleErrorPayload,
  InjectReadyPayload,
  InjectRelevantSettings,
  InjectSelectorMissPayload,
  TauriCommand,
} from '../types/messages';
import type { ErrorRecord } from '../types/feature';
import { createLogger } from '../utils/logger';
import { asError } from '../utils/safe-call';

const log = createLogger('core:bridge');

/** Tauri 注入的全局对象（最小子集）。 */
interface TauriGlobal {
  event: {
    emit(event: string, payload?: unknown): Promise<void>;
    listen<T>(
      event: string,
      handler: (e: { payload: T }) => void,
    ): Promise<() => void>;
  };
  /** v2 命令调用入口（对应 @tauri-apps/api/core 的 invoke）。 */
  core?: {
    invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  };
  /** v1 兼容路径（少数构建仍暴露 window.__TAURI__.invoke）。 */
  invoke?<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

/** 类型化的事件 payload 表。 */
interface EmitPayloads {
  'inject:ready': InjectReadyPayload;
  'inject:module-error': InjectModuleErrorPayload;
  'inject:version-mismatch': { missing: string[]; href: string };
  'inject:selector-miss': InjectSelectorMissPayload;
  // webview://message-completed 与 message:captured 当前阶段未启用真实采集（仅占位）
  'webview://message-completed': Record<string, unknown>;
  'message:captured': Record<string, unknown>;
  'retry:attempt': { attempt: number; maxAttempts: number; delay: number };
  'mermaid:rendered': { id: string; success: boolean; error?: string };
  'slash:menu-opened': Record<string, never>;
  'draft:saved': { conversationId: string | null; length: number };
  'message:retracted': { messageId: string; conversationId: string };
}

interface ListenPayloads {
  'settings:updated': InjectRelevantSettings;
  'inject:updated': { newVersion: string };
  'feature-flag:set': FeatureFlagSetPayload;
  'conversation:updated': string;
  'screenshot:captured': string;
  'ocr:completed': { text: string; image_path: string; lang: string };
}

/** Tauri 是否就绪。 */
function getTauri(): TauriGlobal | null {
  const w = window as unknown as { __TAURI__?: TauriGlobal };
  return w.__TAURI__ ?? null;
}

class Bridge {
  private ready = false;
  /** 等待 __TAURI__ 注入的最大时长（ms）。 */
  private readonly readyTimeout = 5000;
  /** 探测间隔（ms）。 */
  private readonly probeInterval = 50;
  private readyPromise: Promise<boolean> | null = null;

  /** 启动期就绪检测。返回 true 表示 Tauri 可用。 */
  waitForReady(): Promise<boolean> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = new Promise<boolean>((resolve) => {
      const start = Date.now();
      const tick = (): void => {
        if (getTauri()) {
          this.ready = true;
          log.info('Tauri bridge ready');
          resolve(true);
          return;
        }
        if (Date.now() - start >= this.readyTimeout) {
          log.warn('Tauri bridge timeout, running in degraded mode');
          resolve(false);
          return;
        }
        setTimeout(tick, this.probeInterval);
      };
      tick();
    });
    return this.readyPromise;
  }

  /** 当前是否可用（同步查询）。 */
  isReady(): boolean {
    return this.ready;
  }

  /**
   * 发送事件到 Rust。降级模式下仅 console.debug。
   */
  async emit<E extends keyof EmitPayloads>(
    event: E,
    payload: EmitPayloads[E],
  ): Promise<void>;
  async emit(event: InjectEmitEvent | string, payload?: unknown): Promise<void>;
  async emit(event: string, payload?: unknown): Promise<void> {
    const tauri = getTauri();
    if (!tauri) {
      log.debug('emit (degraded):', event, payload);
      return;
    }
    try {
      await tauri.event.emit(event, payload);
    } catch (err) {
      log.error(`emit(${event}) failed:`, asError(err));
    }
  }

  /**
   * 监听 Rust 事件。降级模式下返回 noop unlisten。
   */
  async listen<E extends keyof ListenPayloads>(
    event: E,
    handler: (payload: ListenPayloads[E]) => void,
  ): Promise<() => void>;
  async listen(
    event: InjectListenEvent | string,
    handler: (payload: unknown) => void,
  ): Promise<() => void>;
  async listen(
    event: string,
    handler: (payload: unknown) => void,
  ): Promise<() => void> {
    const tauri = getTauri();
    if (!tauri) {
      log.debug('listen (degraded):', event);
      return () => {
        /* noop */
      };
    }
    try {
      const unlisten = await tauri.event.listen<unknown>(event, (e) => {
        try {
          handler(e.payload);
        } catch (err) {
          log.error(`listener for ${event} threw:`, asError(err));
        }
      });
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        try {
          unlisten();
        } catch (err) {
          log.warn(`unlisten ${event} failed:`, asError(err));
        }
      };
    } catch (err) {
      log.error(`listen(${event}) failed:`, asError(err));
      return () => {
        /* noop */
      };
    }
  }

  /**
   * 调用 Tauri command。降级模式下抛出可识别的错误供调用方判断。
   */
  async invoke<T>(command: TauriCommand | string, args?: Record<string, unknown>): Promise<T> {
    const tauri = getTauri();
    if (!tauri) {
      throw new Error(`bridge.invoke(${command}) called in degraded mode`);
    }
    try {
      const fn = tauri.core?.invoke ?? tauri.invoke;
      if (!fn) throw new Error('Tauri invoke API not available');
      const thisArg = (tauri.core ?? tauri) as unknown;
      return (await fn.call(thisArg, command, args)) as T;
    } catch (err) {
      log.error(`invoke(${command}) failed:`, asError(err));
      throw err;
    }
  }

  /**
   * 把一条 ErrorRecord 转换为 inject:module-error 事件向主进程上报。
   * 由 runtime 在 setHostReporter 时挂上。
   */
  buildErrorReporter(): (rec: ErrorRecord) => void {
    return (rec) => {
      void this.emit('inject:module-error', {
        module: rec.source,
        error: rec.message,
        stack: rec.stack,
      });
    };
  }
}

/** 单例。 */
export const bridge = new Bridge();
