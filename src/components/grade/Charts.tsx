import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { getLetter, filterByTerm } from "@/lib/grade-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * LazyMount — defers rendering of expensive children until the wrapper
 * scrolls into the viewport. Used to keep initial render fast even with
 * 150+ tasks; large chart datasets only compute when the user actually
 * sees the panel.
 */
function LazyMount({ minHeight = 200, children }: { minHeight?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);
  return (
    <div ref={ref} style={{ minHeight }}>
      {visible ? children : (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
          Loading chart…
        </div>
      )}
    </div>
  );
}

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

/** Hidden-by-default dot. Reveals a labeled marker when clicked OR when focused
 *  via keyboard (Tab) and toggled with Enter/Space. Keeps lines clean while
 *  remaining accessible. */
function makeRevealDot(
  activeIndex: number | null,
  setActive: (updater: (prev: number | null) => number | null) => void,
  color: string,
) {
  return (props: { cx?: number; cy?: number; index?: number; value?: number }) => {
    const { cx, cy, index, value } = props;
    if (cx == null || cy == null || index == null) return <g />;
    const active = activeIndex === index;
    return (
      <g>
        {/* Invisible focusable hit target — keyboard users can Tab to it and
            press Enter/Space to toggle the value reveal. */}
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill="transparent"
          tabIndex={0}
          role="button"
          aria-label={`Reveal score ${value}% at point ${index + 1}`}
          aria-pressed={active}
          style={{ cursor: "pointer", outline: "none" }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActive((prev) => (prev === index ? null : index));
            }
          }}
          onFocus={() => setActive(() => index)}
        />
        {active && (
          <>
            <circle cx={cx} cy={cy} r={5} fill={color} stroke="var(--background)" strokeWidth={2} />
            <text
              x={cx}
              y={cy - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--foreground)"
            >
              {value}%
            </text>
          </>
        )}
      </g>
    );
  };
}

