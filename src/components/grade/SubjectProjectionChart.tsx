import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ErrorBar,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Y-axis ticks aligned with the report card's letter-grade scale so the
 * chart reads as "B / A / A*" instead of arbitrary 30/60/90 numbers.
 */
const LETTER_TICKS: Array<{ y: number; label: string }> = [
  { y: 0, label: "NA" },
  { y: 41, label: "E" },
  { y: 51, label: "D" },
  { y: 61, label: "C" },
  { y: 71, label: "B" },
  { y: 81, label: "A" },
  { y: 91, label: "A*" },
];

function letterTickFormatter(v: number): string {
  const hit = [...LETTER_TICKS].reverse().find((t) => v >= t.y);
  return hit ? hit.label : "NA";
}

/**
 * Compact per-subject projection chart shown inside Bullet 6 of the
 * Report Card. Renders Current vs Projected with the goal reference
 * line and a ±margin error bar. Lives inside the printable
 * #academic-report region so it is captured by both PDF export and the
 * Save-to-History snapshot — no separate import/export plumbing needed.
 */
export function SubjectProjectionChart(props: {
  subjectName: string;
  current: number;
  projected: number;
  marginPp: number;
  goalPct: number | null;
  color?: string;
  onTrack: boolean;
}) {
  const data = [
    {
      name: props.subjectName,
      Current: Number(props.current.toFixed(1)),
      Projected: Number(props.projected.toFixed(1)),
      margin: Number(props.marginPp.toFixed(1)),
    },
  ];
  return (
    <div className="h-44 w-full mt-2 mb-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis
            domain={[0, 100]}
            ticks={LETTER_TICKS.map((t) => t.y)}
            tickFormatter={letterTickFormatter}
            tick={{ fontSize: 10 }}
            width={32}
          />
          <Tooltip formatter={(v, key) => [`${Number(v).toFixed(1)}% (${letterTickFormatter(Number(v))})`, String(key)]} />
          {props.goalPct != null && (
            <ReferenceLine
              y={props.goalPct}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{
                value: `Goal ${letterTickFormatter(props.goalPct)}`,
                position: "insideTopRight",
                fontSize: 9,
                fill: "hsl(var(--primary))",
              }}
            />
          )}
          <Bar dataKey="Current" radius={[3, 3, 0, 0]}>
            <Cell fill={props.color ?? "hsl(var(--muted-foreground))"} fillOpacity={0.55} />
          </Bar>
          <Bar dataKey="Projected" radius={[3, 3, 0, 0]}>
            <Cell
              fill={
                props.onTrack
                  ? "hsl(var(--success, 142 71% 45%))"
                  : "hsl(var(--destructive))"
              }
            />
            <ErrorBar dataKey="margin" width={4} stroke="hsl(var(--foreground))" opacity={0.5} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}