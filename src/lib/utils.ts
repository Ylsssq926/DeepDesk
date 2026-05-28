import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind 类名合并工具，shadcn/ui 标配。
 *
 * 用法：cn('px-4 py-2', condition && 'bg-brand', className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
