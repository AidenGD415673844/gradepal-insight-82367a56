import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUIPrefs } from "@/lib/ui-prefs";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter } from "@/lib/grade-utils";
import { Target, TrendingUp, Shield, Activity, Sparkles, Settings } from "lucide-react";

export const Route = createFileRoute("/advanced")({
  head: () => ({
    meta: [
      { title: "Advanced Features — GradeCalc" },
      { name: "description", content: "Pareto matrix, EMA sparkline, Black Swan stress, skewness profile and convergence anchor — all client-side." },
    ],
  }),
  component: AdvancedPage,
});

type Labels = {
  pareto: string;
  ema: string;
  blackSwan: string;
  skewness: string;
  convergence: string;
};

const PRO_LABELS: Labels = {
  pareto: "Pareto Yield Matrix",
  ema: "Exponential Moving Average",
  blackSwan: "Black Swan Factor",
  skewness: "Third-Moment Skewness",
  convergence: "Convergence Alignment",
};
const SIMPLE_LABELS: Labels = {
  pareto: "High-Impact Focus Categories",
  ema: "Recent Performance Pacing",
  blackSwan: "Grade Security Analysis",
  skewness: "Grade Distribution Consistency Profile",
  convergence: "Target Achievement Baseline",
};

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function variance(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length;
}
function stddev(xs: number[]) { return Math.sqrt(variance(xs)); }
function skewness(xs: number[]) {
  if (xs.length < 3) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const sd = stddev(xs);
  if (sd === 0) return 0;
  const n = xs.length;
  return (xs.reduce((s, x) => s + ((x - m) / sd) ** 3, 0) * n) / ((n - 1) * (n - 2));
}
function emaSeries(values: number[], k = 0.3): number[] {
  if (!values.length) return [];
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(k * values[i] + (1 - k) * out[i - 1]);
  return out;
}
function pctOf(t: { score: number; maxScore: number }) {
  return t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0;
}

function AdvancedPage() {
  const [prefs] = useUIPrefs();
  const L = prefs.advancedStatsMode ? PRO_LABELS : SIMPLE_LABELS;
  const { courses, tasks, scale, settings, subjectGoals } = useGrades();

  return (
    <AppShell
      title="Advanced Features"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/settings"><Settings className="h-4 w-4 mr-1" />Toggle Mode</Link>
        </Button>
      }
    >
      <div className="space-y-5">
        <Card className="p-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <div>
              <div className="font-bold">
                {prefs.advancedStatsMode ? "Pro Analytics Mode" : "Simplified Mode"}
              </div>
              <p className="text-xs text-muted-foreground">
                Toggle <strong>Display Advanced Statistical Analytics</strong> in Settings to switch terminology.
              </p>
            </div>
          </div>
          <Badge variant="outline">{prefs.advancedStatsMode ? "Formal" : "Academic"}</Badge>
        </Card>

        <ParetoCard label={L.pareto} courses={courses} tasks={tasks} weighted={settings.weighted} />
        <EMACard label={L.ema} courses={courses} tasks={tasks} />
        <BlackSwanCard
          label={L.blackSwan}
          courses={courses}
          tasks={tasks}
          weighted={settings.weighted}
          scale={scale}
        />
        <SkewnessCard label={L.skewness} courses={courses} tasks={tasks} />
        <ConvergenceCard
          label={L.convergence}
          courses={courses}
          tasks={tasks}
          weighted={settings.weighted}
          subjectGoals={subjectGoals}
          defaultGoal={settings.goal}
        />
      </div>
    </AppShell>
  );
}

