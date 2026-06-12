// Bullet 7 (Statistical Diagnosis) — dynamic, client-side string template
// interpolation engine. 20 continuous 5%-wide tiers (0–100). Each tier
// returns a fully-formed sentence with {subject_name}, {current_percentage},
// {letter_grade}, and {calculated_velocity} interpolated at render time.

type Tier = "high" | "steady" | "urgent";

const TEMPLATE: Record<Tier, string> = {
  high:
    "Statistical Diagnosis: Cumulative grade book mathematics for {subject_name} confirm an optimal status, with individual assessment data points grouping tightly to yield a final average of {current_percentage} ({letter_grade}). Tracking stability metrics reveal absolute core mastery, indicating zero structural vulnerabilities across weighted categories with a current momentum factor of {calculated_velocity}.",
  steady:
    "Statistical Diagnosis: The final term data loop for {subject_name} indicates solid stability at {current_percentage} ({letter_grade}), though minor score variances between coursework components and heavy assessment weights are present. Eliminating these slight performance deltas while managing your {calculated_velocity} direction will instantly elevate your trajectory into the top tier.",
  urgent:
    "Statistical Diagnosis: Cumulative data points for {subject_name} are currently tracking at {current_percentage} ({letter_grade}), showing that your mathematical grade insulation buffer is fully exhausted. Reversing this tracking deficit and stabilizing your {calculated_velocity} vector requires immediate optimization of all upcoming weighted task outputs.",
};

function tierFor(min: number): Tier {
  if (min >= 92) return "high";
  if (min >= 60) return "steady";
  return "urgent";
}

export type Bullet7Tier = {
  min: number;
  max: number;
  template: string;
};

// 20 continuous 5%-wide tiers — every band has concrete copy, no gaps.
export const BULLET7_TIERS: Bullet7Tier[] = (() => {
  const out: Bullet7Tier[] = [];
  for (let i = 0; i < 20; i++) {
    const min = i * 5;
    const max = i === 19 ? 100 : min + 4.99;
    const t = tierFor(min);
    const tag = ` (${min}–${Math.floor(max)}% band)`;
    out.push({ min, max, template: TEMPLATE[t] + tag });
  }
  return out;
})();

export function lookupBullet7(pct: number): string {
  const safe = Math.max(0, Math.min(100, pct));
  const hit =
    BULLET7_TIERS.find((b) => safe >= b.min && safe <= b.max) ??
    BULLET7_TIERS[BULLET7_TIERS.length - 1];
  return hit.template;
}

export function formatVelocity(slopePerWeek: number, sample: number): string {
  if (sample < 2) return "insufficient data";
  const sign = slopePerWeek > 0 ? "+" : "";
  const dir =
    Math.abs(slopePerWeek) < 0.3 ? "flat" : slopePerWeek > 0 ? "upward" : "downward";
  return `${sign}${slopePerWeek.toFixed(2)} pp/wk (${dir})`;
}

export function bullet7For(args: {
  subjectName: string;
  pct: number;
  letter: string;
  velocityLabel: string;
}): string {
  return lookupBullet7(args.pct)
    .replace(/\{subject_name\}/g, args.subjectName)
    .replace(/\{current_percentage\}/g, `${args.pct.toFixed(1)}%`)
    .replace(/\{letter_grade\}/g, args.letter)
    .replace(/\{calculated_velocity\}/g, args.velocityLabel);
}