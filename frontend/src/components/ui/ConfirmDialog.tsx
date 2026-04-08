'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
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
      onClose={onCancel}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
              variant === 'danger'
                ? 'bg-red-100 dark:bg-red-900/30'
                : variant === 'warning'
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 ${
                variant === 'danger'
                  ? 'text-red-600 dark:text-red-400'
                  : variant === 'warning'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
