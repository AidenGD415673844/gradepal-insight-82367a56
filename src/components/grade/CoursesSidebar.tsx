import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, Plus, Trash2, AlertTriangle, Pencil, Check, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcAverage } from "@/lib/grade-utils";
import { VelocityBadge } from "@/components/grade/VelocityBadge";

export function CoursesSidebar() {
  const { courses, tasks, settings, setSettings, addCourse, deleteCourse, categories, addCategory, deleteCategory, renameCourse, subjectGoals, setSubjectGoal } =
    useGrades();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("3");
  const [catOpen, setCatOpen] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");

  const isActive = (id: string) => settings.selectedCourse === id;
  const readOnly = settings.parentView;

  const handleAdd = () => {
    if (!name.trim()) return;
    const colors = [
      "oklch(0.55 0.22 275)",
      "oklch(0.6 0.16 155)",
      "oklch(0.72 0.17 65)",
      "oklch(0.62 0.22 25)",
      "oklch(0.6 0.15 220)",
    ];
    addCourse({
      id: crypto.randomUUID(),
      name: name.trim(),
      credits: Number(credits) || 0,
      color: colors[courses.length % colors.length],
    });
    setName("");
    setCredits("3");
    setOpen(false);
  };

  const courseAvg = (courseId: string) => {
    const ct = tasks.filter((t) => t.courseId === courseId && !t.pending);
    return ct.length ? calcAverage(ct, settings.weighted) : null;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 shadow-soft backdrop-blur-xl bg-card/70 border-border/60 h-fit">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Subjects
          </span>
          {!readOnly && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Subject</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Subject Name</Label>
                    <Input value={name} maxLength={25} onChange={(e) => setName(e.target.value.slice(0, 25))} placeholder="" />
                    <p className="text-[10px] text-muted-foreground mt-1">{name.length}/25</p>
                  </div>
                  <div>
                    <Label>Credit Hours</Label>
                    <Input
                      type="number"
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      placeholder=""
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAdd}>Add Subject</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setSettings({ selectedCourse: "all" })}
            className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors ${
              isActive("all")
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-foreground"
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <GraduationCap className="h-4 w-4" />
              All Subjects
            </span>
            <span className="text-xs opacity-70">{tasks.length}</span>
          </button>
          {courses.map((c) => {
            const count = tasks.filter((t) => t.courseId === c.id).length;
            const avg = courseAvg(c.id);
            const danger = avg !== null && avg < settings.dangerThreshold;
            const goal = subjectGoals[c.id];
            const isEditing = editingId === c.id;
            if (isEditing) {
              return (
                <div key={c.id} className="p-2 rounded-lg border bg-muted/30 space-y-2">
                  <div>
                    <Label className="text-[10px] uppercase">Name</Label>
                    <Input
                      value={editName}
                      maxLength={25}
                      onChange={(e) => setEditName(e.target.value.slice(0, 25))}
                      className="h-8 text-sm"
                    />
                    <p className="text-[10px] text-muted-foreground">{editName.length}/25</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase">Goal % (blank = use global)</Label>
                    <Input
                      type="number"
                      value={editGoal}
                      onChange={(e) => setEditGoal(e.target.value)}
                      className="h-8 text-sm"
                      placeholder={String(settings.goal)}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      className="flex-1 gap-1 h-7"
                      onClick={() => {
                        const n = editName.trim().slice(0, 25);
                        if (n) renameCourse(c.id, n);
                        const g = editGoal.trim();
                        setSubjectGoal(c.id, g === "" ? null : Number(g));
                        setEditingId(null);
                      }}
                    >
                      <Check className="h-3 w-3" /> Save
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            }
            return (
              <div key={c.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSettings({ selectedCourse: c.id })}
                  className={`flex-1 text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors min-w-0 ${
                    isActive(c.id)
                      ? "bg-primary text-primary-foreground"
                      : danger
                        ? "bg-destructive/10 hover:bg-destructive/20 text-foreground border border-destructive/30"
                        : "hover:bg-accent text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium truncate min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        isActive(c.id)
                          ? "ring-2 ring-primary-foreground/80"
                          : ""
                      }`}
                      style={{ background: c.color }}
                    />
                    <span className="truncate">{c.name}</span>
                    {danger && (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                  </span>
                  <span className="text-xs opacity-70 ml-2 shrink-0">
                    {avg !== null ? `${avg.toFixed(0)}%` : count}
                    {goal !== undefined && <span className="ml-1">/{goal}</span>}
                  </span>
                  <VelocityBadge
                    compact
                    className="ml-1.5 shrink-0"
                    tasks={tasks.filter((t) => t.courseId === c.id && !t.pending)}
                  />
                </button>
                {!readOnly && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                        setEditGoal(goal !== undefined ? String(goal) : "");
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm(`Delete "${c.name}" and its grades?`)) deleteCourse(c.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {!readOnly && (
        <Card className="p-4 shadow-soft backdrop-blur-xl bg-card/70 border-border/60">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Categories
            </span>
            <Dialog open={catOpen} onOpenChange={setCatOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Category</DialogTitle>
                </DialogHeader>
                <Input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  placeholder="e.g. Labs"
                />
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (newCat.trim()) {
                        addCategory(newCat.trim());
                        setNewCat("");
                        setCatOpen(false);
                      }
                    }}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-1">
            {categories.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-accent text-sm"
              >
                <span>{c}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    if (confirm(`Delete category "${c}"?`)) deleteCategory(c);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground px-3 py-2">No categories yet.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
