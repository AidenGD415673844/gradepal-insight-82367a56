import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGrades, type Task } from "@/lib/grade-store";

const KANBAN_KEY = "gradecalc-kanban-status-v1";
const COLS = ["To-Do", "In Progress", "Submitted", "Graded"] as const;
type Col = typeof COLS[number];

function defaultCol(t: Task): Col {
  return t.pending ? "To-Do" : "Graded";
}

export function KanbanBoard() {
  const { tasks, courses, updateTask } = useGrades();
  const [statuses, setStatuses] = useState<Record<string, Col>>(() => {
    try { return JSON.parse(localStorage.getItem(KANBAN_KEY) ?? "{}"); } catch { return {}; }
  });
  useEffect(() => { localStorage.setItem(KANBAN_KEY, JSON.stringify(statuses)); }, [statuses]);

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