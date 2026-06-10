import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Beaker } from "lucide-react";
import type { Bracket } from "./feedback-data";
import { BRACKETS, TREND_BRACKETS, COMPLETION_BRACKETS, lookupBracket } from "./feedback-data";
import { useGrades } from "@/lib/grade-store";
import { getLetter } from "@/lib/grade-utils";

const LABELS = ["Strengths", "Trends", "Commendations", "Responsibility", "Improvement"] as const;

/**
 * Sub-band ladder mirrored from AcademicFeedback for forward-looking
 * milestone copy in Bullet 5. Keep in sync with NEXT_TIER_LADDER there.
 */
const NEXT_TIER_LADDER: Array<{ letter: string; tier: string; min: number }> = [
  { letter: "E", tier: "low", min: 40 },
  { letter: "E", tier: "mid", min: 45 },
  { letter: "E", tier: "high", min: 50 },
  { letter: "D", tier: "low", min: 55 },
  { letter: "D", tier: "mid", min: 59 },
  { letter: "D", tier: "high", min: 62 },
  { letter: "C", tier: "low", min: 65 },
  { letter: "C", tier: "mid", min: 68 },
  { letter: "C", tier: "high", min: 72 },
  { letter: "B", tier: "low", min: 75 },
  { letter: "B", tier: "mid", min: 78 },
  { letter: "B", tier: "high", min: 82 },
  { letter: "A", tier: "low", min: 85 },
  { letter: "A", tier: "mid", min: 87 },
  { letter: "A", tier: "high", min: 89 },
  { letter: "A*", tier: "", min: 91 },
];

function nextTierGoal(pct: number): string {
  const next = NEXT_TIER_LADDER.find((b) => b.min > pct);
  if (!next) {
    return "Continue to maintain your A* standing by tackling stretch challenges and competition-level questions.";
  }
  const label = next.tier ? `${next.tier} ${next.letter}` : next.letter;
  const pointsAway = Math.max(1, Math.ceil(next.min - pct));
  return `Try to aim and work hard to bring your grade up into the ${label} band — roughly ${pointsAway} point${pointsAway === 1 ? "" : "s"} away.`;
}

export function GradeScaleTester() {
  const { scale } = useGrades();
  const [raw, setRaw] = useState("88");
  const [delta, setDelta] = useState("0");
  const [completion, setCompletion] = useState("100");
  const [noPrev, setNoPrev] = useState(false);

  const score = Math.max(0, Math.min(100, Number(raw) || 0));
  const deltaNum = Math.max(-100, Math.min(100, Number(delta) || 0));
  const compNum = Math.max(0, Math.min(100, Number(completion) || 0));

  const main: Bracket = useMemo(() => lookupBracket(BRACKETS, score), [score]);
  const trend = useMemo(() => lookupBracket(TREND_BRACKETS, deltaNum), [deltaNum]);
  const comp = useMemo(() => lookupBracket(COMPLETION_BRACKETS, compNum), [compNum]);

  // B2 mirrors AcademicFeedback: when no previous-term data is available
  // we emit the preset "not enough data" message instead of a trend bullet.
  const b2 = noPrev
    ? "There isn't enough data to establish a trend and trend feedback. Once you have more graded tasks, comparative progress insights will appear here."
    : trend.bullets[1];
  // B5 appends the dynamic next-tier goal so the tester surfaces the
  // same forward-looking copy users see in the live report card.
  const b5 = `${main.bullets[4]} ${nextTierGoal(score)}`;
  const bullets = [main.bullets[0], b2, comp.bullets[2], main.bullets[3], b5];
  // Letter uses the user's configured grade scale (with the same A*
  // override the report card applies at ≥91%).
  const rawLetter = getLetter(score, scale)?.letter ?? "—";
  const letter = score >= 91 ? "A*" : rawLetter;
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
          <Input type="number" min={-100} max={100} value={delta} onChange={(e) => setDelta(e.target.value)} disabled={noPrev} />
        </label>
        <label className="text-xs space-y-1">
          <div className="text-muted-foreground">Completion %</div>
          <Input type="number" min={0} max={100} value={completion} onChange={(e) => setCompletion(e.target.value)} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs mb-3 text-muted-foreground">
        <input type="checkbox" checked={noPrev} onChange={(e) => setNoPrev(e.target.checked)} />
        No previous-term data (simulate first term / All terms)
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs mb-3">
        <div className="rounded-md border p-2"><span className="text-muted-foreground">Tier:</span> <b>{tier}</b></div>
        <div className="rounded-md border p-2"><span className="text-muted-foreground">Letter:</span> <b>{letter}</b></div>
        <div className="rounded-md border p-2"><span className="text-muted-foreground">Δ tier:</span> <b>{noPrev ? "n/a" : `${trend.min}…${trend.max}%`}</b></div>
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