'use client';

import { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { Button } from './ui/Button';
import { useLanguage } from '@/hooks/useLanguage';

interface LimitReachedModalProps {
  open: boolean;
  onClose: () => void;
}

export function LimitReachedModal({ open, onClose }: LimitReachedModalProps) {
  const { t } = useLanguage();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-0 shadow-2xl backdrop:bg-black/50 max-w-md w-full"
      onClose={onClose}
    >
      <div className="p-6">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
            {t.limit.modalTitle}
          </h2>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line mb-6">
          {t.limit.modalText}
        </div>
        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@firmyx.com"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            {t.limit.contactUs} — support@firmyx.com
          </a>
          <Button variant="ghost" onClick={onClose}>
            {t.limit.close}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
