import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, filterByTerm } from "@/lib/grade-utils";
import { Sliders, ChevronDown, ChevronUp } from "lucide-react";

/** Weighted Category "Stress Test" Slider Sandbox — fully ephemeral. */
export function StressTestSimulator() {
  const { tasks, courses, settings, terms, activeTermId } = useGrades();
  const [open, setOpen] = useState(false);
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;

  const scoped = filterByTerm(tasks, activeTerm)
    .filter((t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse)
    .filter((t) => !t.pending);

  const categories = useMemo(
    () => Array.from(new Set(scoped.map((t) => t.category || "Uncategorized"))),
    [scoped],
  );

  const equalWeight = categories.length ? Math.round(100 / categories.length) : 0;
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(categories.map((c) => [c, equalWeight])),
  );

  // Keep slider keys in sync when category list changes.
  const synced: Record<string, number> = { ...weights };
  for (const c of categories) if (synced[c] == null) synced[c] = equalWeight;

  const total = Object.values(synced).reduce((a, b) => a + b, 0);

  // Simulated grade: average each category's tasks, then weight by slider.
  const simulated = useMemo(() => {
    if (!scoped.length || total === 0) return null;
    let weighted = 0;
    let denom = 0;
    for (const cat of categories) {
      const catTasks = scoped.filter((t) => (t.category || "Uncategorized") === cat);
      if (!catTasks.length) continue;
      const catAvg = calcAverage(catTasks, false);
      const w = synced[cat] ?? 0;
      weighted += catAvg * w;
      denom += w;
    }
    return denom > 0 ? weighted / denom : null;
  }, [scoped, categories, synced, total]);

  return (
    <Card className="p-4 shadow-soft">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <span className="font-semibold">Weighting Stress Test Simulator</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No graded tasks yet — add some to play with category weights.
            </p>
          ) : (
            <>
              {categories.map((cat) => (
                <div key={cat} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{cat}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {synced[cat]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={synced[cat]}
                    onChange={(e) =>
                      setWeights((w) => ({ ...w, [cat]: Number(e.target.value) }))
                    }
                    className="w-full accent-primary"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t">
                <div
                  className={`text-xs font-medium ${
                    total === 100 ? "text-success" : "text-destructive"
                  }`}
                >
                  Total weight: {total}% {total === 100 ? "✓" : "(should be 100%)"}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setWeights(
                      Object.fromEntries(categories.map((c) => [c, equalWeight])),
                    )
                  }
                >
                  Reset
                </Button>
              </div>
              <div className="rounded-lg bg-primary/10 border border-primary/30 px-3 py-2 text-sm font-semibold">
                Simulated Grade:{" "}
                <span className="text-primary tabular-nums">
                  {simulated == null ? "—" : `${simulated.toFixed(1)}%`}
                </span>
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  (ephemeral — does not modify saved task weights)
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}