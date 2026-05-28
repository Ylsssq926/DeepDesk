/**
 * Textarea
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.2
 *
 * 使用场景：多行文本输入、消息编辑、备注字段
 *
 * 与 shadcn 原版的差异：
 *   - 背景用 bg-bg-elevated，描边用 border-border
 *   - focus 时 border-brand + ring-2 ring-brand-soft（无 ring-offset）
 *   - placeholder 用 fg-tertiary
 *   - 支持自适应高度（通过 CSS field-sizing 或 JS 回退）
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import { cn } from '@/lib/utils';

/**
 * Textarea 组件 Props。
 *
 * @example
 * ```tsx
 * <Textarea placeholder="输入消息..." rows={3} />
 * <Textarea className="min-h-[80px] max-h-[200px]" />
 * ```
 */
type TextareaProps = React.ComponentProps<'textarea'>;

/**
 * 多行文本输入组件。
 *
 * 默认圆角 md（8px），支持自适应高度。
 * 可通过 min-h / max-h 控制高度范围。
 *
 * @example
 * ```tsx
 * <Textarea
 *   placeholder="描述你的需求..."
 *   value={content}
 *   onChange={(e) => setContent(e.target.value)}
 *   className="min-h-[100px]"
 * />
 * ```
 */
function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex w-full rounded-md px-3 py-2',
        'bg-bg-elevated text-fg-primary text-sm',
        'border border-border',
        'placeholder:text-fg-tertiary',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-none field-sizing-content',
        'min-h-[60px]',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
export type { TextareaProps };
