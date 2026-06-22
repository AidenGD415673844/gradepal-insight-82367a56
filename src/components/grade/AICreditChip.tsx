import { Link } from "@tanstack/react-router";
import { useAICredits } from "@/lib/ai-credits";
import { Zap, Crown, GraduationCap } from "lucide-react";

export function AICreditChip() {
  const { balance, tierLabel, isPro, isStudent } = useAICredits();
  const Icon = isPro ? Crown : isStudent ? GraduationCap : Zap;
  const tone = isPro
    ? "from-amber-500/15 to-amber-500/5 border-amber-500/40 text-amber-700 dark:text-amber-300"
    : isStudent
      ? "from-emerald-500/15 to-emerald-500/5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
      : "from-primary/15 to-primary/5 border-primary/30 text-primary";

  return (
    <Link
      to="/shop"
      title={`${tierLabel} · ${balance.toFixed(1)} AI credits`}
      className={`hidden md:inline-flex items-center gap-1.5 rounded-full border bg-gradient-to-br px-2.5 h-9 text-xs font-semibold tabular-nums transition-all hover:scale-105 active:scale-95 shadow-sm ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{balance.toFixed(1)}</span>
      <span className="opacity-70 font-normal">credits</span>
    </Link>
  );
}