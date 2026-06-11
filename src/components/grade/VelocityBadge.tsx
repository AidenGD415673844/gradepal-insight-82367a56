import { Rocket, Minus, ArrowDown } from "lucide-react";
import { computeVelocity } from "@/lib/grade-velocity";
import type { Task } from "@/lib/grade-store";

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

  const palette =
    v.direction === "up"
      ? "text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-900"
      : v.direction === "down"
        ? "text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-900"
        : "text-muted-foreground bg-muted border-border";

  const Icon =
    v.direction === "up" ? Rocket : v.direction === "down" ? ArrowDown : Minus;

  if (compact) {
    return (
      <span
        title={`Momentum: ${label} (last 30 days, n=${v.sample})`}
        className={`inline-flex items-center justify-center h-5 w-5 rounded-md border ${palette} ${className}`}
      >
        <Icon className="h-3 w-3" />
      </span>
    );
  }

  return (
    <span
      title={`Rolling 30-day momentum (n=${v.sample})`}
      className={`inline-flex items-center gap-1 px-2 h-6 rounded-md border text-[11px] font-semibold tabular-nums ${palette} ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}