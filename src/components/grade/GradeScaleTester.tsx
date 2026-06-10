import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Beaker } from "lucide-react";
import type { Bracket } from "./feedback-data";
import { BRACKETS, TREND_BRACKETS, COMPLETION_BRACKETS, lookupBracket } from "./feedback-data";

const LABELS = ["Strengths", "Trends", "Commendations", "Responsibility", "Improvement"] as const;

function letterFor(pct: number): string {
  if (pct >= 92) return "A*";
  if (pct >= 85) return "A";
  if (pct >= 75) return "B";
  if (pct >= 65) return "C";
  if (pct >= 55) return "D";
  if (pct >= 40) return "E";
  return "U";
}

export function GradeScaleTester() {
  const [raw, setRaw] = useState("88");
  const [delta, setDelta] = useState("0");
  const [completion, setCompletion] = useState("100");

  const score = Math.max(0, Math.min(100, Number(raw) || 0));
  const deltaNum = Math.max(-100, Math.min(100, Number(delta) || 0));
  const compNum = Math.max(0, Math.min(100, Number(completion) || 0));

  const main: Bracket = useMemo(() => lookupBracket(BRACKETS, score), [score]);
  const trend = useMemo(() => lookupBracket(TREND_BRACKETS, deltaNum), [deltaNum]);
  const comp = useMemo(() => lookupBracket(COMPLETION_BRACKETS, compNum), [compNum]);

  const bullets = [main.bullets[0], trend.bullets[0], comp.bullets[0], main.bullets[3], main.bullets[4]];
  const letter = letterFor(score);
  const tier = `${main.min}–${main.max}%`;

  return (
    <Card className="p-4 md:p-5 no-print">
      <div className="flex items-center gap-2 mb-3">
        <Beaker className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Grade-Scale Tester</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <label className="text-xs space-y-1">
          <div className="text-muted-foreground">Score %</div>
          <Input type="number" min={0} max={100} value={raw} onChange={(e) => setRaw(e.target.value)} />
        </label>
        <label className="text-xs space-y-1">
          <div className="text-muted-foreground">Δ vs prev term</div>
          <Input type="number" min={-100} max={100} value={delta} onChange={(e) => setDelta(e.target.value)} />
        </label>
        <label className="text-xs space-y-1">
          <div className="text-muted-foreground">Completion %</div>
          <Input type="number" min={0} max={100} value={completion} onChange={(e) => setCompletion(e.target.value)} />
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3">
        <div className="rounded-md border p-2"><span className="text-muted-foreground">Tier:</span> <b>{tier}</b></div>
        <div className="rounded-md border p-2"><span className="text-muted-foreground">Letter:</span> <b>{letter}</b></div>
        <div className="rounded-md border p-2"><span className="text-muted-foreground">Δ tier:</span> <b>{trend.min}…{trend.max}%</b></div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {bullets.map((b, i) => (
          <li key={i} className="leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">B{i + 1} ({LABELS[i]}):</span> {b}
          </li>
        ))}
      </ul>
    </Card>
  );
}