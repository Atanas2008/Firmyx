'use client';

import { AlertTriangle, TrendingDown } from 'lucide-react';
import { detectUrgencyAlerts } from '@/lib/aiInsights';
import { useLanguage } from '@/hooks/useLanguage';
import type { RiskAnalysis } from '@/types';

interface UrgencyAlertsProps {
  analyses: RiskAnalysis[];
}

export function UrgencyAlerts({ analyses }: UrgencyAlertsProps) {
  useLanguage();
  const alerts = detectUrgencyAlerts(analyses);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm ${
            alert.severity === 'critical'
              ? 'border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              : 'border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200'
          }`}
        >
          {alert.severity === 'critical' ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="font-medium">⚠ {alert.text}</span>
        </div>
      ))}
    </div>
  );
}
