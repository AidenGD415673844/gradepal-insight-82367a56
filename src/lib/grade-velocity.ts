import type { Task } from "@/lib/grade-store";

export type VelocityDirection = "up" | "flat" | "down";

export type Velocity = {
  /** Score change in percentage points per week. */
  slopePerWeek: number;
  direction: VelocityDirection;
  /** How many tasks were considered in the rolling window. */
  sample: number;
};

const WINDOW_DAYS = 30;
const FLAT_THRESHOLD = 0.3; // ±0.3 pp/week ⇒ stable

/**
 * Compute a rolling 30-day momentum vector for a set of graded tasks.
 * Uses an ordinary-least-squares slope against task date (in days)
 * and converts to percentage-points per week. Tasks without a usable
 * score are skipped. Pending tasks are ignored entirely.
 */
export function computeVelocity(tasks: Task[], now: Date = new Date()): Velocity {
  const cutoff = now.getTime() - WINDOW_DAYS * 86400000;
  const points = tasks
    .filter((t) => !t.pending && t.maxScore > 0 && Number.isFinite(t.score))
    .map((t) => {
      const ts = new Date(t.date).getTime();
      return { ts, pct: (t.score / t.maxScore) * 100 };
    })
    .filter((p) => Number.isFinite(p.ts) && p.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts);

  if (points.length < 2) {
    return { slopePerWeek: 0, direction: "flat", sample: points.length };
  }

  // OLS slope of pct vs day-index.
  const xs = points.map((p) => p.ts / 86400000);
  const ys = points.map((p) => p.pct);
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

  const direction: VelocityDirection =
    Math.abs(slopePerWeek) < FLAT_THRESHOLD
      ? "flat"
      : slopePerWeek > 0
        ? "up"
        : "down";

  return { slopePerWeek, direction, sample: n };
}