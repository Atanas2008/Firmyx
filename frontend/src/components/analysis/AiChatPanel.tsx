'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { MessageSquare, Sparkles, ChevronDown, ArrowUp, X } from 'lucide-react';
import { chatApi, type ChatMessage } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface AiChatPanelProps {
  businessId: string;
  analysis: RiskAnalysis;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSuggestedQuestions(analysis: RiskAnalysis): string[] {
  const questions: string[] = [];

  questions.push(`Why is my risk score ${Math.round(analysis.risk_score)}?`);
  questions.push('Explain my Altman Z-Score in simple terms');

  if (analysis.risk_score > 60) {
    questions.push('What are the most urgent things I should fix?');
  } else {
    questions.push('What can I do to keep improving my financial health?');
  }

  questions.push('How do my numbers compare to industry averages?');

  if (analysis.cash_runway_months !== null && analysis.cash_runway_months < 12) {
    questions.push(
      `My cash runway is ${analysis.cash_runway_months.toFixed(1)} months — is that dangerous?`
    );
  }

  if (analysis.profit_margin < 0) {
    questions.push("I'm operating at a loss — what should I do first?");
  }

  return questions.slice(0, 4);
}

/** Lightweight markdown-ish rendering — bold + bullet lists. */
function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="space-y-1 my-1">$&</ul>')
    .replace(/\n/g, '<br/>');
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{t.chat.thinking}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiChatPanel({ businessId, analysis }: AiChatPanelProps) {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  // ------------------------------------------------------------------
  // Send
  // ------------------------------------------------------------------
  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || isLoading) return;

    setError(null);
    const userMessage: ChatMessage = { role: 'user', content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await chatApi.send(businessId, msg, messages);
      const assistantMessage: ChatMessage = { role: 'assistant', content: res.data.reply };
      setMessages([...updatedMessages, assistantMessage]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 503) {
        setError(t.chat.notConfigured);
      } else if (status === 429) {
        setError(t.chat.rateLimited);
      } else {
        setError(t.chat.connectionError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // ------------------------------------------------------------------
  // Collapsed bar
  // ------------------------------------------------------------------
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-[calc(240px+1.5rem)] z-30">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-5 py-3 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/40">
              <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {t.chat.askAi}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 rotate-180 text-gray-400 dark:text-gray-500" />
        </button>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Expanded panel
  // ------------------------------------------------------------------
  const suggested = getSuggestedQuestions(analysis);

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-[calc(240px+1.5rem)] z-30 flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl" style={{ height: '420px' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">{t.chat.title}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t.chat.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(false)}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Welcome message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100">
            {t.chat.welcomeMessage}{' '}
            <strong>{t.chat.exampleQuestion1}</strong> or{' '}
            <strong>{t.chat.exampleQuestion2}</strong>
          </div>
        </div>

        {/* Suggested questions — only when empty */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {suggested.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendMessage(q)}
                className="rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Conversation */}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
              {...(m.role === 'assistant'
                ? { dangerouslySetInnerHTML: { __html: renderMarkdown(m.content) } }
                : { children: m.content })}
            />
          </div>
        ))}

        {isLoading && <TypingIndicator />}

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2.5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.chat.placeholder}
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
