import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";

type Row = { category: string; weight: number; avg: number };

export function SensitivityMatrix({ rows }: { rows: Row[] }) {
  const indexed = useMemo(() => {
    const out = rows.map((r) => ({ ...r, index: r.weight * (100 - r.avg) }));
    const max = Math.max(0.0001, ...out.map((r) => r.index));
    return out.map((r) => ({ ...r, norm: r.index / max })).sort((a, b) => b.index - a.index);
  }, [rows]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-rose-500" />
        <h3 className="font-bold text-sm">Category Weight Sensitivity Matrix</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          Index = weight × (100 − average)
        </Badge>
      </div>
      {indexed.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4">No categories with weights configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Weight</th>
                <th className="text-right py-2">Avg %</th>
                <th className="text-right py-2">Sens. Index</th>
                <th className="text-left py-2 pl-4">Statistical leverage</th>
              </tr>
            </thead>
            <tbody>
              {indexed.map((r) => {
                const hot = r.norm >= 0.66;
                const cool = r.norm <= 0.33;
                const bg = hot
                  ? `rgba(244, 63, 94, ${0.18 + r.norm * 0.32})`
                  : cool
                    ? `rgba(56, 189, 248, ${0.10 + (1 - r.norm) * 0.22})`
                    : `rgba(250, 204, 21, ${0.10 + r.norm * 0.18})`;
                const shadow = hot ? `0 0 16px rgba(244,63,94,0.25)` : "none";
                const msg = hot
                  ? `Critical leverage — ${(r.weight * 100).toFixed(0)}% weight at ${(r.avg).toFixed(1)}% avg drags final by up to ${(r.index / 100).toFixed(2)} pts.`
                  : cool
                    ? `Low risk — small footprint on the final score, focus elsewhere.`
                    : `Moderate leverage — keep avg above ${(r.avg + 5).toFixed(0)}% to neutralise.`;
                return (
                  <tr key={r.category} style={{ background: bg, boxShadow: shadow }} className="transition">
                    <td className="py-2 px-2 font-semibold">{r.category}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{(r.weight * 100).toFixed(0)}%</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.avg.toFixed(1)}%</td>
                    <td className="py-2 px-2 text-right tabular-nums font-bold">{r.index.toFixed(2)}</td>
                    <td className="py-2 px-4 text-xs text-muted-foreground">{msg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}