/**
 * Command
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.5 + §9（Raycast 风范例）
 *
 * 使用场景：Cmd+K 命令面板、搜索面板、快速操作
 *
 * 与 shadcn 原版的差异：
 *   - 圆角 lg（12px），bg-overlay + border-border + shadow-lg
 *   - 项目高度 32px，hover 用 bg-hover
 *   - selected 状态用 bg-brand-soft + text-brand
 *   - 搜索输入无独立边框，底部用 border 分隔
 *   - 动效用 CSS animation + tokens
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

/**
 * Command 根组件。
 *
 * 基于 cmdk 库，提供命令面板的核心功能。
 *
 * @example
 * ```tsx
 * <Command>
 *   <CommandInput placeholder="搜索命令..." />
 *   <CommandList>
 *     <CommandEmpty>未找到结果</CommandEmpty>
 *     <CommandGroup heading="操作">
 *       <CommandItem>新建对话</CommandItem>
 *       <CommandItem>打开设置</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </Command>
 * ```
 */
function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        'flex h-full w-full flex-col overflow-hidden',
        'bg-bg-overlay rounded-lg text-fg-primary',
        className
      )}
      {...props}
    />
  );
}

/**
 * CommandDialog 命令面板对话框。
 *
 * 将 Command 包裹在 Dialog 中，用于 Cmd+K 全局命令面板。
 *
 * @example
 * ```tsx
 * <CommandDialog open={open} onOpenChange={setOpen}>
 *   <CommandInput placeholder="输入命令..." />
 *   <CommandList>
 *     <CommandGroup heading="最近">
 *       <CommandItem>继续上次对话</CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </CommandDialog>
 * ```
 */
function CommandDialog({
  children,
  ...props
}: DialogProps & { children?: React.ReactNode }) {
  return (
    <Dialog {...props}>
      <DialogContent hideClose className="overflow-hidden p-0 max-w-lg">
        <Command
          className={cn(
            '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-secondary',
            '[&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0',
            '[&_[cmdk-group]]:px-2',
            '[&_[cmdk-input-wrapper]_svg]:size-4',
            '[&_[cmdk-input]]:h-10',
            '[&_[cmdk-item]]:px-2.5 [&_[cmdk-item]]:py-2',
            '[&_[cmdk-item]_svg]:size-4'
          )}
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Command 搜索输入框。
 *
 * @example
 * ```tsx
 * <CommandInput placeholder="搜索..." />
 * ```
 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div className="flex items-center border-b border-border px-3" data-cmdk-input-wrapper="">
      <Search size={16} className="mr-2 shrink-0 text-fg-tertiary" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'flex h-10 w-full bg-transparent py-2 text-sm',
          'text-fg-primary placeholder:text-fg-tertiary',
          'outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Command 列表容器。
 *
 * @example
 * ```tsx
 * <CommandList>
 *   <CommandGroup>...</CommandGroup>
 * </CommandList>
 * ```
 */
function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
      {...props}
    />
  );
}

/**
 * Command 空状态提示。
 *
 * @example
 * ```tsx
 * <CommandEmpty>未找到匹配的命令</CommandEmpty>
 * ```
 */
function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm text-fg-secondary', className)}
      {...props}
    />
  );
}

/**
 * Command 分组。
 *
 * @example
 * ```tsx
 * <CommandGroup heading="操作">
 *   <CommandItem>新建对话</CommandItem>
 * </CommandGroup>
 * ```
 */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden p-1',
        '[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5',
        '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-secondary',
        className
      )}
      {...props}
    />
  );
}

/**
 * Command 分隔线。
 *
 * @example
 * ```tsx
 * <CommandSeparator />
 * ```
 */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/**
 * Command 单个命令项。
 *
 * @example
 * ```tsx
 * <CommandItem onSelect={() => handleNewChat()}>
 *   <MessageSquare size={14} />
 *   <span>新建对话</span>
 *   <CommandShortcut>⌘N</CommandShortcut>
 * </CommandItem>
 * ```
 */
function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'relative flex cursor-default select-none items-center gap-2',
        'rounded-md px-2.5 py-1.5 text-sm',
        'transition-colors duration-[var(--duration-fast)]',
        'data-[selected=true]:bg-brand-soft data-[selected=true]:text-brand',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-fg-tertiary',
        'data-[selected=true]:[&_svg]:text-brand',
        className
      )}
      {...props}
    />
  );
}

/**
 * Command 快捷键提示。
 *
 * @example
 * ```tsx
 * <CommandShortcut>⌘K</CommandShortcut>
 * ```
 */
function CommandShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto text-xs tracking-widest text-fg-tertiary', className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
