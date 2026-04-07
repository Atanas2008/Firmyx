import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant = 'safe' | 'moderate_risk' | 'high_risk' | 'low' | 'medium' | 'high' | 'critical' | 'neutral' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  // v5.0 canonical variants
  low: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800',
  medium: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800',
  high: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800',
  critical: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800',
  // Legacy variants (backward compat with old DB records)
  safe: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800',
  moderate_risk: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800',
  high_risk: 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 ring-1 ring-red-200 dark:ring-red-800',
  neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 ring-1 ring-gray-200 dark:ring-gray-600',
  info: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
