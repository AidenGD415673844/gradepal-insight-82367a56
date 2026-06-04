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

// 30 tiers in 3.33% increments from 100 -> 0
const TIERS: { min: number; label: string; strength: string; commend: string }[] = (() => {
  const arr: { min: number; label: string; strength: string; commend: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const min = +(100 - i * 3.33).toFixed(2);
    const label =
      min >= 95.7
        ? "Exemplary"
        : min >= 90
          ? "Outstanding"
          : min >= 80
            ? "Strong"
            : min >= 70
              ? "Proficient"
              : min >= 60
                ? "Developing"
                : min >= 50
                  ? "Approaching"
                  : min >= 40
                    ? "Limited"
                    : min >= 30
                      ? "Insufficient"
                      : "Critical";
    const strength =
      min >= 90
        ? "demonstrates exceptional command of the subject material"
        : min >= 75
          ? "shows confident grasp of core concepts and applies them effectively"
          : min >= 60
            ? "displays solid foundational understanding with room to refine technique"
            : min >= 45
              ? "is building familiarity with key ideas and benefits from guided practice"
              : "requires structured remediation to secure the foundational skills";
    const commend =
      min >= 90
        ? "Term performance is highly commendable, consistently exceeding expected standards."
        : min >= 75
          ? "Term results are strong and reflect dependable preparation across assessments."
          : min >= 60
            ? "Term results are acceptable but inconsistent across higher-weight tasks."
            : min >= 45
              ? "Term results indicate the student is at risk of falling below standard."
              : "Term results are well below expectations and require immediate intervention.";
    arr.push({ min, label, strength, commend });
  }
  return arr;
})();

function tierFor(pct: number) {
  return TIERS.find((t) => pct >= t.min) ?? TIERS[TIERS.length - 1];
}

