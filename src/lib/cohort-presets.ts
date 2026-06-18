export type CohortProfile = {
  id: string;
  name: string;
  tier: "elite" | "stable" | "inconsistent" | "vulnerable" | "failing";
  tierLabel: string;
  avg: number;
  stdDev: number;
  mastery: number;
  velocity: number;
  color: string;
};

const E = "#0ea5e9", S = "#22c55e", I = "#eab308", V = "#f97316", F = "#ef4444";

export const COHORT_PROFILES: CohortProfile[] = [
  // Tier A — Elite Master
  { id: "c1",  name: "The Flawless Perfectionist",     tier: "elite",        tierLabel: "Tier A — Elite Master",          avg: 98.4, stdDev: 0.8,  mastery: 99, velocity: 0.1,  color: E },
  { id: "c2",  name: "The High-Ceiling Sniper",        tier: "elite",        tierLabel: "Tier A — Elite Master",          avg: 94.2, stdDev: 4.8,  mastery: 92, velocity: 0.3,  color: E },
  { id: "c3",  name: "The Relentless Grinder",         tier: "elite",        tierLabel: "Tier A — Elite Master",          avg: 92.5, stdDev: 1.1,  mastery: 95, velocity: 0.0,  color: E },
  { id: "c4",  name: "The Hyper-Accelerated Tracker",  tier: "elite",        tierLabel: "Tier A — Elite Master",          avg: 96.1, stdDev: 2.3,  mastery: 90, velocity: 1.8,  color: E },
  // Tier B — Stable Competency
  { id: "c5",  name: "The Steady Baseline Performer",  tier: "stable",       tierLabel: "Tier B — Stable Competency",     avg: 85.4, stdDev: 2.2,  mastery: 82, velocity: 0.1,  color: S },
  { id: "c6",  name: "The Theoretical Concept Master", tier: "stable",       tierLabel: "Tier B — Stable Competency",     avg: 88.1, stdDev: 3.5,  mastery: 89, velocity: 0.4,  color: S },
  { id: "c7",  name: "The Analytical Strategy Builder",tier: "stable",       tierLabel: "Tier B — Stable Competency",     avg: 83.7, stdDev: 1.9,  mastery: 80, velocity: 0.0,  color: S },
  { id: "c8",  name: "The Departmental Specialist",    tier: "stable",       tierLabel: "Tier B — Stable Competency",     avg: 86.9, stdDev: 2.8,  mastery: 84, velocity: -0.2, color: S },
  // Tier C — Inconsistent Progressors
  { id: "c9",  name: "The Volatile Comeback Profile",  tier: "inconsistent", tierLabel: "Tier C — Inconsistent Progressors", avg: 78.2, stdDev: 6.4,  mastery: 70, velocity: 2.4,  color: I },
  { id: "c10", name: "The Coursework Specialist",      tier: "inconsistent", tierLabel: "Tier C — Inconsistent Progressors", avg: 74.5, stdDev: 5.1,  mastery: 68, velocity: -0.5, color: I },
  { id: "c11", name: "The Intermittent Focus Scenario",tier: "inconsistent", tierLabel: "Tier C — Inconsistent Progressors", avg: 68.1, stdDev: 7.2,  mastery: 62, velocity: 0.8,  color: I },
  { id: "c12", name: "The Plateaued Pacing Vector",    tier: "inconsistent", tierLabel: "Tier C — Inconsistent Progressors", avg: 63.4, stdDev: 4.1,  mastery: 58, velocity: 0.0,  color: I },
  // Tier D — Vulnerable
  { id: "c13", name: "The Narrow Buffer Profile",      tier: "vulnerable",   tierLabel: "Tier D — Vulnerable (45–60%)",   avg: 58.2, stdDev: 4.9,  mastery: 51, velocity: -0.8, color: V },
  { id: "c14", name: "The Late-Term Decay Scenario",   tier: "vulnerable",   tierLabel: "Tier D — Vulnerable (45–60%)",   avg: 54.1, stdDev: 5.8,  mastery: 48, velocity: -2.1, color: V },
  { id: "c15", name: "The Conceptual Desynchronization", tier: "vulnerable", tierLabel: "Tier D — Vulnerable (45–60%)",   avg: 49.6, stdDev: 3.9,  mastery: 42, velocity: 0.2,  color: V },
  { id: "c16", name: "The Critical Runway Tracker",    tier: "vulnerable",   tierLabel: "Tier D — Vulnerable (45–60%)",   avg: 46.3, stdDev: 4.4,  mastery: 39, velocity: 0.0,  color: V },
  // Tier F — Failing with High Volatility
  { id: "c17", name: "The Erratic Volatility Anomaly", tier: "failing",      tierLabel: "Tier F — Failing (20–44%)",      avg: 41.3, stdDev: 14.8, mastery: 32, velocity: -1.5, color: F },
  { id: "c18", name: "The Systemic Friction Crisis",   tier: "failing",      tierLabel: "Tier F — Failing (20–44%)",      avg: 34.7, stdDev: 12.1, mastery: 25, velocity: 0.0,  color: F },
  { id: "c19", name: "The Downward Velocity Collapse", tier: "failing",      tierLabel: "Tier F — Failing (20–44%)",      avg: 28.2, stdDev: 11.4, mastery: 18, velocity: -3.4, color: F },
  { id: "c20", name: "The Absolute Rebuild Baseline",  tier: "failing",      tierLabel: "Tier F — Failing (20–44%)",      avg: 22.5, stdDev: 10.2, mastery: 11, velocity: -0.1, color: F },
];

export const TIER_GROUPS: { id: CohortProfile["tier"]; label: string }[] = [
  { id: "elite",        label: "Elite Master" },
  { id: "stable",       label: "Stable Competency" },
  { id: "inconsistent", label: "Inconsistent Progressors" },
  { id: "vulnerable",   label: "Vulnerable" },
  { id: "failing",      label: "Failing — High Volatility" },
];

// Derive a synthetic score distribution from (avg, stdDev) for boxplots.
// Uses a deterministic small sample (24 points) drawn around the mean.
export function syntheticScores(p: CohortProfile, n = 24): number[] {
  const out: number[] = [];
  // deterministic pseudo-random based on profile id
  let seed = 0;
  for (let i = 0; i < p.id.length; i++) seed = (seed * 31 + p.id.charCodeAt(i)) >>> 0;
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  for (let i = 0; i < n; i++) {
    // Box-Muller for normal distribution
    const u1 = Math.max(rng(), 1e-9);
    const u2 = rng();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const v = p.avg + z * p.stdDev;
    out.push(Math.max(0, Math.min(100, v)));
  }
  return out;
}

export function quartiles(values: number[]): { min: number; q1: number; median: number; q3: number; max: number } {
  if (!values.length) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  return { min: sorted[0], q1: q(0.25), median: q(0.5), q3: q(0.75), max: sorted[sorted.length - 1] };
}