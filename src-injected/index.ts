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
import { debugIndicatorEnhancer } from './enhancers/debug-indicator';

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
  debugIndicatorEnhancer,
];

/** 仅在 chat.deepseek.com 上挂载会触碰 DOM 的逻辑（如 enhancer 与 observer）。 */
function isTargetHost(): boolean {
  try {
    return window.location.hostname === 'chat.deepseek.com';
  } catch {
    return false;
  }
}

/**
 * 在 console 打印一条带样式的激活 banner，作为给开发者 / 用户的可视确认信号。
 *
 * 设计：
 *   - 三段式：彩色品牌徽章 + 深色版本号 + 描述文字
 *   - 后跟两条灰度斜体说明，强调「不修改请求」「增强默认禁用」
 *   - 即使在生产环境也保留：开销可忽略，对页面行为无影响
 */
function printActivationBanner(version: string, host: string): void {
  /* eslint-disable no-console */
  console.log(
    '%c DeepDesk %c v' + version + ' %c 注入脚本已激活',
    'background:linear-gradient(90deg,oklch(0.55 0.15 215),oklch(0.72 0.13 200));color:#fff;padding:2px 6px;border-radius:3px 0 0 3px;font-weight:600',
    'background:#222;color:#fff;padding:2px 6px;font-weight:500',
    'color:oklch(0.55 0.15 215);font-weight:500;padding:2px 6px',
  );
  console.log('%c → 仅加载，不修改 chat.deepseek.com 任何请求', 'color:#888;font-style:italic');
  console.log(
    '%c → 增强模块（mermaid / immersive / 等）默认全部禁用，可在设置中按需启用',
    'color:#888;font-style:italic',
  );
  if (host !== 'chat.deepseek.com') {
    console.log(
      '%c → 当前 host=' + host + '，非目标域名，不挂载 DOM 增强',
      'color:#c97a2b;font-style:italic',
    );
  }
  /* eslint-enable no-console */
}

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

  // 2.5 打印激活 banner（开发 / 调试时直观确认注入工作；不影响功能）
  const host = (() => {
    try {
      return window.location.hostname;
    } catch {
      return '';
    }
  })();
  printActivationBanner(runtime.version, host);

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

      // 仅在目标域名 (chat.deepseek.com) 上挂载会触碰 DOM 的逻辑。
      // 兜底防御：理论上 Tauri webview 永远只加载该域名，但即便意外被加载到
      // 其他页面（如登录跳转中转页），也不应该污染该页面的 DOM。
      if (isTargetHost()) {
        scheduleObserverStart();
        scheduleEnhancers();
      } else {
        // 把所有 enhancer 标记为 disabled，便于 snapshot() 诊断
        for (const enh of ENHANCERS) {
          runtime.setStatus(enh.name, 'disabled');
        }
        log.info(`non-target host (${host}); skip observer & enhancers`);
      }

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
