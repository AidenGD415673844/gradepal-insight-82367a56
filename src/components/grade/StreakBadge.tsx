import { Flame } from "lucide-react";
import { useStreak } from "@/lib/study-streak";

export function StreakBadge() {
  const s = useStreak();
  if (!s.active) return null;
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 shadow-sm animate-pulse"
      title={`Active study streak: ${s.count} consecutive sub-48h Kanban progressions`}
    >
      <Flame className="h-3.5 w-3.5" />
      Streak Multiplier: {s.multiplier.toFixed(1)}x
    </div>
  );
}