'use client';

import { scoreColor } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

interface HealthScoreCardProps {
  score: number;
  riskLevel: 'safe' | 'moderate_risk' | 'high_risk';
  label?: string;
}

export function HealthScoreCard({
  score,
  riskLevel,
  label,
}: HealthScoreCardProps) {
  const { t } = useLanguage();
  const displayLabel = label ?? t.businesses.riskScore;
  const tierLabel = score <= 30 ? t.risk.lowRisk : score <= 60 ? t.risk.moderateRisk : t.risk.highRisk;
  const color = scoreColor(score);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // score 0 = full circle green; 100 = full circle red
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{displayLabel}</p>
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            className="dark:[stroke:#374151]"
            strokeWidth="12"
          />
          {/* Progress */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold"
            style={{ color }}
          >
            {Math.round(score)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/100</span>
        </div>
      </div>
      <span
        className="text-base font-semibold"
        style={{ color }}
      >
        {tierLabel}
      </span>
    </div>
  );
}
