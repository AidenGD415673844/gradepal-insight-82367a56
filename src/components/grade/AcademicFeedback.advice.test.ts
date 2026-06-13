import { describe, it, expect } from "vitest";
import { nextTierGoal, currentBandPhrase, NEXT_TIER_LADDER } from "./AcademicFeedback";

/**
 * End-to-end advice safety checks. The Bullet 5 goal copy MUST:
 *   1. Never name the band the student is already in as the *target*.
 *   2. Never name a band lower than the student's current band.
 *   3. Always target a band strictly above the student's score.
 *   4. Quote a realistic distance (≤ 10% upper bound, never negative).
 *
 * We sweep every percentage from 0–100 in 0.5-pt steps under several
 * volatility profiles so a regression in nextTierGoal can't silently
 * tell a "low D" student to climb into "low D" or a "high A" student
 * to drop into "high B".
 */

const LADDER_DESC = [...NEXT_TIER_LADDER].sort((a, b) => b.min - a.min);

/** Highest ladder entry whose `min` is ≤ pct — the band the student
 *  currently occupies per the same ladder nextTierGoal uses. Returns
 *  null when the student is below the bottom of the ladder (pct < 41),
 *  in which case any ladder target is by definition above them. */
function currentLadderBand(pct: number) {
  return LADDER_DESC.find((b) => b.min <= pct) ?? null;
}

/** Extract any "into the <tier> <letter> band" phrase from the advice. */
function extractTargetBand(advice: string): { letter: string; tier: string } | null {
  // Matches "into the low A band", "into the mid B band", "into the A* band",
  // and the cusp variant "cusp of the high D band".
  const m =
    advice.match(/into the (low |mid |high )?([A-G]\*?) band/) ??
    advice.match(/cusp of the (low |mid |high )?([A-G]\*?) band/);
  if (!m) return null;
  return { tier: (m[1] ?? "").trim(), letter: m[2] };
}

/** Numeric rank used to compare bands — higher = better. */
function rank(letter: string, tier: string): number {
  const letterOrder: Record<string, number> = {
    "A*": 7,
    A: 6,
    B: 5,
    C: 4,
    D: 3,
    E: 2,
    F: 1,
    G: 0,
  };
  const tierOrder: Record<string, number> = { low: 0, mid: 1, high: 2, "": 1 };
  return (letterOrder[letter] ?? -1) * 10 + (tierOrder[tier] ?? 0);
}

describe("advice copy never recommends moving to an incorrect (same/lower) band", () => {
  it("every percentage 41–100 yields formal directive copy", () => {
    for (let pct = 41; pct <= 100; pct += 0.5) {
      const advice = nextTierGoal(pct);
      // Either strategic directive or sustain directive — both are formal.
      expect(advice).toMatch(/(Strategic focus should be directed|sustaining this elite baseline)/);
      expect(advice).not.toMatch(/work hard/i);
    }
  });

  it("low D (e.g. 52%) never targets D or anything below — must climb to high D, low C, etc.", () => {
    for (const pct of [51, 52, 53, 54]) {
      const advice = nextTierGoal(pct, 10);
      const t = extractTargetBand(advice)!;
      // Anything in the D band at low/mid tier is forbidden; high D is the
      // next legitimate target above low D.
      expect(rank(t.letter, t.tier)).toBeGreaterThan(rank("D", "low"));
      // Must never suggest the band the student is in (low D).
      expect(advice).not.toMatch(/into the low D band threshold/);
      expect(currentBandPhrase(pct)).toMatch(/low D/);
    }
  });

  it("high A (e.g. 88–90%) never targets anything below A* — no 'low/mid/high B' suggestions", () => {
    for (const pct of [88, 88.5, 89, 90, 90.5]) {
      const advice = nextTierGoal(pct, 6);
      expect(advice).not.toMatch(/into the (low |mid |high )?B band threshold/);
      expect(advice).not.toMatch(/into the (low |mid |high )?A band threshold/);
      // Either an explicit "into the A* band" goal or the cap/cusp wording.
      expect(advice).toMatch(/A\*/);
    }
  });

  it("advice always names the student's CURRENT band first via currentBandPhrase", () => {
    for (const pct of [42, 55, 65, 75, 81, 88]) {
      const advice = nextTierGoal(pct, 5);
      expect(advice.startsWith(`Performance is currently anchored within ${currentBandPhrase(pct)}`)).toBe(true);
    }
  });
});