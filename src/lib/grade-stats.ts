// Pure local statistics helpers (no deps). Used by the "Grade Corridor"
// volatility band on the Performance Over Time chart, by report-card
// bullet fixes, and by unit tests.

export function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation (matches the visible spread of plotted values). */
export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

export type VolatilityStatus = "stable" | "moderate" | "volatile";

export function classifyVolatility(sd: number): VolatilityStatus {
  if (sd < 5) return "stable";
  if (sd > 15) return "volatile";
  return "moderate";
}

export function corridorBand(
  avg: number,
  sd: number,
): { low: number; high: number } {
  return {
    low: Math.max(0, avg - sd),
    high: Math.min(100, avg + sd),
  };
}