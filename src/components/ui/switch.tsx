/**
 * Switch
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3（通用组件规范）
 *
 * 使用场景：设置开关、功能启用/禁用、偏好切换
 *
 * 与 shadcn 原版的差异：
 *   - 关闭态用 bg-active，开启态用 brand
 *   - 圆角 full
 *   - 动效用 CSS transition + tokens（duration-fast）
 *   - 移除 forwardRef，使用 React 19 props ref
 */

import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

/**
 * Switch 开关组件 Props。
 *
 * @example
 * ```tsx
 * <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="启用通知" />
 * ```
 */
type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root>;

/**
 * Switch 开关组件。
 *
 * 用于二元状态切换，如启用/禁用功能。
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <Switch id="dark-mode" checked={isDark} onCheckedChange={setIsDark} />
 *   <label htmlFor="dark-mode" className="text-sm">暗色模式</label>
 * </div>
 * ```
 */
function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-default items-center',
        'rounded-full border-2 border-transparent',
        'transition-colors duration-[var(--duration-fast)]',
        // 焦点环走全局 :focus-visible（global.css 已统一定义），这里不抑制
        'disabled:cursor-not-allowed disabled:opacity-50',
        // 关闭态：用 border-strong 提供清晰边界（亮 0.85 vs base 0.99，暗 0.40 vs base 0.16）
        'data-[state=unchecked]:bg-border-strong',
        'data-[state=checked]:bg-brand',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-white shadow-xs',
          'transition-transform duration-[var(--duration-fast)]',
          'data-[state=unchecked]:translate-x-0',
          'data-[state=checked]:translate-x-4'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
export type { SwitchProps };
