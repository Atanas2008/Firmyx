import {
  formatCurrency,
  formatPercent,
  monthName,
  riskColor,
  riskLabel,
  riskBg,
  scoreColor,
  scoreTierLabel,
  formatDate,
} from '../utils';

describe('formatCurrency', () => {
  it('formats USD by default', () => {
    expect(formatCurrency(50000)).toBe('$50,000');
  });

  it('formats BGN with Bulgarian locale', () => {
    const result = formatCurrency(50000, 'BGN', 'bg');
    expect(result).toContain('50');
  });

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('handles negative values', () => {
    expect(formatCurrency(-5000)).toBe('-$5,000');
  });
});

describe('formatPercent', () => {
  it('formats with default 1 decimal', () => {
    expect(formatPercent(15.567)).toBe('15.6%');
  });

  it('formats with custom decimals', () => {
    expect(formatPercent(15.567, 2)).toBe('15.57%');
  });
});

describe('monthName', () => {
  it('returns short month name', () => {
    expect(monthName(1)).toBe('Jan');
    expect(monthName(12)).toBe('Dec');
  });

  it('returns Bulgarian month name with bg locale', () => {
    const result = monthName(1, 'bg');
    expect(result).toBeTruthy();
    expect(result).not.toBe('Jan');
  });
});

describe('riskColor', () => {
  it('returns emerald for safe/low', () => {
    expect(riskColor('safe')).toContain('emerald');
    expect(riskColor('low')).toContain('emerald');
  });

  it('returns amber for moderate/medium', () => {
    expect(riskColor('moderate_risk')).toContain('amber');
    expect(riskColor('medium')).toContain('amber');
  });

  it('returns red for critical', () => {
    expect(riskColor('critical')).toContain('red');
  });
});

describe('riskBg', () => {
  it('returns emerald bg for low', () => {
    expect(riskBg('low')).toContain('emerald');
  });

  it('returns red bg for critical', () => {
    expect(riskBg('critical')).toContain('red');
  });
});

describe('riskLabel', () => {
  it('returns correct labels for all levels', () => {
    expect(riskLabel('low')).toBe('Low Risk');
    expect(riskLabel('safe')).toBe('Low Risk');
    expect(riskLabel('medium')).toBe('Medium Risk');
    expect(riskLabel('high')).toBe('High Risk');
    expect(riskLabel('critical')).toBe('Critical Risk');
  });

  it('accepts custom label overrides', () => {
    const labels = { low: 'Нисък', medium: 'Среден', high: 'Висок', critical: 'Критичен' };
    expect(riskLabel('low', labels)).toBe('Нисък');
    expect(riskLabel('critical', labels)).toBe('Критичен');
  });
});

describe('scoreColor', () => {
  it('returns green for low scores', () => {
    expect(scoreColor(10)).toBe('#10b981');
    expect(scoreColor(30)).toBe('#10b981');
  });

  it('returns amber for medium scores', () => {
    expect(scoreColor(40)).toBe('#f59e0b');
  });

  it('returns red for critical scores', () => {
    expect(scoreColor(80)).toBe('#ef4444');
  });
});

describe('scoreTierLabel', () => {
  it('maps score ranges to labels', () => {
    expect(scoreTierLabel(20)).toBe('Low Risk');
    expect(scoreTierLabel(40)).toBe('Medium Risk');
    expect(scoreTierLabel(60)).toBe('High Risk');
    expect(scoreTierLabel(80)).toBe('Critical Risk');
  });

  it('uses custom labels', () => {
    const labels = { low: 'OK', medium: 'Hmm', high: 'Bad', critical: 'SOS' };
    expect(scoreTierLabel(20, labels)).toBe('OK');
    expect(scoreTierLabel(80, labels)).toBe('SOS');
  });
});

describe('formatDate', () => {
  it('formats date string', () => {
    const result = formatDate('2024-03-15');
    expect(result).toContain('Mar');
    expect(result).toContain('2024');
  });
});
