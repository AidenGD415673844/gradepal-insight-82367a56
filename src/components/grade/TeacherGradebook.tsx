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
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const { courses } = useGrades();
  const [all, setAll] = useState<Record<string, CourseCriteria>>(() => loadCriteria());
  const [openInter, setOpenInter] = useState<Record<string, boolean>>({});

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
    </div>
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