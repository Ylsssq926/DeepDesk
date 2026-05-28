/**
 * Button
 *
 * 基于 shadcn/ui new-york style 改造而来。
 * 设计规范：docs/UI-SKILL.md §3.1
 *
 * 使用场景：主要 CTA、次要操作、工具栏按钮、链接式按钮、危险操作确认
 *
 * 与 shadcn 原版的差异：
 *   - 颜色 token 改为 DeepDesk 蓝青白（brand / bg-elevated / danger）
 *   - 动效用 src/lib/motion.ts（buttonHover / buttonPress）
 *   - 6 种变体严格匹配 UI-SKILL §3.1 规范
 *   - 移除 forwardRef，使用 React 19 props 传递 ref
 *   - 焦点环沿用全局 :focus-visible 规则，不重复定义
 */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * 按钮变体定义。
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md">提交</Button>
 * <Button variant="ghost" size="sm"><Icon /> 操作</Button>
 * <Button variant="danger">删除</Button>
 * ```
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'rounded-md text-sm font-medium whitespace-nowrap',
    'transition-colors duration-[var(--duration-fast)]',
    'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    'cursor-default select-none',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      /**
       * 按钮视觉变体
       * - primary: brand 实心填充，每个视图最多 1 个
       * - secondary: bg-elevated + 1px 描边
       * - ghost: 透明 + hover bg-hover
       * - outline: 透明 + 1px 描边
       * - danger: danger 实心，用于不可逆操作
       * - link: 文字 + 主色 + 下划线 hover
       */
      variant: {
        primary:
          'bg-brand text-white hover:bg-brand-hover active:bg-brand-active',
        secondary:
          'bg-bg-elevated text-fg-primary border border-border hover:bg-bg-hover active:bg-bg-active',
        ghost:
          'bg-transparent text-fg-primary hover:bg-bg-hover active:bg-bg-active',
        outline:
          'bg-transparent text-fg-primary border border-border hover:bg-bg-hover active:bg-bg-active',
        danger:
          'bg-danger text-white hover:bg-danger/90 active:bg-danger/80',
        link:
          'bg-transparent text-brand underline-offset-4 hover:underline hover:text-brand-hover',
      },
      /**
       * 按钮尺寸
       * - sm: 28px 高
       * - md: 32px 高（默认）
       * - lg: 40px 高
       * - icon: 32px 正方形（icon-only）
       */
      size: {
        sm: 'h-7 px-3 py-1 text-xs',
        md: 'h-8 px-3 py-1.5 text-sm',
        lg: 'h-10 px-4 py-2 text-sm',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

/**
 * Button 组件 Props。
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="lg" asChild>
 *   <a href="/settings">设置</a>
 * </Button>
 * ```
 */
type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** 使用 Slot 模式渲染子元素为按钮（如 <a> 标签） */
    asChild?: boolean;
  };

/**
 * 通用按钮组件。
 *
 * 支持 6 种变体（primary / secondary / ghost / outline / danger / link）
 * 和 4 种尺寸（sm / md / lg / icon）。
 *
 * @example
 * ```tsx
 * <Button variant="primary">确认</Button>
 * <Button variant="ghost" size="icon" aria-label="关闭">
 *   <X size={16} />
 * </Button>
 * ```
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : 'button'}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
