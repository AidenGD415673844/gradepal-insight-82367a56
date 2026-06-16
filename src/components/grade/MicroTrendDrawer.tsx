import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";
import { Activity, ChevronDown, X } from "lucide-react";

const SPRING = "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)";

export function MicroTrendDrawer() {
  const { courses, tasks, settings } = useGrades();
  const [courseId, setCourseId] = useState<string>(courses[0]?.id ?? "");
  const [score, setScore] = useState<number>(85);
  const [weight, setWeight] = useState<number>(1);
  const [dismissed, setDismissed] = useState(false);

  const course = courses.find((c) => c.id === courseId);

  const result = useMemo(() => {
    if (!course) return null;
    const ct = tasks.filter((t) => t.courseId === course.id && !t.pending);
    if (ct.length === 0) return null;
    const baseAvg = calcAverage(ct, settings.weighted);
    const simulated = calcAverage(
      [
        ...ct,
        {
          id: "_hypo",
          courseId: course.id,
          name: "hypothetical",
          score,
          maxScore: 100,
          weight,
          category: "x",
          date: "2099-01-01",
        },
      ],
      settings.weighted,
    );
    const delta = simulated - baseAvg;
    const inputDelta = score - baseAvg;
    const elasticity = Math.abs(inputDelta) < 0.0001 ? 0 : Math.abs(delta / inputDelta);
    const marginal = delta / Math.max(weight, 0.1);
    // Diminishing return: high weight but tiny marginal gain
    const diminishing = weight >= 1.5 && Math.abs(marginal) < 0.4;
    return { baseAvg, simulated, delta, elasticity, marginal, diminishing };
  }, [course, tasks, settings.weighted, score, weight]);

  if (!course) return null;

  return (
    <Card className="p-5 backdrop-blur-md bg-card/70 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-violet-500" />
        <h3 className="text-base font-bold">Micro-Trend Efficiency Drawer</h3>
        <span className="text-[11px] text-muted-foreground ml-auto">Live vector tracker</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Adjust a hypothetical pending score and weight. The drawer slides open with a marginal-return diagnostic when an asymmetric allocation is detected.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="h-9 rounded-md border bg-card px-2 text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground shrink-0">Score</span>
          <Input type="number" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="h-9" />
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground shrink-0">Weight</span>
          <Input type="number" min={0.1} step={0.1} value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="h-9" />
        </label>
      </div>

      {result && (
        <div className="grid grid-cols-3 gap-2 text-center mb-2">
          <Cell label="Base" value={`${result.baseAvg.toFixed(1)}%`} />
          <Cell label="Simulated" value={`${result.simulated.toFixed(1)}%`} />
          <Cell
            label="Δ Final"
            value={`${result.delta >= 0 ? "+" : ""}${result.delta.toFixed(2)}%`}
            tone={result.delta >= 0 ? "emerald" : "rose"}
          />
        </div>
      )}

      <div
        style={{
          transition: SPRING,
          maxHeight: result?.diminishing && !dismissed ? 180 : 0,
          opacity: result?.diminishing && !dismissed ? 1 : 0,
          overflow: "hidden",
        }}
      >
        {result?.diminishing && (
          <div className="mt-2 relative rounded-xl border border-amber-400/50 bg-gradient-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/20 p-3 pr-9">
            <button
              aria-label="Dismiss drawer"
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 h-6 w-6 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-900/40 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200 mb-1">
              <ChevronDown className="h-3.5 w-3.5" /> Live Vector Trend
            </div>
            <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">
              Current adjustment creates an asymmetric point distribution. You are over-allocating task
              weight to an operational sector yielding a minor{" "}
              <strong className="tabular-nums">{result.marginal.toFixed(2)}</strong> point marginal return factor.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" }) {
  const cls =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "rose"
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground";
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-base font-bold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}