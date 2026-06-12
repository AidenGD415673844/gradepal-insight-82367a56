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
        <BarChart data={data} margin={{ top: 6, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={32} />
          <Tooltip formatter={(v, key) => [`${Number(v).toFixed(1)}%`, String(key)]} />
          {props.goalPct != null && (
            <ReferenceLine
              y={props.goalPct}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              label={{ value: `Goal ${props.goalPct}%`, position: "right", fontSize: 9 }}
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