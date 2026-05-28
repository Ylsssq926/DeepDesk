/**
 * DropdownMenu
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.5
 *
 * 使用场景：右键菜单、操作菜单、设置下拉
 *
 * 与 shadcn 原版的差异：
 *   - 圆角 lg（12px），bg-overlay + border-border + shadow-lg
 *   - 项目高度 32px，hover 用 bg-hover
 *   - selected 状态用 bg-brand-soft + text-brand
 *   - 动效用 CSS animation + tokens
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronRight, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';

/** DropdownMenu 根组件 */
const DropdownMenu = DropdownMenuPrimitive.Root;

/** DropdownMenu 触发器 */
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

/** DropdownMenu 分组 */
const DropdownMenuGroup = DropdownMenuPrimitive.Group;

/** DropdownMenu Portal */
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

/** DropdownMenu 子菜单 */
const DropdownMenuSub = DropdownMenuPrimitive.Sub;

/** DropdownMenu Radio 分组 */
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

/**
 * DropdownMenu 子菜单触发器。
 *
 * @example
 * ```tsx
 * <DropdownMenuSub>
 *   <DropdownMenuSubTrigger>更多选项</DropdownMenuSubTrigger>
 *   <DropdownMenuSubContent>...</DropdownMenuSubContent>
 * </DropdownMenuSub>
 * ```
 */
function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        'flex cursor-default select-none items-center gap-2',
        'rounded-md px-2.5 py-1.5 text-sm',
        'hover:bg-bg-hover focus:bg-bg-hover',
        'data-[state=open]:bg-bg-hover',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-fg-tertiary',
        inset && 'pl-8',
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight size={14} className="ml-auto" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

/**
 * DropdownMenu 子菜单内容。
 *
 * @example
 * ```tsx
 * <DropdownMenuSubContent>
 *   <DropdownMenuItem>子项 1</DropdownMenuItem>
 *   <DropdownMenuItem>子项 2</DropdownMenuItem>
 * </DropdownMenuSubContent>
 * ```
 */
function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden p-1',
        'bg-bg-overlay border border-border rounded-lg shadow-lg',
        'data-[state=open]:animate-[dd-popover-in_var(--duration-fast)_var(--easing-spring)]',
        'data-[state=closed]:animate-[dd-popover-out_var(--duration-fast)_ease-in]',
        className
      )}
      {...props}
    />
  );
}

/**
 * DropdownMenu 主内容区域。
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild>
 *     <Button variant="ghost">菜单</Button>
 *   </DropdownMenuTrigger>
 *   <DropdownMenuContent>
 *     <DropdownMenuItem>编辑</DropdownMenuItem>
 *     <DropdownMenuItem>复制</DropdownMenuItem>
 *     <DropdownMenuSeparator />
 *     <DropdownMenuItem variant="danger">删除</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 */
function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[8rem] overflow-hidden p-1',
          'bg-bg-overlay border border-border rounded-lg shadow-lg',
          'data-[state=open]:animate-[dd-popover-in_var(--duration-fast)_var(--easing-spring)]',
          'data-[state=closed]:animate-[dd-popover-out_var(--duration-fast)_ease-in]',
          className
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

/**
 * DropdownMenu 菜单项。
 *
 * @example
 * ```tsx
 * <DropdownMenuItem onSelect={() => handleEdit()}>
 *   <Pencil size={14} /> 编辑
 * </DropdownMenuItem>
 * ```
 */
function DropdownMenuItem({
  className,
  inset,
  variant,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  /** danger 变体用于删除等不可逆操作 */
  variant?: 'default' | 'danger';
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        'relative flex cursor-default select-none items-center gap-2',
        'rounded-md px-2.5 py-1.5 text-sm',
        'transition-colors duration-[var(--duration-fast)]',
        'focus:bg-bg-hover focus:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-fg-tertiary',
        variant === 'danger' && 'text-danger focus:text-danger focus:bg-danger/10',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

/**
 * DropdownMenu 复选框项。
 *
 * @example
 * ```tsx
 * <DropdownMenuCheckboxItem checked={showPanel} onCheckedChange={setShowPanel}>
 *   显示面板
 * </DropdownMenuCheckboxItem>
 * ```
 */
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        'relative flex cursor-default select-none items-center',
        'rounded-md py-1.5 pl-8 pr-2.5 text-sm',
        'transition-colors duration-[var(--duration-fast)]',
        'focus:bg-bg-hover focus:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      checked={checked}
      {...props}
    >
      <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check size={14} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

/**
 * DropdownMenu 单选项。
 *
 * @example
 * ```tsx
 * <DropdownMenuRadioGroup value={model} onValueChange={setModel}>
 *   <DropdownMenuRadioItem value="deepseek-v3">DeepSeek V3</DropdownMenuRadioItem>
 *   <DropdownMenuRadioItem value="deepseek-r1">DeepSeek R1</DropdownMenuRadioItem>
 * </DropdownMenuRadioGroup>
 * ```
 */
function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        'relative flex cursor-default select-none items-center',
        'rounded-md py-1.5 pl-8 pr-2.5 text-sm',
        'transition-colors duration-[var(--duration-fast)]',
        'focus:bg-bg-hover focus:outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex size-3.5 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Circle size={8} className="fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

/**
 * DropdownMenu 标签（分组标题）。
 *
 * @example
 * ```tsx
 * <DropdownMenuLabel>模型选择</DropdownMenuLabel>
 * ```
 */
function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      className={cn(
        'px-2.5 py-1.5 text-xs font-medium text-fg-secondary',
        inset && 'pl-8',
        className
      )}
      {...props}
    />
  );
}

/**
 * DropdownMenu 分隔线。
 *
 * @example
 * ```tsx
 * <DropdownMenuSeparator />
 * ```
 */
function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/**
 * DropdownMenu 快捷键提示。
 *
 * @example
 * ```tsx
 * <DropdownMenuItem>
 *   复制 <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
 * </DropdownMenuItem>
 * ```
 */
function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ml-auto text-xs tracking-widest text-fg-tertiary', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
