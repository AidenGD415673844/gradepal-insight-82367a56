import { useGrades, type Task } from "@/lib/grade-store";
import { useUIPrefs } from "@/lib/ui-prefs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

export function GradesTable() {
  const { tasks, courses, settings, deleteTask, updateTask, scale } = useGrades();
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [sliderFor, setSliderFor] = useState<string | null>(null);

  const filtered = tasks.filter(
    (t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse,
  );

  // Total weight per course (used to label tasks by their syllabus weight %)
  const totalWByCourse = courses.reduce<Record<string, number>>((acc, c) => {
    acc[c.id] = tasks
      .filter((t) => t.courseId === c.id)
      .reduce((s, t) => s + (t.weight || 0), 0);
    return acc;
  }, {});

  const weightTag = (pct: number) => {
    if (pct >= 20)
      return {
        label: "High Weight",
        cls: "bg-destructive/15 text-destructive border-destructive/40",
      };
    if (pct >= 10)
      return {
        label: "Medium",
        cls: "bg-warning/15 text-warning-foreground border-warning/40",
      };
    return {
      label: "Light",
      cls: "bg-primary/15 text-primary border-primary/40",
    };
  };

  const readOnly = settings.parentView;


  return (
    <Card className="p-5 shadow-soft backdrop-blur-xl bg-card/70 border-border/60">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Grades</h3>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add Grade
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground border-b">
              <th className="py-2 pr-3 font-medium">Task</th>
              <th className="py-2 pr-3 font-medium">Course</th>
              <th className="py-2 pr-3 font-medium">Category</th>
              <th className="py-2 pr-3 font-medium">Score</th>
              <th className="py-2 pr-3 font-medium">Grade</th>
              <th className="py-2 pr-3 font-medium">Weight</th>
              <th className="py-2 pr-3 font-medium">Date</th>
              {!readOnly && <th className="py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-muted-foreground">
                  No grades yet. Add one to get started.
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const course = courses.find((c) => c.id === t.courseId);
              const pct = (t.score / t.maxScore) * 100;
              const letter = scale
                .slice()
                .sort((a, b) => b.min - a.min)
                .find((r) => pct >= r.min);
              const totalW = totalWByCourse[t.courseId] || 0;
              const weightPct = totalW > 0 ? ((t.weight || 0) / totalW) * 100 : 0;
              const tag = weightTag(weightPct);
              const showSlider = sliderFor === t.id;
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-2.5 pr-3 font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.hypothetical && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-warning/20 text-warning-foreground border border-warning/30">
                          HYPO
                        </span>
                      )}
                      {t.pending && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          PENDING
                        </span>
                      )}
                      {t.name}
                      <span
                        title={`${weightPct.toFixed(1)}% of syllabus weight`}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${tag.cls}`}
                      >
                        {tag.label}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: course?.color }}
                      />
                      {course?.name ?? "—"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{t.category}</td>
                  <td className="py-2.5 pr-3 align-top">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">
                        {t.score}/{t.maxScore}
                      </span>
                      {!readOnly && (
                        <button
                          className="text-[10px] text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                          onClick={() => setSliderFor(showSlider ? null : t.id)}
                        >
                          {showSlider ? "done" : "slide"}
                        </button>
                      )}
                    </div>
                    {showSlider && !readOnly && (
                      <input
                        type="range"
                        min={0}
                        max={t.maxScore}
                        step={1}
                        value={t.score}
                        onChange={(e) =>
                          updateTask(t.id, { score: Number(e.target.value) })
                        }
                        className="w-28 accent-primary mt-1"
                      />
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-semibold">
                    {pct.toFixed(1)}% <span className="text-primary">{letter?.letter ?? ""}</span>
                  </td>
                  <td className="py-2.5 pr-3">{t.weight}×</td>
                  <td className="py-2.5 pr-3 text-muted-foreground">{t.date}</td>
                  {!readOnly && (
                    <td className="py-2.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditing(t);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => deleteTask(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}

          </tbody>
        </table>
      </div>
      <TaskDialog open={open} onOpenChange={setOpen} editing={editing} />
    </Card>
  );
}

type FormState = {
  name: string;
  courseId: string;
  score: string;
  maxScore: string;
  weight: string;
  category: string;
  date: string;
  pending: boolean;
  hypothetical: boolean;
};

export function TaskDialog({
  open,
  onOpenChange,
  editing,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Task | null;
  defaultDate?: string;
}) {
  const { courses, categories, addTask, updateTask, tasks, settings } = useGrades();
  const [prefs] = useUIPrefs();
  const quick = prefs.quickAdd && !editing;

  const buildEmpty = (): FormState => ({
    name: "",
    courseId: "",
    score: "",
    maxScore: "",
    weight: "",
    category: "",
    date: defaultDate ?? "",
    pending: false,
    hypothetical: false,
  });

  const [form, setForm] = useState<FormState>(buildEmpty());

  // Reset whenever dialog opens — fixes leftover-input bug
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        courseId: editing.courseId,
        score: String(editing.score),
        maxScore: String(editing.maxScore),
        weight: String(editing.weight),
        category: editing.category,
        date: editing.date,
        pending: !!editing.pending,
        hypothetical: !!editing.hypothetical,
      });
    } else {
      setForm(buildEmpty());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const save = () => {
    const courseId = quick ? (form.courseId || courses[0]?.id || "") : form.courseId;
    if (!form.name || !courseId) return;
    const maxScore = Number(form.maxScore) || 100;
    let score = Number(form.score) || 0;
    // Hypothetical + Pending: auto-fill with course average
    if (form.pending && settings.hypotheticalMode && !form.score) {
      const done = tasks.filter(
        (t) => t.courseId === form.courseId && !t.pending,
      );
      if (done.length) {
        const avgPct =
          done.reduce((a, t) => a + (t.score / t.maxScore) * 100, 0) /
          done.length;
        score = Math.round((avgPct / 100) * maxScore);
      }
    }
    const payload = {
      name: form.name,
      courseId,
      score,
      maxScore,
      weight: Number(form.weight) || 1,
      category: form.category || "Homework",
      date: form.date || new Date().toISOString().slice(0, 10),
      pending: form.pending,
      hypothetical: form.hypothetical,
    };
    if (editing) updateTask(editing.id, payload);
    else addTask({ id: crypto.randomUUID(), ...payload });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Grade" : "Add Grade"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Task Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Chapter 3 Quiz"
            />
          </div>
          {!quick && (
          <div>
            <Label>Subject</Label>
            <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          )}
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Score</Label>
            <Input
              type="number"
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
              placeholder=""
            />
          </div>
          <div>
            <Label>Max Score</Label>
            <Input
              type="number"
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
              placeholder="100"
            />
          </div>
          {!quick && (<>
          <div>
            <Label>Weight</Label>
            <Input
              type="number"
              step="0.1"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
              placeholder="1"
            />
          </div>
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.pending} onCheckedChange={(v) => setForm({ ...form, pending: !!v })} />
              Pending (upcoming)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.hypothetical} onCheckedChange={(v) => setForm({ ...form, hypothetical: !!v })} />
              Hypothetical
            </label>
          </div>
          </>)}
        </div>
        <DialogFooter>
          <Button onClick={save}>{editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
