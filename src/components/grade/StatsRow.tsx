import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter, calcGPA, filterByTerm } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function StatsRow() {
  const { tasks, scale, settings, setSettings, courses, terms, activeTermId } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  // Strictly compute averages only from tasks within the active term boundary.
  const termScoped = filterByTerm(tasks, activeTerm);
  const filtered = settings.selectedCourse === "all"
    ? termScoped
    : termScoped.filter((t) => t.courseId === settings.selectedCourse);
  const completed = filtered.filter((t) => !t.pending);
  const avg = calcAverage(
    settings.hypotheticalMode ? filtered : completed,
    settings.weighted
  );
  const letter = getLetter(avg, scale);
  const gpa = calcGPA(courses, completed, scale);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Stat label="Average" value={`${(Math.floor(avg * 10) / 10).toFixed(1)}%`} accent />
      <Stat
        label="Letter Grade"
        value={letter?.letter ?? "—"}
        sub={letter?.description}
        accent
      />
      <Stat label="Total Tasks" value={String(completed.length)} />
      <Stat label="Cumulative GPA" value={gpa.toFixed(2)} sub="4.0 scale" />
      <Card className="p-4 flex flex-col justify-between shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Mode</div>
        <div className="flex items-center gap-3 mt-2">
          <Switch
            id="weighted"
            checked={settings.weighted}
            onCheckedChange={(v) => setSettings({ weighted: v })}
          />
          <Label htmlFor="weighted" className="font-medium">
            {settings.weighted ? "Weighted" : "Mean"}
          </Label>
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-4 shadow-soft">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={`text-3xl font-bold mt-1 ${accent ? "text-primary" : "text-foreground"}`}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}
