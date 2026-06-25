import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, Legend, Area, Line, ComposedChart } from "recharts";
import { TrendingDown } from "lucide-react";

export function LorenzGiniChart({ scores }: { scores: number[] }) {
  const { data, gini } = useMemo(() => {
    if (scores.length < 3) return { data: [] as { x: number; lorenz: number; equity: number }[], gini: 0 };
    const sorted = [...scores].sort((a, b) => a - b);
    const total = sorted.reduce((s, v) => s + v, 0);
    const n = sorted.length;
    let cum = 0;
    const pts = [{ x: 0, lorenz: 0, equity: 0 }];
    for (let i = 0; i < n; i++) {
      cum += sorted[i];
      pts.push({
        x: ((i + 1) / n) * 100,
        lorenz: total > 0 ? (cum / total) * 100 : 0,
        equity: ((i + 1) / n) * 100,
      });
    }
    let area = 0;
    for (let i = 1; i < pts.length; i++) {
      const w = (pts[i].x - pts[i - 1].x) / 100;
      area += ((pts[i].lorenz + pts[i - 1].lorenz) / 2 / 100) * w;
    }
    const g = Math.max(0, Math.min(1, 1 - 2 * area));
    return { data: pts, gini: g };
  }, [scores]);

  const verdict =
    gini < 0.1
      ? "Distribution is near-perfectly balanced — every assignment contributes evenly to the term mass."
      : gini < 0.2
        ? "Slight dispersion — performance is broadly uniform with mild outliers."
        : gini < 0.35
          ? "Moderate dispersion — a handful of assignments dominate the cumulative weight."
          : "High concentration — transcript mass is heavily skewed toward a few high-percentile entries; department weight dependency is significant.";

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className="h-4 w-4 text-fuchsia-500" />
        <h3 className="font-bold text-sm">Transcript Grade Dispersion Curve</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">Advanced only</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Lorenz distribution path of all logged assignment percentages this term, plotted against the line of absolute equity.
      </p>
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          Need at least 3 graded assignments to compute a distribution curve.
        </p>
      ) : (
        <>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <XAxis dataKey="x" type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="lorenz" name="Lorenz curve" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
                <Line type="monotone" dataKey="equity" name="Line of equity" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
                <ReferenceLine y={50} stroke="#cbd5e1" strokeDasharray="2 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 rounded-xl border bg-muted/30 p-3 flex items-center gap-4">
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Academic Gini</div>
              <div className="text-2xl font-extrabold tabular-nums">{gini.toFixed(1)}</div>
              <div className="text-[10px] text-muted-foreground">0 = equity · 1 = concentration</div>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">{verdict}</p>
          </div>
        </>
      )}
    </Card>
  );
}