import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGrades, type Task } from "@/lib/grade-store";
import { recordKanbanProgress } from "@/lib/study-streak";
import { calcAverage, getLetter } from "@/lib/grade-utils";
import {
  runRemediationScan,
  useRemediationQueue,
  markRemediationDone,
  clearRemediation,
  type SubjectScanInput,
} from "@/lib/auto-remediation";
import { Shield, Check, X } from "lucide-react";
import { Target } from "lucide-react";
import {
  readBenchmarks,
  removeBenchmark,
  subscribeBenchmarks,
  type KanbanBenchmark,
} from "@/lib/kanban-benchmarks";

const KANBAN_KEY = "gradecalc-kanban-status-v1";
const COLS = ["To-Do", "In Progress", "Submitted", "Graded"] as const;
type Col = typeof COLS[number];

function defaultCol(t: Task): Col {
  return t.pending ? "To-Do" : "Graded";
}

export function KanbanBoard() {
  const { tasks, courses, updateTask, scale, settings } = useGrades();
  const [statuses, setStatuses] = useState<Record<string, Col>>({});
  const remediation = useRemediationQueue().filter((c) => !c.done);
  const [benchmarks, setBenchmarks] = useState<KanbanBenchmark[]>([]);
  useEffect(() => {
    setBenchmarks(readBenchmarks());
    return subscribeBenchmarks(() => setBenchmarks(readBenchmarks()));
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { setStatuses(JSON.parse(localStorage.getItem(KANBAN_KEY) ?? "{}")); } catch {}
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KANBAN_KEY, JSON.stringify(statuses));
  }, [statuses]);

  // Background remediation scan — idempotent (12h window). Reads syllabus
  // mastery directly from localStorage so this module stays decoupled.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      let syllabus: Record<string, { name: string; level: "red" | "amber" | "green" }[]> = {};
      try {
        syllabus = JSON.parse(localStorage.getItem("syllabus-mastery-v1") || "{}");
      } catch { /* ignore */ }
      const inputs: SubjectScanInput[] = courses.map((c) => {
        const ct = tasks
          .filter((t) => t.courseId === c.id && !t.pending)
          .sort((a, b) => a.date.localeCompare(b.date));
        const recentAverages = ct.slice(-6).map((t) => (t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0));
        const avg = calcAverage(ct, settings.weighted);
        const row = getLetter(avg, scale);
        const sortedScale = [...scale].sort((a, b) => a.min - b.min);
        const nextDown = sortedScale.filter((r) => r.min < (row?.min ?? 0)).pop();
        const buffer = avg - (nextDown?.min ?? 0);
        const units = syllabus[c.id] ?? [];
        const red = units.find((u) => u.level === "red") ?? units.find((u) => u.level === "amber");
        return {
          subjectId: c.id,
          subjectName: c.name,
          recentAverages,
          buffer,
          redTopic: red?.name ?? null,
        };
      });
      runRemediationScan(inputs);
    }, 1500);
    return () => window.clearTimeout(id);
  }, [courses, tasks, scale, settings.weighted]);

  const [dragId, setDragId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ task: Task; pct: string } | null>(null);

  const grouped = useMemo(() => {
    const m: Record<Col, Task[]> = { "To-Do": [], "In Progress": [], "Submitted": [], "Graded": [] };
    for (const t of tasks) {
      const c = (statuses[t.id] ?? defaultCol(t)) as Col;
      m[c].push(t);
    }
    return m;
  }, [tasks, statuses]);

  function moveTo(taskId: string, col: Col) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const prev = (statuses[taskId] ?? defaultCol(t)) as Col;
    if (prev !== col) {
      // any column transition counts as a progression event
      try { recordKanbanProgress(); } catch { /* never break the board */ }
    }
    setStatuses((s) => ({ ...s, [taskId]: col }));
    if (col === "Graded") setModal({ task: t, pct: "" });
  }

  function submitScore() {
    if (!modal) return;
    const pct = Number(modal.pct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
    const t = modal.task;
    updateTask(t.id, { score: (pct / 100) * t.maxScore, pending: false });
    setModal(null);
  }

  return (
    <Card className="p-3 md:p-4">
      <h3 className="text-sm font-semibold mb-3">Assignment Kanban</h3>
      {remediation.length > 0 && (
        <div className="mb-3 space-y-2">
          {remediation.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border-2 border-amber-500/50 bg-amber-500/5 p-2.5"
            >
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    {r.title}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{r.body}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-6 px-2 gap-1 text-[10px]" onClick={() => markRemediationDone(r.id)}>
                    <Check className="h-3 w-3" /> Done
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => clearRemediation(r.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COLS.map((col) => (
          <div
            key={col}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && moveTo(dragId, col)}
            className="rounded-md border bg-muted/30 p-2 min-h-[140px]"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{col} · {grouped[col].length}</div>
            <div className="space-y-2">
              {col === "To-Do" && benchmarks.map((b) => (
                <div
                  key={b.id}
                  className="rounded-md border-2 border-emerald-500/50 bg-emerald-500/5 p-2 text-xs shadow-sm"
                >
                  <div className="flex items-start gap-1.5">
                    <Target className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate text-emerald-700 dark:text-emerald-300">
                        {b.label}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Target ≥ {b.target.toFixed(0)}% · {b.detail}
                      </div>
                    </div>
                    <button
                      onClick={() => removeBenchmark(b.id)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Dismiss benchmark"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
              {grouped[col].map((t) => {
                const course = courses.find((c) => c.id === t.courseId);
                return (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className="rounded-md border bg-background p-2 text-xs cursor-grab active:cursor-grabbing shadow-sm hover:shadow transition"
                    style={{ borderLeft: `4px solid ${course?.color ?? "transparent"}` }}
                  >
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-muted-foreground truncate">{course?.name ?? "—"} · {t.date}</div>
                  </div>
                );
              })}
              {!grouped[col].length && <p className="text-[11px] text-muted-foreground">Drop here</p>}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <Card className="p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold mb-1">Enter graded score</h4>
            <p className="text-xs text-muted-foreground mb-3">{modal.task.name}</p>
            <Input
              autoFocus
              type="number"
              min={0}
              max={100}
              placeholder="Score %"
              value={modal.pct}
              onChange={(e) => setModal({ ...modal, pct: e.target.value })}
            />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
              <Button size="sm" onClick={submitScore}>Save</Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}