import { useEffect, useMemo, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter, filterByTerm } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileDown, Printer, GraduationCap } from "lucide-react";
import { GradeScaleTester } from "./GradeScaleTester";
import { GradeDistribution } from "./GradeDistribution";
import { AIDeepGenerate } from "./AIDeepGenerate";
import { BRACKETS, TREND_BRACKETS, COMPLETION_BRACKETS, lookupBracket } from "./feedback-data";

function truncate(s: string, n = 10): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/** Shimmer placeholder — animated linear-gradient over a light gray base. */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-muted ${className}`}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, hsl(var(--foreground) / 0.08), transparent)",
          animation: "gc-shimmer 1.4s ease-in-out infinite",
        }}
      />
    </div>
  );
}

type Meta = {
  teachers: Record<string, string>;
  goals: Record<string, string>;
  prevLetters: Record<string, string>;
  manual: Record<string, string>;
  manualOn: Record<string, boolean>;
};

const META_KEY = "gradecalc-report-meta-v1";

const defaultMeta: Meta = {
  teachers: {},
  goals: {},
  prevLetters: {},
  manual: {},
  manualOn: {},
};

/**
 * 5-bullet report-card feedback engine.
 *
 * BRACKETS array spans 4% increments from 100% down to 4%.
 * Each bracket holds exactly 5 bullet strings (B1 Strengths, B2 Trends,
 * B3 Commendations, B4 Responsibility, B5 Improvement). Only the
 * 88%-91% bracket ships with concrete copy as the template model;
 * every other bracket is intentionally stubbed with empty strings so
 * the user can paste the remaining tier text manually later.
 *
 * IMPORTANT: positive trend logic — when the student's recent half
 * outperforms the earlier half (delta > 0), the bullet phrasing
 * must reflect positive growth, never a decline.
 */



function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function AcademicFeedback() {
  const { courses, tasks, scale, terms, activeTermId, settings } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const prevTerm = useMemo(() => {
    if (!activeTerm) return null;
    const sorted = [...terms].sort((a, b) => a.start.localeCompare(b.start));
    const idx = sorted.findIndex((t) => t.id === activeTerm.id);
    return idx > 0 ? sorted[idx - 1] : null;
  }, [terms, activeTerm]);

  const [meta, setMeta] = useState<Meta>(defaultMeta);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) setMeta({ ...defaultMeta, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [meta]);

  const update = <K extends keyof Meta>(key: K, id: string, val: Meta[K][string]) =>
    setMeta((m) => ({ ...m, [key]: { ...m[key], [id]: val } }));

  const hasPrevTerm = !!prevTerm;
  const rows = courses.map((c) => {
    const allCourseTasks = tasks.filter((t) => t.courseId === c.id);
    const current = filterByTerm(allCourseTasks, activeTerm);
    const previous = filterByTerm(allCourseTasks, prevTerm);
    const done = current.filter((t) => !t.pending);
    const hasData = done.length > 0;
    const avg = hasData ? calcAverage(done, settings.weighted) : 0;
    // Report-card-local A* override: any subject avg strictly above 91%
    // (i.e. 92%–100% inclusive after rounding to the displayed tenth)
    // renders as A*, independent of the global scale rules.
    const rawLetter = hasData ? (getLetter(avg, scale)?.letter ?? "—") : "N/A";
    // Report-card-local A* override: 92%–100% inclusive renders A*.
    const letter = hasData && avg >= 91 ? "A*" : rawLetter;
    const avgDisplay = hasData ? `${avg.toFixed(1)}%` : "N/A%";
    // Previous-term average is computed strictly from previous-term tasks
    // (different date range from current term), so it cannot bleed when the
    // current term's tasks are edited.
    const prevDone = previous.filter((t) => !t.pending);
    const hasPrevData = prevDone.length > 0;
    const prevAvg = hasPrevData ? calcAverage(prevDone, settings.weighted) : 0;
    const prevLetterAuto = hasPrevData ? (getLetter(prevAvg, scale)?.letter ?? "—") : "";
    const completion = current.length
      ? Math.round((done.length / current.length) * 100)
      : 100;
    const lowest = done.length
      ? done.reduce((lo, t) =>
          t.score / t.maxScore < lo.score / lo.maxScore ? t : lo,
        )
      : null;
    return {
      course: c,
      avg,
      letter,
      avgDisplay,
      hasData,
      prevLetterAuto,
      prevAvg,
      hasPrevData,
      completion,
      lowest,
      done,
      current,
    };
  });

  const buildComment = (r: (typeof rows)[number]): string[] => {
    if (!r.hasData) {
      const msg =
        "No tasks has been ever submitted or added in this term. It is important to complete your work if you haven’t submitted anything.";
      return [msg, msg, msg, msg, msg];
    }
    // B1, B4, B5 come from the main 25-tier grade bracket.
    const main = lookupBracket(BRACKETS, r.avg);
    // B2 (Trends) — separate logic pool, keyed by delta vs previous term.
    // If no previous-term data exists, fall back to the main bracket's B2.
    const b2 = r.hasPrevData
      ? lookupBracket(TREND_BRACKETS, r.avg - r.prevAvg).bullets[1]
      : main.bullets[1];
    // B3 (Completion / Responsibility) — separate logic pool, keyed by
    // completion percentage in 5% increments.
    const b3 = lookupBracket(COMPLETION_BRACKETS, r.completion).bullets[2];
    return [main.bullets[0], b2, b3, main.bullets[3], main.bullets[4]];
  };

  const handlePrint = () => window.print();

  const handleCSV = () => {
    const header = [
      "Subject",
      "Teacher",
      "Aspirational",
      "Previous Term",
      "Current Term",
      "Average %",
      "Comment",
    ];
    const lines = rows.map((r) => {
      const teacher = meta.teachers[r.course.id] ?? "";
      const goal = meta.goals[r.course.id] ?? "";
      const prev = meta.prevLetters[r.course.id] ?? r.prevLetterAuto;
      const comment = (meta.manualOn[r.course.id]
        ? (meta.manual[r.course.id] ?? "")
        : buildComment(r).join(" ")
      ).replace(/\s+/g, " ");
      return [r.course.name, teacher, goal, prev, r.letter, r.avg.toFixed(1), comment]
        .map(csvEscape)
        .join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-card-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Shimmer loading buffer: 1.5 s on mount and on term switch.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(id);
  }, [activeTermId]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #academic-report, #academic-report * { visibility: visible !important; }
          #academic-report { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 16mm; }
        }
        @keyframes gc-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="space-y-5">
        <Card className="p-5" id="academic-report">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Academic Report Card</h2>
            </div>
            <div className="text-xs text-muted-foreground">
              {activeTerm
                ? `${truncate(activeTerm.name, 10)} · ${activeTerm.start} → ${activeTerm.end}`
                : "All terms"}
            </div>
          </div>

          <div className="flex gap-2 mt-4 no-print">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> PDF Export
            </Button>
            <Button variant="outline" onClick={handleCSV} className="gap-2">
              <FileDown className="h-4 w-4" /> Spreadsheet Export
            </Button>
          </div>

          {loading ? (
            <div className="mt-2 space-y-4">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Shimmer className="h-7" />
                    <Shimmer className="h-7" />
                    <Shimmer className="h-7" />
                    <Shimmer className="h-7" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Shimmer className="h-10" />
                    <Shimmer className="h-10" />
                    <Shimmer className="h-10" />
                    <Shimmer className="h-10" />
                    <Shimmer className="h-10" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-2 space-y-5">
              {rows.map((r) => {
                const bullets = buildComment(r);
                const manualOn = !!meta.manualOn[r.course.id];
                const urgent = r.avg < 50;
                const labels = [
                  "Strengths",
                  "Trends",
                  "Commendations",
                  "Responsibility",
                  "Improvement",
                ];
                return (
                  <Card
                    key={r.course.id}
                    className="p-4 md:p-5 border-l-4 animate-fade-in"
                    style={{ borderLeftColor: r.course.color }}
                  >
                    {/* Unified metrics header — sits ENTIRELY on top of the comment block */}
                    <div className="border-b pb-3 mb-4">
                      <div className="flex items-baseline gap-3 flex-wrap mb-3 min-w-0">
                        <h3 className="text-xl md:text-3xl font-extrabold tracking-tight break-words min-w-0">
                          {r.course.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {r.done.length} task{r.done.length === 1 ? "" : "s"} graded · {r.completion}% completion
                        </span>
                      </div>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasPrevTerm ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3`}>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Teacher</div>
                          <Input
                            className="h-8 no-print"
                            value={meta.teachers[r.course.id] ?? ""}
                            onChange={(e) => update("teachers", r.course.id, e.target.value)}
                            placeholder="Teacher name"
                          />
                          <div className="hidden print:block text-sm font-medium">
                            {meta.teachers[r.course.id] || "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">Aspirational Goal</div>
                          <Input
                            className="h-8 no-print border-primary/40"
                            value={meta.goals[r.course.id] ?? ""}
                            onChange={(e) => update("goals", r.course.id, e.target.value)}
                            placeholder="A*"
                          />
                          <div className="hidden print:block text-sm font-medium text-primary">
                            {meta.goals[r.course.id] || "—"}
                          </div>
                        </div>
                        {hasPrevTerm && (
                          <div className="space-y-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                              Previous{prevTerm ? ` (${truncate(prevTerm.name, 10)})` : ""}
                            </div>
                            <div className="inline-flex items-center justify-center h-8 w-full rounded-md border bg-muted/40 text-sm font-semibold tabular-nums">
                              {meta.prevLetters[r.course.id] || r.prevLetterAuto || "—"}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                            Term Grade{activeTerm ? ` (${truncate(activeTerm.name, 10)})` : ""}
                          </div>
                          <div className="inline-flex items-center justify-center gap-2 h-8 w-full rounded-md border bg-primary/10 border-primary/30 text-sm font-bold">
                            <span>{r.letter}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{r.avgDisplay}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5-bullet feedback compiler — sits directly UNDERNEATH the header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between no-print">
                        <h4 className="text-sm font-semibold">Teacher Comments</h4>
                        <label className="text-xs flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={manualOn}
                            onChange={(e) => update("manualOn", r.course.id, e.target.checked)}
                          />
                          Manual mode
                        </label>
                      </div>
                      {manualOn ? (
                        <Textarea
                          rows={5}
                          value={meta.manual[r.course.id] ?? ""}
                          onChange={(e) => update("manual", r.course.id, e.target.value)}
                          placeholder="Write your custom feedback..."
                        />
                      ) : (
                        <ul className="space-y-1.5 text-sm">
                          {bullets.map((b, i) => (
                            <li
                              key={i}
                              className={`leading-relaxed ${
                                i === 4 && urgent
                                  ? "text-destructive font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span className="font-semibold text-foreground">
                                B{i + 1} ({labels[i]}):
                              </span>{" "}
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
        <AIDeepGenerate
          subjects={courses.map((c) => ({ id: c.id, name: c.name }))}
          onApply={(courseId, text) => {
            update("manual", courseId, text);
            update("manualOn", courseId, true);
          }}
        />
        <GradeDistribution />
        <GradeScaleTester />
      </div>
    </>
  );
}
