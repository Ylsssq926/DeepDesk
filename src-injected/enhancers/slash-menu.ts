/**
 * Slash 命令菜单增强占位（M-10）。
 *
 * @module src-injected/enhancers/slash-menu
 * @see docs/ARCHITECTURE.md §4.10 Prompt 模板库与 Slash 命令架构
 *
 * 合规约束：
 *   - 仅监听用户在「自身输入框」中按下 "/" 的事件
 *   - 不读取除「用户当前输入框值」之外的任何业务数据
 *   - 模板内容均来自我们本地存储；不向外发送任何 prompt 文本
 *
 * 不变量：
 *   - 菜单 UI 渲染在 Shadow DOM 中（参见 core/shadow-host）
 *   - 键盘导航 / IME 兼容由后续功能实现保证
 *
 * TODO：
 *   - PRD M-10：
 *     · keydown capture 监听 "/"
 *     · 从 Tauri 加载模板列表
 *     · 变量替换（{{selection}}/{{clipboard}}/{{datetime}}/{{file}}）
 *     · React 受控组件写入兼容（nativeInputValueSetter）
 */

import type { Enhancer } from '../types/feature';
import { createLogger } from '../utils/logger';
import { registerFlag } from '../utils/feature-flag';

const NAME = 'slash-menu' as const;
const log = createLogger(`enhancer:${NAME}`);
registerFlag(NAME, true);

export const slashMenuEnhancer: Enhancer = {
  name: NAME,
  when: 'load',
  defaultEnabled: true,
  init() {
    // TODO: M-10 实现 Slash 命令
    log.info('ready (stub)');
  },
  dispose() {
    // TODO: 移除 Shadow DOM 菜单与 keydown listener
  },
};
