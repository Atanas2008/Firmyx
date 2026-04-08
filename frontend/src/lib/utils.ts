import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale === 'bg' ? 'bg-BG' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, locale = 'en-US'): string {
  return new Intl.NumberFormat(locale === 'bg' ? 'bg-BG' : 'en-US').format(value);
}

export function monthName(month: number, locale = 'en-US'): string {
  return new Date(2000, month - 1, 1).toLocaleString(locale === 'bg' ? 'bg-BG' : 'en-US', {
    month: 'short',
  });
}

export function riskColor(
  level: 'safe' | 'moderate_risk' | 'high_risk' | 'low' | 'medium' | 'high' | 'critical' | string
): string {
  switch (level) {
    case 'safe':
    case 'low':
      return 'text-emerald-600';
    case 'moderate_risk':
    case 'medium':
      return 'text-amber-600';
    case 'high_risk':
    case 'high':
      return 'text-orange-600';
    case 'critical':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function riskBg(
  level: 'safe' | 'moderate_risk' | 'high_risk' | 'low' | 'medium' | 'high' | 'critical' | string
): string {
  switch (level) {
    case 'safe':
    case 'low':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'moderate_risk':
    case 'medium':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'high_risk':
    case 'high':
      return 'bg-orange-50 text-orange-700 ring-orange-200';
    case 'critical':
      return 'bg-red-50 text-red-700 ring-red-200';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-200';
  }
}

export function riskLabel(
  level: 'safe' | 'moderate_risk' | 'high_risk' | 'low' | 'medium' | 'high' | 'critical' | string,
  labels?: { low: string; medium: string; high: string; critical: string }
): string {
  const l = labels ?? { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk', critical: 'Critical Risk' };
  switch (level) {
    case 'safe':
    case 'low':
      return l.low;
    case 'moderate_risk':
    case 'medium':
      return l.medium;
    case 'high_risk':
    case 'high':
      return l.high;
    case 'critical':
      return l.critical;
    default:
      return 'Unknown';
  }
}

const SAFE_THRESHOLD = 30;
const MODERATE_THRESHOLD = 50;
const HIGH_THRESHOLD = 70;

export function scoreColor(score: number): string {
  if (score <= 30) return '#10b981'; // emerald  — Low Risk
  if (score <= 50) return '#f59e0b'; // amber    — Medium Risk
  if (score <= 70) return '#f97316'; // orange   — High Risk
  return '#ef4444';                  // red      — Critical Risk
}

/**
 * Derives a human-readable 4-tier risk label directly from the numeric risk score.
 * Matches the v5.0 scoring model: low ≤ 30, medium ≤ 50, high ≤ 70, critical > 70.
 */
export function scoreTierLabel(
  score: number,
  labels?: { low: string; medium: string; high: string; critical: string }
): string {
  const l = labels ?? { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk', critical: 'Critical Risk' };
  if (score <= 30) return l.low;
  if (score <= 50) return l.medium;
  if (score <= 70) return l.high;
  return l.critical;
}

export function formatDate(dateString: string, locale: string = 'en-US'): string {
  return new Date(dateString).toLocaleDateString(locale === 'bg' ? 'bg-BG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
