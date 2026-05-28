/**
 * 失败自动重试增强占位（M-06）。
 *
 * @module src-injected/enhancers/auto-retry
 * @see docs/ARCHITECTURE.md §4.6 失败自动重试与断网恢复
 *
 * 合规约束：
 *   - 重试逻辑只针对「我们自身已发起且失败的请求」
 *   - 不绕过 PoW / 限流；遇到 401 / 403 不重试，转交「重新登录」流程
 *   - 不同时并发多份请求；不主动加速、不抢占
 *
 * 不变量：
 *   - 通过 interceptors/fetch.ts 的 onResponse hook 接入
 *   - 重试间隔严格遵守指数退避（1s / 2s / 4s / 8s / 16s 最多 5 次）
 *   - 任何重试都通过 bridge 上报 retry:attempt 给主进程，便于 UI 展示
 *
 * TODO：
 *   - PRD M-06：
 *     · 服务器繁忙文案识别
 *     · 断网检测 + 在线后弹「恢复发送」
 *     · 与 fetch interceptor 协同（不重复重试）
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag } from '../utils/feature-flag';

const NAME = 'auto-retry' as const;
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, false);

export const autoRetryEnhancer: Enhancer = {
  name: NAME,
  when: 'immediate',
  // 默认禁用：直到 interceptor 与 settings 同步到位再开启，避免重试逻辑过早干扰
  defaultEnabled: false,
  init() {
    // TODO: M-06 接入 fetch.onResponse；实现指数退避重试
    log.info('ready (stub)');
  },
  dispose() {
    // TODO: 反订阅 fetch hook
  },
};
