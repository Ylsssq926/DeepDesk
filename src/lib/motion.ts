/**
 * Motion 标准参数集。
 * 详见 docs/UI-SKILL.md §5
 *
 * 原则：fast + 微弹。所有交互 ≤ 200ms 完成，spring bounce ≤ 0.2。
 */

export const transitions = {
  /** 按钮 hover/scale */
  buttonHover: { type: 'spring', stiffness: 400, damping: 30, mass: 0.5 } as const,

  /** 按钮按下（无过冲） */
  buttonPress: { type: 'spring', stiffness: 600, damping: 35 } as const,

  /** 抽屉/Sheet 滑入 */
  sheet: { type: 'spring', duration: 0.5, bounce: 0.15 } as const,

  /** Modal/Dialog 出现 */
  modal: { type: 'spring', duration: 0.3, bounce: 0.2 } as const,

  /** 列表项 stagger */
  listItem: { type: 'spring', stiffness: 260, damping: 20 } as const,
  listStagger: { staggerChildren: 0.04 } as const,

  /** 流式 token（重要：用 tween 不用 spring，避免抖动） */
  streamingToken: { duration: 0.12, ease: [0.16, 1, 0.3, 1] } as const,

  /** Tooltip / Popover 出现 */
  popover: { duration: 0.16, ease: [0.16, 1, 0.3, 1] } as const,
} as const;
