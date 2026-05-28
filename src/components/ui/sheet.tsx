/**
 * Sheet
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.4
 *
 * 使用场景：侧滑抽屉、移动端导航、设置面板
 *
 * 与 shadcn 原版的差异：
 *   - 圆角 xl（16px），阴影 xl
 *   - backdrop 用 bg-black/40 + backdrop-blur-sm
 *   - 动效用 CSS animation + tokens（duration-slow / easing-spring）
 *   - 颜色 token 改为 DeepDesk 蓝青白
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

/** Sheet 根组件 */
const Sheet = SheetPrimitive.Root;

/** Sheet 触发器 */
const SheetTrigger = SheetPrimitive.Trigger;

/** Sheet 关闭按钮 */
const SheetClose = SheetPrimitive.Close;

/** Sheet Portal */
const SheetPortal = SheetPrimitive.Portal;

/**
 * Sheet 遮罩层。
 *
 * @example
 * ```tsx
 * <SheetOverlay />
 * ```
 */
function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'fixed inset-0 z-50',
        'bg-black/40 backdrop-blur-sm',
        'data-[state=open]:animate-[dd-fade-in_var(--duration-base)_ease-out]',
        'data-[state=closed]:animate-[dd-fade-out_var(--duration-fast)_ease-in]',
        className
      )}
      {...props}
    />
  );
}

const sheetVariants = cva(
  [
    'fixed z-50 flex flex-col gap-4',
    'bg-bg-elevated border-border shadow-xl',
  ].join(' '),
  {
    variants: {
      /**
       * Sheet 滑入方向
       * - top: 从顶部滑入
       * - bottom: 从底部滑入
       * - left: 从左侧滑入
       * - right: 从右侧滑入（默认）
       */
      side: {
        top: 'inset-x-0 top-0 border-b data-[state=open]:animate-[dd-slide-in-from-top_var(--duration-slow)_var(--easing-spring)] data-[state=closed]:animate-[dd-slide-out-to-top_var(--duration-base)_ease-in]',
        bottom:
          'inset-x-0 bottom-0 border-t data-[state=open]:animate-[dd-slide-in-from-bottom_var(--duration-slow)_var(--easing-spring)] data-[state=closed]:animate-[dd-slide-out-to-bottom_var(--duration-base)_ease-in]',
        left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm border-r data-[state=open]:animate-[dd-slide-in-from-left_var(--duration-slow)_var(--easing-spring)] data-[state=closed]:animate-[dd-slide-out-to-left_var(--duration-base)_ease-in]',
        right:
          'inset-y-0 right-0 h-full w-3/4 max-w-sm border-l data-[state=open]:animate-[dd-slide-in-from-right_var(--duration-slow)_var(--easing-spring)] data-[state=closed]:animate-[dd-slide-out-to-right_var(--duration-base)_ease-in]',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

/**
 * Sheet 内容区域。
 *
 * @example
 * ```tsx
 * <Sheet>
 *   <SheetTrigger asChild>
 *     <Button variant="ghost">打开抽屉</Button>
 *   </SheetTrigger>
 *   <SheetContent side="right">
 *     <SheetHeader>
 *       <SheetTitle>设置</SheetTitle>
 *       <SheetDescription>调整应用配置</SheetDescription>
 *     </SheetHeader>
 *     <div>内容</div>
 *   </SheetContent>
 * </Sheet>
 * ```
 */
function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> &
  VariantProps<typeof sheetVariants>) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), 'p-6', className)}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            'absolute right-4 top-4',
            'rounded-sm p-1 text-fg-tertiary',
            'hover:text-fg-primary hover:bg-bg-hover',
            'transition-colors duration-[var(--duration-fast)]',
            'disabled:pointer-events-none'
          )}
          aria-label="关闭"
        >
          <X size={16} />
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

/**
 * Sheet 头部区域。
 *
 * @example
 * ```tsx
 * <SheetHeader>
 *   <SheetTitle>标题</SheetTitle>
 *   <SheetDescription>描述</SheetDescription>
 * </SheetHeader>
 * ```
 */
function SheetHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

/**
 * Sheet 底部区域。
 *
 * @example
 * ```tsx
 * <SheetFooter>
 *   <Button variant="outline">取消</Button>
 *   <Button variant="primary">保存</Button>
 * </SheetFooter>
 * ```
 */
function SheetFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 mt-auto', className)}
      {...props}
    />
  );
}

/**
 * Sheet 标题。
 *
 * @example
 * ```tsx
 * <SheetTitle>设置面板</SheetTitle>
 * ```
 */
function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-md font-[620] text-fg-primary', className)}
      {...props}
    />
  );
}

/**
 * Sheet 描述文字。
 *
 * @example
 * ```tsx
 * <SheetDescription>修改后需要重启应用</SheetDescription>
 * ```
 */
function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn('text-sm text-fg-secondary', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
