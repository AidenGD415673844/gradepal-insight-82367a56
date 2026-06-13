import { describe, it, expect } from "vitest";
import { currentBandPhrase, nextTierGoal } from "./AcademicFeedback";
import type { Task } from "@/lib/grade-store";

const t = (score: number, maxScore = 100, date = "2025-01-01"): Task => ({
  id: Math.random().toString(36),
  courseId: "c1",
  name: "t",
  category: "c",
  weight: 1,
  score,
  maxScore,
  date,
  pending: false,
});

describe("currentBandPhrase — aligned with REPORT_SCALE letter mins", () => {
  it("81.0 (exactly A.min) is labelled as low A, not high B", () => {
    expect(currentBandPhrase(81)).toBe("the low A band");
  });
  it("71.0 (exactly B.min) is labelled as low B, not high C", () => {
    expect(currentBandPhrase(71)).toBe("the low B band");
  });
  it("55.0 (mid D) is labelled as mid D", () => {
    expect(currentBandPhrase(55)).toBe("the mid D band");
  });
  it("80.6 (within 1.5% of A boundary) uses the between-bands phrase", () => {
    expect(currentBandPhrase(80.6)).toBe(
      "between the higher high B band and the lower low A band",
    );
  });
  it("70.5 (within 1.5% of B boundary) uses the between-bands phrase", () => {
    expect(currentBandPhrase(70.5)).toBe(
      "between the higher high C band and the lower low B band",
    );
  });
  it("95 maps to the Mid A* band", () => {
    expect(currentBandPhrase(95)).toBe("the Mid A* band");
  });
  it("98 maps to the High A* band", () => {
    expect(currentBandPhrase(98)).toBe("the High A* band");
  });
});

describe("nextTierGoal — realistic, attainable ranges", () => {
  it("81% (low A) formally targets the next sub-band, never the band already occupied", () => {
    const out = nextTierGoal(81, 6.7);
    expect(out).toMatch(/Strategic focus should be directed/);
    expect(out).not.toMatch(/into the low A band threshold/);
  });

  it("89.5% targets A* with formal wording", () => {
    const out = nextTierGoal(89.5, 3);
    expect(out).toMatch(/A\*/);
  });

  it("95% (Mid A*) targets High A* threshold", () => {
    expect(nextTierGoal(95)).toMatch(/High A\* \(97–100%\) threshold/);
  });

  it("98% (High A*) emits a sustain-baseline directive", () => {
    expect(nextTierGoal(98)).toMatch(/sustaining this elite baseline/);
  });

  it("never uses casual 'work hard' or 'try to' phrasing", () => {
    for (const pct of [45, 55, 70, 85, 92]) {
      const out = nextTierGoal(pct);
      expect(out).not.toMatch(/work hard/i);
      expect(out).not.toMatch(/try to/i);
    }
  });
  // Reference unused helper to keep import surface stable for future tests.
  void t;
});
