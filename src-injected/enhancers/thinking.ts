/**
 * Thinking 链折叠增强占位（M-07）。
 *
 * @module src-injected/enhancers/thinking
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构（Thinking 折叠）
 *
 * 合规约束：
 *   - 仅在我们自己拦截到的 SSE 数据中区分 reasoning_content 与 content
 *   - 折叠 UI 注入到 Shadow DOM；不修改 chat.deepseek.com 业务节点的子树语义
 *   - 不上报 thinking 文本到任何远端
 *
 * 不变量：
 *   - 通过中央 observer 监听 thinkingBlock 锚点出现
 *   - 默认启用，但用户可在设置中关闭
 *
 * TODO：
 *   - PRD M-07：
 *     · 折叠 / 展开动画
 *     · 用时统计、复制 / 导出按钮
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag } from '../utils/feature-flag';

const NAME = 'thinking' as const;
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, true);

export const thinkingEnhancer: Enhancer = {
  name: NAME,
  when: 'dom-ready',
  defaultEnabled: true,
  init() {
    // TODO: M-07 实现 Thinking 折叠 UI
    log.info('ready (stub)');
  },
  dispose() {
    // TODO: 解绑 observer 订阅、移除 Shadow DOM 卡片
  },
};
