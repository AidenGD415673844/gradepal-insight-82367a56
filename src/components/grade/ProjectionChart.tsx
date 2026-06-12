import { useMemo, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { calcAverage, filterByTerm } from "@/lib/grade-utils";
import { projectGrade, HORIZON_OPTIONS } from "@/lib/grade-projection";
import { TrendingUp, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Per-category snapshot: current avg, rolling velocity slope, and the
 * projected grade at the user-selected horizon, with a goal-comparison
 * read-out (% difference + on-track / at-risk).
 */
export function ProjectionChart() {
  const { courses, tasks, settings, terms, activeTermId } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const [weeks, setWeeks] = useState<number>(4.345);

  const rows = useMemo(() => {
    return courses
      .map((c) => {
        const done = filterByTerm(tasks, activeTerm).filter(
          (t) => t.courseId === c.id && !t.pending,
        );
        const avg = calcAverage(done, settings.weighted);
        const proj = projectGrade(done, avg, weeks);
        const goalDelta = proj.projected - settings.goal;
        return {
          id: c.id,
          name: c.name,
          color: c.color,
          avg,
          projected: proj.projected,
          slope: proj.slopePerWeek,
          margin: proj.marginPp,
          sample: proj.sample,
          source: proj.source,
          goalDelta,
          onTrack: goalDelta >= 0,
          hasData: done.length > 0,
        };
      })
      .filter((r) => r.hasData);
  }, [courses, tasks, activeTerm, settings.weighted, settings.goal, weeks]);

  if (rows.length === 0) {
    return null;
  }

  const data = rows.map((r) => ({
    name: r.name,
    Current: Number(r.avg.toFixed(1)),
    Projected: Number(r.projected.toFixed(1)),
    margin: Number(r.margin.toFixed(1)),
    slope: r.slope,
    goalDelta: r.goalDelta,
    onTrack: r.onTrack,
    color: r.color,
  }));

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Projection Snapshot</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Goal {settings.goal}% · Horizon
          </span>
          <select
            aria-label="Projection horizon"
            value={String(weeks)}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="h-7 rounded-md border bg-background px-2 text-xs font-medium"
          >
            {HORIZON_OPTIONS.map((o) => (
              <option key={o.label} value={o.weeks}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(v, key) => [`${Number(v).toFixed(1)}%`, String(key)]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              y={settings.goal}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{ value: `Goal ${settings.goal}%`, position: "right", fontSize: 10 }}
            />
            <Bar dataKey="Current" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color ?? "hsl(var(--muted-foreground))"} fillOpacity={0.55} />
              ))}
            </Bar>
            <Bar dataKey="Projected" radius={[4, 4, 0, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.onTrack ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                />
              ))}
              <ErrorBar dataKey="margin" width={4} stroke="hsl(var(--foreground))" opacity={0.5} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        {rows.map((r) => (
          <li
            key={r.id}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border ${
              r.onTrack
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-900"
                : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-900"
            }`}
          >
            {r.onTrack ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="font-semibold truncate">{r.name}</span>
            <span className="tabular-nums">
              {r.projected.toFixed(1)}% vs {settings.goal}% goal ·{" "}
              <span className="font-medium">
                {r.goalDelta >= 0 ? "+" : ""}
                {r.goalDelta.toFixed(1)}pp
              </span>
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-wide opacity-80">
              {r.onTrack ? "On track" : "At risk"}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}