import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Flame } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";

const KEY = "gradecalc-gpa-floor";

export function GPAFireAlarm() {
  const { courses, tasks, settings } = useGrades();
  const [floor, setFloor] = useState<number>(80);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const next = Number(raw);
    if (Number.isFinite(next)) setFloor(next);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, String(floor));
  }, [floor]);

  const perCourse = courses.map((c) => {
    const done = tasks.filter((t) => t.courseId === c.id && !t.pending);
    return { c, avg: done.length ? calcAverage(done, settings.weighted) : null, done };
  });
  const withData = perCourse.filter((p) => p.avg !== null) as { c: typeof courses[number]; avg: number; done: typeof tasks }[];
  const overall = withData.length
    ? withData.reduce((s, p) => s + p.avg, 0) / withData.length
    : 0;

  const distance = overall - floor;
  const alarm = withData.length > 0 && distance <= 2;
  const draggers = withData
    .flatMap((p) =>
      p.done
        .filter((t) => (t.score / t.maxScore) * 100 < floor)
        .map((t) => ({ ...t, courseName: p.c.name, pct: (t.score / t.maxScore) * 100 })),
    )
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 6);

  return (
    <Card
      className={`p-4 ${alarm ? "border-red-500/60" : ""}`}
      style={alarm ? { animation: "gpa-pulse 1.6s ease-in-out infinite" } : undefined}
    >
      <style>{`
        @keyframes gpa-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.0); background-color: rgba(220,38,38,0.03); }
          50%      { box-shadow: 0 0 0 6px rgba(220,38,38,0.15); background-color: rgba(220,38,38,0.08); }
        }
      `}</style>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Flame className={`h-4 w-4 ${alarm ? "text-red-500" : "text-primary"}`} />
        <h3 className="text-sm font-semibold">GPA Safety Monitor</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          Overall avg: <b className="tabular-nums">{withData.length ? overall.toFixed(1) + "%" : "—"}</b>
        </span>
      </div>
      <label className="text-xs flex items-center gap-2 mb-2">
        GPA Floor Target (%)
        <Input
          type="number"
          min={0}
          max={100}
          className="h-8 w-24"
          value={floor}
          onChange={(e) => setFloor(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        />
      </label>
      {alarm ? (
        <div className="text-xs">
          <p className="text-red-600 font-medium mb-1">
            ⚠ Overall is within 2% of your floor ({distance.toFixed(1)}pt margin). Tasks dragging the average:
          </p>
          {draggers.length ? (
            <ul className="space-y-0.5">
              {draggers.map((t) => (
                <li key={t.id} className="flex justify-between gap-3 border-b last:border-b-0 py-0.5">
                  <span className="truncate"><b>{t.name}</b> · {t.courseName}</span>
                  <span className="tabular-nums shrink-0">{t.pct.toFixed(1)}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">All individual tasks above floor — risk is from cumulative weighting.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {withData.length ? `${distance.toFixed(1)}pt above floor. Safe.` : "No graded tasks yet."}
        </p>
      )}
    </Card>
  );
}