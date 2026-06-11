import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, BookOpen } from "lucide-react";
import {
  addUnit,
  masteryIndex,
  removeUnit,
  setUnitLevel,
  useSyllabusUnits,
  type MasteryLevel,
} from "@/lib/syllabus-store";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";

const LEVELS: { id: MasteryLevel; label: string; className: string; activeClass: string }[] = [
  {
    id: "red",
    label: "Struggling",
    className: "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40",
    activeClass: "bg-red-600 border-red-600 text-white hover:bg-red-600",
  },
  {
    id: "amber",
    label: "Reviewing",
    className: "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40",
    activeClass: "bg-amber-500 border-amber-500 text-white hover:bg-amber-500",
  },
  {
    id: "green",
    label: "Mastered",
    className: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40",
    activeClass: "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-600",
  },
];

export function SyllabusMastery() {
  const { courses, tasks, settings } = useGrades();
  const courseId = settings.selectedCourse;
  const course = courses.find((c) => c.id === courseId);
  const targetId = course ? course.id : "all";
  const units = useSyllabusUnits(targetId);
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    addUnit(targetId, name);
    setName("");
  };

  const courseTasks = course
    ? tasks.filter((t) => t.courseId === course.id && !t.pending)
    : tasks.filter((t) => !t.pending);
  const testAvg = courseTasks.length ? calcAverage(courseTasks, settings.weighted) : null;
  const index = masteryIndex(units);

  return (
    <Card className="p-5 shadow-soft space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Syllabus Unit Mastery
            <span className="text-xs font-normal text-muted-foreground">
              · {course ? course.name : "All Subjects"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track confidence per topic. Green units count toward the mastery index.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold tabular-nums dark:bg-emerald-950/40 dark:text-emerald-300"
            title="Green units ÷ total units"
          >
            {index === null ? "—" : `${index.toFixed(0)}%`} Course Concept Mastery
          </span>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold tabular-nums"
            title="Weighted test average"
          >
            {testAvg === null ? "—" : `${testAvg.toFixed(1)}%`} Test Average
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a learning module or topic (e.g. Trigonometric identities)"
          maxLength={80}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAdd();
          }}
        />
        <Button onClick={handleAdd} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No units yet. Add your first topic above.
        </p>
      ) : (
        <div className="space-y-2">
          {units.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5"
            >
              <span className="text-sm font-medium flex-1 truncate">{u.name}</span>
              <div className="flex gap-1.5 shrink-0">
                {LEVELS.map((lv) => {
                  const active = u.level === lv.id;
                  return (
                    <button
                      key={lv.id}
                      onClick={() => setUnitLevel(targetId, u.id, lv.id)}
                      className={`px-2.5 h-7 rounded-full border text-[11px] font-semibold transition-colors ${active ? lv.activeClass : lv.className}`}
                    >
                      {lv.label}
                    </button>
                  );
                })}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => removeUnit(targetId, u.id)}
                title="Remove unit"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}