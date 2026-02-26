import { AlertTriangle, TrendingUp, DollarSign, Shield, Zap, Info } from 'lucide-react';

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
  if (index === 0) return { label: 'High', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' };
  if (index === 1) return { label: 'Medium', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' };
  return { label: 'Low', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' };
}

export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">
        🎉 No critical recommendations — your business is in great shape!
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
            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              {getIcon(rec)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-gray-400">
                  #{i + 1}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${priority.className}`}
                >
                  {priority.label} priority
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-700 leading-relaxed">{rec}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
