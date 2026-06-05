import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { calcAverage, getLetter, filterByTerm } from "@/lib/grade-utils";
import { TrendingUp, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PredictiveAnalysis() {
  const { tasks, scale, settings, terms, activeTermId } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const termScoped = filterByTerm(tasks, activeTerm);
  const filtered = termScoped.filter(
    (t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse,
  );
  const completed = filtered.filter((t) => !t.pending);
  const pending = filtered.filter((t) => t.pending);

  const currentAvg = calcAverage(completed, settings.weighted);
  const predictedAvg = calcAverage(
    settings.hypotheticalMode
      ? filtered
      : [...completed, ...pending.map((p) => ({ ...p, score: currentAvg * (p.maxScore / 100) }))],
    settings.weighted,
  );

  const currentLetter = getLetter(currentAvg, scale);
  const predictedLetter = getLetter(predictedAvg, scale);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Predictive Analysis</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Mini label="Current Average" value={`${currentAvg.toFixed(1)}%`} sub={currentLetter?.letter} />
        <Mini
          label="Pending Tasks"
          value={String(pending.length)}
          sub={`${completed.length} completed`}
        />
        <Mini
          label="Predicted Final"
          value={`${predictedAvg.toFixed(1)}%`}
          sub={predictedLetter?.letter}
          highlight
        />
      </div>
    </Card>
  );
}

function Mini({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        highlight ? "bg-success/10 border-success/30" : "bg-muted/40 border-transparent"
      }`}
    >
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="flex items-baseline gap-2 mt-1 flex-wrap">
        <div className="text-2xl font-bold leading-none">{value}</div>
        {sub && (
          <div className="text-sm text-primary font-medium leading-none">{sub}</div>
        )}
      </div>
    </div>
  );
}

export function GoalTracker() {
  const { tasks, settings, setSettings, scale, terms, activeTermId } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const filtered = filterByTerm(tasks, activeTerm).filter(
    (t) => settings.selectedCourse === "all" || t.courseId === settings.selectedCourse,
  );
  const completed = filtered.filter((t) => !t.pending);
  const avg = calcAverage(
    settings.hypotheticalMode ? filtered : completed,
    settings.weighted,
  );
  const diff = avg - settings.goal;
  const onTrack = diff >= 0;
  const close = !onTrack && diff > -5;
  const progress = Math.min(100, (avg / settings.goal) * 100);

  const letter = getLetter(settings.goal, scale);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Goal Tracker</h3>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="goal" className="text-xs text-muted-foreground">
            Goal %
          </Label>
          <Input
            id="goal"
            type="number"
            value={settings.goal}
            onChange={(e) => setSettings({ goal: Number(e.target.value) || 0 })}
            className="w-20 h-8"
          />
          {letter && (
            <span className="text-xs text-muted-foreground">({letter.letter})</span>
          )}
        </div>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
        <div
          className="h-full transition-all rounded-full"
          style={{
            width: `${progress}%`,
            background: onTrack
              ? "var(--success)"
              : close
                ? "var(--warning)"
                : "var(--destructive)",
          }}
        />
      </div>
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
          onTrack
            ? "bg-success/10 text-success"
            : close
              ? "bg-warning/15 text-warning-foreground"
              : "bg-destructive/10 text-destructive"
        }`}
      >
        {onTrack ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            On track! You're {diff.toFixed(1)}% above your goal
          </>
        ) : (
          <>
            <AlertTriangle className="h-4 w-4" />
            {Math.abs(diff).toFixed(1)}% away from goal — {close ? "close" : "at risk"}
          </>
        )}
      </div>
    </Card>
  );
}
