import { useMemo, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { filterByTerm } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

/**
 * Grade Distribution histogram (10 bins of 10% width).
 * Bars are clickable to filter the task list below by that bin.
 * Toggle switches between "All Assignments" and "Per-Category View".
 */
const BIN_COUNT = 10;
const BIN_LABELS = ["0–10", "11–20", "21–30", "31–40", "41–50", "51–60", "61–70", "71–80", "81–90", "91–100"];

function binFor(pct: number): number {
  if (pct <= 10) return 0;
  const i = Math.floor((pct - 0.0001) / 10);
  return Math.max(0, Math.min(BIN_COUNT - 1, i));
}

export function GradeDistribution() {
  const { tasks, courses, activeTermId, terms } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const scoped = filterByTerm(
    tasks.filter((t) => !t.pending && t.maxScore > 0),
    activeTerm,
  );
  const [view, setView] = useState<"all" | "category">("all");
  const [selectedBin, setSelectedBin] = useState<number | null>(null);

  const enriched = scoped.map((t) => ({
    ...t,
    pct: (t.score / t.maxScore) * 100,
    course: courses.find((c) => c.id === t.courseId)?.name ?? "—",
  }));

  const categories = useMemo(
    () => Array.from(new Set(enriched.map((t) => t.category || "Uncategorized"))),
    [enriched],
  );

  const series = useMemo(() => {
    if (view === "all") {
      const bins = new Array(BIN_COUNT).fill(0);
      enriched.forEach((t) => bins[binFor(t.pct)]++);
      return [{ label: "All Assignments", bins }];
    }
    return categories.map((cat) => {
      const bins = new Array(BIN_COUNT).fill(0);
      enriched.filter((t) => (t.category || "Uncategorized") === cat).forEach((t) => bins[binFor(t.pct)]++);
      return { label: cat, bins };
    });
  }, [view, enriched, categories]);

  const totalBins = useMemo(() => {
    const b = new Array(BIN_COUNT).fill(0);
    enriched.forEach((t) => b[binFor(t.pct)]++);
    return b;
  }, [enriched]);

  const total = enriched.length;
  const max = Math.max(1, ...totalBins);
  const mean = total ? enriched.reduce((s, t) => s + t.pct, 0) / total : 0;
  const median = (() => {
    if (!total) return 0;
    const s = [...enriched].map((t) => t.pct).sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  })();

  const meanBinPct = (mean / 100) * BIN_COUNT;
  const medianBinPct = (median / 100) * BIN_COUNT;

  const filteredTasks =
    selectedBin == null ? enriched : enriched.filter((t) => binFor(t.pct) === selectedBin);

  return (
    <Card className="p-4 md:p-5 no-print animate-fade-in">
      <div className="flex items-center gap-2 mb-3 justify-between flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Grade Distribution</h3>
          <span className="text-xs text-muted-foreground">· {total} task{total === 1 ? "" : "s"}</span>
        </div>
        <div className="inline-flex rounded-md border overflow-hidden text-xs">
          <button
            className={`px-3 py-1 ${view === "all" ? "bg-primary text-primary-foreground" : "bg-background"}`}
            onClick={() => setView("all")}
          >
            All Assignments
          </button>
          <button
            className={`px-3 py-1 ${view === "category" ? "bg-primary text-primary-foreground" : "bg-background"}`}
            onClick={() => setView("category")}
          >
            Per-Category
          </button>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-foreground">No graded tasks in this term yet.</p>
      ) : (
        <>
          <div className="relative h-44 border-b border-l">
            {/* Mean & Median overlay lines */}
            <div
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-500/70"
              style={{ left: `${(meanBinPct / BIN_COUNT) * 100}%` }}
              title={`Class average ${mean.toFixed(1)}%`}
            />
            <div
              className="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-500/70"
              style={{ left: `${(medianBinPct / BIN_COUNT) * 100}%` }}
              title={`Median ${median.toFixed(1)}%`}
            />
            <div className="absolute inset-0 flex items-end gap-1 px-1">
              {Array.from({ length: BIN_COUNT }).map((_, i) => {
                const stack = series.map((s) => s.bins[i]);
                const sum = stack.reduce((a, b) => a + b, 0);
                const pctBadge = total ? Math.round((sum / total) * 100) : 0;
                const active = selectedBin === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedBin(active ? null : i)}
                    className={`relative flex-1 flex flex-col-reverse rounded-t transition-all ${active ? "ring-2 ring-primary" : ""}`}
                    style={{ height: "100%" }}
                    title={`${BIN_LABELS[i]}% · ${sum} task${sum === 1 ? "" : "s"}`}
                  >
                    {stack.map((v, si) => (
                      <div
                        key={si}
                        className="w-full"
                        style={{
                          height: `${(v / max) * 100}%`,
                          backgroundColor: `hsl(${(si * 53) % 360} 70% 55% / ${view === "all" ? 0.85 : 0.75})`,
                        }}
                      />
                    ))}
                    {sum > 0 && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold tabular-nums">
                        {pctBadge}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-1 px-1 mt-1">
            {BIN_LABELS.map((l) => (
              <div key={l} className="flex-1 text-center text-[10px] text-muted-foreground tabular-nums">{l}</div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs mt-2 text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-blue-500/70" /> Mean {mean.toFixed(1)}%</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 border-t-2 border-dashed border-emerald-500/70" /> Median {median.toFixed(1)}%</span>
            {selectedBin != null && (
              <Button size="sm" variant="ghost" className="ml-auto h-7" onClick={() => setSelectedBin(null)}>Clear filter</Button>
            )}
          </div>

          <div className="mt-3 border-t pt-3">
            <div className="text-xs font-semibold mb-1">
              {selectedBin == null ? "All tasks" : `Tasks in ${BIN_LABELS[selectedBin]}%`}
              <span className="text-muted-foreground"> ({filteredTasks.length})</span>
            </div>
            <ul className="text-xs divide-y max-h-48 overflow-auto">
              {filteredTasks.map((t) => (
                <li key={t.id} className="py-1 flex items-center justify-between gap-3">
                  <span className="truncate"><b>{t.name}</b> <span className="text-muted-foreground">· {t.course} · {t.category || "—"}</span></span>
                  <span className="tabular-nums shrink-0">{t.pct.toFixed(1)}%</span>
                </li>
              ))}
              {filteredTasks.length === 0 && <li className="py-2 text-muted-foreground">No tasks in this bin.</li>}
            </ul>
          </div>
        </>
      )}
    </Card>
  );
}