/**
 * Input
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.2
 *
 * 使用场景：单行文本输入、搜索框、表单字段
 *
 * 与 shadcn 原版的差异：
 *   - 背景用 bg-bg-elevated，描边用 border-border
 *   - focus 时 border-brand + ring-2 ring-brand-soft（无 ring-offset）
 *   - placeholder 用 fg-tertiary
 *   - 高度 32px（md），sm 28px
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import { cn } from '@/lib/utils';

/**
 * Input 组件 Props。
 *
 * @example
 * ```tsx
 * <Input placeholder="搜索对话..." className="w-64" />
 * <Input type="password" aria-label="密码" />
 * ```
 */
type InputProps = React.ComponentProps<'input'>;

/**
 * 单行文本输入组件。
 *
 * 默认高度 32px，圆角 md（8px），支持所有原生 input 属性。
 *
 * @example
 * ```tsx
 * <Input
 *   type="text"
 *   placeholder="输入 API Key..."
 *   value={apiKey}
 *   onChange={(e) => setApiKey(e.target.value)}
 * />
 * ```
 */
function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        'flex h-8 w-full rounded-md px-3 py-1.5',
        'bg-bg-elevated text-fg-primary text-sm',
        'border border-border',
        'placeholder:text-fg-tertiary',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand-soft focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className
      )}
      {...props}
    />
  );
}

export { Input };
export type { InputProps };
