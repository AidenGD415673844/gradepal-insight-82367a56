import { useEffect, useMemo, useState } from "react";
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
import { bullets8910For } from "./feedback-bullets8910";
import { SubjectProjectionChart } from "./SubjectProjectionChart";
import { computeVelocity } from "@/lib/grade-velocity";
import { projectGrade, HORIZON_OPTIONS } from "@/lib/grade-projection";
import { applyAStarOverride } from "./a-star-override";
import { TranscriptSheet } from "./TranscriptSheet";
import { saveReport } from "@/lib/saved-reports";
import { stddev } from "@/lib/grade-stats";
import { toast } from "sonner";
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
  if (pct >= 91) return "A*";
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
  if (pct >= 91) return "the A* band";
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
  if (pct >= 91) {
    return "Continue to maintain your A* standing by tackling stretch challenges and competition-level questions.";
  }
  // Strictly above current — never recommend the band you're already in.
  const next = NEXT_TIER_LADDER.find((b) => b.min > pct);
  if (!next) {
    const gap = Math.max(1, Math.ceil(91 - pct));
    return `You are currently in ${currentBandPhrase(pct)}. You're roughly ${gap}% from clearing the A* threshold — sustained top-band performance on remaining tasks will get you there.`;
  }
  const label = fmtTier(next);
  const rawGap = next.min - pct;
  // On the cusp — skip the "X% away" range, give a micro-goal instead.
  if (rawGap <= 1) {
    return `You are currently in ${currentBandPhrase(pct)}. You're on the cusp of the ${label} band — one strong task pushes you over.`;
  }
  const gap = Math.max(1, Math.ceil(rawGap));
  // Capped cushion (never wider than 4 pts regardless of volatility).
  const cushion = Math.max(1, Math.min(4, Math.ceil(sdSubject / 3)));
  // Don't quote a range that overshoots the tier *after* the goal tier.
  const tierAfter = NEXT_TIER_LADDER.find((b) => b.min > next.min);
  const ceiling = tierAfter
    ? Math.max(gap + 1, Math.ceil(tierAfter.min - pct) - 1)
    : gap + cushion;
  const high = Math.min(gap + cushion, ceiling);

  // Personalised colour from the student's own task history.
  let extra = "";
  if (done.length >= 2) {
    const pcts = done
      .map((t) => (t.score / t.maxScore) * 100)
      .filter((n) => Number.isFinite(n));
    if (pcts.length >= 2) {
      const best = Math.max(...pcts);
      const recent = pcts.slice(-3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      if (best > pct + 2) {
        extra = ` Your highest task this term was ${best.toFixed(1)}% — repeating that level on remaining work would lift your average toward the ${label} band.`;
      } else if (recentAvg > pct + 1) {
        extra = ` Your recent task average (${recentAvg.toFixed(1)}%) is trending above your overall average — keep that momentum.`;
      } else if (recentAvg < pct - 1) {
        extra = ` Your recent task average has dipped to ${recentAvg.toFixed(1)}% — stabilising at your prior level is the first step before reaching for ${label}.`;
      }
    }
  }

  return `You are currently in ${currentBandPhrase(pct)}. Try to aim and work hard to bring your grade up into the ${label} band — roughly ${gap}% to ${high}% away.${extra}`;
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

export function AcademicFeedback() {
  const { courses, tasks, terms, activeTermId, settings } = useGrades();
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
    const b6Narrative =
      proj.source === "insufficient"
        ? `Once two or more graded tasks land, the model will forecast where ${r.course.name} is heading over the next ${horizonLabel}. For now the outlook holds steady at the current ${r.letter} band.`
        : Math.abs(proj.delta) < 0.5
          ? `Momentum in ${r.course.name} is essentially flat, so the ${horizonLabel} outlook keeps the average locked near today's ${projTier} band.`
          : proj.delta > 0
            ? `If this pace holds, ${r.course.name} is on a quiet climb toward the ${projTier} band over the next ${horizonLabel} — keep the current execution steady to bank the gain.`
            : `Recent results are pulling ${r.course.name} toward the ${projTier} band over the next ${horizonLabel}. A small intervention now is enough to flatten or reverse the slope before it locks in.`;
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
    // Summative Weight Strain Index: share of the term's maximum points
    // that come from above-median-weighted tasks. A balanced load lands
    // near 50%; heavy summative loading pushes it toward 100%.
    const maxScoresSorted = [...r.done].map((t) => t.maxScore).sort((a, b) => a - b);
    const medianMax = maxScoresSorted.length
      ? maxScoresSorted[Math.floor(maxScoresSorted.length / 2)]
      : 0;
    const totalMax = r.done.reduce((s, t) => s + (t.maxScore || 0), 0);
    const summativeMax = r.done
      .filter((t) => t.maxScore >= medianMax && t.maxScore > 0)
      .reduce((s, t) => s + t.maxScore, 0);
    const strainIndex = totalMax > 0 ? (summativeMax / totalMax) * 100 : 0;
    // Max ceiling: hypothetical average if every still-pending task is
    // scored 100%. Falls back to the current average when nothing is
    // pending so the copy never references an impossible ceiling.
    const pending = r.current.filter((t) => t.pending);
    const hypoTasks = [
      ...r.done,
      ...pending.map((t) => ({ ...t, score: t.maxScore, pending: false })),
    ];
    const maxCeiling = hypoTasks.length
      ? calcAverage(hypoTasks, settings.weighted)
      : r.avg;
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
      strainIndex,
      stdDev: sdSubject,
      maxCeiling,
      syllabusRedCount,
    });

    return [
      `${shiftedMain.bullets[0]} ${addons.b1}`,
      `${b2 + sdClause} ${addons.b2}`,
      `${b3 + respClause} ${addons.b3}`,
      `${shiftedMain.bullets[3] + sdClause} ${addons.b4}`,
      `${b5} ${addons.b5}`,
      b6Dynamic,
      b7,
      stats8910.b8,
      stats8910.b9,
      stats8910.b10,
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

          <div className="flex gap-2 mt-4 no-print">
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
                // Template-specific chip + card styling so switching the
                // template in the dialog visibly changes the layout.
                const chipCls =
                  tpl.template === "modern"
                    ? "ring-2 ring-primary/60 bg-primary/15"
                    : tpl.template === "k12"
                      ? "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                      : tpl.template === "international"
                        ? "bg-background border-2 border-primary text-primary"
                        : "bg-primary/10 border-primary/30";
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
                          <div className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-md border text-sm font-bold ${chipCls}`}>
                            <span>{r.letter}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{r.avgDisplay}</span>
                          </div>
                        </div>
                      </div>
                      {/* Badges + class-avg comparison. Hidden in 'simple' to keep that layout minimal. */}
                      {tpl.template !== "simple" && (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.hasData && classAvg > 0 && (
                              <span
                                className={`px-1.5 h-5 inline-flex items-center rounded border text-[10px] font-semibold tabular-nums ${
                                  r.avg - classAvg >= 0
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                                    : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                                }`}
                              >
                                {r.avg - classAvg >= 0 ? "+" : ""}
                                {(r.avg - classAvg).toFixed(1)}% {tr.vsClass}
                              </span>
                            )}
                            {computeBadges({
                              avg: r.avg,
                              prevAvg: r.hasPrevData ? r.prevAvg : null,
                              completion: r.completion,
                              hasData: r.hasData,
                            }).map((b) => (
                              <span
                                key={b.label}
                                className={`px-1.5 h-5 inline-flex items-center gap-1 rounded border text-[10px] font-semibold ${
                                  b.tone === "good"
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
                                    : b.tone === "warn"
                                      ? "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                                      : "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900"
                                }`}
                              >
                                <span aria-hidden>{b.emoji}</span>
                                {b.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 5-bullet feedback compiler — sits directly UNDERNEATH the header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between no-print">
                        <h4 className="text-sm font-semibold">{tr.comments}</h4>
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
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
                          <Textarea
                            rows={8}
                            value={meta.manual[r.course.id] ?? ""}
                            onChange={(e) => update("manual", r.course.id, e.target.value)}
                            placeholder="Write your custom feedback..."
                          />
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
    </>
  );
}
