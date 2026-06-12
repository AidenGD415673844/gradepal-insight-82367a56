import type { Task } from "@/lib/grade-store";

export type ProjectionSource = "rolling-30d" | "all-tasks" | "insufficient";

export type GradeProjection = {
  slopePerWeek: number;
  sample: number;
  source: ProjectionSource;
  weeks: number;
  /** Final projected % after capping & clamping to [0,100]. */
  projected: number;
  /** projected - currentAvg (capped). */
  delta: number;
  /** True if raw slope*weeks was clamped by MAX_DELTA_PP. */
  capped: boolean;
  /** ±pp 1-sigma-ish uncertainty band (already widened for small n). */
  marginPp: number;
  /** Confidence label derived from sample size + horizon. */
  confidence: "high" | "medium" | "low" | "very-low";
  low: number;
  high: number;
};

/** Max one-month projection shift in percentage points (per the spec). */
export const MAX_DELTA_PP = 20;

/**
 * Project a subject's term average forward by `weeks` using an OLS slope.
 * Prefers the rolling 30-day window (matches VelocityBadge), but falls back
 * to ALL graded tasks for the term if fewer than 2 recent points exist —
 * so 2+ tasks always yield a real projection.
 *
 * The total shift is capped at ±MAX_DELTA_PP (default 20) to prevent a
 * single small recovered task from yanking a 50% projection to 100%.
 */
export function projectGrade(
  doneTasks: Task[],
  currentAvg: number,
  weeks: number,
  now: Date = new Date(),
): GradeProjection {
  const points = doneTasks
    .filter(
      (t) => !t.pending && t.maxScore > 0 && Number.isFinite(t.score),
    )
    .map((t) => ({
      ts: new Date(t.date).getTime(),
      pct: (t.score / t.maxScore) * 100,
    }))
    .filter((p) => Number.isFinite(p.ts))
    .sort((a, b) => a.ts - b.ts);

  if (points.length < 2) {
    return {
      slopePerWeek: 0,
      sample: points.length,
      source: "insufficient",
      weeks,
      projected: currentAvg,
      delta: 0,
      capped: false,
      marginPp: 0,
      confidence: "very-low",
      low: currentAvg,
      high: currentAvg,
    };
  }

  const cutoff = now.getTime() - 30 * 86400000;
  const recent = points.filter((p) => p.ts >= cutoff);
  const usePts = recent.length >= 2 ? recent : points;
  const source: ProjectionSource = recent.length >= 2 ? "rolling-30d" : "all-tasks";

  const xs = usePts.map((p) => p.ts / 86400000);
  const ys = usePts.map((p) => p.pct);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : num / den;
  const slopePerWeek = slopePerDay * 7;

  // Residual std-dev (in pp).
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const pred = my + slopePerDay * (xs[i] - mx);
    ssRes += (ys[i] - pred) ** 2;
  }
  const sigma =
    n > 2 ? Math.sqrt(ssRes / (n - 2)) : Math.sqrt(ssRes / Math.max(1, n - 1));

  const rawDelta = slopePerWeek * weeks;
  const cappedDelta = Math.max(-MAX_DELTA_PP, Math.min(MAX_DELTA_PP, rawDelta));
  const capped = Math.abs(rawDelta) > MAX_DELTA_PP;
  const projected = Math.max(0, Math.min(100, currentAvg + cappedDelta));

  // Margin widens with small samples and longer horizons.
  const smallNBoost = n < 3 ? 6 : n < 5 ? 3 : 0;
  const marginPp = Math.min(
    25,
    sigma * Math.sqrt(Math.max(1, weeks)) * 1.2 + smallNBoost,
  );

  const confidence: GradeProjection["confidence"] =
    n >= 6 && source === "rolling-30d"
      ? "high"
      : n >= 4
        ? "medium"
        : n >= 2
          ? "low"
          : "very-low";

  return {
    slopePerWeek,
    sample: n,
    source,
    weeks,
    projected,
    delta: cappedDelta,
    capped,
    marginPp,
    confidence,
    low: Math.max(0, projected - marginPp),
    high: Math.min(100, projected + marginPp),
  };
}

export const HORIZON_OPTIONS: Array<{ label: string; weeks: number }> = [
  { label: "2 weeks", weeks: 2 },
  { label: "1 month", weeks: 4.345 },
  { label: "6 weeks", weeks: 6 },
];