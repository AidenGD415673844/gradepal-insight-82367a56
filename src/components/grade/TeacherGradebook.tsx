import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useGrades } from "@/lib/grade-store";
import {
  CRITERIA_LETTERS,
  loadCriteria,
  saveCriteria,
  type CourseCriteria,
  type CriteriaLetter,
} from "@/lib/teacher-auth";
import { ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { calcAverage } from "@/lib/grade-utils";
import { Badge } from "@/components/ui/badge";

const CORE = [
  { key: "A" as const, label: "Criterion A" },
  { key: "B" as const, label: "Criterion B" },
  { key: "C" as const, label: "Criterion C" },
  { key: "D" as const, label: "Criterion D" },
];
const INTERDISC = [
  { key: "IA" as const, label: "Interdisciplinary A — Evaluating" },
  { key: "IB" as const, label: "Interdisciplinary B — Synthesizing" },
  { key: "IC" as const, label: "Interdisciplinary C — Reflecting" },
];

export function TeacherGradebook() {
  const { courses, tasks, settings } = useGrades();
  const [all, setAll] = useState<Record<string, CourseCriteria>>(() => loadCriteria());
  const [openInter, setOpenInter] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<"criteria" | "intervention">("criteria");

  const set = (courseId: string, key: keyof CourseCriteria, value: CriteriaLetter) => {
    saveCriteria(courseId, key, value);
    setAll(loadCriteria());
  };

  useEffect(() => {
    const sync = () => setAll(loadCriteria());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border bg-card p-1 gap-1">
        <button
          onClick={() => setTab("criteria")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === "criteria" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          Criteria Gradebook
        </button>
        <button
          onClick={() => setTab("intervention")}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === "intervention" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"}`}
        >
          Intervention Matrix
        </button>
      </div>

      {tab === "intervention" && (
        <InterventionMatrix courses={courses} tasks={tasks} weighted={settings.weighted} />
      )}

      {tab === "criteria" && (<>
      <Card className="p-4">
        <p className="text-xs text-muted-foreground">
          Teacher-only qualitative criteria. These values save locally per
          subject and are <strong>never factored</strong> into numerical averages,
          GPA, or category weights.
        </p>
      </Card>

      {courses.map((c) => {
        const data = all[c.id] ?? {};
        const interOpen = !!openInter[c.id];
        return (
          <Card key={c.id} className="p-4 md:p-5 border-l-4" style={{ borderLeftColor: c.color }}>
            <h3 className="text-lg font-bold mb-3">{c.name}</h3>

            <div className="space-y-3">
              {CORE.map((cr) => (
                <CriteriaRow
                  key={cr.key}
                  label={cr.label}
                  value={data[cr.key]}
                  onChange={(v) => set(c.id, cr.key, v)}
                />
              ))}
            </div>

            <button
              onClick={() => setOpenInter((o) => ({ ...o, [c.id]: !o[c.id] }))}
              className="mt-4 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {interOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Interdisciplinary Criteria
            </button>

            {interOpen && (
              <div className="mt-3 space-y-3 animate-fade-in">
                {INTERDISC.map((cr) => (
                  <CriteriaRow
                    key={cr.key}
                    label={cr.label}
                    value={data[cr.key]}
                    onChange={(v) => set(c.id, cr.key, v)}
                  />
                ))}
              </div>
            )}

            <p className="mt-3 text-[11px] italic text-muted-foreground">
              ID Assessment above was last updated by Teacher on{" "}
              {data.updatedAt
                ? new Date(data.updatedAt).toLocaleString()
                : "—"}
            </p>
          </Card>
        );
      })}
      </>)}
    </div>
  );
}

function InterventionMatrix({ courses, tasks, weighted }: { courses: any[]; tasks: any[]; weighted: boolean }) {
  const rows = courses.map((c) => {
    const ct = tasks.filter((t) => t.courseId === c.id);
    const completed = ct.filter((t) => !t.pending);
    const completion = ct.length > 0 ? (completed.length / ct.length) * 100 : 100;
    const avg = calcAverage(completed, weighted);
    // Velocity: compare last 3 vs prior 3
    const sorted = [...completed].sort((a, b) => a.date.localeCompare(b.date));
    const last3 = sorted.slice(-3).map((t) => (t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0));
    const prev3 = sorted.slice(-6, -3).map((t) => (t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0));
    const recent = last3.length ? last3.reduce((a, b) => a + b, 0) / last3.length : avg;
    const prior = prev3.length ? prev3.reduce((a, b) => a + b, 0) / prev3.length : recent;
    const velocity = recent - prior;
    const flags = [velocity < -1, completion < 75, avg < 60];
    const flagCount = flags.filter(Boolean).length;
    return { course: c, avg, completion, velocity, flagCount };
  });

  return (
    <Card className="p-4 md:p-5 backdrop-blur-md bg-card/70 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-rose-500" />
        <h2 className="text-base font-bold">Student Intervention Matrix</h2>
        <span className="text-[11px] text-muted-foreground ml-auto">
          Flags: velocity ↓, completion &lt; 75%, average &lt; 60%
        </span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => {
          const flagged = r.flagCount >= 2;
          return (
            <Link
              key={r.course.id}
              to="/grades"
              className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                flagged
                  ? "bg-rose-500/10 border-rose-500/40"
                  : "bg-card/50 hover:bg-muted/40"
              }`}
              style={{ transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {flagged ? (
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{r.course.name}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    Avg {r.avg.toFixed(1)}% · Completion {r.completion.toFixed(0)}% · Vel {r.velocity >= 0 ? "+" : ""}{r.velocity.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {flagged && (
                  <Badge className="bg-rose-500 text-white border-rose-500">Intervention Recommended</Badge>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No courses found.</p>
        )}
      </div>
    </Card>
  );
}

function CriteriaRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CriteriaLetter | undefined;
  onChange: (v: CriteriaLetter) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {CRITERIA_LETTERS.map((L) => {
          const active = value === L;
          return (
            <button
              key={L}
              type="button"
              onClick={() => onChange(L)}
              className={`min-w-[40px] px-2 h-8 rounded-md text-xs font-bold tabular-nums border transition-all ${
                active
                  ? "bg-success text-success-foreground border-success shadow-sm"
                  : "bg-card hover:bg-muted border-border"
              }`}
            >
              {L}
            </button>
          );
        })}
      </div>
    </div>
  );
}