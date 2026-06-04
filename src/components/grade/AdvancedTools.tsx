import { useMemo, useRef, useState } from "react";
import { useGrades, type Task } from "@/lib/grade-store";
import { calcAverage, calcGPA, getLetter } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Flame,
  Trophy,
  BookOpen,
  ScanLine,
  AlertTriangle,
  Activity,
  Eye,
  Upload,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { CumulativeTrajectory } from "./Charts";

/* ---------- 1. GPA Goal Slider ---------- */
export function GpaGoalSlider() {
  const { settings, setSettings, courses, tasks, scale } = useGrades();
  const currentGpa = calcGPA(courses, tasks.filter((t) => !t.pending), scale);

  // Find min average % needed on remaining tasks to reach gpaTarget overall.
  // Approximation: solve for required overall % whose letter GPA >= target.
  const sortedScale = [...scale].sort((a, b) => a.gpa - b.gpa);
  const neededLetter = sortedScale.find((s) => s.gpa >= settings.gpaTarget);
  const neededPct = neededLetter?.min ?? 100;

  const pending = tasks.filter((t) => t.pending);
  const completed = tasks.filter((t) => !t.pending);
  const completedWeight = completed.reduce((s, t) => s + (t.weight || 1), 0);
  const pendingWeight = pending.reduce((s, t) => s + (t.weight || 1), 0);
  const currentAvg = calcAverage(completed, true);
  const required =
    pendingWeight > 0
      ? (neededPct * (completedWeight + pendingWeight) - currentAvg * completedWeight) /
        pendingWeight
      : neededPct;
  const achievable = required <= 100 && required >= 0;

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">GPA Goal</h3>
      </div>
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="text-muted-foreground">Target GPA</span>
        <span className="font-bold text-primary text-lg">{settings.gpaTarget.toFixed(2)}</span>
      </div>
      <Slider
        value={[settings.gpaTarget]}
        min={0}
        max={4}
        step={0.05}
        onValueChange={(v) => setSettings({ gpaTarget: v[0] })}
        className="mb-4"
      />
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="text-xs text-muted-foreground">Current GPA</div>
          <div className="text-2xl font-bold mt-1">{currentGpa.toFixed(2)}</div>
        </div>
        <div
          className={`p-3 rounded-lg ${
            achievable ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"
          }`}
        >
          <div className="text-xs text-muted-foreground">Need on remaining</div>
          <div className="text-2xl font-bold mt-1">
            {pending.length === 0
              ? "—"
              : achievable
                ? `${Math.max(0, required).toFixed(1)}%`
                : "Out of reach"}
          </div>
          <div className="text-xs mt-0.5 text-muted-foreground">
            {pending.length} pending · target {neededLetter?.letter ?? "?"}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- 2. Burnout Meter & Streak Tracker ---------- */
export function BurnoutAndStreak() {
  const { tasks, settings } = useGrades();
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);
  const thisWeek = tasks.filter((t) => {
    const d = new Date(t.date);
    return t.pending && d >= now && d <= weekEnd;
  });
  const load = thisWeek.reduce((s, t) => s + (t.weight || 1), 0);
  const burnout = Math.min(100, (load / 8) * 100);
  const tone =
    burnout < 30 ? "bg-success" : burnout < 70 ? "bg-warning" : "bg-destructive";
  const label = burnout < 30 ? "Chill" : burnout < 70 ? "Busy" : "Overloaded";

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Burnout & Streak</h3>
      </div>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">This week's load</span>
            <span className="font-semibold">{label}</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div className={`h-full ${tone} transition-all`} style={{ width: `${burnout}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {thisWeek.length} upcoming task{thisWeek.length === 1 ? "" : "s"} · weight {load.toFixed(1)}×
          </p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/20">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold leading-none">{settings.streak} 🔥</div>
            <div className="text-xs text-muted-foreground mt-1">Study streak (days)</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ---------- 3. Smart Study Planner ---------- */
export function SmartStudyPlanner() {
  const { tasks, courses, scale, settings } = useGrades();
  const weakest = useMemo(() => {
    return courses
      .map((c) => {
        const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
        const avg = ct.length ? calcAverage(ct, settings.weighted) : 100;
        const upcoming = tasks.filter((t) => t.courseId === c.id && t.pending).length;
        return { course: c, avg, upcoming };
      })
      .sort((a, b) => a.avg - b.avg);
  }, [tasks, courses, scale, settings.weighted]);

  const totalMinutes = 120;
  const totalGap = weakest.reduce((s, w) => s + Math.max(0, 90 - w.avg), 0) || 1;
  const plan = weakest.map((w) => {
    const gap = Math.max(0, 90 - w.avg);
    const mins = Math.round((gap / totalGap) * totalMinutes);
    return { ...w, mins };
  });

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Smart Study Planner</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Suggested daily breakdown ({totalMinutes} min total) — prioritizing weakest subjects.
      </p>
      <div className="space-y-2">
        {plan.map((p) => {
          const letter = getLetter(p.avg, scale)?.letter ?? "—";
          return (
            <div
              key={p.course.id}
              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
            >
              <span className="h-3 w-3 rounded-full" style={{ background: p.course.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.course.name}</div>
                <div className="text-xs text-muted-foreground">
                  Current {p.avg.toFixed(0)}% ({letter}) · {p.upcoming} upcoming
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">{p.mins} min</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">today</div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- 4. Syllabus AI Scanner (mock) ---------- */
const MOCK_EXTRACT = [
  { name: "Reading Response 1", category: "Homework", weight: 1, daysOut: 3 },
  { name: "Midterm Exam", category: "Tests", weight: 3, daysOut: 21 },
  { name: "Group Project", category: "Projects", weight: 2, daysOut: 35 },
  { name: "Lab Quiz 2", category: "Quizzes", weight: 1, daysOut: 10 },
  { name: "Final Paper", category: "Projects", weight: 3, daysOut: 56 },
];

export function SyllabusScanner() {
  const { courses, settings, addTask, categories, addCategory } = useGrades();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanned, setScanned] = useState<typeof MOCK_EXTRACT | null>(null);
  const [target, setTarget] = useState(
    settings.selectedCourse !== "all" ? settings.selectedCourse : courses[0]?.id ?? "",
  );
  const [scanning, setScanning] = useState(false);

  const handleScan = (file: File) => {
    setScanning(true);
    setTimeout(() => {
      setScanned(MOCK_EXTRACT);
      setScanning(false);
      toast.success(`Scanned ${file.name} — ${MOCK_EXTRACT.length} items detected`);
    }, 900);
  };

  const importAll = () => {
    if (!scanned || !target) return;
    for (const item of scanned) {
      if (!categories.includes(item.category)) addCategory(item.category);
      const date = new Date(Date.now() + item.daysOut * 86400000).toISOString().slice(0, 10);
      addTask({
        id: crypto.randomUUID(),
        courseId: target,
        name: item.name,
        score: 0,
        maxScore: 100,
        weight: item.weight,
        category: item.category,
        date,
        pending: true,
      });
    }
    toast.success(`${scanned.length} assignments added`);
    setScanned(null);
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <ScanLine className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Syllabus AI Scanner</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Upload a syllabus image or PDF — assignments auto-populate your subject. (Demo extraction)
      </p>
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div className="flex-1 min-w-[160px]">
          <Label>Import into subject</Label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
          <Upload className="h-4 w-4" />
          {scanning ? "Scanning…" : "Upload syllabus"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleScan(e.target.files[0])}
        />
      </div>
      {scanned && (
        <div className="border rounded-xl p-3 space-y-2 bg-muted/30">
          <div className="text-sm font-semibold">Detected assignments</div>
          <ul className="space-y-1">
            {scanned.map((s, i) => (
              <li key={i} className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="flex-1">{s.name}</span>
                <Badge variant="secondary">{s.category}</Badge>
                <span className="text-xs text-muted-foreground">in {s.daysOut}d</span>
                <span className="text-xs font-semibold">{s.weight}×</span>
              </li>
            ))}
          </ul>
          <Button size="sm" className="w-full mt-2" onClick={importAll}>
            Import all into {courses.find((c) => c.id === target)?.name ?? "subject"}
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ---------- 5. Historical Trend Lines ---------- */
export function HistoricalTrend() {
  return <CumulativeTrajectory />;
}

/* ---------- 6. Danger Zone Alerts ---------- */
export function DangerZoneAlerts() {
  const { courses, tasks, settings, setSettings, scale } = useGrades();
  const danger = courses
    .map((c) => {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
      const avg = ct.length ? calcAverage(ct, settings.weighted) : null;
      return { c, avg };
    })
    .filter((x) => x.avg !== null && x.avg! < settings.dangerThreshold);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-semibold text-lg">Danger Zone</h3>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Threshold %</Label>
          <Input
            type="number"
            value={settings.dangerThreshold}
            onChange={(e) => setSettings({ dangerThreshold: Number(e.target.value) || 0 })}
            className="w-20 h-8"
          />
        </div>
      </div>
      {danger.length === 0 ? (
        <p className="text-sm text-muted-foreground">All subjects above {settings.dangerThreshold}% — nice work.</p>
      ) : (
        <ul className="space-y-2">
          {danger.map(({ c, avg }) => (
            <li
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30"
            >
              <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
              <span className="font-medium flex-1">{c.name}</span>
              <span className="font-bold text-destructive">
                {avg!.toFixed(1)}% ({getLetter(avg!, scale)?.letter ?? "—"})
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------- 7. Subject Heatmap ---------- */
export function SubjectHeatmap() {
  const { courses, tasks, settings, studyMinutes } = useGrades();
  const rows = courses.map((c) => {
    const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
    const totalWeight = ct.reduce((s, t) => s + (t.weight || 1), 0);
    const avg = ct.length ? calcAverage(ct, settings.weighted) : 0;
    const mins = studyMinutes[c.id] ?? 0;
    const effortScore = (ct.length ? totalWeight / ct.length : 0) + mins / 60; // hours add to effort
    const effort = ct.length === 0 && mins === 0 ? "none" : effortScore >= 1.5 ? "high" : "low";
    const grade = avg >= 85 ? "high" : "low";
    let tag: string;
    let tone: string;
    if (ct.length === 0) {
      tag = "No data";
      tone = "bg-muted text-muted-foreground";
    } else if (effort === "high" && grade === "low") {
      tag = "High Effort / Low Grade";
      tone = "bg-destructive/10 text-destructive border-destructive/30";
    } else if (effort === "low" && grade === "high") {
      tag = "Low Effort / High Grade";
      tone = "bg-success/10 text-success border-success/30";
    } else if (effort === "high" && grade === "high") {
      tag = "High Effort / High Grade";
      tone = "bg-primary/10 text-primary border-primary/30";
    } else {
      tag = "Low Effort / Low Grade";
      tone = "bg-warning/15 text-warning-foreground border-warning/30";
    }
    return { c, tag, tone, avg, tasks: ct.length, mins };
  });

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Subject Heatmap</h3>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {rows.map((r) => (
          <div
            key={r.c.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-3 w-3 rounded-full" style={{ background: r.c.color }} />
              <div className="min-w-0">
                <div className="font-medium truncate">{r.c.name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.tasks} tasks · {r.avg.toFixed(0)}% · {Math.round(r.mins)}m studied
                </div>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${r.tone}`}>
              {r.tag}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- 8. Parent/Tutor View toggle ---------- */
export function ParentViewToggle() {
  const { settings, setSettings } = useGrades();
  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Parent / Tutor View</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Hide all editing controls and show a clean, read-only dashboard suitable for sharing.
      </p>
      <Button
        variant={settings.parentView ? "default" : "outline"}
        onClick={() => setSettings({ parentView: !settings.parentView })}
        className="w-full"
      >
        {settings.parentView ? "Exit Parent View" : "Enable Parent View"}
      </Button>
    </Card>
  );
}

/* ---------- Container ---------- */
export function AdvancedTools() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <GpaGoalSlider />
        <BurnoutAndStreak />
        <SmartStudyPlanner />
        <SyllabusScanner />
        <DangerZoneAlerts />
        <SubjectHeatmap />
      </div>
      <HistoricalTrend />
      <ParentViewToggle />
    </div>
  );
}

// Helper: keep types reachable
export type _T = Task;
