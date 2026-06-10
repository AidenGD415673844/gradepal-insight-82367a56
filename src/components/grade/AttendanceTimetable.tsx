import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  BookX,
  RotateCcw,
  Copy,
  Trash2,
  CalendarDays,
} from "lucide-react";

type Status =
  | "present"
  | "late"
  | "early"
  | "absent"
  | "trip"
  | "holiday";

const STATUS: Record<
  Status,
  { label: string; color: string; text: string }
> = {
  present: { label: "Present", color: "#10b981", text: "#fff" },
  late: { label: "Late", color: "#f5c518", text: "#1a1a1a" },
  early: { label: "Early Leave", color: "#64748b", text: "#fff" },
  absent: { label: "Absent", color: "#dc2626", text: "#fff" },
  trip: { label: "Field Trip", color: "#38bdf8", text: "#0b2533" },
  holiday: { label: "Holiday", color: "#f97316", text: "#fff" },
};
const ORDER: Status[] = ["present", "late", "early", "absent", "trip", "holiday"];

type Block = {
  id: string;
  day: number; // 0=Mon..5=Sat
  subject: string;
  room: string;
  teacher: string;
  start: string; // "08:00"
  end: string;
  status: Status;
};

type Store = Record<string, Block[]>; // key = weekStart ISO (Mon)

