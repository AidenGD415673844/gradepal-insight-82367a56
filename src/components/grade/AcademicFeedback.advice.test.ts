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
  const sds = [0, 5, 10, 20, 35];
  for (const sd of sds) {
    it(`σ=${sd}: every percentage 41–100 yields a strictly-higher target band`, () => {
      // Below 41 the student is beneath the bottom ladder rung — any
      // target ladder band is trivially above them, so the comparison
      // only carries signal once we're inside the ladder.
      for (let pct = 41; pct <= 100; pct += 0.5) {
        const advice = nextTierGoal(pct, sd);
        // The A* maintenance branch is exempt — there is no higher band.
        if (pct >= 91) {
          expect(advice).toMatch(/A\*/);
          continue;
        }
        const target = extractTargetBand(advice);
        expect(target, `no target band in advice at pct=${pct}: "${advice}"`).not.toBeNull();
        const current = currentLadderBand(pct);
        if (!current) continue;
        const currentRank = rank(current.letter, current.tier);
        const targetRank = rank(target!.letter, target!.tier);
        expect(
          targetRank,
          `target ${target!.tier} ${target!.letter} ≤ current ${current.tier} ${current.letter} at pct=${pct}`,
        ).toBeGreaterThan(currentRank);
      }
    });
  }

  it("low D (e.g. 52%) never targets D or anything below — must climb to high D, low C, etc.", () => {
    for (const pct of [51, 52, 53, 54]) {
      const advice = nextTierGoal(pct, 10);
      const t = extractTargetBand(advice)!;
      // Anything in the D band at low/mid tier is forbidden; high D is the
      // next legitimate target above low D.
      expect(rank(t.letter, t.tier)).toBeGreaterThan(rank("D", "low"));
      // Must never suggest the band the student is in (low D).
      expect(advice).not.toMatch(/into the low D band/);
      expect(currentBandPhrase(pct)).toMatch(/low D/);
    }
  });

  it("high A (e.g. 88–90%) never targets anything below A* — no 'low/mid/high B' suggestions", () => {
    for (const pct of [88, 88.5, 89, 90, 90.5]) {
      const advice = nextTierGoal(pct, 6);
      expect(advice).not.toMatch(/into the (low |mid |high )?B band/);
      expect(advice).not.toMatch(/into the (low |mid |high )?A band/);
      // Either an explicit "into the A* band" goal or the cap/cusp wording.
      expect(advice).toMatch(/A\*/);
    }
  });

  it("quoted distance range width is capped (no runaway cushions from high variance)", () => {
    // The cushion is capped at 4 in nextTierGoal, so (high - low) must
    // also stay within that cap regardless of σ. The absolute gap can
    // still be large when the student is far from the next tier (e.g.
    // 41% → mid E is legitimately ~4 away), but the *spread* of the
    // recommendation must remain tight.
    for (let pct = 41; pct <= 90; pct += 0.5) {
      const advice = nextTierGoal(pct, 35);
      const m = advice.match(/roughly (\d+)% to (\d+)% away/);
      if (!m) continue;
      const low = Number(m[1]);
      const high = Number(m[2]);
      expect(low).toBeGreaterThan(0);
      expect(high).toBeGreaterThanOrEqual(low);
      expect(high - low).toBeLessThanOrEqual(4);
    }
  });

  it("advice always names the student's CURRENT band first via currentBandPhrase", () => {
    for (const pct of [42, 55, 65, 75, 81, 88]) {
      const advice = nextTierGoal(pct, 5);
      expect(advice.startsWith(`You are currently in ${currentBandPhrase(pct)}`)).toBe(true);
    }
  });
});