import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { calcAverage, filterByTerm } from "@/lib/grade-utils";
import { Compass, CheckCircle2 } from "lucide-react";

/** Subject-by-subject "Grade Horizon" goal map. */
export function GradeHorizonMap() {
  const { courses, tasks, settings, terms, activeTermId, subjectGoals, setSubjectGoal } =
    useGrades();
  const readOnly = settings.parentView;
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Grade Horizon — Goal Map</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {courses.map((c) => {
          const courseTasks = filterByTerm(
            tasks.filter((t) => t.courseId === c.id && !t.pending),
            activeTerm,
          );
          const current = courseTasks.length
            ? calcAverage(courseTasks, settings.weighted)
            : 0;
          const goal = subjectGoals[c.id] ?? 90;
          const gap = current - goal;
          const met = gap >= 0;
          return (
            <div
              key={c.id}
              className="border rounded-xl p-3 space-y-2 bg-card animate-fade-in"
              style={{ borderLeftWidth: 4, borderLeftColor: c.color }}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="font-semibold truncate">{c.name}</div>
                <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                  {current.toFixed(1)}%
                </span>
              </div>

              {/* Dual-progress bar: solid current + dotted goal marker overlay */}
              <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(0, current))}%`,
                    background: c.color,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-foreground/70"
                  style={{ left: `${Math.min(100, Math.max(0, goal))}%` }}
                  aria-label={`Goal marker at ${goal}%`}
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-xs">
                <label className="text-muted-foreground flex items-center gap-1.5">
                  Goal
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    disabled={readOnly}
                    value={goal}
                    onChange={(e) =>
                      setSubjectGoal(c.id, Number(e.target.value) || 0)
                    }
                    className="h-7 w-16 text-xs"
                  />
                  %
                </label>
                {met ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/15 text-success font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Target met
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground font-medium tabular-nums">
                    {gap.toFixed(1)}% to target
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}