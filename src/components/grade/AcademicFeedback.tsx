import React, { useEffect, useMemo, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter, filterByTerm } from "@/lib/grade-utils";
import type { GradeScaleRow, Task } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileDown, Printer, GraduationCap, Save, FileText } from "lucide-react";
import { GradeScaleTester } from "./GradeScaleTester";
import { GradeDistribution } from "./GradeDistribution";
import { AIDeepGenerate } from "./AIDeepGenerate";
import { CommentBankPalette } from "./CommentBankPalette";
import { ReportTemplateDialog } from "./ReportTemplateDialog";
import { useReportTemplate, I18N, computeBadges } from "@/lib/report-template";
import { BRACKETS, TREND_BRACKETS, COMPLETION_BRACKETS, lookupBracket } from "./feedback-data";
import { addonBulletsFor } from "./feedback-addons";
import { bullet7For, formatVelocity } from "./feedback-bullet7";
import { bullets8910For, reportBracketFloor } from "./feedback-bullets8910";
import { SubjectProjectionChart } from "./SubjectProjectionChart";
import { computeVelocity } from "@/lib/grade-velocity";
import { useUIPrefs } from "@/lib/ui-prefs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import { projectGrade, HORIZON_OPTIONS } from "@/lib/grade-projection";
import { applyAStarOverride } from "./a-star-override";
import { TranscriptSheet } from "./TranscriptSheet";
import { saveReport } from "@/lib/saved-reports";
import { stddev } from "@/lib/grade-stats";
import { toast } from "sonner";
import { loadCriteria } from "@/lib/teacher-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bold, Italic, List } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
export { A_STAR_MIN, applyAStarOverride } from "./a-star-override";

function truncate(s: string, n = 10): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/**
 * Fixed grade scale used by the Report Card regardless of the user's
 * configured global scale. Bands are inclusive of the lower bound and
 * exclusive of the next band's lower bound (e.g. A = 81 ≤ x < 91).
 * A* override (≥91%) is layered on top and mirrored in GradeScaleTester
 * so both surfaces agree.
 */
const REPORT_SCALE: GradeScaleRow[] = [
  { id: "rs-astar", letter: "A*", min: 91, gpa: 4, description: "91–100" },
  { id: "rs-a", letter: "A", min: 81, gpa: 4, description: "81–90.999" },
  { id: "rs-b", letter: "B", min: 71, gpa: 3, description: "71–80.999" },
  { id: "rs-c", letter: "C", min: 61, gpa: 2, description: "61–70.999" },
  { id: "rs-d", letter: "D", min: 51, gpa: 1, description: "51–60.999" },
  { id: "rs-e", letter: "E", min: 41, gpa: 0.5, description: "41–50.999" },
  { id: "rs-f", letter: "F", min: 31, gpa: 0, description: "31–40.999" },
  { id: "rs-g", letter: "G", min: 1, gpa: 0, description: "1–30.999" },
  { id: "rs-na", letter: "NA", min: 0, gpa: 0, description: "0.999 or below" },
];

/**
 * Sub-band ladder for forward-looking goal injection (Bullet 5).
 * Each entry marks the minimum % needed to enter that tier.
 *
 * The "low" tier of every letter MUST equal that letter's `REPORT_SCALE.min`
 * so a student exactly on a letter boundary (e.g. 81 → A) is never described
 * as the previous letter. Mid/high tiers split the remaining band evenly.
 */
export const NEXT_TIER_LADDER: Array<{ letter: string; tier: string; min: number }> = [
  { letter: "G", tier: "low", min: 1 },
  { letter: "G", tier: "mid", min: 11 },
  { letter: "G", tier: "high", min: 21 },
  { letter: "F", tier: "low", min: 31 },
  { letter: "F", tier: "mid", min: 34 },
  { letter: "F", tier: "high", min: 37 },
  { letter: "E", tier: "low", min: 41 },
  { letter: "E", tier: "mid", min: 45 },
  { letter: "E", tier: "high", min: 48 },
  { letter: "D", tier: "low", min: 51 },
  { letter: "D", tier: "mid", min: 55 },
  { letter: "D", tier: "high", min: 58 },
  { letter: "C", tier: "low", min: 61 },
  { letter: "C", tier: "mid", min: 65 },
  { letter: "C", tier: "high", min: 68 },
  { letter: "B", tier: "low", min: 71 },
  { letter: "B", tier: "mid", min: 75 },
  { letter: "B", tier: "high", min: 78 },
  { letter: "A", tier: "low", min: 81 },
  { letter: "A", tier: "mid", min: 85 },
  { letter: "A", tier: "high", min: 88 },
  { letter: "A*", tier: "", min: 91 },
];

const LETTER_MINS = [41, 51, 61, 71, 81, 91];

/**
 * Renders the projected percentage as a sub-band label like "low A*",
 * "mid B" etc. — mirrors the NEXT_TIER_LADDER decoration used by the
 * forward-looking goal copy so the snapshot reads naturally.
 */
export function projectedTierLabel(pct: number): string {
  if (pct >= 97) return "High A*";
  if (pct >= 91) return "Mid A*";
  const sorted = [...NEXT_TIER_LADDER].sort((a, b) => a.min - b.min);
  const below = [...sorted].reverse().find((b) => b.min <= pct);
  if (!below) return "NA";
  return below.tier ? `${below.tier} ${below.letter}` : below.letter;
}

/**
 * Returns a human-readable description of the student's current band.
 * When the score is within ±1.5% of a real LETTER boundary (e.g. 70.5 is
 * very close to B's 71 cutoff) it returns a "between higher X and lower Y"
 * phrase. Otherwise it picks the matching sub-tier (low/mid/high) within
 * the letter the score actually falls into per REPORT_SCALE.
 */
const fmtTier = (b: { letter: string; tier: string }) =>
  b.tier ? `${b.tier} ${b.letter}` : b.letter;

export function currentBandPhrase(pct: number): string {
  if (pct >= 97) return "the High A* band";
  if (pct >= 91) return "the Mid A* band";
  const sorted = [...NEXT_TIER_LADDER].sort((a, b) => a.min - b.min);
  const below = [...sorted].reverse().find((b) => b.min <= pct);
  // Detect proximity to a real letter boundary (not a sub-tier one).
  const nextLetterMin = LETTER_MINS.find((m) => m > pct);
  if (nextLetterMin != null && nextLetterMin - pct <= 1.5 && below) {
    const aboveAtLetter = sorted.find((b) => b.min >= nextLetterMin);
    if (aboveAtLetter) {
      return `between the higher ${fmtTier(below)} band and the lower ${fmtTier(aboveAtLetter)} band`;
    }
  }
  if (!below) return `the ${sorted[0].letter} band`;
  return `the ${fmtTier(below)} band`;
}

export function nextTierGoal(pct: number, sdSubject = 0, done: Task[] = []): string {
  // Formal, diagnostic phrasing — no casual "try to" or "work hard"
  // language. The student's CURRENT band is always named first so the
  // copy frames the recommendation around their proven baseline.
  void sdSubject;
  void done;
  const current = currentBandPhrase(pct);
  if (pct >= 97) {
    return `Performance is currently anchored within ${current}. Strategic focus should be directed toward sustaining this elite baseline through stretch tasks and competition-level problem sets.`;
  }
  if (pct >= 91) {
    return `Performance is currently anchored within ${current}. Strategic focus should be directed toward elevating performance metrics cleanly into the High A* (97–100%) threshold.`;
  }
  const next = NEXT_TIER_LADDER.find((b) => b.min > pct);
  if (!next) {
    return `Performance is currently anchored within ${current}. Strategic focus should be directed toward elevating performance metrics cleanly into the Mid A* (91–96.99%) threshold.`;
  }
  const targetLabel = fmtTier(next);
  return `Performance is currently anchored within ${current}. Strategic focus should be directed toward elevating performance metrics cleanly into the ${targetLabel} band threshold.`;
}

