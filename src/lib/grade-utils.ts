import type { Task, GradeScaleRow, Course, Term } from "./grade-store";

export function filterByTerm(tasks: Task[], term: Term | null | undefined): Task[] {
  if (!term) return tasks;
  return tasks.filter((t) => t.date >= term.start && t.date <= term.end);
}


export function calcAverage(tasks: Task[], weighted: boolean): number {
  if (!tasks.length) return 0;
  if (weighted) {
    const totalW = tasks.reduce((s, t) => s + (t.weight || 1), 0);
    if (totalW === 0) return 0;
    return (
      tasks.reduce((s, t) => s + (t.score / t.maxScore) * 100 * (t.weight || 1), 0) /
      totalW
    );
  }
  return tasks.reduce((s, t) => s + (t.score / t.maxScore) * 100, 0) / tasks.length;
}

export function getLetter(pct: number, scale: GradeScaleRow[]): GradeScaleRow | null {
  const sorted = [...scale].sort((a, b) => b.min - a.min);
  return sorted.find((r) => pct >= r.min) ?? sorted[sorted.length - 1] ?? null;
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