// --------------- 1. Pareto ----------------
function ParetoCard({
  label, courses, tasks, weighted,
}: { label: string; courses: any[]; tasks: any[]; weighted: boolean }) {
  const rows = useMemo(() => {
    const out: Array<{ key: string; courseName: string; category: string; multiplier: number; avg: number }> = [];
    for (const c of courses) {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
      const cats = Array.from(new Set(ct.map((t) => t.category)));
      for (const cat of cats) {
        const items = ct.filter((t) => t.category === cat);
        if (items.length < 2) continue;
        const weights = items.reduce((s, t) => s + (t.weight || 1), 0);
        const pcts = items.map(pctOf);
        const v = variance(pcts);
        const multiplier = weights * v;
        const avg = calcAverage(items, weighted);
        out.push({ key: `${c.id}-${cat}`, courseName: c.name, category: cat, multiplier, avg });
      }
    }
    return out.sort((a, b) => b.multiplier - a.multiplier).slice(0, 6);
  }, [courses, tasks, weighted]);

  const max = rows[0]?.multiplier ?? 1;

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-bold">{label}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Categories with the highest combined weight × variance — your most leveraged grading multipliers.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not enough graded tasks to compute leverage.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="font-semibold text-sm">
                  <span className="text-amber-600 dark:text-amber-400 mr-1">#{i + 1}</span>
                  {r.courseName} · <span className="text-muted-foreground">{r.category}</span>
                </div>
                <Badge variant="outline" className="tabular-nums">{r.avg.toFixed(1)}%</Badge>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-rose-500 rounded-full"
                  style={{ width: `${(r.multiplier / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// --------------- 2. EMA Sparkline ----------------
function EMACard({ label, courses, tasks }: { label: string; courses: any[]; tasks: any[] }) {
  const today = Date.now();
  const rows = useMemo(() => {
    return courses.map((c) => {
      const ct = tasks
        .filter((t) => t.courseId === c.id && !t.pending && t.maxScore > 0)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (ct.length < 2) return { course: c, ema14: 0, ema30: 0, points: [] as number[] };
      const recent14 = ct.filter((t) => today - new Date(t.date).getTime() <= 14 * 86400000).map(pctOf);
      const recent30 = ct.filter((t) => today - new Date(t.date).getTime() <= 30 * 86400000).map(pctOf);
      const s14 = emaSeries(recent14, 0.4);
      const s30 = emaSeries(recent30, 0.2);
      return {
        course: c,
        ema14: s14[s14.length - 1] ?? 0,
        ema30: s30[s30.length - 1] ?? 0,
        points: emaSeries(ct.map(pctOf), 0.25),
      };
    });
  }, [courses, tasks, today]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-bold">{label}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        14-day and 30-day exponential moving averages traced as a soft vector spark trail.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => {
          const pts = r.points;
          let path = "";
          if (pts.length >= 2) {
            const lo = Math.min(...pts), hi = Math.max(...pts);
            const range = hi - lo || 1;
            path = pts
              .map((p, i) => {
                const x = (i / (pts.length - 1)) * 100;
                const y = 30 - ((p - lo) / range) * 28;
                return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(" ");
          }
          const delta = r.ema14 - r.ema30;
          return (
            <div key={r.course.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-sm truncate">{r.course.name}</div>
                <Badge variant={delta >= 0 ? "default" : "destructive"}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                </Badge>
              </div>
              <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-16 mt-2">
                <path d={path} fill="none" stroke="hsl(217 91% 60%)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1 tabular-nums">
                <span>14d EMA: <strong className="text-foreground">{r.ema14.toFixed(1)}%</strong></span>
                <span>30d EMA: <strong className="text-foreground">{r.ema30.toFixed(1)}%</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --------------- 3. Black Swan ----------------
function BlackSwanCard({
  label, courses, tasks, weighted, scale,
}: { label: string; courses: any[]; tasks: any[]; weighted: boolean; scale: any[] }) {
  const rows = useMemo(() => {
    return courses.map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending && t.maxScore > 0);
      const pending = tasks.filter((t) => t.courseId === c.id && t.pending);
      const avg = calcAverage(ct, weighted);
      const sd = stddev(ct.map(pctOf));
      const baseLetter = getLetter(avg, scale)?.letter ?? "—";
      // -2.5σ shock on pending tasks
      const shockScore = clamp(avg - 2.5 * (sd || 5), 0, 100);
      const stressed = [
        ...ct,
        ...pending.map((p) => ({
          ...p,
          score: (shockScore / 100) * (p.maxScore || 100),
          maxScore: p.maxScore || 100,
          pending: false,
        })),
      ];
      const stressedAvg = calcAverage(stressed, weighted);
      const stressedLetter = getLetter(stressedAvg, scale)?.letter ?? "—";
      const protected_ = baseLetter === stressedLetter;
      const insulation = clamp(((stressedAvg - 0) / (avg - 0 || 1)) * 100, 0, 100);
      return { course: c, baseLetter, stressedLetter, avg, stressedAvg, protected: protected_, insulation };
    });
  }, [courses, tasks, weighted, scale]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-bold">{label}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Simulates a -2.5σ shock on every pending task, then measures which letter grades stay insulated.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div
            key={r.course.id}
            className={`rounded-xl border p-3 ${
              r.protected
                ? "bg-emerald-500/5 border-emerald-500/30"
                : "bg-rose-500/5 border-rose-500/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm truncate">{r.course.name}</div>
              <Badge variant={r.protected ? "default" : "destructive"}>
                {r.protected ? "Shield holds" : "Breach"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span>Now: <strong>{r.baseLetter}</strong> ({r.avg.toFixed(1)}%)</span>
              <span className="text-muted-foreground">→</span>
              <span>Under shock: <strong>{r.stressedLetter}</strong> ({r.stressedAvg.toFixed(1)}%)</span>
            </div>
            <div className="h-2 mt-2 bg-muted/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${r.protected ? "bg-emerald-500" : "bg-rose-500"}`}
                style={{ width: `${r.insulation.toFixed(1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --------------- 4. Skewness ----------------
function SkewnessCard({ label, courses, tasks }: { label: string; courses: any[]; tasks: any[] }) {
  const rows = useMemo(() => {
    return courses.map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending && t.maxScore > 0);
      const pcts = ct.map(pctOf);
      const sk = skewness(pcts);
      let archetype = "Balanced Performer";
      let detail = "Even distribution — neither bottom-heavy nor top-heavy.";
      if (sk < -0.5) {
        archetype = "Consistent Baseline Performer";
        detail = "Negative skew — most scores cluster high with a protected performance floor.";
      } else if (sk > 0.5) {
        archetype = "High-Ceiling Dynamic Performer";
        detail = "Positive skew — occasional breakout scores well above a steady baseline.";
      }
      return { course: c, skew: sk, archetype, detail, n: pcts.length };
    });
  }, [courses, tasks]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-fuchsia-500" />
        <h2 className="text-lg font-bold">{label}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Examines the third moment (skewness) of percentage arrays to classify your profile archetype.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.course.id} className="rounded-xl border p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm truncate">{r.course.name}</div>
              <Badge variant="outline" className="tabular-nums">γ₁ = {r.skew.toFixed(2)}</Badge>
            </div>
            <div className="text-sm font-bold">{r.archetype}</div>
            <div className="text-xs text-muted-foreground">{r.detail}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// --------------- 5. Convergence Anchor ----------------
function ConvergenceCard({
  label, courses, tasks, weighted, subjectGoals, defaultGoal,
}: {
  label: string; courses: any[]; tasks: any[]; weighted: boolean;
  subjectGoals: Record<string, number>; defaultGoal: number;
}) {
  const rows = useMemo(() => {
    return courses.map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
      const pending = tasks.filter((t) => t.courseId === c.id && t.pending);
      const avg = calcAverage(ct, weighted);
      const goal = subjectGoals[c.id] ?? defaultGoal;
      // Solve: average required on pending tasks (assuming /100, weight 1) so that final avg = goal
      let required = 0;
      let found = false;
      const pendingCount = Math.max(pending.length, 1);
      for (let s = 0; s <= 100; s += 0.5) {
        const sim = calcAverage(
          [
            ...ct,
            ...Array.from({ length: pendingCount }, (_, i) => ({
              id: `c${i}`, courseId: c.id, name: "c", score: s,
              maxScore: 100, weight: 1, category: "x", date: "2099-01-01",
            })),
          ],
          weighted,
        );
        if (sim >= goal) { required = s; found = true; break; }
        required = s;
      }
      return { course: c, avg, goal, required, found, gap: goal - avg };
    });
  }, [courses, tasks, weighted, subjectGoals, defaultGoal]);

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-bold">{label}</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Required average on remaining task completions to hit your aspirational goal by term-end.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.course.id} className="rounded-xl border p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm truncate">{r.course.name}</div>
              <Badge variant="outline">Goal {r.goal}%</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Current: <strong className="text-foreground">{r.avg.toFixed(1)}%</strong>
              {" · "}Gap: <strong className={r.gap > 0 ? "text-rose-500" : "text-emerald-500"}>
                {r.gap >= 0 ? "+" : ""}{r.gap.toFixed(1)}%
              </strong>
            </div>
            <div className="text-sm">
              Needed average on remaining tasks:{" "}
              <strong className={r.found ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                {r.found ? `${r.required.toFixed(1)}%` : "Unreachable from current trajectory"}
              </strong>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}