"""Server-side industry benchmark data.

Mirrors the data in frontend/src/lib/benchmarks.ts so the AI chat endpoint
can inject benchmark context into the system prompt without importing from
the frontend.
"""

from __future__ import annotations

INDUSTRY_BENCHMARKS: dict[str, dict] = {
    "coffee":      {"label": "Coffee Chains",        "profit_margin": 14, "liquidity_ratio": 1.1, "debt_ratio": 0.50, "altman_z_score": 2.4},
    "restaurant":  {"label": "Restaurants",           "profit_margin": 6,  "liquidity_ratio": 0.9, "debt_ratio": 0.55, "altman_z_score": 2.1},
    "food":        {"label": "Food & Beverage",       "profit_margin": 8,  "liquidity_ratio": 1.1, "debt_ratio": 0.48, "altman_z_score": 2.3},
    "retail":      {"label": "Retail",                "profit_margin": 5,  "liquidity_ratio": 1.3, "debt_ratio": 0.45, "altman_z_score": 2.3},
    "tech":        {"label": "Technology",            "profit_margin": 18, "liquidity_ratio": 2.0, "debt_ratio": 0.30, "altman_z_score": 3.2},
    "software":    {"label": "Software",              "profit_margin": 22, "liquidity_ratio": 2.5, "debt_ratio": 0.25, "altman_z_score": 3.5},
    "manufactur":  {"label": "Manufacturing",         "profit_margin": 8,  "liquidity_ratio": 1.5, "debt_ratio": 0.50, "altman_z_score": 2.5},
    "health":      {"label": "Healthcare",            "profit_margin": 10, "liquidity_ratio": 1.6, "debt_ratio": 0.40, "altman_z_score": 2.8},
    "real estate": {"label": "Real Estate",           "profit_margin": 20, "liquidity_ratio": 0.8, "debt_ratio": 0.65, "altman_z_score": 1.9},
    "logistics":   {"label": "Logistics & Transport", "profit_margin": 5,  "liquidity_ratio": 1.1, "debt_ratio": 0.52, "altman_z_score": 2.2},
}

DEFAULT_BENCHMARK: dict = {
    "label": "General Industry",
    "profit_margin": 10,
    "liquidity_ratio": 1.2,
    "debt_ratio": 0.45,
    "altman_z_score": 2.5,
}


def get_benchmark(industry: str) -> dict:
    """Return the best-matching benchmark for a given industry string."""
    normalized = industry.lower()
    for token, benchmark in INDUSTRY_BENCHMARKS.items():
        if token in normalized:
            return benchmark
    return DEFAULT_BENCHMARK
