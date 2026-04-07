import { AlertTriangle, TrendingUp, DollarSign, Shield, Zap, Info, ChevronDown, ChevronUp, Target, BarChart3, Crosshair } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from '@/hooks/useTranslation';
import type { RecommendationItem } from '@/types';

interface RecommendationsListProps {
  recommendations: RecommendationItem[] | string[];
}

function isStructured(rec: RecommendationItem | string): rec is RecommendationItem {
  return typeof rec !== 'string' && 'justification' in rec;
}

function getIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('debt') || lower.includes('loan') || lower.includes('liabilit') || lower.includes('leverage'))
    return <DollarSign className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('grow'))
    return <TrendingUp className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('risk') || lower.includes('bankrupt') || lower.includes('danger') || lower.includes('solvency'))
    return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('cash') || lower.includes('reserve') || lower.includes('runway') || lower.includes('liqui'))
    return <Shield className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('cut') || lower.includes('reduc') || lower.includes('expens') || lower.includes('margin') || lower.includes('profit'))
    return <Zap className="h-4 w-4 flex-shrink-0" />;
  return <Info className="h-4 w-4 flex-shrink-0" />;
}

function getPriority(index: number): { label: string; className: string } {
  if (index === 0) return { label: 'high', className: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800' };
  if (index === 1) return { label: 'medium', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800' };
  return { label: 'low', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-800' };
}

const ICON_BG = [
  'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
];

function JustificationPanel({ justification }: { justification: RecommendationItem['justification'] }) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-xs">
      <div className="flex items-start gap-2">
        <Target className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500 dark:text-blue-400" />
        <div>
          <span className="font-semibold text-gray-600 dark:text-gray-300">{`Driver: `}</span>
          <span className="text-gray-700 dark:text-gray-300">{justification.driver}</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <BarChart3 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
        <div>
          <span className="font-semibold text-gray-600 dark:text-gray-300">{`Comparison: `}</span>
          <span className="text-gray-700 dark:text-gray-300">{justification.comparison}</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <TrendingUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500 dark:text-emerald-400" />
        <div>
          <span className="font-semibold text-gray-600 dark:text-gray-300">{`Impact: `}</span>
          <span className="text-gray-700 dark:text-gray-300">{justification.impact}</span>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Crosshair className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-500 dark:text-violet-400" />
        <div>
          <span className="font-semibold text-gray-600 dark:text-gray-300">{`Priority: `}</span>
          <span className="text-gray-700 dark:text-gray-300">{justification.priority_reason}</span>
        </div>
      </div>
    </div>
  );
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // Collect explanation texts for translation
  const explanationTexts = recommendations.map((rec) =>
    isStructured(rec) ? rec.explanation : rec,
  );
  const { translated: translatedTexts } = useTranslation(explanationTexts);

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-4 text-sm text-emerald-700 dark:text-emerald-300">
        {t.recommendations.noCritical}
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {recommendations.map((rec, i) => {
        const structured = isStructured(rec);
        const title = structured ? rec.title : undefined;
        const explanation = structured ? rec.explanation : rec;
        const priority = getPriority(i);
        const isOpen = expanded[i] ?? false;

        return (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm dark:shadow-none"
          >
            <span
              className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${ICON_BG[Math.min(i, 2)]}`}
            >
              {getIcon(title ?? explanation)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  #{i + 1}
                </span>
                {title && (
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {title}
                  </span>
                )}
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}
                >
                  {priority.label === 'high'
                    ? t.recommendations.highPriority
                    : priority.label === 'medium'
                      ? t.recommendations.mediumPriority
                      : t.recommendations.lowPriority}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {translatedTexts[i] || explanation}
              </p>

              {structured && rec.justification && rec.justification.driver !== 'N/A' && (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded((prev) => ({ ...prev, [i]: !isOpen }))}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    {isOpen ? (
                      <>
                        {t.recommendations.hideJustification ?? 'Hide justification'}
                        <ChevronUp className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        {t.recommendations.showJustification ?? 'Show justification'}
                        <ChevronDown className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                  {isOpen && <JustificationPanel justification={rec.justification} />}
                </>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
