import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
  ReferenceLine,
  Legend,
} from "recharts";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter } from "@/lib/grade-utils";
import { useSyllabusUnits, masteryIndex } from "@/lib/syllabus-store";
import { Activity, Gauge, TrendingUp, Zap, Shield, Thermometer, Brain, Sigma } from "lucide-react";

export const Route = createFileRoute("/forecasting")({
  head: () => ({
    meta: [
      { title: "Strategic Forecasting Hub — GradeCalc" },
      { name: "description", content: "Local Monte Carlo simulations, cone-of-uncertainty trajectories, GPA velocity dials and burnout thermometer — all serverless." },
    ],
  }),
  component: ForecastingHub,
});

// ---------- shared helpers (pure, client-side) ----------
function pctOf(t: { score: number; maxScore: number }) {
  return t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0;
}
function stddev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}
function ema(values: number[], k = 0.4) {
  if (!values.length) return 0;
  let v = values[0];
  for (let i = 1; i < values.length; i++) v = k * values[i] + (1 - k) * v;
  return v;
}
function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function ForecastingHub() {
  const { courses, tasks, scale, settings, subjectGoals } = useGrades();
  const [selected, setSelected] = useState<string>(courses[0]?.id ?? "");
  const course = courses.find((c) => c.id === selected) ?? courses[0];

  return (
    <AppShell
      title="Strategic Forecasting Hub"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/grades">Grades</Link>
        </Button>
      }
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold mr-2">Subject focus:</span>
          {courses.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={selected === c.id ? "default" : "outline"}
              onClick={() => setSelected(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </Card>

      {course && (
        <>
          <ConeOfUncertainty course={course} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <MonteCarloMatrix />
            <BurnoutThermometer />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <GPAVelocityGauge />
            <HalfLifeDecay />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ElasticityWidget course={course} />
            <EffortEfficiency />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <CeilingDeficit />
            <DeficitInsurance course={course} />
          </div>
          <CorrelationHeatmap />
        </>
      )}
    </AppShell>
  );

  // shared closures
  function avgForCourse(id: string) {
    return calcAverage(
      tasks.filter((t) => t.courseId === id),
      settings.weighted,
    );
  }
  function goalFor(id: string) {
    return subjectGoals[id] ?? settings.goal;
  }

  // =================================================================
  // 1. CONE OF UNCERTAINTY
  // =================================================================
  function ConeOfUncertainty({ course }: { course: NonNullable<typeof courses[0]> }) {
    const WEEKS = 8;
    const courseTasks = tasks.filter((t) => t.courseId === course.id && !t.pending);
    const scored = courseTasks
      .filter((t) => t.maxScore > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const avg = avgForCourse(course.id);
    const goal = goalFor(course.id);
    const units = useSyllabusUnitsSafe(course.id);
    const mIdx = masteryIndex(units) ?? avg;
    const ceiling = clamp(80 + (mIdx / 100) * 20, avg, 100);

    // 14-day EMA on percentages
    const cutoff = Date.now() - 14 * 86400000;
    const recent = scored.filter((t) => new Date(t.date).getTime() >= cutoff).map(pctOf);
    const emaVal = recent.length ? ema(recent) : avg;
    const slopePerWk = recent.length >= 2 ? (emaVal - avg) / 2 : 0;

    const sd = stddev(scored.map(pctOf));
    const fatigueDrop = avg - 1.5 * (sd || 3);

    // Goal convergence: linear convergence toward goal
    const goalSlope = (goal - avg) / WEEKS;

    const data = useMemo(() => {
      const rows: Array<Record<string, number | string>> = [];
      for (let w = 0; w <= WEEKS; w++) {
        const red = avg;
        const green = clamp(avg + slopePerWk * w, 0, 100);
        const blue = clamp(avg + ((ceiling - avg) * w) / WEEKS, 0, 100);
        const yellow = clamp(fatigueDrop + (avg - fatigueDrop) * 0.1 * w - w * 0.5, 0, 100);
        const purple = clamp(avg + goalSlope * w, 0, 100);
        const hi = Math.max(red, green, blue, yellow, purple);
        const lo = Math.min(red, green, blue, yellow, purple);
        rows.push({
          week: w === 0 ? "Today" : `W+${w}`,
          red, green, blue, yellow, purple,
          band: [lo, hi],
          hi, lo,
        });
      }
      return rows;
    }, [avg, slopePerWk, ceiling, fatigueDrop, goalSlope]);

    const [visible, setVisible] = useState({
      red: true, green: true, blue: true, yellow: true, purple: true,
    });
    const toggle = (k: keyof typeof visible) => setVisible((v) => ({ ...v, [k]: !v[k] }));

    const legend: Array<{ k: keyof typeof visible; label: string; color: string; desc: string }> = [
      { k: "red", label: "Historical Baseline", color: "#ef4444", desc: "Flat cumulative average" },
      { k: "green", label: "Recent Momentum", color: "#22c55e", desc: "14-day EMA velocity" },
      { k: "blue", label: "Syllabus Potential", color: "#3b82f6", desc: "Ceiling from mastery" },
      { k: "yellow", label: "Fatigue Risk", color: "#eab308", desc: "-1.5σ drop corridor" },
      { k: "purple", label: "Goal Convergence", color: "#a855f7", desc: `Required to hit ${goal}%` },
    ];

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-500" />
          <h2 className="text-lg font-bold">Grade Cone of Uncertainty — {course.name}</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Five client-side projection paths over the next {WEEKS} weeks. The shaded corridor spans the
          highest and lowest helper at every timeline step.
        </p>
        <div className="h-[340px] w-full">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="band"
                stroke="none"
                fill="url(#coneGrad)"
                isAnimationActive={false}
              />
              <defs>
                <linearGradient id="coneGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <ReferenceLine
                x="Today"
                stroke="#c026d3"
                strokeDasharray="4 3"
                strokeWidth={2}
                label={{ value: "Today", position: "top", fill: "#c026d3", fontSize: 11, fontWeight: 700 }}
              />
              <ReferenceLine y={goal} stroke="hsl(142 71% 45%)" strokeDasharray="5 5" strokeWidth={2}
                label={{ value: `Goal ${goal}%`, position: "right", fill: "hsl(142 71% 35%)", fontSize: 11, fontWeight: 700 }}
              />
              {legend.map((l) =>
                visible[l.k] ? (
                  <Line
                    key={l.k}
                    type="monotone"
                    dataKey={l.k}
                    stroke={l.color}
                    strokeDasharray="4 3"
                    strokeWidth={1.75}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : null,
              )}
              <Legend wrapperStyle={{ display: "none" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {legend.map((l) => (
            <button
              key={l.k}
              type="button"
              onClick={() => toggle(l.k)}
              className={`text-left rounded-lg border px-2.5 py-2 transition ${
                visible[l.k] ? "bg-card" : "bg-muted/50 opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
                <span className="text-xs font-bold">{l.label}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{l.desc}</div>
            </button>
          ))}
        </div>
      </Card>
    );
  }

  // =================================================================
  // 2. MONTE CARLO MATRIX
  // =================================================================
  function MonteCarloMatrix() {
    const TRIALS = 100;
    const results = useMemo(() => {
      return courses.map((c) => {
        const ct = tasks.filter((t) => t.courseId === c.id);
        const completed = ct.filter((t) => !t.pending);
        const pending = ct.filter((t) => t.pending);
        const baseAvg = calcAverage(completed, settings.weighted);
        if (!completed.length) {
          return { course: c, aStar: 0, a: 0, drop: 0, breakthrough: 0, baseLetter: "—", baseAvg: 0 };
        }
        let aStar = 0, a = 0, drop = 0, breakthrough = 0;
        const baseLetterRow = getLetter(baseAvg, scale);
        const baseLetter = baseLetterRow?.letter ?? "—";
        for (let i = 0; i < TRIALS; i++) {
          const trial = [...completed];
          for (const p of pending) {
            const variance = (Math.random() - 0.5) * 30; // ±15%
            const simPct = clamp(baseAvg + variance, 0, 100);
            trial.push({ ...p, score: (simPct / 100) * (p.maxScore || 100), maxScore: p.maxScore || 100, pending: false });
          }
          const avg = calcAverage(trial, settings.weighted);
          if (avg >= 91) aStar++;
          if (avg >= 81 && avg < 91) a++;
          const newLetter = getLetter(avg, scale)?.letter ?? "—";
          if (rankLetter(newLetter) < rankLetter(baseLetter)) drop++;
          if (rankLetter(newLetter) > rankLetter(baseLetter)) breakthrough++;
        }
        return {
          course: c,
          aStar: Math.round((aStar / TRIALS) * 100),
          a: Math.round((a / TRIALS) * 100),
          drop: Math.round((drop / TRIALS) * 100),
          breakthrough: Math.round((breakthrough / TRIALS) * 100),
          baseLetter,
          baseAvg,
        };
      });
    }, [courses, tasks, settings.weighted, scale]);

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sigma className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold">Monte Carlo Probability Matrix</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          100 randomized trials per subject (±15% variance on pending tasks). Pure client compute.
        </p>
        <div className="space-y-2">
          {results.map((r) => {
            const showBreakthrough = ["B", "A", "A*"].includes(r.baseLetter);
            return (
              <div key={r.course.id} className="rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{r.course.name}</div>
                  <Badge variant="outline">{r.baseLetter} · {r.baseAvg.toFixed(1)}%</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                    A*: {r.aStar}%
                  </Badge>
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30">
                    A: {r.a}%
                  </Badge>
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30">
                    Drop tier: {r.drop}%
                  </Badge>
                  {showBreakthrough && (
                    <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">
                      Breakthrough to next tier: {r.breakthrough}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // =================================================================
  // 3. HALF-LIFE DECAY
  // =================================================================
  function HalfLifeDecay() {
    const HL_DAYS = 14; // half-life
    const lambda = Math.log(2) / HL_DAYS;
    const now = Date.now();
    const data = courses.map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id);
      if (!ct.length) return { course: c, retention: 0, gapDays: Infinity };
      const lastTs = Math.max(...ct.map((t) => new Date(t.date).getTime()));
      const gapDays = (now - lastTs) / 86400000;
      const retention = Math.exp(-lambda * gapDays) * 100;
      return { course: c, retention, gapDays };
    });
    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-pink-500" />
          <h2 className="text-lg font-bold">Grade Half-Life Retention</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Exponential decay N(t) = e^(-λt) on the gap since each subject's last logged task.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {data.map(({ course, retention, gapDays }) => {
            const pct = Math.round(retention);
            const stale = gapDays > 7;
            return (
              <div key={course.id} className="rounded-xl border p-3 text-center">
                <div className="relative mx-auto h-20 w-20">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={pct >= 70 ? "#22c55e" : pct >= 40 ? "#eab308" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${pct} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {pct}%
                  </div>
                </div>
                <div className="text-xs font-semibold mt-1 truncate">{course.name}</div>
                {stale && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    Asymptotic memory decay detected. Initialize a review block to stabilize retention.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // =================================================================
  // 5. GPA VELOCITY GAUGE
  // =================================================================
  function GPAVelocityGauge() {
    const { vel, accel, currentGPA } = useMemo(() => {
      const points = computeWeeklyGPA(courses, tasks, scale);
      const currentGPA = points.length ? points[points.length - 1].gpa : 0;
      let vel = 0, accel = 0;
      if (points.length >= 2) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        vel = last.gpa - prev.gpa;
      }
      if (points.length >= 3) {
        const a = points[points.length - 3].gpa;
        const b = points[points.length - 2].gpa;
        const c = points[points.length - 1].gpa;
        accel = (c - b) - (b - a);
      }
      return { vel, accel, currentGPA };
    }, []);

    // Needle angles (gauge from -90deg = 0 to +90deg = 4)
    const needleAngle = (v: number) => -90 + clamp(v / 4, 0, 1) * 180;
    const projected = clamp(currentGPA + vel * 4, 0, 4); // 4-week forward

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-cyan-500" />
          <h2 className="text-lg font-bold">GPA Velocity Vector</h2>
        </div>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 200 120" className="w-full max-w-xs">
            <defs>
              <linearGradient id="gaugeArc" x1="0" x2="1">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeArc)" strokeWidth="14" strokeLinecap="round" />
            {/* tick marks */}
            {[0, 1, 2, 3, 4].map((v) => {
              const a = ((-90 + (v / 4) * 180) * Math.PI) / 180;
              const x1 = 100 + Math.cos(a) * 72;
              const y1 = 100 + Math.sin(a) * 72;
              const x2 = 100 + Math.cos(a) * 60;
              const y2 = 100 + Math.sin(a) * 60;
              return (
                <g key={v}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--foreground))" strokeWidth="1.5" />
                  <text x={100 + Math.cos(a) * 50} y={100 + Math.sin(a) * 50 + 3} textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
                    {v}
                  </text>
                </g>
              );
            })}
            {/* ghosted projected needle */}
            <line
              x1="100" y1="100"
              x2={100 + Math.cos((needleAngle(projected) * Math.PI) / 180) * 70}
              y2={100 + Math.sin((needleAngle(projected) * Math.PI) / 180) * 70}
              stroke="#a855f7" strokeWidth="3" strokeLinecap="round" opacity="0.5"
              style={{ filter: "drop-shadow(0 0 4px #a855f7)" }}
            />
            {/* primary needle */}
            <line
              x1="100" y1="100"
              x2={100 + Math.cos((needleAngle(currentGPA) * Math.PI) / 180) * 70}
              y2={100 + Math.sin((needleAngle(currentGPA) * Math.PI) / 180) * 70}
              stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="5" fill="hsl(var(--foreground))" />
          </svg>
          <div className="text-3xl font-extrabold tabular-nums">{currentGPA.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Current GPA</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">GPA Velocity</div>
            <div className={`text-lg font-bold tabular-nums ${vel >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {vel >= 0 ? "+" : ""}{vel.toFixed(2)} pts/wk
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">GPA Acceleration</div>
            <div className={`text-lg font-bold tabular-nums ${accel >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {accel >= 0 ? "+" : ""}{accel.toFixed(2)} pts/wk²
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // =================================================================
  // 6. ELASTICITY
  // =================================================================
  function ElasticityWidget({ course }: { course: NonNullable<typeof courses[0]> }) {
    const ct = tasks.filter((t) => t.courseId === course.id && !t.pending);
    const [nextScore, setNextScore] = useState(85);
    const [nextWeight, setNextWeight] = useState(1);
    const baseAvg = calcAverage(ct, settings.weighted);
    const simulated = calcAverage(
      [...ct, { id: "sim", courseId: course.id, name: "sim", score: nextScore, maxScore: 100, weight: nextWeight, category: "x", date: "2099-01-01" }],
      settings.weighted,
    );
    const deltaFinal = simulated - baseAvg;
    const deltaInput = nextScore - baseAvg;
    const elasticity = Math.abs(deltaInput) < 0.0001 ? 0 : Math.abs(deltaFinal / deltaInput);
    const highSensitivity = ct.length < 4;

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">Grade Elasticity — {course.name}</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Next task score: <strong>{nextScore}%</strong></span>
            <span className="text-muted-foreground">Weight: {nextWeight.toFixed(1)}×</span>
          </div>
          <Slider value={[nextScore]} min={0} max={100} step={1} onValueChange={(v) => setNextScore(v[0])} />
          <Slider value={[nextWeight * 10]} min={1} max={50} step={1} onValueChange={(v) => setNextWeight(v[0] / 10)} />
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Elasticity Factor</div>
            <div className="text-2xl font-bold tabular-nums">{elasticity.toFixed(3)}</div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <div className="text-xs text-muted-foreground">Avg shift</div>
            <div className={`text-2xl font-bold tabular-nums ${deltaFinal >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {deltaFinal >= 0 ? "+" : ""}{deltaFinal.toFixed(2)}%
            </div>
          </div>
        </div>
        {highSensitivity && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
            <strong className="text-amber-700 dark:text-amber-300">High Sensitivity:</strong> with only {ct.length} banked task{ct.length === 1 ? "" : "s"}, upcoming evaluations exert disproportionate leverage over the master letter tier. Each task swing can shift the bracket.
          </div>
        )}
      </Card>
    );
  }

  // =================================================================
  // 4. CORRELATION HEATMAP
  // =================================================================
  function CorrelationHeatmap() {
    const cats = settings ? Array.from(new Set(tasks.map((t) => t.category))).slice(0, 6) : [];
    const matrix = useMemo(() => {
      return cats.map((a) =>
        cats.map((b) => {
          const pairs: Array<[number, number]> = [];
          for (const c of courses) {
            const aTasks = tasks.filter((t) => t.courseId === c.id && t.category === a && !t.pending);
            const bTasks = tasks.filter((t) => t.courseId === c.id && t.category === b && !t.pending);
            if (aTasks.length && bTasks.length) {
              const aAvg = aTasks.reduce((s, t) => s + pctOf(t), 0) / aTasks.length;
              const bAvg = bTasks.reduce((s, t) => s + pctOf(t), 0) / bTasks.length;
              pairs.push([aAvg, bAvg]);
            }
          }
          return pearson(pairs);
        }),
      );
    }, [cats, courses, tasks]);

    if (cats.length < 2) {
      return (
        <Card className="p-5">
          <h2 className="text-lg font-bold mb-2">Category Correlation Heatmap</h2>
          <p className="text-xs text-muted-foreground">Need at least two categories with graded tasks.</p>
        </Card>
      );
    }

    return (
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold">Category Correlation Heatmap</h2>
        <p className="text-xs text-muted-foreground">Pearson r across category averages by subject.</p>
        <div className="overflow-auto">
          <div className="inline-grid gap-1" style={{ gridTemplateColumns: `120px repeat(${cats.length}, minmax(70px, 1fr))` }}>
            <div />
            {cats.map((c) => <div key={c} className="text-[11px] font-semibold text-center truncate">{c}</div>)}
            {cats.map((row, i) => (
              <>
                <div key={`l-${row}`} className="text-[11px] font-semibold truncate self-center">{row}</div>
                {cats.map((_, j) => {
                  const r = matrix[i][j];
                  const color = r > 0
                    ? `rgba(37, 99, 235, ${Math.abs(r)})`
                    : r < 0
                    ? `rgba(220, 38, 38, ${Math.abs(r)})`
                    : "rgba(120,120,120,0.2)";
                  return (
                    <div
                      key={`${i}-${j}`}
                      title={`r = ${r.toFixed(2)} — ${r > 0.4 ? "strong positive" : r < -0.4 ? "strong negative" : "weak/neutral"}`}
                      className="rounded-md h-12 flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: color }}
                    >
                      {Number.isFinite(r) ? r.toFixed(2) : "—"}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // =================================================================
  // 7. CEILING DEFICIT
  // =================================================================
  function CeilingDeficit() {
    const data = courses.map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending && t.maxScore > 0);
      if (!ct.length) return { course: c, deficit: 0 };
      const earned = ct.reduce((s, t) => s + t.score, 0);
      const max = ct.reduce((s, t) => s + t.maxScore, 0);
      const deficit = max === 0 ? 0 : (1 - earned / max) * 100;
      return { course: c, deficit };
    });
    return (
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold">Ceiling Deficit Ledger</h2>
        <p className="text-xs text-muted-foreground">Unrecoverable point loss against a flawless ceiling.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {data.map(({ course, deficit }) => {
            const pct = Math.min(100, deficit);
            return (
              <div key={course.id} className="rounded-xl border p-3 text-center">
                <div className="relative mx-auto h-20 w-20">
                  <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray={`${pct} 100`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                    -{deficit.toFixed(2)}%
                  </div>
                </div>
                <div className="text-xs font-semibold mt-1 truncate">{course.name}</div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  }

  // =================================================================
  // 8. EFFORT EFFICIENCY
  // =================================================================
  function EffortEfficiency() {
    const rows = courses.map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
      const avg = calcAverage(ct, settings.weighted);
      // marginal yield = how much one perfect new task moves the average
      const simulated = calcAverage(
        [...ct, { id: "y", courseId: c.id, name: "y", score: 100, maxScore: 100, weight: 1, category: "x", date: "2099-01-01" }],
        settings.weighted,
      );
      const yield_ = Math.max(0, simulated - avg);
      return { course: c, avg, yield: yield_ };
    });
    const sorted = [...rows].sort((a, b) => b.yield - a.yield);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    const efficiency = worst && best && best.yield > 0
      ? Math.round((worst.yield / best.yield) * 100)
      : 100;

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-bold">Effort Efficiency Index</h2>
        </div>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 200 110" className="w-full max-w-xs">
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke={efficiency >= 60 ? "#22c55e" : efficiency >= 30 ? "#eab308" : "#ef4444"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={`${(efficiency / 100) * 251} 251`}
            />
            <text x="100" y="90" textAnchor="middle" fontSize="22" fontWeight="800" fill="hsl(var(--foreground))">{efficiency}%</text>
          </svg>
        </div>
        {worst && best && worst.course.id !== best.course.id && (
          <p className="text-xs text-center text-muted-foreground px-3">
            Effort Efficiency is <strong>{efficiency}%</strong> for <strong>{worst.course.name}</strong> —
            a perfect score yields minimal acceleration. Reallocate study blocks to
            <strong> {best.course.name}</strong>, where the hourly yield factor is roughly{" "}
            <strong>{best.yield > 0 ? Math.round((best.yield / Math.max(worst.yield, 0.0001) - 1) * 100) : 0}%</strong> higher.
          </p>
        )}
      </Card>
    );
  }

  // =================================================================
  // 9. DEFICIT INSURANCE
  // =================================================================
  function DeficitInsurance({ course }: { course: NonNullable<typeof courses[0]> }) {
    const ct = tasks.filter((t) => t.courseId === course.id && !t.pending);
    const avg = calcAverage(ct, settings.weighted);
    const letterRow = getLetter(avg, scale);
    const sorted = [...scale].sort((a, b) => b.min - a.min);
    const idx = sorted.findIndex((r) => r.id === letterRow?.id);
    const floor = letterRow?.min ?? 0;

    // simulate score needed on a +1 weight, /100 task to keep avg >= floor
    let needed = 0;
    for (let s = 0; s <= 100; s += 0.5) {
      const sim = calcAverage(
        [...ct, { id: "i", courseId: course.id, name: "i", score: s, maxScore: 100, weight: 1, category: "x", date: "2099-01-01" }],
        settings.weighted,
      );
      if (sim >= floor) { needed = s; break; }
      needed = 100;
    }
    const nextLetter = idx > 0 ? sorted[idx - 1]?.letter : letterRow?.letter;

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-bold">Grade Deficit Insurance — {course.name}</h2>
        </div>
        <div className="rounded-lg border p-3 text-sm">
          <span className="font-semibold">{letterRow?.letter ?? "—"} Grade Insured:</span>{" "}
          Securing a minimum score of <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{needed.toFixed(1)}%</strong> on your next evaluation
          mathematically guarantees your <strong>{letterRow?.letter ?? "current"}</strong> letter grade tier remains locked.
        </div>
        {nextLetter && nextLetter !== letterRow?.letter && (
          <p className="text-xs text-muted-foreground">
            Next tier above: <strong>{nextLetter}</strong> (≥{sorted[idx - 1]?.min}%)
          </p>
        )}
      </Card>
    );
  }

  // =================================================================
  // 10. BURNOUT THERMOMETER
  // =================================================================
  function BurnoutThermometer() {
    const pendingCount = tasks.filter((t) => t.pending).length;
    const allPcts = tasks.filter((t) => !t.pending && t.maxScore > 0).map(pctOf);
    const sd = stddev(allPcts);
    let unmastered = 0;
    for (const c of courses) {
      const units = readSyllabusUnsafe()[c.id] ?? [];
      unmastered += units.filter((u: { level: string }) => u.level !== "green").length;
    }
    // Stress index 0..100
    const score = clamp(pendingCount * 6 + sd * 2 + unmastered * 4, 0, 100);
    const color = score < 33 ? "#38bdf8" : score < 66 ? "#f59e0b" : "#dc2626";
    const label = score < 33 ? "Optimal" : score < 66 ? "Heavy Workload" : "Critical Burnout Warning";
    const pulsing = score >= 66;

    return (
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-rose-500" />
          <h2 className="text-lg font-bold">Workload Stress Index</h2>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative h-44 w-12 rounded-full bg-muted/60 border overflow-hidden flex items-end">
            <div
              className={`w-full transition-all duration-700 ${pulsing ? "animate-pulse" : ""}`}
              style={{ height: `${score}%`, background: `linear-gradient(to top, ${color}, ${color}80)` }}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-8 w-8 rounded-full" style={{ background: color }} />
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-extrabold tabular-nums" style={{ color }}>
              {Math.round(score)}
            </div>
            <Badge style={{ background: color, color: "white" }}>{label}</Badge>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
              <div>Pending tasks: <strong>{pendingCount}</strong></div>
              <div>Score volatility (σ): <strong>{sd.toFixed(1)}%</strong></div>
              <div>Unmastered syllabus: <strong>{unmastered}</strong></div>
            </div>
          </div>
        </div>
      </Card>
    );
  }
}

// ---------- pure utilities ----------
function rankLetter(l: string): number {
  const map: Record<string, number> = { "A*": 7, A: 6, B: 5, C: 4, D: 3, E: 2, F: 1, G: 0 };
  return map[l] ?? 0;
}

function pearson(pairs: Array<[number, number]>): number {
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

function computeWeeklyGPA(
  courses: Array<{ id: string; credits: number }>,
  tasks: Array<{ courseId: string; score: number; maxScore: number; date: string; pending?: boolean; weight: number }>,
  scale: Array<{ min: number; gpa: number; letter: string }>,
): Array<{ week: string; gpa: number }> {
  const active = tasks.filter((t) => !t.pending && t.maxScore > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (!active.length) return [];
  const out: Array<{ week: string; gpa: number }> = [];
  const firstWeek = startOfWeek(new Date(active[0].date));
  const lastWeek = startOfWeek(new Date());
  for (let d = new Date(firstWeek); d <= lastWeek; d.setDate(d.getDate() + 7)) {
    const iso = d.toISOString().slice(0, 10);
    const upTo = active.filter((t) => t.date <= iso);
    let pts = 0, cr = 0;
    for (const c of courses) {
      if (!c.credits) continue;
      const ct = upTo.filter((t) => t.courseId === c.id);
      if (!ct.length) continue;
      const w = ct.reduce((s, t) => s + (t.weight || 1), 0);
      const avg = w === 0 ? 0 : ct.reduce((s, t) => s + (t.score / t.maxScore) * 100 * (t.weight || 1), 0) / w;
      const row = [...scale].sort((a, b) => b.min - a.min).find((r) => avg >= r.min);
      pts += (row?.gpa ?? 0) * c.credits;
      cr += c.credits;
    }
    out.push({ week: iso, gpa: cr ? pts / cr : 0 });
  }
  return out;
}

function startOfWeek(d: Date) {
  const n = new Date(d);
  n.setDate(n.getDate() - n.getDay());
  n.setHours(0, 0, 0, 0);
  return n;
}

function useSyllabusUnitsSafe(courseId: string) {
  // wrapper so the import is colocated
  return useSyllabusUnits(courseId);
}

function readSyllabusUnsafe(): Record<string, Array<{ level: string }>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("syllabus-mastery-v1") || "{}");
  } catch {
    return {};
  }
}