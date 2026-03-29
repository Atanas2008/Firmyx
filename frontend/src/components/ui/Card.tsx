import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function Card({ title, subtitle, children, className, actions }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl bg-white dark:bg-gray-900 shadow-sm dark:shadow-none border border-gray-100 dark:border-gray-800',
        className
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
