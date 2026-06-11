import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarClock, Lock, Sparkles, Trash2 } from "lucide-react";
import { useGrades } from "@/lib/grade-store";

type Block = {
  id: string;
  day: number; // 0..5 (Mon..Sat)
  start: string;
  end: string;
};
type AttendanceStore = Record<string, Block[]>;

type LockedSession = {
  id: string;
  weekKey: string;
  day: number;
  start: string;
  end: string;
  reason: string;
};

const ATT_KEY = "attendance-timetable-v1";
const LOCK_KEY = "study-blocks-v1";
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCHOOL_START = 8 * 60; // minutes
const SCHOOL_END = 15 * 60;

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const fromMin = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function readAttendance(): AttendanceStore {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ATT_KEY) || "{}");
  } catch {
    return {};
  }
}
function readLocks(): LockedSession[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCK_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeLocks(l: LockedSession[]) {
  localStorage.setItem(LOCK_KEY, JSON.stringify(l));
  window.dispatchEvent(new CustomEvent("study-blocks-change"));
}

/** Empty 60-minute intervals outside 8–15 (evenings + early mornings). */
function findOpenSlots(dayBlocks: Block[]): Array<{ start: string; end: string }> {
  const candidates = [
    { start: 6 * 60, end: 7 * 60 },
    { start: 7 * 60, end: 8 * 60 },
    { start: 15 * 60, end: 16 * 60 },
    { start: 16 * 60, end: 17 * 60 },
    { start: 17 * 60, end: 18 * 60 },
    { start: 18 * 60, end: 19 * 60 },
    { start: 19 * 60, end: 20 * 60 },
    { start: 20 * 60, end: 21 * 60 },
  ];
  return candidates
    .filter((c) => c.start < SCHOOL_START || c.start >= SCHOOL_END)
    .filter((c) =>
      dayBlocks.every((b) => {
        const bs = toMin(b.start);
        const be = toMin(b.end);
        return be <= c.start || bs >= c.end;
      }),
    )
    .map((c) => ({ start: fromMin(c.start), end: fromMin(c.end) }));
}

export function StudyBlockPlanner() {
  const { tasks, courses } = useGrades();
  const [locks, setLocks] = useState<LockedSession[]>([]);
  const [attendance, setAttendance] = useState<AttendanceStore>({});

  useEffect(() => {
    setLocks(readLocks());
    setAttendance(readAttendance());
    const refresh = () => {
      setLocks(readLocks());
      setAttendance(readAttendance());
    };
    window.addEventListener("study-blocks-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("study-blocks-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Heavy tasks (weight > 20%) due in the next 14 days that aren't pending.
  const heavy = useMemo(() => {
    const now = Date.now();
    return tasks
      .filter((t) => t.weight > 20 && t.pending)
      .map((t) => ({ ...t, due: new Date(t.date).getTime() }))
      .filter((t) => t.due >= now && t.due - now < 14 * 86400000)
      .sort((a, b) => a.due - b.due);
  }, [tasks]);

  const today = mondayOf(new Date());
  const weekStart = today;
  const weekKey = iso(weekStart);
  const weekBlocks = attendance[weekKey] ?? [];

  // Build per-day suggestions if any heavy task exists.
  const suggestions = useMemo(() => {
    if (!heavy.length) return [];
    const out: Array<{ day: number; start: string; end: string; reason: string }> = [];
    for (let d = 0; d < 6; d++) {
      const dayBlocks = weekBlocks.filter((b) => b.day === d);
      for (const slot of findOpenSlots(dayBlocks)) {
        const isLocked = locks.some(
          (l) =>
            l.weekKey === weekKey &&
            l.day === d &&
            l.start === slot.start &&
            l.end === slot.end,
        );
        if (isLocked) continue;
        const target = heavy[0];
        const courseName = courses.find((c) => c.id === target.courseId)?.name ?? "course";
        out.push({
          day: d,
          start: slot.start,
          end: slot.end,
          reason: `Prep for "${target.name}" (${courseName}, ${target.weight}%)`,
        });
      }
    }
    return out;
  }, [heavy, weekBlocks, locks, weekKey, courses]);

  const lockSession = (s: { day: number; start: string; end: string; reason: string }) => {
    const next = [
      ...locks,
      {
        id: crypto.randomUUID(),
        weekKey,
        day: s.day,
        start: s.start,
        end: s.end,
        reason: s.reason,
      },
    ];
    writeLocks(next);
    setLocks(next);
  };
  const removeSession = (id: string) => {
    const next = locks.filter((l) => l.id !== id);
    writeLocks(next);
    setLocks(next);
  };

  const weekLocks = locks.filter((l) => l.weekKey === weekKey);

  return (
    <Card className="p-5 shadow-soft space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-violet-600" />
        <h3 className="font-semibold">Smart Study-Block Planner</h3>
        <span className="text-xs text-muted-foreground">
          (this week · outside 8:00–15:00)
        </span>
      </div>

      {heavy.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No upcoming high-weight tasks (&gt;20%) detected. Add a heavy task on the
          Grades page to receive study-block recommendations.
        </p>
      ) : (
        <>
          <div className="text-xs text-muted-foreground">
            Detected {heavy.length} heavy task{heavy.length === 1 ? "" : "s"} in
            the next 14 days. Tap a recommendation to lock it as a study session.
          </div>

          {suggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No empty evening/morning slots available for this week.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {suggestions.slice(0, 8).map((s, i) => (
                <button
                  key={`${s.day}-${s.start}-${i}`}
                  onClick={() => lockSession(s)}
                  className="text-left rounded-md border border-dashed border-violet-300 bg-violet-50/60 hover:bg-violet-100 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 dark:border-violet-800 p-2 transition"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    <Sparkles className="h-3 w-3" />
                    {DAYS[s.day]} {s.start}–{s.end}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {s.reason}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {weekLocks.length > 0 && (
        <div className="pt-2 border-t border-border space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Locked Study Sessions
          </div>
          <div className="flex flex-wrap gap-2">
            {weekLocks.map((l) => (
              <span
                key={l.id}
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 text-white text-[11px] font-semibold px-2 py-1"
                title={l.reason}
              >
                <Lock className="h-3 w-3" />
                {DAYS[l.day]} {l.start}–{l.end}
                <button
                  onClick={() => removeSession(l.id)}
                  className="ml-1 hover:opacity-80"
                  aria-label="Remove session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}