import { useMemo } from "react";
import { useGrades, type Task } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Flame } from "lucide-react";

type WindowHit = {
  startISO: string;
  endISO: string;
  tasks: (Task & { courseName: string })[];
  totalWeight: number;
  examCount: number;
};

const EXAM_CATS = ["Tests", "Exam", "Exams", "Final", "Finals", "Midterm"];

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function isExam(t: Task): boolean {
  const c = t.category?.toLowerCase() ?? "";
  return EXAM_CATS.some((e) => c.includes(e.toLowerCase()));
}

export function BurnoutRadar() {
  const { tasks, courses } = useGrades();

  const { hit, schedule } = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = tasks
      .filter((t) => t.pending && t.date >= today)
      .map((t) => ({
        ...t,
        courseName: courses.find((c) => c.id === t.courseId)?.name ?? "—",
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let hit: WindowHit | null = null;

    // Rolling 7-day window anchored on each upcoming task's date.
    for (const anchor of upcoming) {
      const end = addDays(anchor.date, 6);
      const windowTasks = upcoming.filter(
        (t) => t.date >= anchor.date && t.date <= end,
      );
      const examCount = windowTasks.filter(isExam).length;
      const totalWeight = windowTasks.reduce((s, t) => s + (t.weight || 0), 0);
      // Trigger: 2+ exams in the window OR combined weight > 35%
      const triggered = examCount >= 2 || totalWeight > 35;
      if (triggered && (!hit || windowTasks.length > hit.tasks.length)) {
        hit = {
          startISO: anchor.date,
          endISO: end,
          tasks: windowTasks,
          totalWeight,
          examCount,
        };
      }
    }

    // Tactical schedule: distribute 100% of revision time proportionally to weight.
    const schedule = hit
      ? hit.tasks
          .slice()
          .sort((a, b) => (b.weight || 0) - (a.weight || 0))
          .map((t) => ({
            task: t,
            share: hit!.totalWeight
              ? ((t.weight || 0) / hit!.totalWeight) * 100
              : 100 / hit!.tasks.length,
          }))
      : [];

    return { hit, schedule };
  }, [tasks, courses]);

  if (!hit) return null;

  return (
    <Card className="border-2 border-destructive/70 bg-destructive/5 p-5 shadow-soft animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive flex items-center justify-center shrink-0 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-destructive-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base md:text-lg font-extrabold tracking-tight text-destructive uppercase">
            BURNOUT ALERT: High Academic Load Detected
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">
              {hit.startISO} → {hit.endISO}
            </span>{" "}
            · {hit.examCount} exam{hit.examCount === 1 ? "" : "s"} ·{" "}
            {hit.totalWeight.toFixed(1)}% combined weight across {hit.tasks.length}{" "}
            tasks. Distribute revision proportionally to avoid cramming.
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-destructive/30 bg-card/80">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <Flame className="h-3 w-3 text-destructive" /> Tactical Study Schedule
                    </span>
                  </th>
                  <th className="px-3 py-2 font-semibold">Subject</th>
                  <th className="px-3 py-2 font-semibold">Due</th>
                  <th className="px-3 py-2 font-semibold">Weight</th>
                  <th className="px-3 py-2 font-semibold">Revision Share</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(({ task, share }) => (
                  <tr key={task.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-medium">{task.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{task.courseName}</td>
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{task.date}</td>
                    <td className="px-3 py-2 tabular-nums">{(task.weight || 0).toFixed(1)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-destructive transition-all"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-xs w-12 text-right font-semibold">
                          {share.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Card>
  );
}