const KEY = "attendance-timetable-v1";
const SAT_KEY = "attendance-include-sat";

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0=Sun
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
const fmtRange = (start: Date, days: number) => {
  const end = addDays(start, days - 1);
  const m = (x: Date) =>
    x.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${m(start)} – ${m(end)}, ${end.getFullYear()}`;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function loadStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function AttendanceTimetable() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [includeSat, setIncludeSat] = useState<boolean>(false);
  const [weekStart, setWeekStart] = useState<Date>(() => mondayOf(new Date()));
  const [repeatN, setRepeatN] = useState<string>("4");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<{ day: number; block?: Block } | null>(
    null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(store));
  }, [store]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(SAT_KEY, includeSat ? "1" : "0");
  }, [includeSat]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIncludeSat(localStorage.getItem(SAT_KEY) === "1");
  }, []);

  const weekKey = iso(weekStart);
  const blocks = store[weekKey] ?? [];
  const dayCount = includeSat ? 6 : 5;

  // ---- swipe ----
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) shiftWeek(dx < 0 ? 1 : -1);
    touchX.current = null;
  };
  const shiftWeek = (n: number) => setWeekStart((w) => addDays(w, 7 * n));

  // ---- CRUD ----
  const upsertBlock = (b: Block) => {
    setStore((s) => {
      const list = s[weekKey] ? [...s[weekKey]] : [];
      const i = list.findIndex((x) => x.id === b.id);
      if (i >= 0) list[i] = b;
      else list.push(b);
      return { ...s, [weekKey]: list };
    });
  };
  const removeBlock = (id: string) =>
    setStore((s) => ({
      ...s,
      [weekKey]: (s[weekKey] ?? []).filter((b) => b.id !== id),
    }));
  const cycleStatus = (id: string) =>
    setStore((s) => ({
      ...s,
      [weekKey]: (s[weekKey] ?? []).map((b) =>
        b.id === id
          ? { ...b, status: ORDER[(ORDER.indexOf(b.status) + 1) % ORDER.length] }
          : b,
      ),
    }));
  const resetAttendance = () =>
    setStore((s) => ({
      ...s,
      [weekKey]: (s[weekKey] ?? []).map((b) => ({ ...b, status: "present" })),
    }));
  const repeatWeek = () => {
    const n = Math.max(1, Math.min(52, parseInt(repeatN) || 0));
    if (!blocks.length) return;
    setStore((s) => {
      const next = { ...s };
      for (let i = 1; i <= n; i++) {
        const k = iso(addDays(weekStart, 7 * i));
        next[k] = blocks.map((b) => ({
          ...b,
          id: crypto.randomUUID(),
          status: "present",
        }));
      }
      return next;
    });
  };

  // ---- pie ----
  const counts = useMemo(() => {
    const c: Record<Status, number> = {
      present: 0, late: 0, early: 0, absent: 0, trip: 0, holiday: 0,
    };
    blocks.forEach((b) => c[b.status]++);
    return c;
  }, [blocks]);
  const total = blocks.length || 1;

  const pieSlices = useMemo(() => {
    let acc = 0;
    return ORDER.map((s) => {
      const v = counts[s];
      if (!v) return null;
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += v;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const large = end - start > Math.PI ? 1 : 0;
      const r = 50;
      const cx = 60, cy = 60;
      const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
      const d =
        v === blocks.length
          ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
      return { d, color: STATUS[s].color, key: s, pct: (v / total) * 100 };
    }).filter(Boolean) as { d: string; color: string; key: Status; pct: number }[];
  }, [counts, total, blocks.length]);

  return (
    <Card
      className="p-5 shadow-soft lg:col-span-2"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Attendance Timetable</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm font-medium px-2 min-w-[170px] text-center">
            {fmtRange(weekStart, dayCount)}
          </div>
          <Button size="icon" variant="outline" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeSat}
            onCheckedChange={(v) => setIncludeSat(!!v)}
          />
          Include Saturday School
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Repeat for</span>
          <Input
            type="number"
            min={1}
            max={52}
            value={repeatN}
            onChange={(e) => setRepeatN(e.target.value)}
            className="w-16 h-8"
          />
          <span className="text-sm text-muted-foreground">weeks</span>
          <Button size="sm" onClick={repeatWeek} disabled={!blocks.length}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Repeat
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_180px] gap-4">
        {/* grid */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0,1fr))` }}
        >
          {Array.from({ length: dayCount }).map((_, d) => {
            const day = addDays(weekStart, d);
            const dayBlocks = blocks
              .filter((b) => b.day === d)
              .sort((a, b) => a.start.localeCompare(b.start));
            return (
              <div
                key={d}
                className="rounded-md border bg-card/50 p-2 min-h-[180px] flex flex-col"
              >
                <div className="text-xs font-medium text-center mb-2">
                  <div>{DAYS[d]}</div>
                  <div className="text-muted-foreground">{day.getDate()}</div>
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  {dayBlocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center text-[10px] text-muted-foreground flex-1 px-1">
                      <BookX className="h-6 w-6 mb-1 opacity-60" />
                      <span>No classes available for this day</span>
                    </div>
                  ) : (
                    dayBlocks.map((b) => {
                      const st = STATUS[b.status];
                      return (
                        <button
                          key={b.id}
                          onClick={() => {
                            setEditing({ day: d, block: b });
                            setDialogOpen(true);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            cycleStatus(b.id);
                          }}
                          className="text-left rounded p-1.5 text-[11px] leading-tight transition"
                          style={{ background: st.color, color: st.text }}
                          title={`${st.label} — click to edit, right-click to cycle status`}
                        >
                          <div className="font-semibold truncate">{b.subject}</div>
                          <div className="opacity-90 truncate">
                            {b.start}–{b.end}
                          </div>
                          {(b.room || b.teacher) && (
                            <div className="opacity-80 truncate">
                              {b.room}
                              {b.room && b.teacher ? " · " : ""}
                              {b.teacher}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] mt-auto"
                    onClick={() => {
                      setEditing({ day: d });
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* pie + actions */}
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 120 120" className="w-[140px] h-[140px]">
            {blocks.length === 0 ? (
              <circle cx="60" cy="60" r="50" fill="hsl(var(--muted))" />
            ) : (
              pieSlices.map((s) => (
                <path key={s.key} d={s.d} fill={s.color} />
              ))
            )}
          </svg>
          <div className="text-xs space-y-1 mt-2 w-full">
            {ORDER.map((s) => (
              <div key={s} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: STATUS[s].color }}
                  />
                  {STATUS[s].label}
                </span>
                <span className="text-muted-foreground">
                  {counts[s]}
                  {blocks.length
                    ? ` · ${Math.round((counts[s] / blocks.length) * 100)}%`
                    : ""}
                </span>
              </div>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full"
            onClick={resetAttendance}
            disabled={!blocks.length}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Attendance
          </Button>
        </div>
      </div>

      <BlockDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        onSave={upsertBlock}
        onDelete={removeBlock}
      />
    </Card>
  );
}

function BlockDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: { day: number; block?: Block } | null;
  onSave: (b: Block) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Block>({
    id: "",
    day: 0,
    subject: "",
    room: "",
    teacher: "",
    start: "08:00",
    end: "08:45",
    status: "present",
  });

  useEffect(() => {
    if (!open || !editing) return;
    if (editing.block) setForm(editing.block);
    else
      setForm({
        id: crypto.randomUUID(),
        day: editing.day,
        subject: "",
        room: "",
        teacher: "",
        start: "08:00",
        end: "08:45",
        status: "present",
      });
  }, [open, editing]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing?.block ? "Edit Class" : "Add Class"} — {DAYS[form.day]}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Subject</Label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <Label>Room</Label>
            <Input
              value={form.room}
              onChange={(e) => setForm({ ...form, room: e.target.value })}
            />
          </div>
          <div>
            <Label>Teacher</Label>
            <Input
              value={form.teacher}
              onChange={(e) => setForm({ ...form, teacher: e.target.value })}
            />
          </div>
          <div>
            <Label>Start</Label>
            <Input
              type="time"
              step={300}
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
            />
          </div>
          <div>
            <Label>End</Label>
            <Input
              type="time"
              step={300}
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label>Attendance Status</Label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              style={{ borderLeft: `4px solid ${STATUS[form.status].color}` }}
            >
              {ORDER.map((s) => (
                <option key={s} value={s}>
                  {STATUS[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {editing?.block && (
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(form.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
          <Button
            onClick={() => {
              if (!form.subject.trim()) return;
              onSave(form);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
