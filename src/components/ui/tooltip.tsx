/**
 * Tooltip
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.6
 *
 * 使用场景：icon-only 按钮提示、快捷键提示、状态说明
 *
 * 与 shadcn 原版的差异：
 *   - bg-overlay + border-border + shadow-md
 *   - 圆角 sm（6px），文字 2xs（11px）fg-secondary
 *   - 出现延迟 350ms，消失延迟 80ms
 *   - 动效用 CSS animation + tokens
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

/**
 * Tooltip Provider，控制全局延迟。
 *
 * 建议在 App 根部包裹一次。
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <App />
 * </TooltipProvider>
 * ```
 */
function TooltipProvider({
  delayDuration = 350,
  skipDelayDuration = 80,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      skipDelayDuration={skipDelayDuration}
      {...props}
    />
  );
}

/** Tooltip 根组件 */
const Tooltip = TooltipPrimitive.Root;

/** Tooltip 触发器 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Tooltip 内容区域。
 *
 * @example
 * ```tsx
 * <Tooltip>
 *   <TooltipTrigger asChild>
 *     <Button variant="ghost" size="icon" aria-label="设置">
 *       <Settings size={16} />
 *     </Button>
 *   </TooltipTrigger>
 *   <TooltipContent>设置</TooltipContent>
 * </Tooltip>
 * ```
 */
function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 overflow-hidden px-2.5 py-1.5',
          'bg-bg-overlay border border-border rounded-sm shadow-md',
          'text-2xs text-fg-secondary',
          'data-[state=delayed-open]:animate-[dd-tooltip-in_var(--duration-fast)_var(--easing-spring)]',
          'data-[state=closed]:animate-[dd-tooltip-out_var(--duration-fast)_ease-out]',
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
