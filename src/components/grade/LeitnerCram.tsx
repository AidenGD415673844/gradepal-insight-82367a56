import { useEffect, useMemo, useState } from "react";
import { useGrades, type Task } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ChevronRight, ChevronLeft, X, Zap } from "lucide-react";

type BoxId = 1 | 2 | 3;
type LeitnerState = Record<string, { box: BoxId; lastReview: string | null }>;

const LK = "gradecalc-leitner-v1";
const DK = "gradecalc-leitner-dismiss-v1";

const BOX_META: Record<BoxId, { label: string; tint: string }> = {
  1: { label: "Box 1 · Review Daily", tint: "bg-destructive/15 border-destructive/40 text-destructive" },
  2: { label: "Box 2 · Every 3 Days", tint: "bg-warning/15 border-warning/40 text-warning-foreground" },
  3: { label: "Box 3 · Mastered", tint: "bg-primary/15 border-primary/40 text-primary" },
};

function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const target = new Date(iso + "T00:00:00Z").getTime();
  return Math.round((target - today) / 86400000);
}

export function LeitnerCram() {
  const { tasks, courses } = useGrades();
  const [state, setState] = useState<LeitnerState>({});
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LK);
      if (raw) setState(JSON.parse(raw));
      const d = localStorage.getItem(DK);
      if (d) setDismissed(JSON.parse(d));
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(LK, JSON.stringify(state));
  }, [state]);
  useEffect(() => {
    localStorage.setItem(DK, JSON.stringify(dismissed));
  }, [dismissed]);

  const imminent = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks
      .filter((t) => t.pending && t.date >= today && daysUntil(t.date) <= 7)
      .filter((t) => !dismissed.includes(t.id))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [tasks, dismissed]);

  if (imminent.length === 0) return null;

  const getBox = (id: string): BoxId => state[id]?.box ?? 1;
  const setBox = (id: string, box: BoxId) =>
    setState((s) => ({
      ...s,
      [id]: { box, lastReview: new Date().toISOString().slice(0, 10) },
    }));

  const grouped: Record<BoxId, Task[]> = { 1: [], 2: [], 3: [] };
  for (const t of imminent) grouped[getBox(t.id)].push(t);

  return (
    <Card className="p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/30 shadow-soft animate-fade-in">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Brain className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base md:text-lg font-extrabold tracking-tight flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Cram Mode — Leitner Spaced Repetition
          </h2>
          <p className="text-xs text-muted-foreground">
            {imminent.length} target{imminent.length === 1 ? "" : "s"} at memory-decay risk in the next 7 days.
            Promote cards rightward as recall improves.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {([1, 2, 3] as BoxId[]).map((box) => (
          <div
            key={box}
            className={`rounded-lg border p-3 min-h-[120px] ${BOX_META[box].tint}`}
          >
            <div className="text-[10px] uppercase tracking-wider font-bold mb-2">
              {BOX_META[box].label}
            </div>
            <div className="space-y-2">
              {grouped[box].length === 0 && (
                <div className="text-xs opacity-60 italic">Empty</div>
              )}
              {grouped[box].map((t) => {
                const course = courses.find((c) => c.id === t.courseId);
                const days = daysUntil(t.date);
                return (
                  <div
                    key={t.id}
                    className="rounded-md bg-card/80 backdrop-blur p-2 border border-border/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate text-foreground">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {course?.name ?? "—"} · {days === 0 ? "today" : `${days}d`}
                        </div>
                      </div>
                      <button
                        aria-label="Dismiss card"
                        onClick={() => setDismissed((d) => [...d, t.id])}
                        className="text-muted-foreground hover:text-destructive p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[11px]"
                        disabled={box === 1}
                        onClick={() => setBox(t.id, (box - 1) as BoxId)}
                      >
                        <ChevronLeft className="h-3 w-3" /> Forgot
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[11px] ml-auto"
                        disabled={box === 3}
                        onClick={() => setBox(t.id, (box + 1) as BoxId)}
                      >
                        Recalled <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}