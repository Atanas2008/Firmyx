import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type BadgeVariant = 'safe' | 'moderate_risk' | 'high_risk' | 'neutral' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  safe: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  moderate_risk: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  high_risk: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  neutral: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
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