/**
 * Trend-source labels that drive both Bullet 2 and the small explanation
 * caption shown beneath the bullet list. Exported so unit tests can
 * verify "All terms" delta strictly uses the subject's full task history.
 */
export type TrendMode =
  | "prev-term"
  | "all-history"
  | "first-term-split"
  | "insufficient"
  | "no-data";

export type TrendInfo = {
  mode: TrendMode;
  delta: number | null;
  /** Tasks the delta was actually derived from (post-sort). */
  sourceTasks: Task[];
};

export const TREND_MODE_CAPTION: Record<TrendMode, string> = {
  "prev-term": "Trend Δ compared against the previous term's graded tasks.",
  "all-history":
    "Trend Δ derived from this subject's full task history (All terms view) — earlier half vs. later half.",
  "first-term-split":
    "Trend Δ derived from this term's tasks — earlier half vs. later half (no previous term to compare).",
  insufficient:
    "Only one graded task is available — not enough data to establish a trend yet.",
  "no-data": "No graded tasks in this term.",
};

/**
 * Rewrites trend-bullet copy so it doesn't reference a "previous term"
 * when the delta was actually computed from earlier-vs-later halves of
 * the current term (or full subject history). Pure string transform so
 * it's safe to unit-test.
 */
export function adaptTrendCopy(text: string, mode: TrendMode): string {
  if (mode === "prev-term") return text;
  const replacement =
    mode === "all-history"
      ? "compared with earlier tasks in this subject"
      : "compared with earlier tasks this term";
  const steadyReplacement =
    mode === "all-history"
      ? "across this subject's history so far"
      : "across earlier tasks this term";
  return text
    .replace(/compared to the previous term/gi, replacement)
    .replace(/relative to the previous term/gi, replacement)
    .replace(/held exactly steady relative to the previous term/gi,
      `held exactly steady ${steadyReplacement}`)
    .replace(/the previous term/gi,
      mode === "all-history" ? "earlier tasks in this subject" : "earlier tasks this term");
}

/**
 * Pure helper that decides which trend-delta strategy to apply. Kept
 * outside the component so it can be unit-tested in isolation.
 */
export function computeTrendInfo(args: {
  hasData: boolean;
  hasPrevData: boolean;
  avg: number;
  prevAvg: number;
  done: Task[];
  allDone: Task[];
  isAllTerms: boolean;
  weighted: boolean;
}): TrendInfo {
  if (!args.hasData) return { mode: "no-data", delta: null, sourceTasks: [] };
  if (args.hasPrevData) {
    return {
      mode: "prev-term",
      delta: args.avg - args.prevAvg,
      sourceTasks: [],
    };
  }
  // "All terms" view uses the FULL subject history; first-term uses only
  // current-term tasks.
  const source = args.isAllTerms ? args.allDone : args.done;
  const sorted = [...source].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < 2) {
    return { mode: "insufficient", delta: null, sourceTasks: sorted };
  }
  const mid = Math.floor(sorted.length / 2) || 1;
  const earlier = sorted.slice(0, mid);
  const later = sorted.slice(mid);
  const delta =
    calcAverage(later, args.weighted) - calcAverage(earlier, args.weighted);
  return {
    mode: args.isAllTerms ? "all-history" : "first-term-split",
    delta,
    sourceTasks: sorted,
  };
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

function badgeExplanation(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("most improved"))
    return "This badge indicates your final average has jumped significantly compared against your past term baseline records.";
  if (l.includes("top performer"))
    return "Awarded when this subject sits comfortably inside the top performance band of your active subject set.";
  if (l.includes("perfect completion"))
    return "Every graded task in this term has been submitted on time, with nothing left pending.";
  if (l.includes("highest jump"))
    return "This subject has the strongest positive projected swing across all your subjects this term.";
  if (l.includes("biggest drop"))
    return "This subject has the largest negative projected swing — review recent tasks to identify the cause.";
  if (l.includes("high confidence"))
    return "The projection model has enough recent graded tasks to forecast with high statistical confidence.";
  if (l.includes("volatile"))
    return "Score variance is wide (σ ≥ 15%), meaning task results are swinging notably between assessments.";
  return "Local achievement marker derived from this subject's task ledger.";
}

