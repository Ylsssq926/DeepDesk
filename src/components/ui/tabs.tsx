/**
 * Tabs
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3（通用组件规范）
 *
 * 使用场景：设置页分类、内容切换、面板切换
 *
 * 与 shadcn 原版的差异：
 *   - 颜色 token 改为 DeepDesk 蓝青白
 *   - 选中态用 brand 色 + bg-bg-base
 *   - 列表背景用 bg-hover，圆角 lg
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as TabsPrimitive from '@radix-ui/react-tabs';

import { cn } from '@/lib/utils';

/**
 * Tabs 根组件。
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="general">
 *   <TabsList>
 *     <TabsTrigger value="general">通用</TabsTrigger>
 *     <TabsTrigger value="appearance">外观</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="general">通用设置内容</TabsContent>
 *   <TabsContent value="appearance">外观设置内容</TabsContent>
 * </Tabs>
 * ```
 */
const Tabs = TabsPrimitive.Root;

/**
 * Tabs 标签列表容器。
 *
 * @example
 * ```tsx
 * <TabsList>
 *   <TabsTrigger value="tab1">标签 1</TabsTrigger>
 *   <TabsTrigger value="tab2">标签 2</TabsTrigger>
 * </TabsList>
 * ```
 */
function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-1',
        'rounded-lg bg-bg-hover p-1',
        'text-fg-secondary',
        className
      )}
      {...props}
    />
  );
}

/**
 * Tabs 单个标签触发器。
 *
 * @example
 * ```tsx
 * <TabsTrigger value="general">通用</TabsTrigger>
 * ```
 */
function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap',
        'rounded-md px-3 py-1 h-7 text-sm font-medium',
        'transition-all duration-[var(--duration-fast)]',
        'hover:text-fg-primary',
        // 焦点环走全局 :focus-visible，这里不抑制
        'disabled:pointer-events-none disabled:opacity-50',
        // 用 bg-overlay 而不是 bg-base，避免亮/暗模式下的视觉方向反转
        'data-[state=active]:bg-bg-overlay data-[state=active]:text-fg-primary data-[state=active]:shadow-xs',
        className
      )}
      {...props}
    />
  );
}

/**
 * Tabs 内容面板。
 *
 * @example
 * ```tsx
 * <TabsContent value="general">
 *   <p>通用设置内容</p>
 * </TabsContent>
 * ```
 */
function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        'mt-3 focus-visible:outline-none',
        className
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
