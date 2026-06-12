import { Rocket, Minus, ArrowDown } from "lucide-react";
import { computeVelocity } from "@/lib/grade-velocity";
import type { Task } from "@/lib/grade-store";

/**
 * 4-tier momentum palette (per spec):
 *  • Green       — stable / improving (slope ≥ 0)
 *  • Orange      — mild decline  (−0.01 to −4.99 pp/week)
 *  • Red         — sharp decline (−5 to −9.99 pp/week)
 *  • Dark red    — severe drop   (≤ −10 pp/week)
 */
function trendTier(slope: number, sample: number):
  | "insufficient"
  | "stable"
  | "mild"
  | "sharp"
  | "severe" {
  if (sample < 2) return "insufficient";
  if (slope >= 0) return "stable";
  if (slope > -5) return "mild";
  if (slope > -10) return "sharp";
  return "severe";
}

const TIER_STYLE: Record<string, string> = {
  insufficient: "text-muted-foreground bg-muted border-border",
  stable:
    "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900",
  mild:
    "text-orange-700 bg-orange-100 border-orange-300 dark:text-orange-300 dark:bg-orange-950/40 dark:border-orange-900",
  sharp:
    "text-red-700 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-950/40 dark:border-red-900",
  severe:
    "text-white bg-red-700 border-red-900 dark:text-red-50 dark:bg-red-800 dark:border-red-950",
};

const TIER_LABEL: Record<string, string> = {
  insufficient: "Insufficient data",
  stable: "Stable / improving",
  mild: "Mild decline",
  sharp: "Sharp decline",
  severe: "Severe drop",
};

export function VelocityBadge({
  tasks,
  compact = false,
  className = "",
}: {
  tasks: Task[];
  compact?: boolean;
  className?: string;
}) {
  const v = computeVelocity(tasks);
  const sign = v.slopePerWeek > 0 ? "+" : "";
  const label = v.sample < 2
    ? "Insufficient data"
    : `${sign}${v.slopePerWeek.toFixed(1)}% / wk`;

  const tier = trendTier(v.slopePerWeek, v.sample);
  const palette = TIER_STYLE[tier];
  const Icon =
    tier === "stable" && v.direction === "up"
      ? Rocket
      : tier === "stable"
        ? Minus
        : ArrowDown;
  const tooltip = `Momentum: ${label} · ${TIER_LABEL[tier]} (last 30 days, n=${v.sample})`;

  if (compact) {
    return (
      <span
        title={tooltip}
        className={`inline-flex items-center justify-center h-5 w-5 rounded-md border ${palette} ${className}`}
      >
        <Icon className="h-3 w-3" />
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-2 h-6 rounded-md border text-[11px] font-semibold tabular-nums ${palette} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}