function trendText(tasks: { date: string; score: number; maxScore: number }[]): string {
  if (tasks.length < 2) return "insufficient data points to establish a trend.";
  const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
  const half = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, half);
  const last = sorted.slice(half);
  const avg = (a: typeof sorted) =>
    a.reduce((s, t) => s + (t.score / t.maxScore) * 100, 0) / a.length;
  const delta = avg(last) - avg(first);
  if (delta >= 8) return "strong upward trajectory across the term.";
  if (delta >= 3) return "steady upward progress at a stable speed.";
  if (delta > -3) return "stable performance with minimal variation.";
  if (delta > -8) return "gradual decline that warrants attention.";
  return "significant downward trend that requires immediate action.";
}

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
    const tier = tierFor(r.avg);
    const pct = r.avg;

    // Strengths bank — pick by tier and add a course-specific colour
    const strengthsBank: string[] =
      pct >= 90
        ? [
            `${r.course.name}: ${tier.strength}, with assessments consistently showcasing precise reasoning, accurate vocabulary, and confident independent thinking. The student approaches new tasks with curiosity and produces work of a standard that could be shared as an exemplar to peers.`,
            `${r.course.name}: outstanding command of the course material — concepts are connected fluently, written responses are well-structured, and quantitative work is delivered with very few errors. The student is operating well above year-level expectations.`,
            `${r.course.name}: the student demonstrates a sophisticated grasp of the discipline, generalising key principles across contexts and supporting answers with evidence. Higher-order tasks such as analysis, synthesis and evaluation are handled with poise.`,
          ]
        : pct >= 75
          ? [
              `${r.course.name}: ${tier.strength}. Core skills are secure, and on most tasks the student transfers learning effectively without needing prompting. Refinement of presentation and time management would move this work into the highest band.`,
              `${r.course.name}: the student shows confident understanding of the major topics and applies set methods reliably. Continued exposure to extension problems and exam-style timed practice will sharpen accuracy under pressure.`,
              `${r.course.name}: a dependable performer who participates actively and submits clean, considered work. Strengths are particularly visible in routine application; the next step is to deepen analysis on open-ended tasks.`,
            ]
          : pct >= 60
            ? [
                `${r.course.name}: ${tier.strength}. The student grasps surface-level requirements but loses marks where multi-step reasoning or extended writing is required. Strengthening the underpinning vocabulary and procedure will give a more stable foundation.`,
                `${r.course.name}: foundational understanding is present and improves visibly when worked examples are reviewed in class. Independent practice on past papers — especially the mid-difficulty band — would consolidate skills.`,
                `${r.course.name}: there is real capacity here that has not yet translated into consistent marks. With closer attention to feedback, regular short revision, and timely question-asking, a measurable lift is realistic this term.`,
              ]
            : pct >= 45
              ? [
                  `${r.course.name}: ${tier.strength}. Gaps in prerequisite knowledge are limiting progress on higher-weight tasks; structured catch-up sessions and weekly check-ins are recommended.`,
                  `${r.course.name}: the student responds well to one-to-one explanation but is not yet retaining methods between lessons. Building a personal glossary and a worked-examples notebook would help bridge this gap.`,
                  `${r.course.name}: motivation appears inconsistent and is shaping the result. Re-establishing short, achievable routines (10–15 minutes daily on flashcards or worked questions) should rebuild confidence.`,
                ]
              : [
                  `${r.course.name}: ${tier.strength}. Several core skills are missing and immediate intervention is required to prevent the gap from widening. A coordinated plan involving teacher, parent and student is strongly advised.`,
                  `${r.course.name}: current results sit well below the required standard. Diagnostic re-teaching of the fundamental units, followed by graded re-assessments, is the most realistic recovery path this term.`,
                ];

    // Trends bank — uses computed trend text
    const trend = trendText(r.done);
    const trendsBank: string[] = [
      `Trends: across the term the student shows ${trend} Recent assessments carry the strongest signal and should be weighted accordingly when judging current ability.`,
      `Trends: looking across the assessment timeline, ${trend} This pattern is reflected in both classwork engagement and submitted homework quality.`,
      `Trends: the trajectory of marks indicates ${trend} Maintaining (or arresting) this direction will depend on consistent revision habits over the coming weeks.`,
    ];

    // Commendations bank
    const commendBank: string[] =
      pct >= 75
        ? [
            `Commendations: ${tier.commend} The student should be proud of the calibre of work submitted (term average ${pct.toFixed(1)}%, grade ${r.letter}) and is encouraged to mentor peers where appropriate.`,
            `Commendations: term performance (average ${pct.toFixed(1)}%, grade ${r.letter}) demonstrates dependable preparation, careful presentation and a positive approach to feedback — all qualities worth sustaining.`,
            `Commendations: it is a pleasure to teach this student; results (${pct.toFixed(1)}%, ${r.letter}) sit firmly in the upper band and reflect both ability and effort.`,
          ]
        : pct >= 50
          ? [
              `Commendations: ${tier.commend} Effort in class is generally positive (${pct.toFixed(1)}%, ${r.letter}); converting that effort into higher accuracy on summative tasks is the next milestone.`,
              `Commendations: there are clear pockets of strong work this term (${pct.toFixed(1)}%, ${r.letter}); the challenge now is to make that quality the rule rather than the exception.`,
            ]
          : [
              `Commendations: ${tier.commend} While the current average (${pct.toFixed(1)}%, ${r.letter}) is below standard, the student has shown moments of capability that we can build on with the right structure.`,
              `Commendations: results (${pct.toFixed(1)}%, ${r.letter}) are concerning, but the student remains willing to engage when supported — this attitude is the foundation of any recovery plan.`,
            ];

    // Responsibility bank — based on completion %
    const responsibilityBank: string[] =
      r.completion >= 90
        ? [
            `Responsibility: with ${r.completion}% of assessable tasks submitted on time, the student demonstrates exemplary work habits, strong organisation and respect for deadlines.`,
            `Responsibility: a ${r.completion}% submission rate shows excellent self-management — homework, drafts and final pieces are arriving when expected and ready for marking.`,
          ]
        : r.completion >= 70
          ? [
              `Responsibility: task completion at ${r.completion}% reflects generally reliable habits, although a small number of missed submissions has cost marks that were otherwise within reach.`,
              `Responsibility: a ${r.completion}% on-time rate is acceptable; tightening the calendar around upcoming due dates would protect the grade from avoidable zeros.`,
            ]
          : [
              `Responsibility: only ${r.completion}% of tasks have been completed — missed work is the single largest factor pulling the grade down, and addressing this is more impactful than any new study technique.`,
              `Responsibility: at ${r.completion}% completion the student is leaving easy marks on the table. A weekly deadline review with a parent or mentor is strongly recommended.`,
            ];

    // Actionable Improvement bank
    const lowestName = r.lowest?.name ?? "—";
    const lowPct = r.lowest ? (r.lowest.score / r.lowest.maxScore) * 100 : 100;
    const improvementBank: string[] =
      pct < 50
        ? [
                  `Actionable Improvement (URGENT): the weakest assessment was '${lowestName}' at ${lowPct.toFixed(0)}%. Before the semester closes, the student should request a re-teach of this unit, attempt a guided re-do, and book additional tutoring or after-school support.`,
                  `Actionable Improvement (URGENT): targeted recovery on '${lowestName}' (${lowPct.toFixed(0)}%) is the highest-leverage action. Speak to the teacher about extra-credit opportunities or a modified recovery plan before the semester closes.`,
                ]
        : pct < 75
          ? [
              `Actionable Improvement: focus revision on '${lowestName}' (${lowPct.toFixed(0)}%) and similar tasks; a structured re-attempt with the marking scheme in hand typically lifts results by 5–10 percentage points within two assessments.`,
              `Actionable Improvement: the lowest performance was on '${lowestName}' (${lowPct.toFixed(0)}%). Twenty minutes a day on this topic, combined with one timed past-paper question per week, is realistic and effective.`,
            ]
          : [
              `Actionable Improvement: the only soft spot this term was '${lowestName}' (${lowPct.toFixed(0)}%). A brief revisit — even a single mentor session — should be enough to close the gap and push the overall average even higher.`,
              `Actionable Improvement: to move from strong to exemplary, the student should target '${lowestName}' (${lowPct.toFixed(0)}%) for refinement and continue seeking stretch tasks beyond the standard syllabus.`,
            ];

    // Deterministic pick based on course id so comments stay stable across renders
    const pick = (arr: string[], salt: number) => {
      let h = 0;
      for (const ch of r.course.id) h = (h * 31 + ch.charCodeAt(0)) | 0;
      const idx = Math.abs(h + salt) % arr.length;
      return arr[idx];
    };

    return [
      `Strengths: ${pick(strengthsBank, 1)}`,
      pick(trendsBank, 2),
      pick(commendBank, 3),
      pick(responsibilityBank, 4),
      pick(improvementBank, 5),
    ];
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
