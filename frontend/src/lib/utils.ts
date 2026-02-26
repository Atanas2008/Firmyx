import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-US', {
    month: 'short',
  });
}

export function riskColor(
  level: 'safe' | 'moderate_risk' | 'high_risk' | string
): string {
  switch (level) {
    case 'safe':
      return 'text-emerald-600';
    case 'moderate_risk':
      return 'text-amber-600';
    case 'high_risk':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

export function riskBg(
  level: 'safe' | 'moderate_risk' | 'high_risk' | string
): string {
  switch (level) {
    case 'safe':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    case 'moderate_risk':
      return 'bg-amber-50 text-amber-700 ring-amber-200';
    case 'high_risk':
      return 'bg-red-50 text-red-700 ring-red-200';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-200';
  }
}

export function riskLabel(
  level: 'safe' | 'moderate_risk' | 'high_risk' | string
): string {
  switch (level) {
    case 'safe':
      return 'Safe';
    case 'moderate_risk':
      return 'Moderate Risk';
    case 'high_risk':
      return 'High Risk';
    default:
      return 'Unknown';
  }
}

const SAFE_THRESHOLD = 30;
const MODERATE_THRESHOLD = 60;

export function scoreColor(score: number): string {
  if (score <= SAFE_THRESHOLD) return '#10b981'; // emerald-500
  if (score <= MODERATE_THRESHOLD) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
