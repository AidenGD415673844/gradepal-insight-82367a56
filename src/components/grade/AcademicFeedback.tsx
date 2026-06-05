import { useEffect, useMemo, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter, filterByTerm } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FileDown, Printer, GraduationCap } from "lucide-react";

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
type Bracket = { min: number; max: number; bullets: [string, string, string, string, string] };

const EMPTY_BULLETS: [string, string, string, string, string] = ["", "", "", "", ""];

// Template model — fully populated bracket for 88%-91%
const TEMPLATE_88_91: [string, string, string, string, string] = [
  "The student consistently demonstrates a strong understanding of core concepts and applies them accurately during practical tasks. They show a high level of analytical clarity when breaking down complex topics, making connections across different units with ease. This strong foundational comprehension allows them to approach new subject material with confidence and skill.",
  "Maintains a highly stable academic trajectory with positive performance metrics moving forward at a reliable speed. Minor tracking variances are quickly mitigated through targeted review sessions and strong self-reflection habits. The overall trend line indicates an entrenched and consistent control over the subject curriculum.",
  "Submits work that is thoroughly researched and well-structured, maintaining a highly disciplined and organized work ethic. They carefully document their findings, adhering to all strict assignment layout guidelines with great fidelity. Their ongoing academic effort highlights an exemplary commitment to optimizing their overall classroom average.",
  "Displays outstanding personal accountability and consistently meets assignment deadlines with excellent care, showing true maturity in managing independent study schedules. They track their progress proactively, ensuring all rubric criteria are completely fulfilled prior to final verification.",
  "To maximize performance gains, focus targeted study sessions toward reviewing structural principles from your lowest assignment metrics. Re-evaluating past errors in execution will cleanly protect your current letter grade parameters and ensure top-tier positioning.",
];

// Build all 4%-increment brackets from 100 -> 4 (inclusive). Brackets are
// [min, max] with width 4 (max = min + 3). 100 is its own singleton bucket.
const BRACKETS: Bracket[] = (() => {
  const arr: Bracket[] = [];
  // 100 singleton (only avg === 100 can land here)
  arr.push({ min: 100, max: 100, bullets: [...EMPTY_BULLETS] as Bracket["bullets"] });
  for (let min = 96; min >= 4; min -= 4) {
    const max = min + 3;
    const bullets: Bracket["bullets"] =
      min === 88 ? ([...TEMPLATE_88_91] as Bracket["bullets"]) : ([...EMPTY_BULLETS] as Bracket["bullets"]);
    arr.push({ min, max, bullets });
  }
  return arr;
})();

function bracketFor(pct: number): Bracket {
  return (
    BRACKETS.find((b) => pct >= b.min && pct <= b.max) ??
    BRACKETS[BRACKETS.length - 1]
  );
}

const STUB_PLACEHOLDER = "(Feedback template for this tier is pending — paste your sentence here.)";

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
    const letter = hasData ? (getLetter(avg, scale)?.letter ?? "—") : "N/A";
    const avgDisplay = hasData ? `${avg.toFixed(1)}%` : "N/A%";
    const prevAvg = calcAverage(
      previous.filter((t) => !t.pending),
      settings.weighted,
    );
    const prevLetterAuto = previous.length ? (getLetter(prevAvg, scale)?.letter ?? "—") : "";
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
    // Look up the 4%-increment bracket and emit its 5 bullets verbatim.
    // Empty (un-populated) tier slots fall back to a clear placeholder so
    // the user knows that bracket still needs sentence copy.
    const bracket = bracketFor(r.avg);
    return bracket.bullets.map((b) => (b.trim() === "" ? STUB_PLACEHOLDER : b));
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
                ? `${activeTerm.name} · ${activeTerm.start} → ${activeTerm.end}`
                : "All terms"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 px-2 font-semibold">Subject</th>
                  <th className="py-2 px-2 font-semibold">Teacher</th>
                  <th className="py-2 px-2 font-semibold">Aspirational</th>
                  {hasPrevTerm && <th className="py-2 px-2 font-semibold">Previous Term</th>}
                  <th className="py-2 px-2 font-semibold">Current Term</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.course.id} className="border-b last:border-b-0">
                    <td className="py-2 px-2 font-medium">{r.course.name}</td>
                    <td className="py-2 px-2">
                      <Input
                        className="h-8"
                        value={meta.teachers[r.course.id] ?? ""}
                        onChange={(e) => update("teachers", r.course.id, e.target.value)}
                        placeholder="Teacher"
                      />
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        className="h-8 w-20"
                        value={meta.goals[r.course.id] ?? ""}
                        onChange={(e) => update("goals", r.course.id, e.target.value)}
                        placeholder="A"
                      />
                    </td>
                    {hasPrevTerm && (
                      <td className="py-2 px-2">
                        <span className="inline-flex items-center justify-center h-8 w-20 rounded-md border bg-muted/40 text-sm font-medium tabular-nums">
                          {meta.prevLetters[r.course.id] || r.prevLetterAuto || "—"}
                        </span>
                      </td>
                    )}
                    <td className="py-2 px-2">
                      <span className="inline-flex items-center gap-2">
                        <span className="font-bold">{r.letter}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {r.avgDisplay}
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-4 no-print">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> PDF Export
            </Button>
            <Button variant="outline" onClick={handleCSV} className="gap-2">
              <FileDown className="h-4 w-4" /> Spreadsheet Export
            </Button>
          </div>

          <div className="mt-5">
            <h3 className="text-sm font-semibold mb-2">Teacher Comments</h3>
            <Accordion type="multiple" className="w-full">
              {rows.map((r) => {
                const bullets = buildComment(r);
                const manualOn = !!meta.manualOn[r.course.id];
                const urgent = r.avg < 50;
                return (
                  <AccordionItem key={r.course.id} value={r.course.id}>
                    <AccordionTrigger className="text-sm">
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: r.course.color }}
                        />
                        {r.course.name}
                        <span className="text-xs text-muted-foreground">
                          {r.letter} · {r.avgDisplay}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between no-print">
                          <label className="text-xs flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={manualOn}
                              onChange={(e) =>
                                update("manualOn", r.course.id, e.target.checked)
                              }
                            />
                            Manual mode (custom comment)
                          </label>
                        </div>
                        {manualOn ? (
                          <Textarea
                            rows={5}
                            value={meta.manual[r.course.id] ?? ""}
                            onChange={(e) =>
                              update("manual", r.course.id, e.target.value)
                            }
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
                                • {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </Card>
      </div>
    </>
  );
}
