'use client';

import { scoreColor } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';

interface HealthScoreCardProps {
  score: number;
  riskLevel: 'safe' | 'moderate_risk' | 'high_risk' | 'low' | 'medium' | 'high' | 'critical';
  label?: string;
}

export function HealthScoreCard({
  score,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  riskLevel,
  label,
}: HealthScoreCardProps) {
  const { t } = useLanguage();
  const { resolvedTheme } = useTheme();
  const displayLabel = label ?? t.businesses.riskScore;
  const tierLabel = score <= 30 ? t.risk.low : score <= 50 ? t.risk.medium : score <= 70 ? t.risk.high : t.risk.critical;
  const color = scoreColor(score);
  const trackColor = resolvedTheme === 'dark' ? '#1f2937' : '#e5e7eb';
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{displayLabel}</p>
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke={trackColor} strokeWidth="10" />
          <circle
            cx="70" cy="70" r={radius} fill="none"
            stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{Math.round(score)}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{tierLabel}</span>
    </div>
  );
}
