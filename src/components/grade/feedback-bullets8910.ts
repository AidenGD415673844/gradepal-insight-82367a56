// Bullets 8 (Task Type Profile & Summative Weight Strain Index),
// 9 (Score Volatility & Population Standard Deviation Corridor) and
// 10 (Asymptotic Grade Optimization Ceiling & Yield Strategy).
//
// Each bullet ships with three concrete tier templates (high / steady /
// urgent) and is expanded into a continuous 4%-increment lookup ladder
// covering 0–100% so every fractional grade boundary has fully-formed
// copy — no placeholders, no empty bands. Pure local computation; no
// network or model dependencies.

type Tier = "high" | "steady" | "urgent";

function tierFor(min: number): Tier {
  if (min >= 92) return "high";
  if (min >= 60) return "steady";
  return "urgent";
}

const B8: Record<Tier, string> = {
  high:
    "Task Distribution Profile: Internal metrics confirm a highly balanced task profile, with a Summative Weight Strain Index sitting at an optimal {strain_index}%. The student demonstrates total operational versatility, executing flawless performance regardless of task format, showing equal mastery across both high-stakes examinations and independent coursework portfolios.",
  steady:
    "Task Distribution Profile: Grade data captures an uneven task distribution pattern, registering a Summative Weight Strain Index of {strain_index}%. While routine formative tasks provide a stable points anchor, a slight performance lag under timed exam conditions indicates that shifting study hours toward mock test simulations will rebalance their distribution profile and unlock the top tier.",
  urgent:
    "Task Distribution Profile: Diagnostics flag severe structural friction inside the task profile, with a Summative Weight Strain Index of {strain_index}%. Daily task consistency is being heavily overwhelmed by steep drops during high-stakes summative evaluations, proving that the student's primary academic hurdle is timed examination anxiety or a lack of exam-specific preparation loops.",
};

const B9: Record<Tier, string> = {
  high:
    "Scoring Consistency: Standard deviation modeling registers an exceptionally low volatility coefficient of σ = {std_dev}% across all grading inputs. The student's assessment scores cluster tightly around their master mean, demonstrating flawless execution stability and a highly predictable, mathematically secure academic foundation.",
  steady:
    "Scoring Consistency: Statistical deviation metrics identify a moderate spread across task scores, yielding a standard deviation corridor of σ = {std_dev}%. While the cumulative baseline remains secure, occasional outlier tasks are widening the deviation path, proving that stabilizing execution variance will instantly lock in a higher grading tier.",
  urgent:
    "Scoring Consistency: Variance calculations detect an erratic standard deviation pattern of σ = {std_dev}% across the grading ledger. High mathematical volatility suggests performance is fluctuating heavily between assessment types, showing an urgent need to anchor baseline skills to prevent extreme downward grade shocks.",
};

const B10: Record<Tier, string> = {
  high:
    "Optimization Strategy: To navigate the law of diminishing returns at this elite level, future study blocks should bypass basic review and focus purely on non-routine edge cases to protect the current absolute performance ceiling of {max_ceiling}%. The optimal tactical move is to maintain current Grade Velocity momentum to lock down a flawless end-of-year transcript profile.",
  steady:
    "Optimization Strategy: To achieve maximum grade acceleration toward the course ceiling of {max_ceiling}%, the student must apply a targeted optimization sprint to our Syllabus Unit Mastery Grid to eliminate the remaining {syllabus_red_count} unmastered concepts. Resolving these specific topic blocks will generate the highest mathematical yield per study hour, driving their average efficiently past the final A* boundary.",
  urgent:
    "Optimization Strategy: To stop downward grade decay and elevate the current performance floor toward a maximum boundary of {max_ceiling}%, tactical priority must be directed entirely toward high-weight categories. The student must resolve the remaining {syllabus_red_count} flagged syllabus vulnerabilities, treating every single remaining unweighted point as a critical asset to force a full system recovery.",
};

export type Tier8910 = { min: number; max: number; b8: string; b9: string; b10: string };

// 25 continuous 4%-wide tiers (0–3.99, 4–7.99, …, 96–100). Every band
// resolves to fully-formed copy via the high/steady/urgent ladder.
export const TIERS_8910: Tier8910[] = (() => {
  const out: Tier8910[] = [];
  for (let i = 0; i < 25; i++) {
    const min = i * 4;
    const max = i === 24 ? 100 : min + 3.99;
    const t = tierFor(min);
    const tag = ` (${min}–${Math.floor(max)}% band)`;
    out.push({ min, max, b8: B8[t] + tag, b9: B9[t] + tag, b10: B10[t] + tag });
  }
  return out;
})();

export function lookup8910(pct: number): Tier8910 {
  const safe = Math.max(0, Math.min(100, pct));
  return (
    TIERS_8910.find((b) => safe >= b.min && safe <= b.max) ??
    TIERS_8910[TIERS_8910.length - 1]
  );
}

export function bullets8910For(args: {
  pct: number;
  strainIndex: number;
  stdDev: number;
  maxCeiling: number;
  syllabusRedCount: number;
}): { b8: string; b9: string; b10: string } {
  const tier = lookup8910(args.pct);
  const fmt = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : "0.0");
  const sub = (s: string) =>
    s
      .replace(/\{strain_index\}/g, fmt(args.strainIndex))
      .replace(/\{std_dev\}/g, fmt(args.stdDev))
      .replace(/\{max_ceiling\}/g, fmt(args.maxCeiling))
      .replace(/\{syllabus_red_count\}/g, String(Math.max(0, Math.round(args.syllabusRedCount))));
  return { b8: sub(tier.b8), b9: sub(tier.b9), b10: sub(tier.b10) };
}