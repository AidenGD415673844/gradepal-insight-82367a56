import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";
import { Radar } from "lucide-react";

export function SubjectRadar() {
  const { courses, tasks, settings } = useGrades();

  const points = useMemo(() => {
    return courses
      .map((c) => {
        const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
        return { name: c.name, value: calcAverage(ct, settings.weighted), color: c.color };
      })
      .filter((p) => Number.isFinite(p.value));
  }, [courses, tasks, settings.weighted]);

  if (points.length < 3) return null;

  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 40;
  const n = points.length;

  const coord = (i: number, frac: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(angle) * radius * frac, cy + Math.sin(angle) * radius * frac] as const;
  };

  const polygon = points
    .map((p, i) => {
      const [x, y] = coord(i, Math.max(0, Math.min(100, p.value)) / 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <Card className="p-5 backdrop-blur-md bg-card/70 border-border/60 shadow-[0_4px_30px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2 mb-3">
        <Radar className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold">Academic Balance Radar</h2>
        <span className="text-[11px] text-muted-foreground ml-auto">All subjects · 0–100%</span>
      </div>
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[360px] h-auto">
          {rings.map((r) => (
            <polygon
              key={r}
              points={points
                .map((_, i) => {
                  const [x, y] = coord(i, r);
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" ")}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="1"
              opacity={0.6}
            />
          ))}
          {points.map((_, i) => {
            const [x, y] = coord(i, 1);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth="1" opacity={0.5} />;
          })}
          <polygon
            points={polygon}
            fill="hsl(217 91% 60% / 0.22)"
            stroke="hsl(217 91% 60%)"
            strokeWidth="2"
            strokeLinejoin="round"
            className="transition-all duration-500"
          />
          {points.map((p, i) => {
            const [x, y] = coord(i, Math.max(0, Math.min(100, p.value)) / 100);
            return <circle key={`pt-${i}`} cx={x} cy={y} r="3.5" fill="hsl(217 91% 60%)" stroke="white" strokeWidth="1.5" />;
          })}
          {points.map((p, i) => {
            const [lx, ly] = coord(i, 1.12);
            return (
              <text
                key={`lbl-${i}`}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                fontSize="11"
                fontWeight="600"
              >
                {p.name.length > 14 ? p.name.slice(0, 12) + "…" : p.name}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
        {points.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-2 rounded-lg border bg-card/60 px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 truncate">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
              <span className="truncate">{p.name}</span>
            </span>
            <span className="font-bold tabular-nums">{p.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}