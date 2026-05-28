/**
 * DeepDesk 注入脚本入口。
 *
 * @module src-injected/index
 * @see docs/ARCHITECTURE.md §3.3 / §4.2
 *
 * 运行环境：
 *   - 通过 Tauri `initialization_script` 注入到 chat.deepseek.com WebView，
 *     **先于页面 JS 执行**（这是 fetch monkey-patch 必须的前置条件）
 *
 * 合规约束（PRD §1.6 合规底线，绝对不可触碰）：
 *   - 不抓取 chat.deepseek.com DOM 业务数据
 *   - 不修改 DeepSeek 自身请求体 / headers / token / PoW
 *   - 不绕过 PoW / 限流 / 反滥用机制
 *   - 不模拟登录或代理协议
 *   - 仅缓存自身请求结果到本地用于导出与搜索
 *   - 仅在用户主动触发时才采集屏幕等敏感数据
 *
 * 不变量：
 *   - 防重复加载：同一 window 上仅初始化一次
 *   - 任何子模块抛错都不会阻止页面正常运行（safeCall 全程兜底）
 *   - 启动末尾向 Tauri 主进程 emit `inject:ready`
 *   - 暴露 window.__DEEPSEEK_DESKTOP__ 命名空间，仅作为诊断只读快照
 */

import { runtime } from './core/runtime';
import { bridge } from './core/bridge';
import { startObserver } from './core/observer';

import { installFetchInterceptor } from './interceptors/fetch';
import { installXHRInterceptor } from './interceptors/xhr';

import { immersiveEnhancer } from './enhancers/immersive';
import { mermaidEnhancer } from './enhancers/mermaid';
import { slashMenuEnhancer } from './enhancers/slash-menu';
import { thinkingEnhancer } from './enhancers/thinking';
import { autoRetryEnhancer } from './enhancers/auto-retry';

import type { Enhancer } from './types/feature';
import type { InjectReadyPayload, InjectRelevantSettings } from './types/messages';
import { createLogger } from './utils/logger';
import { safeCall, safeCallAsync } from './utils/safe-call';
import { isEnabled, registerFlag, setFlag, snapshot, syncFlags } from './utils/feature-flag';

declare global {
  interface Window {
    __DEEPSEEK_DESKTOP__?: {
      version: string;
      initialized: boolean;
      /** runtime 状态浅快照，便于 DevTools 诊断。 */
      readonly snapshot: () => unknown;
      /** feature flag 浅快照。 */
      readonly flags: () => Readonly<Record<string, boolean>>;
    };
  }
}

const log = createLogger('inject:bootstrap');

/** 当前注入阶段所有可用的 enhancer。 */
const ENHANCERS: readonly Enhancer[] = [
  immersiveEnhancer,
  mermaidEnhancer,
  slashMenuEnhancer,
  thinkingEnhancer,
  autoRetryEnhancer,
];

/** 启动入口：自调用，但所有副作用通过 try/catch 隔离。 */
(function bootstrap(): void {
  // 1. 防重复加载
  if (window.__DEEPSEEK_DESKTOP__) {
    // 直接 console，避免 logger 在重复加载时双倍上报
    // eslint-disable-next-line no-console
    console.warn('[DeepDesk:inject:bootstrap] script already loaded; skip');
    return;
  }

  // 2. 暴露最小诊断面板
  window.__DEEPSEEK_DESKTOP__ = {
    version: runtime.version,
    initialized: false,
    snapshot: () => runtime.snapshot(),
    flags: () => snapshot(),
  };

  // 3. 立即安装 fetch / XHR 拦截器（必须早于页面 JS）
  safeCall('inject:bootstrap:fetch', () => installFetchInterceptor(), undefined);
  safeCall('inject:bootstrap:xhr', () => installXHRInterceptor(), undefined);

  // 4. 注册 enhancer 与 feature flag（不立即启动）
  for (const enh of ENHANCERS) {
    registerFlag(enh.name, enh.defaultEnabled);
    runtime.register(enh.name, () => enh.init());
  }

  // 5. 异步主流程：等待 Tauri 桥就绪 → 启动 observer → 启动 enhancer → emit ready
  void safeCallAsync(
    'inject:bootstrap:main',
    async () => {
      const tauriReady = await bridge.waitForReady();
      if (tauriReady) {
        // 把 logger 的 error 流转给主进程
        runtime.setHostReporter(bridge.buildErrorReporter());
        await wireSettingsSync();
      }

      scheduleObserverStart();
      scheduleEnhancers();

      // 末尾：emit inject:ready
      const payload: InjectReadyPayload = {
        version: runtime.version,
        startedAt: runtime.startedAt,
        enhancers: ENHANCERS.filter((e) => isEnabled(e.name)).map((e) => e.name),
        href: location.href,
        userAgent: navigator.userAgent,
      };
      void bridge.emit('inject:ready', payload);

      window.__DEEPSEEK_DESKTOP__!.initialized = true;
      log.info(`DeepDesk inject ready (v${runtime.version}, ${tauriReady ? 'tauri' : 'degraded'})`);
    },
    undefined,
  );
})();

/** 监听 Rust 端 settings:updated / feature-flag:set，把开关同步进来。 */
async function wireSettingsSync(): Promise<void> {
  await bridge.listen('settings:updated', (payload) => {
    const s = payload as InjectRelevantSettings;
    syncFlags(s.inject_feature_flags);
  });
  await bridge.listen('feature-flag:set', (payload) => {
    setFlag(payload.name, payload.enabled);
  });
}

/** 在合适时机启动中央 observer（必须 body 就绪）。 */
function scheduleObserverStart(): void {
  if (document.body) {
    startObserver();
    return;
  }
  document.addEventListener('DOMContentLoaded', () => startObserver(), { once: true });
}

/** 按各 enhancer 的 when 时机调度 init。 */
function scheduleEnhancers(): void {
  for (const enh of ENHANCERS) {
    const launch = (): void => {
      if (!isEnabled(enh.name)) {
        runtime.setStatus(enh.name, 'disabled');
        return;
      }
      // 直接 try/catch 区分成功 / 失败：fallback 值无法可靠判断 enhancer 是否抛错
      void (async (): Promise<void> => {
        try {
          await enh.init();
          runtime.setStatus(enh.name, 'ready');
        } catch (err) {
          log.error(`enhancer ${enh.name} init failed:`, err);
          runtime.setStatus(enh.name, 'failed');
        }
      })();
    };

    switch (enh.when) {
      case 'immediate':
        launch();
        break;
      case 'dom-ready':
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', launch, { once: true });
        } else {
          launch();
        }
        break;
      case 'load':
        if (document.readyState === 'complete') {
          launch();
        } else {
          window.addEventListener('load', launch, { once: true });
        }
        break;
      case 'idle': {
        const idle = (window as unknown as {
          requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        }).requestIdleCallback;
        if (typeof idle === 'function') idle(launch, { timeout: 2000 });
        else setTimeout(launch, 0);
        break;
      }
      default:
        launch();
    }
  }
}

export {};
