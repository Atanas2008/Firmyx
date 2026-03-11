'use client';

import { scoreColor, scoreTierLabel } from '@/lib/utils';

interface HealthScoreCardProps {
  score: number;
  riskLevel: 'safe' | 'moderate_risk' | 'high_risk';
  label?: string;
}

export function HealthScoreCard({
  score,
  riskLevel,
  label = 'Risk Score',
}: HealthScoreCardProps) {
  const color = scoreColor(score);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  // score 0 = full circle green; 100 = full circle red
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {/* Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
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
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
      <span
        className="text-base font-semibold"
        style={{ color }}
      >
        {scoreTierLabel(score)}
      </span>
    </div>
  );
}
