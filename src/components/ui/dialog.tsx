/**
 * Dialog
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.4
 *
 * 使用场景：模态对话框、确认弹窗、表单弹窗
 *
 * 与 shadcn 原版的差异：
 *   - 圆角 xl（16px），阴影 xl
 *   - backdrop 用 bg-black/40 + backdrop-blur-sm
 *   - 动效用 CSS animation + tokens（duration-base / easing-spring）
 *   - 颜色 token 改为 DeepDesk 蓝青白
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Dialog 根组件，控制打开/关闭状态。
 *
 * @example
 * ```tsx
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogTrigger asChild>
 *     <Button>打开对话框</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>标题</DialogTitle>
 *       <DialogDescription>描述文字</DialogDescription>
 *     </DialogHeader>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
const Dialog = DialogPrimitive.Root;

/** Dialog 触发器，点击后打开对话框 */
const DialogTrigger = DialogPrimitive.Trigger;

/** Dialog Portal，将内容渲染到 body */
const DialogPortal = DialogPrimitive.Portal;

/** Dialog 关闭按钮 */
const DialogClose = DialogPrimitive.Close;

/**
 * Dialog 遮罩层。
 *
 * @example
 * ```tsx
 * <DialogOverlay className="custom-overlay" />
 * ```
 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
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

/**
 * Dialog 内容区域。
 *
 * 包含遮罩层和关闭按钮。ESC 关闭、点击遮罩关闭。
 *
 * @example
 * ```tsx
 * <DialogContent className="max-w-md">
 *   <DialogHeader>
 *     <DialogTitle>设置</DialogTitle>
 *   </DialogHeader>
 *   <div>内容区域</div>
 *   <DialogFooter>
 *     <Button variant="outline">取消</Button>
 *     <Button variant="primary">确认</Button>
 *   </DialogFooter>
 * </DialogContent>
 * ```
 */
function DialogContent({
  className,
  children,
  hideClose = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  /** 隐藏右上角的关闭按钮（默认 false）。CommandDialog 等场景可设为 true。 */
  hideClose?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
          'w-full max-w-lg p-6',
          'bg-bg-elevated border border-border rounded-xl shadow-xl',
          'grid gap-4',
          'data-[state=open]:animate-[dd-dialog-in_var(--duration-base)_var(--easing-spring)]',
          'data-[state=closed]:animate-[dd-dialog-out_var(--duration-fast)_ease-in]',
          className
        )}
        {...props}
      >
        {children}
        {!hideClose && (
        <DialogPrimitive.Close
          className={cn(
            'absolute right-4 top-4',
            'rounded-md p-1 text-fg-tertiary',
            'hover:text-fg-primary hover:bg-bg-hover',
            'transition-colors duration-[var(--duration-fast)]',
            'disabled:pointer-events-none'
          )}
          aria-label="关闭"
        >
          <X size={16} />
        </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * Dialog 头部区域，包含标题和描述。
 *
 * @example
 * ```tsx
 * <DialogHeader>
 *   <DialogTitle>确认删除</DialogTitle>
 *   <DialogDescription>此操作不可撤销</DialogDescription>
 * </DialogHeader>
 * ```
 */
function DialogHeader({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

/**
 * Dialog 底部区域，通常放置操作按钮。
 *
 * @example
 * ```tsx
 * <DialogFooter>
 *   <Button variant="outline">取消</Button>
 *   <Button variant="primary">确认</Button>
 * </DialogFooter>
 * ```
 */
function DialogFooter({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
}

/**
 * Dialog 标题。
 *
 * @example
 * ```tsx
 * <DialogTitle>新建对话</DialogTitle>
 * ```
 */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-md font-[620] text-fg-primary leading-tight', className)}
      {...props}
    />
  );
}

/**
 * Dialog 描述文字。
 *
 * @example
 * ```tsx
 * <DialogDescription>请输入对话名称</DialogDescription>
 * ```
 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-fg-secondary', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
