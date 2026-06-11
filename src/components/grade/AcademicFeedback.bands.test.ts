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
  it("95 maps to the A* band", () => {
    expect(currentBandPhrase(95)).toBe("the A* band");
  });
});

describe("nextTierGoal — realistic, attainable ranges", () => {
  it("81% (low A) targets mid A, never the band already occupied", () => {
    const out = nextTierGoal(81, 6.7);
    expect(out).toMatch(/mid A band/);
    expect(out).not.toMatch(/into the low A band/);
    expect(out).not.toMatch(/high B band/);
  });

  it("55% with high variance still caps the upper bound (no 19% suggestions)", () => {
    const out = nextTierGoal(55, 30);
    // Range pattern: "roughly N% to M% away" with M ≤ 8
    const m = out.match(/roughly (\d+)% to (\d+)% away/);
    expect(m).toBeTruthy();
    const high = Number(m![2]);
    expect(high).toBeLessThanOrEqual(8);
    expect(out).toMatch(/high D band/);
  });

  it("80.6% (cusp of low A) uses cusp wording, not a multi-percent range", () => {
    const out = nextTierGoal(80.6, 5);
    expect(out).toMatch(/cusp of the low A band/);
    expect(out).not.toMatch(/roughly \d+% to \d+% away/);
  });

  it("70.5% (cusp of low B) uses cusp wording", () => {
    const out = nextTierGoal(70.5, 5);
    expect(out).toMatch(/cusp of the low B band/);
  });

  it("89.5% targets A* with a small gap", () => {
    const out = nextTierGoal(89.5, 3);
    expect(out).toMatch(/A\*/);
  });

  it("95% (already A*) returns the maintenance fallback", () => {
    expect(nextTierGoal(95)).toMatch(/Continue to maintain your A\* standing/);
  });

  it("appends a 'highest task' line when best task exceeds the average", () => {
    const done = [t(60), t(72), t(95)];
    const out = nextTierGoal(75, 8, done);
    expect(out).toMatch(/highest task this term was 95\.0%/);
  });

  it("flags a recent dip rather than promising a jump", () => {
    const done = [t(76), t(75), t(70), t(68), t(66)];
    const out = nextTierGoal(75, 8, done);
    expect(out).toMatch(/recent task average has dipped/);
  });
});