export function GradesBarChart() {
  const { tasks, settings, courses, scale, terms, activeTermId } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const filtered = filterByTerm(tasks, activeTerm)
    .filter((t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse)
    .filter((t) => !t.pending);

  const data = filtered.map((t) => ({
    name: t.name.length > 12 ? t.name.slice(0, 12) + "…" : t.name,
    pct: Number(((t.score / t.maxScore) * 100).toFixed(1)),
    color: courses.find((c) => c.id === t.courseId)?.color ?? "var(--primary)",
  }));

  // Y axis ticks at each grade scale min, label with letter
  const sortedScale = [...scale].sort((a, b) => a.min - b.min);
  const ticks = sortedScale.map((s) => s.min);
  const formatTick = (v: number) => getLetter(v, scale)?.letter ?? "";

  return (
    <Card className="p-5 shadow-soft backdrop-blur-xl bg-card/70 border-border/60">
      <h3 className="font-semibold text-lg mb-3">Task Scores</h3>
      <div className="h-52 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis
              stroke="var(--muted-foreground)"
              fontSize={11}
              domain={[0, 100]}
              ticks={ticks}
              tickFormatter={formatTick}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
              formatter={(v: number) => [
                `${v}% (${getLetter(v, scale)?.letter ?? "—"})`,
                "Grade",
              ]}
            />
            <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function GradeDistributionPie() {
  const { tasks, scale, settings, terms, activeTermId } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const filtered = filterByTerm(tasks, activeTerm)
    .filter((t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse)
    .filter((t) => !t.pending);


  const counts = new Map<string, number>();
  for (const t of filtered) {
    const pct = (t.score / t.maxScore) * 100;
    const letter = getLetter(pct, scale)?.letter ?? "?";
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  const data = Array.from(counts.entries()).map(([letter, value]) => ({ letter, value }));
  const palette = [
    "oklch(0.55 0.22 275)",
    "oklch(0.6 0.16 155)",
    "oklch(0.72 0.17 65)",
    "oklch(0.62 0.22 25)",
    "oklch(0.6 0.15 220)",
    "oklch(0.65 0.2 320)",
  ];

  return (
    <Card className="p-5 shadow-soft backdrop-blur-xl bg-card/70 border-border/60">
      <h3 className="font-semibold text-lg mb-3">Grade Distribution</h3>
      <div className="h-52 sm:h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="letter"
                outerRadius={80}
                innerRadius={45}
                label={(p) => p.letter}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={palette[i % palette.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

export function PerformanceOverTime() {
  const { tasks, courses, scale, terms, activeTermId } = useGrades();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [lineCourse, setLineCourse] = useState<string>(courses[0]?.id ?? "");
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const filtered = filterByTerm(tasks, activeTerm)
    .filter((t) => t.courseId === lineCourse)
    .filter((t) => !t.pending)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Single-course trajectory
  const activeCourses = courses.filter((c) => c.id === lineCourse);
  const dates = Array.from(new Set(filtered.map((t) => t.date))).sort();


  const data: Record<string, number | string>[] = dates.map((date) => {
    const row: Record<string, number | string> = { date };
    for (const c of activeCourses) {
      const upTo = filtered.filter((t) => t.courseId === c.id && t.date <= date);
      if (upTo.length) {
        const totalW = upTo.reduce((s, t) => s + (t.weight || 1), 0);
        const avg =
          upTo.reduce((s, t) => s + (t.score / t.maxScore) * 100 * (t.weight || 1), 0) / totalW;
        row[c.name] = Number(avg.toFixed(1));
      }
    }
    return row;
  });

  // Projection: weighted moving average of last up to 3 cumulative values, extended 3 dates forward.
  if (data.length >= 2 && dates.length) {
    const lastDate = new Date(dates[dates.length - 1]);
    const futureDates = [7, 14, 21].map((d) =>
      new Date(lastDate.getTime() + d * 86400000).toISOString().slice(0, 10),
    );
    const bridge: Record<string, number | string> = { date: dates[dates.length - 1] };
    for (const c of activeCourses) {
      const series = data
        .map((r) => r[c.name])
        .filter((v): v is number => typeof v === "number");
      if (series.length >= 2) {
        const last = series[series.length - 1];
        bridge[`${c.name} (proj)`] = last;
      }
    }
    data.push(bridge);
    for (const fd of futureDates) {
      const row: Record<string, number | string> = { date: fd };
      for (const c of activeCourses) {
        const series = data
          .map((r) => r[c.name])
          .filter((v): v is number => typeof v === "number");
        if (series.length >= 2) {
          const recent = series.slice(-3);
          const weights = recent.map((_, i) => i + 1);
          const wSum = weights.reduce((a, b) => a + b, 0);
          const wma = recent.reduce((s, v, i) => s + v * weights[i], 0) / wSum;
          const slope = series[series.length - 1] - series[series.length - 2];
          const projSeries = data
            .map((r) => r[`${c.name} (proj)`])
            .filter((v): v is number => typeof v === "number");
          const step = projSeries.length;
          const projected = Math.max(0, Math.min(100, wma + slope * step * 0.5));
          row[`${c.name} (proj)`] = Number(projected.toFixed(1));
        }
      }
      data.push(row);
    }
  }

  const sortedScale = [...scale].sort((a, b) => a.min - b.min);
  const ticks = sortedScale.map((s) => s.min);

  return (
    <Card className="p-5 shadow-soft backdrop-blur-xl bg-card/70 border-border/60">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-semibold text-lg">Performance Over Time</h3>
        <Select value={lineCourse} onValueChange={setLineCourse}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Choose subject" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Solid = actual cumulative average. Dashed = projection. Click any point on the line to
        reveal its score.
      </p>

      <LazyMount minHeight={208}><div className="h-56 sm:h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
              onClick={(state: { activeTooltipIndex?: number } | null) => {
                if (state && typeof state.activeTooltipIndex === "number") {
                  setActiveIdx((prev) =>
                    prev === state.activeTooltipIndex ? null : state.activeTooltipIndex!,
                  );
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                domain={[0, 100]}
                ticks={ticks}
                tickFormatter={(v) => getLetter(v, scale)?.letter ?? ""}
                stroke="var(--muted-foreground)"
                fontSize={11}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                formatter={(v: number) => `${v}% (${getLetter(v, scale)?.letter ?? "—"})`}
              />
              <Legend />
              {activeCourses.map((c) => (
                <Line
                  key={c.id}
                  type="monotone"
                  dataKey={c.name}
                  stroke={c.color}
                  strokeWidth={2.5}
                  dot={makeRevealDot(activeIdx, setActiveIdx, c.color)}
                  activeDot={{ r: 5, stroke: "var(--background)", strokeWidth: 2 }}
                  connectNulls
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              ))}
              {activeCourses.map((c) => (
                <Line
                  key={`${c.id}-proj`}
                  type="monotone"
                  dataKey={`${c.name} (proj)`}
                  stroke={c.color}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  activeDot={false}
                  connectNulls
                  opacity={0.6}
                  animationDuration={900}
                  animationEasing="ease-out"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div></LazyMount>
    </Card>
  );
}


// Cumulative overall trajectory across ALL tasks chronologically
export function CumulativeTrajectory() {
  const { tasks, settings, scale } = useGrades();
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const filtered = tasks
    .filter((t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse)
    .filter((t) => !t.pending)
    .sort((a, b) => a.date.localeCompare(b.date));

  let runW = 0;
  let runS = 0;
  const data = filtered.map((t) => {
    const w = t.weight || 1;
    runW += w;
    runS += (t.score / t.maxScore) * 100 * w;
    return {
      date: t.date,
      label: t.name.length > 10 ? t.name.slice(0, 10) + "…" : t.name,
      cumulative: Number((runS / runW).toFixed(1)),
    };
  });

  const sortedScale = [...scale].sort((a, b) => a.min - b.min);
  const ticks = sortedScale.map((s) => s.min);

  return (
    <Card className="p-5 shadow-soft backdrop-blur-xl bg-card/70 border-border/60">
      <h3 className="font-semibold text-lg mb-3">Cumulative Grade Trajectory</h3>
      <p className="text-xs text-muted-foreground mb-2">
        Click any point on the line to reveal its exact score.
      </p>
      <LazyMount minHeight={208}><div className="h-56 sm:h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
              onClick={(state: { activeTooltipIndex?: number } | null) => {
                if (state && typeof state.activeTooltipIndex === "number") {
                  setActiveIdx((prev) =>
                    prev === state.activeTooltipIndex ? null : state.activeTooltipIndex!,
                  );
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                domain={[0, 100]}
                ticks={ticks}
                tickFormatter={(v) => getLetter(v, scale)?.letter ?? ""}
                stroke="var(--muted-foreground)"
                fontSize={11}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                }}
                formatter={(v: number) => `${v}% (${getLetter(v, scale)?.letter ?? "—"})`}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="var(--primary)"
                strokeWidth={3}
                dot={makeRevealDot(activeIdx, setActiveIdx, "var(--primary)")}
                activeDot={{ r: 5, stroke: "var(--background)", strokeWidth: 2 }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div></LazyMount>
    </Card>
  );
}

