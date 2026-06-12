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
  /** Confidence as a 0–100% scalar derived from sample size + margin. */
  confidencePct: number;
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
      confidencePct: 0,
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
  // True visual delta = projected − current. Using the raw capped slope
  // shift here is wrong when projected hits the 0/100 clamp (e.g. 96.3
  // current + 16.8 raw shift would show "+16.8pp" while projected is
  // pinned to 100, a real move of only +3.7pp).
  const visualDelta = projected - currentAvg;

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

  // Map sample size + margin onto a 0–100 confidence scalar so the UI
  // can show a single "% confidence" number instead of a raw ±pp band.
  const nFactor = Math.min(1, n / 8); // saturates at 8 graded tasks
  const marginFactor = Math.max(0, 1 - marginPp / 20);
  const confidencePct = Math.round(Math.max(0, Math.min(100, 100 * (0.35 * nFactor + 0.65 * marginFactor))));

  return {
    slopePerWeek,
    sample: n,
    source,
    weeks,
    projected,
    delta: visualDelta,
    capped,
    marginPp,
    confidence,
    confidencePct,
    low: Math.max(0, projected - marginPp),
    high: Math.min(100, projected + marginPp),
  };
}

export const HORIZON_OPTIONS: Array<{ label: string; weeks: number }> = [
  { label: "1 week", weeks: 1 },
  { label: "2 weeks", weeks: 2 },
  { label: "4 weeks", weeks: 4 },
  { label: "6 weeks", weeks: 6 },
  { label: "10 weeks", weeks: 10 },
];