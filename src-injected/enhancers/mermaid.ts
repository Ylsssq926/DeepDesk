/**
 * Mermaid 渲染增强占位（M-09）。
 *
 * @module src-injected/enhancers/mermaid
 * @see docs/ARCHITECTURE.md §4.9 Mermaid 渲染注入
 *
 * 合规约束：
 *   - 仅在已经渲染到 DOM 的 mermaid 代码块下方挂载我们自己的 SVG 渲染容器
 *   - 不读取其他业务文本；不修改原始代码块内容
 *   - 渲染发生在 Shadow DOM 内，避免污染宿主页样式
 *
 * 不变量：
 *   - 通过中央 observer 订阅新代码块，不自启 MutationObserver
 *   - 渲染失败保留原代码块 + 错误 badge（具体在功能实现阶段引入）
 *
 * TODO：
 *   - PRD M-09 真正实现：
 *     · 在功能实现阶段以 dynamic import 方式引入 mermaid 库（避免 skeleton 阶段膨胀 bundle）
 *     · 暗色主题切换
 *     · 仅按钮触发模式
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag } from '../utils/feature-flag';

const NAME = 'mermaid' as const;
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, true);

export const mermaidEnhancer: Enhancer = {
  name: NAME,
  when: 'dom-ready',
  defaultEnabled: true,
  init() {
    // TODO: M-09 实现 mermaid 渲染管线
    log.info('ready (stub)');
  },
  dispose() {
    // TODO: 移除已挂载的渲染容器
  },
};
