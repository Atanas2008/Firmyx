import { AlertTriangle, TrendingUp, DollarSign, Shield, Zap, Info } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface RecommendationsListProps {
  recommendations: string[];
}

function getIcon(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('debt') || lower.includes('loan') || lower.includes('liabilit'))
    return <DollarSign className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('grow'))
    return <TrendingUp className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('risk') || lower.includes('bankrupt') || lower.includes('danger'))
    return <AlertTriangle className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('cash') || lower.includes('reserve') || lower.includes('runway'))
    return <Shield className="h-4 w-4 flex-shrink-0" />;
  if (lower.includes('cut') || lower.includes('reduc') || lower.includes('expens'))
    return <Zap className="h-4 w-4 flex-shrink-0" />;
  return <Info className="h-4 w-4 flex-shrink-0" />;
}

function getPriority(index: number): { label: string; className: string } {
  if (index === 0) return { label: 'high', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' };
  if (index === 1) return { label: 'medium', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
  return { label: 'low', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' };
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const { t } = useLanguage();

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
        const priority = getPriority(i);
        return (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm dark:shadow-none"
          >
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              {getIcon(rec)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                  #{i + 1}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}
                >
                  {priority.label === 'high' ? t.recommendations.highPriority : priority.label === 'medium' ? t.recommendations.mediumPriority : t.recommendations.lowPriority}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{rec}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
