/**
 * Sonner（Toast）
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3（通用组件规范）
 *
 * 使用场景：操作反馈通知、错误提示、成功确认
 *
 * 与 shadcn 原版的差异：
 *   - 颜色 token 改为 DeepDesk 蓝青白
 *   - 背景用 bg-elevated，描边用 border-border
 *   - 文字用 fg-primary / fg-secondary
 *   - 圆角 lg（12px）
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/stores/theme';

/**
 * Toaster 组件 Props。
 *
 * @example
 * ```tsx
 * // 在 App 根部放置一次
 * <Toaster position="bottom-right" />
 *
 * // 在任意位置触发
 * import { toast } from 'sonner';
 * toast.success('保存成功');
 * toast.error('操作失败');
 * ```
 */
type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Toast 通知容器组件。
 *
 * 基于 sonner 库，在 App 根部放置一次即可。
 * 通过 `import { toast } from 'sonner'` 在任意位置触发通知。
 *
 * 主题联动：通过 useTheme store 与 DeepDesk 全局主题同步，
 * 不依赖 sonner 默认的 prefers-color-scheme 媒体查询。
 *
 * @example
 * ```tsx
 * // App.tsx
 * import { Toaster } from '@/components/ui/sonner';
 *
 * function App() {
 *   return (
 *     <>
 *       <MainContent />
 *       <Toaster />
 *     </>
 *   );
 * }
 *
 * // 使用
 * import { toast } from 'sonner';
 * toast('消息已发送');
 * toast.success('设置已保存');
 * toast.error('网络连接失败', { description: '请检查网络设置' });
 * ```
 */
function Toaster({ ...props }: ToasterProps) {
  const resolvedTheme = useTheme((state) => state.resolvedTheme);
  return (
    <Sonner
      className="toaster group"
      theme={resolvedTheme}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-bg-elevated group-[.toaster]:text-fg-primary group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg',
          description: 'group-[.toast]:text-fg-secondary',
          actionButton:
            'group-[.toast]:bg-brand group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-bg-hover group-[.toast]:text-fg-secondary',
          error:
            'group-[.toaster]:border-danger/30 group-[.toaster]:text-danger',
          success:
            'group-[.toaster]:border-success/30',
          warning:
            'group-[.toaster]:border-warning/30',
          info:
            'group-[.toaster]:border-info/30',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
export type { ToasterProps };
