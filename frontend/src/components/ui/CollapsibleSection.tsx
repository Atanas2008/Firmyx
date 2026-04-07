'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, subtitle, children, defaultOpen = false }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm dark:shadow-none">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-5">
          {children}
        </div>
      )}
    </div>
  );
}
