/**
 * Industry Benchmark Data
 *
 * Contains typical financial averages for common industries sourced from
 * publicly available sector reports and academic finance literature.
 * Values are approximations intended for qualitative comparison only.
 */

export interface IndustryBenchmark {
  /** Display label shown in the UI */
  label: string;
  /** Average annual profit margin as a percentage (e.g. 14 means 14 %) */
  profit_margin: number;
  /** Average liquidity ratio (Cash / Current Liabilities) */
  liquidity_ratio: number;
  /** Average total-debt-to-assets ratio (0–1) */
  debt_ratio: number;
  /** Typical Altman Z-Score range midpoint */
  altman_z_score: number;
}

/**
 * Industry benchmark map.
 * Keys are lowercase search tokens; the first key that appears in the
 * business's industry string (case-insensitive) wins.
 */
export const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  coffee: {
    label: 'Coffee Chains',
    profit_margin: 14,
    liquidity_ratio: 1.1,
    debt_ratio: 0.50,
    altman_z_score: 2.4,
  },
  restaurant: {
    label: 'Restaurants',
    profit_margin: 6,
    liquidity_ratio: 0.9,
    debt_ratio: 0.55,
    altman_z_score: 2.1,
  },
  food: {
    label: 'Food & Beverage',
    profit_margin: 8,
    liquidity_ratio: 1.1,
    debt_ratio: 0.48,
    altman_z_score: 2.3,
  },
  retail: {
    label: 'Retail',
    profit_margin: 5,
    liquidity_ratio: 1.3,
    debt_ratio: 0.45,
    altman_z_score: 2.3,
  },
  tech: {
    label: 'Technology',
    profit_margin: 18,
    liquidity_ratio: 2.0,
    debt_ratio: 0.30,
    altman_z_score: 3.2,
  },
  software: {
    label: 'Software',
    profit_margin: 22,
    liquidity_ratio: 2.5,
    debt_ratio: 0.25,
    altman_z_score: 3.5,
  },
  manufactur: {
    label: 'Manufacturing',
    profit_margin: 8,
    liquidity_ratio: 1.5,
    debt_ratio: 0.50,
    altman_z_score: 2.5,
  },
  health: {
    label: 'Healthcare',
    profit_margin: 10,
    liquidity_ratio: 1.6,
    debt_ratio: 0.40,
    altman_z_score: 2.8,
  },
  'real estate': {
    label: 'Real Estate',
    profit_margin: 20,
    liquidity_ratio: 0.8,
    debt_ratio: 0.65,
    altman_z_score: 1.9,
  },
  logistics: {
    label: 'Logistics & Transport',
    profit_margin: 5,
    liquidity_ratio: 1.1,
    debt_ratio: 0.52,
    altman_z_score: 2.2,
  },
};

/** Default fallback benchmark used when no industry match is found. */
const DEFAULT_BENCHMARK: IndustryBenchmark = {
  label: 'General Industry',
  profit_margin: 10,
  liquidity_ratio: 1.2,
  debt_ratio: 0.45,
  altman_z_score: 2.5,
};

/**
 * Returns the best-matching benchmark for a given industry string.
 * Falls back to DEFAULT_BENCHMARK when no match is found.
 */
export function getBenchmark(industry: string): IndustryBenchmark {
  const normalized = industry.toLowerCase();
  for (const [token, benchmark] of Object.entries(INDUSTRY_BENCHMARKS)) {
    if (normalized.includes(token)) return benchmark;
  }
  return DEFAULT_BENCHMARK;
}
