'use client';

import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
  accept?: string;
}

export function FileUpload({
  onUpload,
  loading = false,
  accept = '.csv,.xlsx,.xls',
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrag(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragging(true);
    else setDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) setFile(selected);
  }

  function clearFile() {
    setFile(null);
    setUploaded(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!file) return;
    await onUpload(file);
    setUploaded(true);
  }

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
          dragging
            ? 'border-blue-400 bg-blue-50'
            : file
            ? 'border-emerald-300 bg-emerald-50 cursor-default'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {file ? (
          <>
            {uploaded ? (
              <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
            ) : (
              <FileText className="mb-3 h-10 w-10 text-blue-500" />
            )}
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
            <p className="text-xs text-gray-400">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            {uploaded && (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                Upload successful!
              </p>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <Upload className="mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">
              Drop your file here or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Supports CSV, XLSX, XLS files
            </p>
          </>
        )}
      </div>

      {file && !uploaded && (
        <Button onClick={handleSubmit} loading={loading} disabled={loading}>
          Upload &amp; Process File
        </Button>
      )}
    </div>
  );
}
