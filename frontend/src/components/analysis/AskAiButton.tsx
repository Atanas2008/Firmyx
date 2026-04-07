'use client';

import { Sparkles } from 'lucide-react';

interface AskAiButtonProps {
  question: string;
  onAsk: (question: string) => void;
  label?: string;
}

/**
 * Contextual "Ask AI" button placed near specific analysis sections.
 * When clicked, it opens the AI chat panel with a pre-filled question.
 */
export function AskAiButton({ question, onAsk, label }: AskAiButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onAsk(question)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
    >
      <Sparkles className="h-3 w-3" />
      {label ?? 'Ask AI'}
    </button>
  );
}
