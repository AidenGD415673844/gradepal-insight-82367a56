import type { Task, GradeScaleRow, Course, Term } from "./grade-store";

export function filterByTerm(tasks: Task[], term: Term | null | undefined): Task[] {
  if (!term) return tasks;
  return tasks.filter((t) => t.date >= term.start && t.date <= term.end);
}


export function calcAverage(tasks: Task[], weighted: boolean): number {
  // Dynamic Weight Exclusion: drop tasks with no entered score, pending, or
  // hypothetical flags. The denominator (sum of weights or count) is then
  // computed strictly from active scored tasks — never penalising 0% for a
  // missing/un-graded entry.
  const active = tasks.filter(
    (t) =>
      !t.pending &&
      !t.hypothetical &&
      typeof t.score === "number" &&
      Number.isFinite(t.score) &&
      typeof t.maxScore === "number" &&
      t.maxScore > 0,
  );
  if (!active.length) return 0;
  if (weighted) {
    const totalW = active.reduce((s, t) => s + (t.weight || 1), 0);
    if (totalW === 0) return 0;
    return (
      active.reduce((s, t) => s + (t.score / t.maxScore) * 100 * (t.weight || 1), 0) /
      totalW
    );
  }
  return active.reduce((s, t) => s + (t.score / t.maxScore) * 100, 0) / active.length;
}

export function getLetter(pct: number, scale: GradeScaleRow[]): GradeScaleRow | null {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  // A* renders for any pct >= the A* row min (default 91). The scale row's
  // own `min` is the single source of truth — no extra 100%-only gate.
  const idx = sorted.findIndex((r) => pct >= r.min);
  if (idx === -1) return sorted[sorted.length - 1] ?? null;
  return sorted[idx];
}

export function calcGPA(courses: Course[], tasks: Task[], scale: GradeScaleRow[]): number {
  const used = courses.filter((c) => c.credits > 0);
  if (!used.length) return 0;
  let pts = 0;
  let credits = 0;
  for (const c of used) {
    const ct = tasks.filter((t) => t.courseId === c.id);
    if (!ct.length) continue;
    const avg = calcAverage(ct, true);
    const row = getLetter(avg, scale);
    pts += (row?.gpa ?? 0) * c.credits;
    credits += c.credits;
  }
  return credits ? pts / credits : 0;
}
