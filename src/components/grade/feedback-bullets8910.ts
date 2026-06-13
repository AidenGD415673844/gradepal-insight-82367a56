// Bullets 8 (Grading Buffer Margin), 9 (Scoring Stability) and 10
// (Strategic Goal). Pure deterministic copy keyed off concrete metrics
// — no placeholder fragments, no band-range tags, no template leaks.

const REPORT_FLOORS = [41, 51, 61, 71, 81, 91];

export function reportBracketFloor(pct: number): number {
  return [...REPORT_FLOORS].reverse().find((f) => pct >= f) ?? 0;
}

export function bullets8910For(args: {
  pct: number;
  /** Lower-bound of the student's current letter bracket. */
  bracketFloor: number;
  stdDev: number;
  syllabusRedCount: number;
}): { b8: string; b9: string; b10: string } {
  const bufferRaw = Math.max(0, args.pct - args.bracketFloor);
  const buffer = bufferRaw.toFixed(1);

  // ----- B8 — Grading Buffer Margin -----
  let b8: string;
  if (args.pct >= 92) {
    b8 = `Grading Insulation: Cumulative statistics reveal an exceptionally secure grading foundation. The current average maintains a robust safety buffer margin of ${buffer}% above the lower bracket threshold, proving that the student's performance is heavily insulated against standard grading fluctuations.`;
  } else if (args.pct >= 60) {
    b8 = `Grading Insulation: Performance metrics sit safely within the active bracket, holding a baseline buffer margin of ${buffer}% before encountering the lower grade threshold. While the position is stable, tightening consistency on upcoming tasks will expand this safety runway and protect the active letter grade.`;
  } else {
    b8 = `Grading Insulation: Data analysis flags a highly narrow insulation zone, with the active average hovering just ${buffer}% above the lower bracket drop point. The safety margin is entirely exhausted, meaning that immediate stabilization of upcoming task outputs is required to prevent a downward tier shift.`;
  }

  // ----- B9 — Scoring Stability -----
  const sd = Number.isFinite(args.stdDev) ? args.stdDev : 0;
  const sdTxt = sd.toFixed(1);
  const b9 =
    sd <= 2
      ? `Scoring Stability: Grade book data registers exceptional execution consistency (σ = ${sdTxt}%). The student's task scores do not fluctuate wildly, demonstrating a highly predictable and mathematically secure academic foundation.`
      : `Scoring Stability: Performance metrics reveal a moderate fluctuation between assignment scores (σ = ${sdTxt}%). While the baseline average is sound, eliminating occasional low outlier scores will safely stabilize the trajectory.`;

  // ----- B10 — Strategic Goal -----
  const red = Math.max(0, Math.round(args.syllabusRedCount));
  const b10 =
    red === 0
      ? `Strategic Goal: With 100% of core syllabus modules officially verified as mastered, the optimal tactical focus moving into the next term is to maintain this excellent baseline momentum and prevent any late-term grade decay.`
      : `Strategic Goal: To drive the current average efficiently toward your aspirational target, tactical priority should be focused on clearing the remaining ${red} unmastered topic block${red === 1 ? "" : "s"} currently flagged in your syllabus grid.`;

  return { b8, b9, b10 };
}