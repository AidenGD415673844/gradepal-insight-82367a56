import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useState } from "react";
import { TaskDialog } from "./GradesTable";
import type { Task } from "@/lib/grade-store";

export function CalendarView() {
  const { tasks, settings } = useGrades();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);
  const [defaultDate, setDefaultDate] = useState<string | undefined>();

  const filtered = tasks.filter(
    (t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse,
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < startDay; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d).toISOString().slice(0, 10);
    cells.push({ date, day: d });
  }

  const monthName = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center text-sm">{monthName}</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground text-center mb-1 font-medium">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date)
            return <div key={i} className="aspect-square" />;
          const dayTasks = filtered.filter((t) => t.date === cell.date);
          const isToday = cell.date === today;
          return (
            <button
              key={i}
              onClick={() => {
                if (dayTasks.length) {
                  setEditing(dayTasks[0]);
                  setDefaultDate(undefined);
                } else {
                  setEditing(null);
                  setDefaultDate(cell.date ?? undefined);
                }
                setOpen(true);
              }}
              className={`aspect-square rounded-lg p-1.5 flex flex-col items-start text-left transition-colors border ${
                isToday
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:bg-accent"
              }`}
            >
              <span
                className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}
              >
                {cell.day}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-auto">
                  {dayTasks.slice(0, 3).map((t) => (
                    <span
                      key={t.id}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{
                        background: t.pending ? "var(--warning)" : "var(--primary)",
                      }}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{dayTasks.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <TaskDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        defaultDate={defaultDate}
      />
    </Card>
  );
}
