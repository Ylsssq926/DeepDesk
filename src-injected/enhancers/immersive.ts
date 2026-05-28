/**
 * 沉浸式模式（Immersive Mode）增强占位。
 *
 * @module src-injected/enhancers/immersive
 * @see docs/ARCHITECTURE.md §4.2 注入脚本架构（沉浸式 CSS）
 *
 * 合规约束：
 *   - 仅注入 CSS（隐藏侧栏 / 顶栏 / 底栏），不修改 chat.deepseek.com DOM 结构
 *   - 不读取业务数据
 *
 * 不变量：
 *   - 默认 disabled；由 settings:updated.immersive_mode 切换
 *   - 重复 init() 幂等
 *
 * TODO：
 *   - PRD M-03：实现真正的 CSS 切换（需要在 setting 同步到位后）
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag } from '../utils/feature-flag';

const NAME = 'immersive' as const;
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, false);

export const immersiveEnhancer: Enhancer = {
  name: NAME,
  when: 'dom-ready',
  defaultEnabled: false,
  init() {
    // TODO: M-03 注入沉浸式 CSS（隐藏侧栏 / 顶栏 / 底栏）
    log.info('ready (stub)');
  },
  dispose() {
    // TODO: 移除已注入的 <style>
  },
};
