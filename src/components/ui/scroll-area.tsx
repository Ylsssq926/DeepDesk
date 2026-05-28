/**
 * ScrollArea
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §4（自定义滚动条）
 *
 * 使用场景：长列表、侧栏、对话历史、代码块
 *
 * 与 shadcn 原版的差异：
 *   - 滚动条颜色用 border-strong token
 *   - 滚动条宽度 6px，圆角 full
 *   - hover 时才显示滚动条（与全局 CSS 一致）
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';

import { cn } from '@/lib/utils';

/**
 * ScrollArea 自定义滚动区域。
 *
 * 替代原生滚动条，提供统一的桌面级视觉体验。
 *
 * @example
 * ```tsx
 * <ScrollArea className="h-[300px]">
 *   <div className="p-4">
 *     {items.map(item => <div key={item.id}>{item.name}</div>)}
 *   </div>
 * </ScrollArea>
 * ```
 */
function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

/**
 * ScrollBar 滚动条组件。
 *
 * 支持垂直和水平方向。
 *
 * @example
 * ```tsx
 * <ScrollBar orientation="horizontal" />
 * ```
 */
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-bar"
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-opacity duration-[var(--duration-base)]',
        'opacity-0 hover:opacity-100 [&[data-state=visible]]:opacity-100',
        orientation === 'vertical' && 'h-full w-1.5 border-l border-l-transparent p-px',
        orientation === 'horizontal' && 'h-1.5 flex-col border-t border-t-transparent p-px',
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className="relative flex-1 rounded-full bg-border-strong"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
