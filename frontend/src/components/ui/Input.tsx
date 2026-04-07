import { cn } from '@/lib/utils';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-200"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-50',
          'placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500',
          error
            ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 focus:ring-red-400/40 focus:border-red-400'
            : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700',
          props.disabled && 'bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