export function AcademicFeedback() {
  const { courses, tasks, terms, activeTermId, settings, subjectGoals, setSubjectGoal } = useGrades();
  const [prefs] = useUIPrefs();
  const [gradeRefOpen, setGradeRefOpen] = useState(false);
  // Report card always uses the fixed REPORT_SCALE — not the user's scale.
  const scale = REPORT_SCALE;
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  // All terms preceding the active term, most recent first — used to
  // populate the "previous term" selector above the previous-grade box.
  const prevTermOptions = useMemo(() => {
    if (!activeTerm) return [];
    const sorted = [...terms].sort((a, b) => a.start.localeCompare(b.start));
    const idx = sorted.findIndex((t) => t.id === activeTerm.id);
    if (idx <= 0) return [];
    return sorted.slice(0, idx).reverse();
  }, [terms, activeTerm]);
  const [selectedPrevTermId, setSelectedPrevTermId] = useState<string | null>(null);
  // Keep selection valid as active term / available prior terms change.
  useEffect(() => {
    if (prevTermOptions.length === 0) {
      if (selectedPrevTermId !== null) setSelectedPrevTermId(null);
      return;
    }
    if (!selectedPrevTermId || !prevTermOptions.some((t) => t.id === selectedPrevTermId)) {
      setSelectedPrevTermId(prevTermOptions[0].id);
    }
  }, [prevTermOptions, selectedPrevTermId]);
  const prevTerm = useMemo(
    () => prevTermOptions.find((t) => t.id === selectedPrevTermId) ?? null,
    [prevTermOptions, selectedPrevTermId],
  );
  const [tpl] = useReportTemplate();
  const tr = I18N[tpl.lang];

  // User-selectable projection horizon for Bullet 6 (Future Outlook).
  // Persisted to localStorage so the choice survives reloads.
  const HORIZON_KEY = "gradecalc-report-horizon-weeks";
  const [horizonWeeks, setHorizonWeeks] = useState<number>(() => {
    if (typeof window === "undefined") return 4;
    const raw = localStorage.getItem(HORIZON_KEY);
    const n = raw ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n <= 0) return 4;
    // Normalize legacy 1-month default (4.345) to the new 4-week option.
    if (Math.abs(n - 4.345) < 0.01) return 4;
    return n;
  });
  useEffect(() => {
    try { localStorage.setItem(HORIZON_KEY, String(horizonWeeks)); } catch {}
  }, [horizonWeeks]);
  const horizonLabel =
    HORIZON_OPTIONS.find((o) => Math.abs(o.weeks - horizonWeeks) < 0.01)?.label ??
    `${horizonWeeks.toFixed(1)} wk`;

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
    // Only treat tasks as "previous-term data" when a real prior term
    // exists. filterByTerm(_, null) returns ALL tasks, which would otherwise
    // make a first-term or "All terms" view fabricate a phantom previous
    // average equal to the current one.
    const previous = prevTerm ? filterByTerm(allCourseTasks, prevTerm) : [];
    const done = current.filter((t) => !t.pending);
    const hasData = done.length > 0;
    const avg = hasData ? calcAverage(done, settings.weighted) : 0;
    // Report-card-local A* override: any subject avg strictly above 91%
    // (i.e. 92%–100% inclusive after rounding to the displayed tenth)
    // renders as A*, independent of the global scale rules.
    const rawLetter = hasData ? (getLetter(avg, scale)?.letter ?? "—") : "N/A";
    const letter = hasData ? applyAStarOverride(avg, rawLetter) : rawLetter;
    const avgDisplay = hasData ? `${avg.toFixed(1)}%` : "N/A%";
    // Previous-term average is computed strictly from previous-term tasks
    // (different date range from current term), so it cannot bleed when the
    // current term's tasks are edited.
    const prevDone = previous.filter((t) => !t.pending);
    const hasPrevData = prevDone.length > 0;
    const prevAvg = hasPrevData ? calcAverage(prevDone, settings.weighted) : 0;
    const prevRawLetter = hasPrevData ? (getLetter(prevAvg, scale)?.letter ?? "—") : "";
    const prevLetterAuto = hasPrevData ? applyAStarOverride(prevAvg, prevRawLetter) : prevRawLetter;
    const prevAvgDisplay = hasPrevData ? `${prevAvg.toFixed(1)}%` : "";
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
      prevAvgDisplay,
      prevAvg,
      hasPrevData,
      completion,
      lowest,
      done,
      current,
      allDone: allCourseTasks.filter((t) => !t.pending),
    };
  });

  // Class average across all subjects (this student's own subjects act as
  // the comparison cohort — purely local computation).
  const classAvg = (() => {
    const xs = rows.filter((r) => r.hasData).map((r) => r.avg);
    return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  })();

  // Per-subject projection deltas, used to award the "Highest Jump" and
  // "Biggest Drop" badges so only ONE subject per report ever wears them.
  const projDeltas = new Map<string, number>();
  const projConfidence = new Map<string, number>();
  rows.forEach((r) => {
    if (!r.hasData) return;
    const p = projectGrade(r.done, r.avg, horizonWeeks);
    projDeltas.set(r.course.id, p.delta);
    projConfidence.set(r.course.id, p.confidencePct);
  });
  const highestJumpId: string | null = (() => {
    let bestId: string | null = null;
    let bestD = 0.5;
    projDeltas.forEach((d, id) => {
      if (d > bestD) { bestD = d; bestId = id; }
    });
    return bestId;
  })();
  const biggestDropId: string | null = (() => {
    let worstId: string | null = null;
    let worstD = -0.5;
    projDeltas.forEach((d, id) => {
      if (d < worstD) { worstD = d; worstId = id; }
    });
    return worstId;
  })();

  const buildComment = (r: (typeof rows)[number]): string[] => {
    if (!r.hasData) {
      const msg =
        "No tasks has been ever submitted or added in this term. It is important to complete your work if you haven’t submitted anything.";
      return [msg, msg, msg, msg, msg];
    }
    // Trajectory-aware shift: when the predicted final is very different
    // from current, B1 and B4 should reflect a higher / lower band so the
    // tone matches where the student is heading, not just where they sit.
    const pcts = r.done.map((t) => (t.score / t.maxScore) * 100);
    const sdSubject = stddev(pcts);
    let projected = r.avg;
    if (pcts.length >= 2) {
      const sorted = [...r.done].sort((a, b) => a.date.localeCompare(b.date));
      const last = (sorted[sorted.length - 1].score / sorted[sorted.length - 1].maxScore) * 100;
      const prev = (sorted[sorted.length - 2].score / sorted[sorted.length - 2].maxScore) * 100;
      projected = Math.max(0, Math.min(100, r.avg + (last - prev) * 0.5));
    }
    const drift = projected - r.avg;
    const shifted = Math.max(0, Math.min(100, r.avg + (drift >= 10 ? 4 : drift <= -10 ? -4 : 0)));
    // B1, B4 from trajectory-shifted band; B5 from current-tier ladder.
    const main = lookupBracket(BRACKETS, r.avg);
    const shiftedMain = lookupBracket(BRACKETS, shifted);
    // B2 (Trends) — strategy chosen by computeTrendInfo so the same
    // decision can be unit-tested and surfaced as a caption below.
    const trend = computeTrendInfo({
      hasData: r.hasData,
      hasPrevData: r.hasPrevData,
      avg: r.avg,
      prevAvg: r.prevAvg,
      done: r.done,
      allDone: r.allDone,
      isAllTerms: activeTerm == null,
      weighted: settings.weighted,
    });
    const b2 =
      trend.delta == null
        ? "There isn't enough data to establish a trend and trend feedback. Once you have more graded tasks, comparative progress insights will appear here."
        : adaptTrendCopy(
            lookupBracket(TREND_BRACKETS, trend.delta).bullets[1],
            trend.mode,
          );
    // B3 (Completion / Responsibility) — separate logic pool, keyed by
    // completion percentage in 5% increments.
    const b3 = lookupBracket(COMPLETION_BRACKETS, r.completion).bullets[2];
    // B5 (Improvement / Action Items) — append a dynamically computed
    // forward-looking milestone string based on the student's current
    // score AND volatility, phrased as a "X% to Y% away" range.
    const b5 = `${main.bullets[4]} ${nextTierGoal(r.avg, sdSubject, r.done)}`;
    // ---- B5 Quadrant Diagnostic (Effort vs Achievement) ----
    // Cross-reference qualitative criteria marks against numerical avg.
    let b5Diagnostic = "";
    try {
      const allCrit = loadCriteria();
      const c = allCrit[r.course.id];
      if (c) {
        const RANK: Record<string, number> = { "A*": 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };
        const marks = ["A", "B", "C", "D", "IA", "IB", "IC"]
          .map((k) => (c as any)[k])
          .filter((v) => v && v !== "N/A" && RANK[v] != null)
          .map((v) => RANK[v as string]);
        if (marks.length) {
          const avgRank = marks.reduce((s, n) => s + n, 0) / marks.length;
          if (avgRank <= 2 && r.avg < 60) {
            b5Diagnostic = " Diagnostic: The student displays exceptional work consistency, suggesting academic hurdles are purely conceptual rather than motivational.";
          } else if (avgRank >= 4 && r.avg > 85) {
            b5Diagnostic = " Diagnostic: Core conceptual mastery remains excellent, but a distinct gap in engagement indicators suggests the student is operating below their full potential baseline.";
          }
        }
      }
    } catch { /* criteria optional */ }
    // Tail clauses add statistical colour (σ + Δ) to keep bullets 2–4 longer.
    const sdClause =
      pcts.length >= 2
        ? ` Score variance is ${sdSubject.toFixed(1)}% across ${pcts.length} graded task${pcts.length === 1 ? "" : "s"}.`
        : "";
    const respClause = ` Completion currently sits at ${r.completion}%.`;
    // Universal addons — appended to each existing bullet (never replacing
    // prior text) plus a brand-new 6th bullet (Future Outlook). Continuous
    // 5% increment lookup keyed by the subject's term average.
    const addons = addonBulletsFor(r.avg);
    // B7 — Statistical Diagnosis. Dynamic template interpolation using the
    // subject's live name, current percentage, letter grade, and a rolling
    // 30-day velocity vector. Pure client-side, no network calls.
    const velocity = computeVelocity(r.done);
    const b7 = bullet7For({
      subjectName: r.course.name,
      pct: r.avg,
      letter: r.letter,
      velocityLabel: formatVelocity(velocity.slopePerWeek, velocity.sample),
    });
    // B6 — Future Outlook. Uses projectGrade(), which falls back to ALL
    // graded tasks if the rolling 30-day window has <2 points, caps the
    // total shift at ±20pp, and emits a confidence interval.
    const proj = projectGrade(r.done, r.avg, horizonWeeks);
    const projRawLetter = getLetter(proj.projected, scale)?.letter ?? "—";
    const projLetter = applyAStarOverride(proj.projected, projRawLetter);
    const projTier = projectedTierLabel(proj.projected);
    const goalPct = Number.isFinite(settings.goal) ? settings.goal : null;
    const goalDelta = goalPct != null ? proj.projected - goalPct : null;
    // Clean narrative: a single, plain-English sentence followed by the
    // tier-aware addon. The hard numbers (current/projected/confidence/
    // goal delta) live in the snapshot card embedded inside this bullet.
    const currentTier = projectedTierLabel(r.avg);
    const b6Narrative =
      proj.source === "insufficient"
        ? `With limited graded data to forecast from, ${r.course.name} is securely holding its position within the ${currentTier} band over the next ${horizonLabel}.`
        : proj.projected > r.avg + 0.5 && projTier !== currentTier
          ? `If this pace holds, ${r.course.name} is on a quiet climb toward the ${projTier} band over the next ${horizonLabel} — keep the current execution steady to bank the gain.`
          : proj.projected < r.avg - 0.5
            ? `${r.course.name} is showing a mild deceleration toward the lower ${projTier} threshold over the next ${horizonLabel}. A small intervention now is enough to flatten the slope before it locks in.`
            : `${r.course.name} is securely holding its position within the ${currentTier} band over the next ${horizonLabel}.`;
    const goalLine =
      goalDelta == null
        ? ""
        : goalDelta >= 0
          ? ` On the goal front, the projection sits +${goalDelta.toFixed(1)}pp above your ${goalPct}% target — on track.`
          : Math.abs(goalDelta) <= 3
            ? ` Versus your ${goalPct}% goal the projection is ${goalDelta.toFixed(1)}pp short — close, but at risk without sustained effort.`
            : ` Versus your ${goalPct}% goal the projection is ${goalDelta.toFixed(1)}pp short — at risk; a focused push is needed to close the gap.`;
    const b6Dynamic = `Future Outlook (${horizonLabel}): ${b6Narrative}${goalLine} ${addons.b6}`;

    // ---- Bullets 8 / 9 / 10 ----
    // Syllabus red-unit count for this course (independent local store).
    let syllabusRedCount = 0;
    try {
      const raw =
        typeof window !== "undefined"
          ? localStorage.getItem("syllabus-mastery-v1")
          : null;
      if (raw) {
        const store = JSON.parse(raw) as Record<string, Array<{ level: string }>>;
        syllabusRedCount = (store[r.course.id] ?? []).filter(
          (u) => u.level === "red",
        ).length;
      }
    } catch {
      syllabusRedCount = 0;
    }
    const stats8910 = bullets8910For({
      pct: r.avg,
      bracketFloor: reportBracketFloor(r.avg),
      stdDev: sdSubject,
      syllabusRedCount,
    });
    // Aspirational realism evaluation — compare manual/auto goal vs.
    // projected horizon score and append a critique to B10.
    const goalForEval = (subjectGoals[r.course.id] ?? settings.goal);
    let b10Final = stats8910.b10;
    if (Number.isFinite(goalForEval) && Number.isFinite(proj.projected)) {
      const gap = goalForEval - proj.projected;
      if (gap > 15) {
        b10Final = `${b10Final} Target Evaluation: Your active aspirational benchmark reflects a steep upward projection that significantly outpaces current work trends, suggesting an overestimation of immediate velocity parameters without a critical reallocation of study blocks.`;
      } else if (gap < 0) {
        b10Final = `${b10Final} Target Evaluation: Your baseline goal parameters mathematically underestimate your proven operational velocity, indicating that your current performance baseline is fully prepared to absorb an immediate upward target boundary adjustment.`;
      }
    }

    // ---- Warm, quantitative openers ----
    // Each opener names the exact numbers that drove the observation, then
    // reframes them in an encouraging, human tone. The clinical bracket
    // copy that follows keeps the analytical detail intact.
    const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
    const warmB1 = `You're currently averaging ${r.avg.toFixed(1)}% (grade ${r.letter}) in ${r.course.name} — that number is the result of real, measurable effort worth recognising.`;
    let warmB2: string;
    if (trend.delta == null) {
      warmB2 = `There aren't enough graded tasks yet to plot a trend line, but every submission from here writes the story of your progress.`;
    } else if (trend.mode === "prev-term") {
      const dir = trend.delta > 0.05 ? "genuine upward momentum you built yourself" : trend.delta < -0.05 ? "a dip that is a signal, not a setback — you have the room and time to turn it around" : "rock-solid consistency between terms";
      warmB2 = `You moved from ${r.prevAvg.toFixed(1)}% last term to ${r.avg.toFixed(1)}% this term — a ${signed(trend.delta)}pp shift that reflects ${dir}.`;
    } else {
      const dir = trend.delta > 0.05 ? "you are trending in the right direction — keep going" : trend.delta < -0.05 ? "a small course-correction now is enough to flip the arrow back up" : "a steady, dependable rhythm you can build on";
      warmB2 = `Your later tasks in this window averaged ${signed(trend.delta)}pp against your earlier ones (${r.avg.toFixed(1)}% current) — ${dir}.`;
    }
    const compTone = r.completion === 100
      ? "outstanding follow-through — nothing left on the table"
      : r.completion >= 80
        ? "your commitment is clearly showing"
        : r.completion >= 60
          ? "a solid base to build on, and every remaining task lifts this cleanly"
          : "each task submitted from here will meaningfully move this number upward";
    const warmB3 = `With ${r.completion}% of graded work completed this term, ${compTone}.`;
    const varTone = pcts.length < 2
      ? `A fresh start — from here, each task begins to shape your personal consistency profile.`
      : sdSubject < 5
        ? `Your ${sdSubject.toFixed(1)}% score variance across ${pcts.length} tasks shows admirable consistency — you deliver reliably at ${r.avg.toFixed(1)}%.`
        : sdSubject < 10
          ? `A ${sdSubject.toFixed(1)}% variance across ${pcts.length} tasks sits inside a healthy range — your ${r.avg.toFixed(1)}% average is dependable, not lucky.`
          : `A ${sdSubject.toFixed(1)}% variance across ${pcts.length} tasks is a real opportunity — you have already shown you can hit high marks, so stabilising is very reachable.`;
    const warmB4 = varTone;
    const gapToNext = (() => {
      const next = NEXT_TIER_LADDER.find((b) => b.min > r.avg);
      if (!next) return null;
      return { label: next.tier ? `${next.tier} ${next.letter}` : next.letter, pp: next.min - r.avg };
    })();
    const warmB5 = gapToNext
      ? `You are just ${gapToNext.pp.toFixed(1)}pp away from the ${gapToNext.label} band — a small, deliberate push compounds quickly from your current ${r.avg.toFixed(1)}%.`
      : `You are already inside the top band at ${r.avg.toFixed(1)}% — the goal now is to protect and extend that lead.`;

    return [
      `${warmB1} ${shiftedMain.bullets[0]} ${addons.b1}`,
      `${warmB2} ${b2 + sdClause} ${addons.b2}`,
      `${warmB3} ${b3 + respClause} ${addons.b3}`,
      `${warmB4} ${shiftedMain.bullets[3] + sdClause} ${addons.b4}`,
      `${warmB5} ${b5} ${addons.b5}${b5Diagnostic}`,
      b6Dynamic,
      b7,
      stats8910.b8,
      stats8910.b9,
      b10Final,
    ];
  };

  const handlePrint = () => window.print();

  const handleTranscript = () => {
    document.body.classList.add("transcript-print-mode");
    // Give the browser a tick to apply the class before invoking print.
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove("transcript-print-mode"), 200);
    }, 50);
  };

  const [capOpen, setCapOpen] = useState(false);
  // Per-subject toggle for the "Compare with previous terms" panel
  // rendered beneath the Bullet-6 projection chart.
  const [compareOpen, setCompareOpen] = useState<Record<string, boolean>>({});
  // Per-subject toggle to hide the bullet feedback list. Helps avoid
  // jank when many heavy comment blocks render simultaneously.
  const [hideComments, setHideComments] = useState<Record<string, boolean>>({});

  const handleSaveReport = () => {
    const labels: [string, string, string, string, string] = [
      "Strengths",
      "Trends",
      "Commendations",
      "Responsibility",
      "Improvement",
    ];
    const sig =
      typeof window !== "undefined"
        ? localStorage.getItem("gradecalc-signature")
        : null;
    const snapRows = rows.map((r) => {
      const trend = computeTrendInfo({
        hasData: r.hasData,
        hasPrevData: r.hasPrevData,
        avg: r.avg,
        prevAvg: r.prevAvg,
        done: r.done,
        allDone: r.allDone,
        isAllTerms: activeTerm == null,
        weighted: settings.weighted,
      });
      const bullets = buildComment(r) as unknown as [string, string, string, string, string];
      return {
        courseId: r.course.id,
        courseName: r.course.name,
        color: r.course.color,
        teacher: meta.teachers[r.course.id] ?? "",
        goal: meta.goals[r.course.id] ?? "",
        letter: r.letter,
        avgDisplay: r.avgDisplay,
        avg: r.avg,
        prevLetter: meta.prevLetters[r.course.id] || r.prevLetterAuto,
        prevAvgDisplay: r.prevAvgDisplay,
        bullets,
        labels,
        trendCaption: TREND_MODE_CAPTION[trend.mode],
        trendDelta: trend.delta,
      };
    });
    const res = saveReport({
      termLabel: activeTerm ? activeTerm.name : "All terms",
      signatureDataUrl: sig,
      rows: snapRows,
    });
    if (!res.ok) {
      setCapOpen(true);
      return;
    }
    toast.success("Report saved to history hub.");
  };

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

  // ---- Aspirational auto-targeting (settings toggle) ----
  // When the user enables "Set aspirational grade using data", recompute
  // each subject's goal from the live velocity vector. Bounded [41, 95].
  useEffect(() => {
    if (!prefs.aspirationalAuto) return;
    courses.forEach((c) => {
      const done = tasks
        .filter((t) => t.courseId === c.id && !t.pending)
        .filter((t) => t.maxScore > 0 && Number.isFinite(t.score));
      if (done.length === 0) return;
      const avg = calcAverage(done, settings.weighted);
      const vel = computeVelocity(done);
      const bump = vel.slopePerWeek < -0.2 ? 12 : 7.5;
      const raw = avg + bump;
      const clamped = Math.max(41, Math.min(95, Math.round(raw)));
      if (subjectGoals[c.id] !== clamped) setSubjectGoal(c.id, clamped);
    });
    // Intentionally exclude subjectGoals from deps to avoid loops; the
    // pref + task set fully determines the auto-target.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.aspirationalAuto, courses, tasks, settings.weighted]);

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
        <Card
          className={`p-5 ${tpl.template === "modern" ? "bg-gradient-to-br from-background to-primary/5" : ""}`}
          id="academic-report"
          style={{
            fontFamily:
              tpl.font === "serif"
                ? "Georgia, serif"
                : tpl.font === "mono"
                  ? "ui-monospace, monospace"
                  : undefined,
          }}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              {tpl.logoDataUrl && (
                <img
                  src={tpl.logoDataUrl}
                  alt="School logo"
                  className="h-9 w-9 object-contain rounded border"
                />
              )}
              <GraduationCap className="h-5 w-5" style={{ color: tpl.accent }} />
              <div className="leading-tight">
                <h2
                  className="text-lg font-bold"
                  style={{
                    fontFamily:
                      tpl.font === "serif"
                        ? "Georgia, serif"
                        : tpl.font === "mono"
                          ? "monospace"
                          : undefined,
                  }}
                >
                  {tr.reportCard}
                </h2>
                {tpl.schoolName && (
                  <div className="text-[11px] text-muted-foreground">{tpl.schoolName}</div>
                )}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="inline-flex items-center px-1.5 h-5 mr-2 rounded border bg-muted/50 font-semibold uppercase tracking-wider text-[10px]">
                {tpl.template}
              </span>
              {activeTerm
                ? `${truncate(activeTerm.name, 10)} · ${activeTerm.start} → ${activeTerm.end}`
                : "All terms"}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 no-print">
            <ReportTemplateDialog />
            <label className="inline-flex items-center gap-2 px-2 h-9 rounded-md border bg-background text-xs font-medium">
              <span className="text-muted-foreground">Bullet 6 horizon:</span>
              <select
                aria-label="Bullet 6 projection horizon"
                value={String(horizonWeeks)}
                onChange={(e) => setHorizonWeeks(Number(e.target.value))}
                className="bg-transparent outline-none text-foreground"
              >
                {HORIZON_OPTIONS.map((o) => (
                  <option key={o.label} value={o.weeks}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> PDF Export
            </Button>
            <Button variant="outline" onClick={handleCSV} className="gap-2">
              <FileDown className="h-4 w-4" /> Spreadsheet Export
            </Button>
            <Button onClick={handleSaveReport} className="gap-2">
              <Save className="h-4 w-4" /> Save Report to History Hub
            </Button>
            <Button variant="outline" onClick={handleTranscript} className="gap-2">
              <FileText className="h-4 w-4" /> Generate Official Transcript Document
            </Button>
            <Button
              variant="outline"
              onClick={() => setGradeRefOpen(true)}
              className="gap-2"
              aria-label="View Grade Scale Reference"
            >
              <Info className="h-4 w-4" /> View Grade Scale Reference
            </Button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground italic no-print">
            This only uses the grade scale provided, sorry for the inconvenience!
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
                  tr.strengths,
                  tr.trends,
                  tr.commendations,
                  tr.responsibility,
                  tr.improvement,
                  "Future Outlook",
                  "Statistical Diagnosis",
                  "Task Type Profile",
                  "Scoring Consistency",
                  "Optimization Strategy",
                ];
                // Template-specific card styling so switching the template
                // in the dialog visibly changes the layout. (Term-grade chip
                // is intentionally template-neutral — old version.)
                const cardCls =
                  tpl.template === "simple"
                    ? "p-3 md:p-4 border-l-2"
                    : tpl.template === "modern"
                      ? "p-5 md:p-6 border-l-8 shadow-md"
                      : "p-4 md:p-5 border-l-4";
                return (
                  <Card
                    key={r.course.id}
                    className={`${cardCls} animate-fade-in`}
                    style={{ borderLeftColor: tpl.template === "modern" ? tpl.accent : r.course.color }}
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
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{tr.teacher}</div>
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
                          <div className="text-[10px] uppercase tracking-wider text-primary font-semibold">{tr.aspirational}</div>
                          {(() => {
                            const goalPct = subjectGoals[r.course.id] ?? settings.goal;
                            const goalLetter = applyAStarOverride(
                              goalPct,
                              getLetter(goalPct, scale)?.letter ?? "—",
                            );
                            return (
                              <div
                                title="Locked to this subject's goal — change it in the Subjects sidebar"
                                aria-readonly="true"
                                className="inline-flex items-center justify-center gap-2 h-8 w-full rounded-md border border-primary/40 bg-primary/5 text-sm font-semibold text-primary tabular-nums"
                              >
                                <span>{goalLetter}</span>
                                <span className="text-xs font-normal text-primary/80">
                                  ({goalPct}%)
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                        {hasPrevTerm && (
                          <div className="space-y-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                              {tr.previous}{prevTerm ? ` (${truncate(prevTerm.name, 10)})` : ""}
                            </div>
                            <div className="inline-flex items-center justify-center gap-2 h-8 w-full rounded-md border bg-muted/40 text-sm font-semibold tabular-nums">
                              <span>{meta.prevLetters[r.course.id] || r.prevLetterAuto || "—"}</span>
                              {r.prevAvgDisplay && !meta.prevLetters[r.course.id] && (
                                <span className="text-xs font-normal text-muted-foreground">({r.prevAvgDisplay})</span>
                              )}
                            </div>
                            {prevTermOptions.length > 1 && (
                              <select
                                aria-label="Select previous term to compare"
                                value={selectedPrevTermId ?? ""}
                                onChange={(e) => setSelectedPrevTermId(e.target.value)}
                                className="no-print h-7 w-full rounded-md border bg-background px-2 text-xs font-medium"
                              >
                                {prevTermOptions.map((pt) => (
                                  <option key={pt.id} value={pt.id}>
                                    {pt.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold truncate">
                            {/* Term Grade */}
                            {tr.termGrade}{activeTerm ? ` (${truncate(activeTerm.name, 10)})` : ""}
                          </div>
                          <div className="inline-flex items-center justify-center gap-2 h-8 w-full rounded-md border bg-muted/40 text-sm font-semibold tabular-nums">
                            <span>{r.letter}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {r.avgDisplay}
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Badges + class-avg comparison. Hidden in 'simple' to keep that layout minimal. */}
                      {tpl.template !== "simple" && (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.hasData && classAvg > 0 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className={`px-1.5 h-5 inline-flex items-center rounded border text-[10px] font-semibold tabular-nums cursor-pointer ${
                                      r.avg - classAvg >= 0
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                                        : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                                    }`}
                                  >
                                    {r.avg - classAvg >= 0 ? "+" : ""}
                                    {(r.avg - classAvg).toFixed(1)}% {tr.vsClass}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 text-xs">
                                  Difference between this subject's current average
                                  and the across-subject class average for this term.
                                </PopoverContent>
                              </Popover>
                            )}
                            {computeBadges({
                              avg: r.avg,
                              prevAvg: r.hasPrevData ? r.prevAvg : null,
                              completion: r.completion,
                              hasData: r.hasData,
                            }).map((b) => (
                              <Popover key={b.label}>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    className={`px-1.5 h-5 inline-flex items-center gap-1 rounded border text-[10px] font-semibold cursor-pointer ${
                                      b.tone === "good"
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                                        : b.tone === "warn"
                                          ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                                          : "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                                    }`}
                                  >
                                    <span aria-hidden>{b.emoji}</span>
                                    {b.label}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 text-xs">
                                  {badgeExplanation(b.label)}
                                </PopoverContent>
                              </Popover>
                            ))}
                            {r.course.id === highestJumpId && (
                              <span className="px-1.5 h-5 inline-flex items-center gap-1 rounded border text-[10px] font-semibold border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                                <span aria-hidden>🚀</span>
                                Highest Jump · +{(projDeltas.get(r.course.id) ?? 0).toFixed(1)}pp
                              </span>
                            )}
                            {r.course.id === biggestDropId && (
                              <span className="px-1.5 h-5 inline-flex items-center gap-1 rounded border text-[10px] font-semibold border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900">
                                <span aria-hidden>📉</span>
                                Biggest Drop · {(projDeltas.get(r.course.id) ?? 0).toFixed(1)}pp
                              </span>
                            )}
                            {(projConfidence.get(r.course.id) ?? 0) >= 75 && (
                              <span className="px-1.5 h-5 inline-flex items-center gap-1 rounded border text-[10px] font-semibold border-sky-300 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900">
                                <span aria-hidden>🎯</span>
                                High Confidence · {projConfidence.get(r.course.id)}%
                              </span>
                            )}
                            {r.hasData && r.done.length >= 3 && stddev(r.done.map((t) => (t.score / t.maxScore) * 100)) >= 15 && (
                              <span className="px-1.5 h-5 inline-flex items-center gap-1 rounded border text-[10px] font-semibold border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                                <span aria-hidden>🌊</span>
                                Volatile Scores
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5-bullet feedback compiler — sits directly UNDERNEATH the header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between no-print">
                        <h4 className="text-sm font-semibold">{tr.comments}</h4>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setHideComments((m) => ({ ...m, [r.course.id]: !m[r.course.id] }))
                            }
                            className="text-xs px-2 h-7 rounded-md border bg-background hover:bg-muted font-medium"
                          >
                            {hideComments[r.course.id] ? "Show comments" : "Hide comments"}
                          </button>
                          <label className="text-xs flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={manualOn}
                              onChange={(e) => update("manualOn", r.course.id, e.target.checked)}
                            />
                            Manual mode
                          </label>
                        </div>
                      </div>
                      {hideComments[r.course.id] ? (
                        (() => {
                          if (!r.hasData) {
                            return (
                              <p className="text-xs text-muted-foreground italic">
                                No graded tasks yet for {r.course.name}. Add a task to generate a feedback summary.
                              </p>
                            );
                          }
                          const trend = computeTrendInfo({
                            hasData: r.hasData,
                            hasPrevData: r.hasPrevData,
                            avg: r.avg,
                            prevAvg: r.prevAvg,
                            done: r.done,
                            allDone: r.allDone,
                            isAllTerms: activeTerm == null,
                            weighted: settings.weighted,
                          });
                          const proj = projectGrade(r.done, r.avg, horizonWeeks);
                          const projTier = projectedTierLabel(proj.projected);
                          const goalPct = subjectGoals[r.course.id] ?? settings.goal;
                          const goalDelta = proj.projected - goalPct;
                          const trendPhrase =
                            trend.delta == null
                              ? "trend data is still building"
                              : trend.delta >= 1
                                ? `trending upward (+${trend.delta.toFixed(1)} pts)`
                                : trend.delta <= -1
                                  ? `trending downward (${trend.delta.toFixed(1)} pts)`
                                  : "holding roughly steady";
                          const completionPhrase =
                            r.completion >= 95
                              ? "near-perfect task completion"
                              : r.completion >= 80
                                ? `${r.completion}% completion`
                                : `only ${r.completion}% completion — outstanding work is dragging the average`;
                          const goalPhrase =
                            goalDelta >= 0
                              ? `on track to clear the ${goalPct}% goal by ${goalDelta.toFixed(1)}pp`
                              : Math.abs(goalDelta) <= 3
                                ? `${Math.abs(goalDelta).toFixed(1)}pp short of the ${goalPct}% goal — close, but at risk`
                                : `${Math.abs(goalDelta).toFixed(1)}pp below the ${goalPct}% goal — a focused push is needed`;
                          const para1 =
                            `${r.course.name} sits at ${r.avg.toFixed(1)}% (${r.letter}, ${currentBandPhrase(r.avg)}) with ${completionPhrase}. ` +
                            `Recent performance is ${trendPhrase} ${trend.mode === "all-history" ? "across this subject's full history" : trend.mode === "prev-term" ? "versus the previous term" : "across this term's tasks"}. ` +
                            `(Bullets 1–3: Strengths, Trends, Commendations.)`;
                          const para2 =
                            `Looking ahead over the next ${horizonLabel}, the projection lands near ${proj.projected.toFixed(1)}% (${projTier}) at ${proj.confidencePct}% confidence — ${goalPhrase}. ` +
                            `Improvement focus should target the next sub-band: ${nextTierGoal(r.avg).replace(/^You are currently[^.]*\.\s*/, "")} ` +
                            `(Bullets 4–10: Responsibility, Improvement, Future Outlook, Diagnosis, Task Profile, Consistency, Optimization.)`;
                          return (
                            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                              <p>
                                <span className="font-semibold text-foreground">Quick summary — </span>
                                {para1}
                              </p>
                              <p>{para2}</p>
                              <p className="text-[11px] italic">
                                Full 10-bullet feedback is hidden for {r.course.name} to reduce lag. Click "Show comments" to expand.
                              </p>
                            </div>
                          );
                        })()
                      ) : manualOn ? (
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
                          <div className="space-y-1.5">
                            <RichTextToolbar
                              courseId={r.course.id}
                              value={meta.manual[r.course.id] ?? ""}
                              onChange={(next) => update("manual", r.course.id, next)}
                            />
                            <Textarea
                              id={`manual-${r.course.id}`}
                              rows={8}
                              value={meta.manual[r.course.id] ?? ""}
                              onChange={(e) => update("manual", r.course.id, e.target.value)}
                              placeholder="Write your custom feedback... Use **bold**, _italic_, or - bullet items."
                            />
                          </div>
                          <CommentBankPalette
                            value={meta.manual[r.course.id] ?? ""}
                            onAppend={(next) => update("manual", r.course.id, next)}
                          />
                        </div>
                      ) : (
                        <>
                          <ul className="space-y-1.5 text-sm">
                            {bullets.map((b, i) => (
                              <li
                                key={i}
                                className={`leading-relaxed rounded-md px-2 py-1.5 transition-colors ${
                                  i % 2 === 1 ? "bg-slate-50/70 dark:bg-slate-900/30" : ""
                                } ${
                                  i === 4 && urgent
                                    ? "text-destructive font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span className="font-semibold text-foreground">
                                  B{i + 1} ({labels[i]}):
                                </span>{" "}
                                {decorateMetrics(b)}
                                {i === 5 && r.hasData && (() => {
                                  const proj = projectGrade(r.done, r.avg, horizonWeeks);
                                  const projTier = projectedTierLabel(proj.projected);
                                  const goalPct = Number.isFinite(settings.goal) ? settings.goal : null;
                                  const goalDelta = goalPct != null ? proj.projected - goalPct : null;
                                  const onTrack = goalDelta != null && goalDelta >= 0;
                                  const confTone =
                                    proj.confidencePct >= 70
                                      ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
                                      : proj.confidencePct >= 45
                                        ? "border-sky-300 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900"
                                        : proj.confidencePct >= 20
                                          ? "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900"
                                          : "border-muted bg-muted/40 text-muted-foreground";
                                  const goalTone =
                                    goalDelta == null
                                      ? "border-muted bg-muted/40 text-muted-foreground"
                                      : onTrack
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
                                        : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900";
                                  return (
                                    <div
                                      aria-label="Future Outlook snapshot"
                                      className="mt-2 p-2.5 rounded-md border bg-muted/30"
                                    >
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current</div>
                                          <div className="text-sm font-bold tabular-nums text-foreground">
                                            {r.avg.toFixed(1)}% <span className="text-muted-foreground font-medium">({projectedTierLabel(r.avg)})</span>
                                          </div>
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                            Projected · {horizonLabel}
                                          </div>
                                          <div className="text-sm font-bold tabular-nums text-foreground">
                                            {proj.projected.toFixed(1)}% <span className="text-muted-foreground font-medium">({projTier})</span>
                                            {proj.source !== "insufficient" && (
                                              <span className={`ml-1 text-[10px] font-semibold ${proj.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                {proj.delta >= 0 ? "+" : ""}{proj.delta.toFixed(1)}pp
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Confidence</div>
                                          <span className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-semibold tabular-nums ${confTone}`}>
                                            {proj.source === "insufficient" ? "n/a" : `${proj.confidencePct}%`}
                                          </span>
                                        </div>
                                        <div className="space-y-0.5">
                                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                            Goal {goalPct != null ? `${goalPct}%` : "—"}
                                          </div>
                                          <span className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-semibold tabular-nums ${goalTone}`}>
                                            {goalDelta == null
                                              ? "No goal set"
                                              : `${onTrack ? "On track" : "At risk"} · ${goalDelta >= 0 ? "+" : ""}${goalDelta.toFixed(1)}pp`}
                                          </span>
                                        </div>
                                      </div>
                                      <SubjectProjectionChart
                                        subjectName={r.course.name}
                                        current={r.avg}
                                        projected={proj.projected}
                                        marginPp={proj.marginPp}
                                        goalPct={goalPct}
                                        color={r.course.color}
                                        onTrack={onTrack}
                                      />
                                      {prevTermOptions.length > 0 && (
                                        <div className="mt-2 no-print">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-[11px]"
                                            onClick={() =>
                                              setCompareOpen((s) => ({
                                                ...s,
                                                [r.course.id]: !s[r.course.id],
                                              }))
                                            }
                                          >
                                            {compareOpen[r.course.id] ? "Hide" : "Compare with previous terms"}
                                          </Button>
                                        </div>
                                      )}
                                      {compareOpen[r.course.id] && prevTermOptions.length > 0 && (
                                        <div className="mt-3 space-y-3 border-t pt-3">
                                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                            Previous Term Projections · {r.course.name}
                                          </div>
                                          {prevTermOptions.map((pt) => {
                                            const courseTasksAll = tasks.filter((t) => t.courseId === r.course.id);
                                            const ptTasks = filterByTerm(courseTasksAll, pt).filter((t) => !t.pending);
                                            if (ptTasks.length === 0) {
                                              return (
                                                <div key={pt.id} className="p-2.5 rounded-md border bg-muted/20">
                                                  <div className="text-[11px] font-semibold mb-1">{pt.name}</div>
                                                  <div className="text-[11px] text-muted-foreground">No graded tasks in this term.</div>
                                                </div>
                                              );
                                            }
                                            const ptAvg = calcAverage(ptTasks, settings.weighted);
                                            const ptProj = projectGrade(ptTasks, ptAvg, horizonWeeks);
                                            const ptGoalDelta = goalPct != null ? ptProj.projected - goalPct : null;
                                            const ptOnTrack = ptGoalDelta != null && ptGoalDelta >= 0;
                                            return (
                                              <div key={pt.id} className="p-2.5 rounded-md border bg-muted/20">
                                                <div className="text-[11px] font-semibold mb-2">
                                                  {pt.name} <span className="text-muted-foreground font-normal">({pt.start} → {pt.end})</span>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                  <div className="space-y-0.5">
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current</div>
                                                    <div className="text-sm font-bold tabular-nums text-foreground">
                                                      {ptAvg.toFixed(1)}% <span className="text-muted-foreground font-medium">({projectedTierLabel(ptAvg)})</span>
                                                    </div>
                                                  </div>
                                                  <div className="space-y-0.5">
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Projected · {horizonLabel}</div>
                                                    <div className="text-sm font-bold tabular-nums text-foreground">
                                                      {ptProj.projected.toFixed(1)}% <span className="text-muted-foreground font-medium">({projectedTierLabel(ptProj.projected)})</span>
                                                      {ptProj.source !== "insufficient" && (
                                                        <span className={`ml-1 text-[10px] font-semibold ${ptProj.delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                          {ptProj.delta >= 0 ? "+" : ""}{ptProj.delta.toFixed(1)}pp
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                  <div className="space-y-0.5">
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Confidence</div>
                                                    <span className="inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-semibold tabular-nums border-muted bg-muted/40 text-foreground">
                                                      {ptProj.source === "insufficient" ? "n/a" : `${ptProj.confidencePct}%`}
                                                    </span>
                                                  </div>
                                                  <div className="space-y-0.5">
                                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                                      Goal {goalPct != null ? `${goalPct}%` : "—"}
                                                    </div>
                                                    <span className={`inline-flex items-center px-1.5 h-5 rounded border text-[10px] font-semibold tabular-nums ${
                                                      ptGoalDelta == null
                                                        ? "border-muted bg-muted/40 text-muted-foreground"
                                                        : ptOnTrack
                                                          ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900"
                                                          : "border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900"
                                                    }`}>
                                                      {ptGoalDelta == null
                                                        ? "No goal set"
                                                        : `${ptOnTrack ? "On track" : "At risk"} · ${ptGoalDelta >= 0 ? "+" : ""}${ptGoalDelta.toFixed(1)}pp`}
                                                    </span>
                                                  </div>
                                                </div>
                                                <SubjectProjectionChart
                                                  subjectName={pt.name}
                                                  current={ptAvg}
                                                  projected={ptProj.projected}
                                                  marginPp={ptProj.marginPp}
                                                  goalPct={goalPct}
                                                  color={r.course.color}
                                                  onTrack={ptOnTrack}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </li>
                            ))}
                          </ul>
                          {(() => {
                            const trend = computeTrendInfo({
                              hasData: r.hasData,
                              hasPrevData: r.hasPrevData,
                              avg: r.avg,
                              prevAvg: r.prevAvg,
                              done: r.done,
                              allDone: r.allDone,
                              isAllTerms: activeTerm == null,
                              weighted: settings.weighted,
                            });
                            const deltaTxt =
                              trend.delta == null
                                ? ""
                                : ` (Δ = ${trend.delta >= 0 ? "+" : ""}${trend.delta.toFixed(1)} pts)`;
                            return (
                              <p
                                data-testid={`trend-caption-${r.course.id}`}
                                data-trend-mode={trend.mode}
                                className="mt-2 text-[11px] italic text-muted-foreground"
                              >
                                {TREND_MODE_CAPTION[trend.mode]}
                                {deltaTxt}
                              </p>
                            );
                          })()}
                        </>
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
      <TranscriptSheet />
      <Dialog open={capOpen} onOpenChange={setCapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>History Capacity Reached</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please delete an older report card entry from your Saved Reports hub
            to free up local space.
          </p>
          <DialogFooter>
            <Button onClick={() => setCapOpen(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={gradeRefOpen} onOpenChange={setGradeRefOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Scale Reference</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Read-only reference for the Report Card's internal letter-grade
            boundary scale. This grid cannot be edited.
          </p>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Tier</th>
                  <th className="text-left px-3 py-2 font-semibold">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { tier: "High A*", range: "97 – 100%" },
                  { tier: "Mid A*", range: "91 – 96.99%" },
                  { tier: "A", range: "81 – 90.99%" },
                  { tier: "B", range: "71 – 80.99%" },
                  { tier: "C", range: "61 – 70.99%" },
                  { tier: "D", range: "51 – 60.99%" },
                  { tier: "E", range: "41 – 50.99%" },
                  { tier: "F", range: "31 – 40.99%" },
                  { tier: "G", range: "1 – 30.99%" },
                  { tier: "NA", range: "0 – 0.99%" },
                ].map((row) => (
                  <tr key={row.tier}>
                    <td className="px-3 py-2 font-semibold tabular-nums">{row.tier}</td>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{row.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button onClick={() => setGradeRefOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------
// Metric tooltip decorator: wraps σ tokens and key index phrases in
// hover popovers explaining the underlying formula.
// ---------------------------------------------------------------
const METRIC_EXPLANATIONS: Array<{ pattern: RegExp; tip: string }> = [
  { pattern: /\bσ\b/g, tip: "Standard deviation (σ) — square root of the mean squared deviation from the average. Measures score consistency." },
  { pattern: /Grading Insulation Buffer/g, tip: "Grading Insulation Buffer — the percentage-point gap between your current average and the floor of your active letter-grade tier." },
  { pattern: /Effort Efficiency Index/g, tip: "Effort Efficiency Index — marginal grade yield per unit of weighted task input." },
  { pattern: /Summative Weight Strain Index/g, tip: "Summative Weight Strain Index — cumulative weight × variance leverage that any remaining summative carries." },
];

function decorateMetrics(text: string): React.ReactNode {
  // Split on each metric pattern in order, wrapping matches in tooltips.
  let parts: Array<string | React.ReactNode> = [text];
  METRIC_EXPLANATIONS.forEach(({ pattern, tip }, mi) => {
    const next: Array<string | React.ReactNode> = [];
    parts.forEach((part, pi) => {
      if (typeof part !== "string") { next.push(part); return; }
      const segments = part.split(pattern);
      const matches = part.match(pattern) || [];
      segments.forEach((seg, i) => {
        next.push(seg);
        if (i < segments.length - 1) {
          next.push(
            <TooltipProvider key={`m-${mi}-${pi}-${i}`} delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="underline decoration-dotted decoration-primary/50 cursor-help font-medium text-foreground">
                    {matches[i]}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
                  {tip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>,
          );
        }
      });
    });
    parts = next;
  });
  return <>{parts}</>;
}

// ---------------------------------------------------------------
// Rich-text toolbar — inserts markdown-style formatting around the
// current selection in the linked <textarea>. Persists with the
// existing manual-text localStorage flow.
// ---------------------------------------------------------------
function RichTextToolbar({
  courseId, value, onChange,
}: { courseId: string; value: string; onChange: (next: string) => void }) {
  const wrap = (prefix: string, suffix: string = prefix) => {
    const ta = document.getElementById(`manual-${courseId}`) as HTMLTextAreaElement | null;
    if (!ta) {
      onChange(`${value}${prefix}${suffix}`);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const sel = value.slice(start, end) || "text";
    const after = value.slice(end);
    const next = `${before}${prefix}${sel}${suffix}${after}`;
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + prefix.length + sel.length + suffix.length;
      ta.setSelectionRange(pos, pos);
    });
  };
  const bulletize = () => {
    const ta = document.getElementById(`manual-${courseId}`) as HTMLTextAreaElement | null;
    if (!ta) { onChange(`${value}\n- item`); return; }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const sel = value.slice(start, end) || "item";
    const after = value.slice(end);
    const lines = sel.split(/\r?\n/).map((l) => (l.trim() ? `- ${l.replace(/^[-*]\s*/, "")}` : l));
    const next = `${before}${lines.join("\n")}${after}`;
    onChange(next);
  };
  const Btn = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="h-8 px-2.5 rounded-md border bg-card hover:bg-muted/60 text-xs font-semibold flex items-center gap-1 transition-all"
      style={{ transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {children}
    </button>
  );
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Btn onClick={() => wrap("**")} label="Bold"><Bold className="h-3.5 w-3.5" />Bold</Btn>
      <Btn onClick={() => wrap("_")} label="Italic"><Italic className="h-3.5 w-3.5" />Italic</Btn>
      <Btn onClick={bulletize} label="Bulleted list"><List className="h-3.5 w-3.5" />List</Btn>
      <span className="text-[10px] text-muted-foreground ml-1">Markdown stored locally; renders in print exports.</span>
    </div>
  );
}
