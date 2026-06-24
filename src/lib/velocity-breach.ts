// Background script: scans gradebook for negative velocity (>1.5 slope drop)
// over a 7-day window per course and drops an urgent inbox card. Pure
// client-side; idempotent per course/day via a localStorage marker.

import { pushInbox } from "./peer-network";
import { getLetter } from "./grade-utils";

const K_MARK = "gradecalc_velocity_breach_marks_v1";

type GradeScale = { min: number; letter: string }[];
type TaskLite = { id: string; courseId: string; date: string; score: number; maxScore: number; pending?: boolean };
type Course = { id: string; name: string };

function getMarks(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(K_MARK) || "{}"); } catch { return {}; }
}
function setMarks(m: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K_MARK, JSON.stringify(m));
}

/** Linear-regression slope (least squares) for y given x in days. */
function slope(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0, den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

export function runVelocityBreachScan(courses: Course[], tasks: TaskLite[], scale: GradeScale) {
  const today = new Date().toISOString().slice(0, 10);
  const marks = getMarks();
  const cutoff = Date.now() - 7 * 86400000;

  for (const course of courses) {
    if (marks[course.id] === today) continue; // already alerted today
    const ct = tasks
      .filter((t) => t.courseId === course.id && !t.pending && t.maxScore > 0)
      .map((t) => ({
        ts: new Date(t.date).getTime(),
        pct: (t.score / t.maxScore) * 100,
      }))
      .filter((p) => Number.isFinite(p.ts) && p.ts >= cutoff)
      .sort((a, b) => a.ts - b.ts);
    if (ct.length < 3) continue;

    const t0 = ct[0].ts;
    const pts = ct.map((p) => ({ x: (p.ts - t0) / 86400000, y: p.pct }));
    const s = slope(pts); // percentage points per day

    if (s <= -1.5) {
      // Current letter and how many points until the next-lower tier
      const lastAvg = ct[ct.length - 1].pct;
      const letter = getLetter(lastAvg, scale);
      const lowerThresh = [...scale].sort((a, b) => b.min - a.min).find((row) => row.min < lastAvg)?.min ?? 0;
      const ptsUntilBreak = Math.max(0, lastAvg - lowerThresh);
      const daysUntilBreak = Math.max(1, Math.ceil(ptsUntilBreak / Math.abs(s)));

      pushInbox({
        kind: "sync",
        title: "System Velocity Breach Warning",
        body:
          `Course ${course.name} velocity ${s.toFixed(2)}pp/day. ` +
          `Current tier ${letter} (${lastAvg.toFixed(1)}%) at risk in ~${daysUntilBreak} day(s).`,
        payload: {
          breach: true,
          courseId: course.id,
          courseName: course.name,
          slope: s,
          currentLetter: letter,
          currentAvg: lastAvg,
          daysUntilBreak,
          windowDays: 7,
        },
      });
      marks[course.id] = today;
    }
  }
  setMarks(marks);
}