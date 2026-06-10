import { describe, it, expect } from "vitest";
import { computeTrendInfo, TREND_MODE_CAPTION } from "./AcademicFeedback";
import type { Task } from "@/lib/grade-store";

function mk(
  courseId: string,
  date: string,
  score: number,
  maxScore = 100,
): Task {
  return {
    id: `${courseId}-${date}-${score}`,
    courseId,
    name: `t-${date}`,
    score,
    maxScore,
    weight: 1,
    category: "test",
    date,
  };
}

describe("computeTrendInfo — All terms uses subject's full task history", () => {
  it("derives Δ from allDone (not done) when isAllTerms=true and there is no prev term", () => {
    // done is empty (no active term filter) but allDone spans multiple terms.
    const allDone = [
      mk("math", "2025-01-10", 50),
      mk("math", "2025-02-10", 60),
      mk("math", "2025-06-10", 80),
      mk("math", "2025-07-10", 90),
    ];
    const info = computeTrendInfo({
      hasData: true,
      hasPrevData: false,
      avg: 70,
      prevAvg: 0,
      done: allDone, // in "All terms" view, done === allDone in real usage
      allDone,
      isAllTerms: true,
      weighted: false,
    });
    expect(info.mode).toBe("all-history");
    // earlier=[50,60] (avg 55), later=[80,90] (avg 85) → Δ = +30
    expect(info.delta).toBeCloseTo(30, 5);
    expect(info.sourceTasks).toHaveLength(4);
    // Tasks must come from allDone, in chronological order.
    expect(info.sourceTasks.map((t) => t.date)).toEqual([
      "2025-01-10",
      "2025-02-10",
      "2025-06-10",
      "2025-07-10",
    ]);
  });

  it("ignores `done` and only uses `allDone` for All terms — even if done is a smaller subset", () => {
    const allDone = [
      mk("eng", "2024-09-01", 40),
      mk("eng", "2024-10-01", 50),
      mk("eng", "2025-03-01", 70),
      mk("eng", "2025-04-01", 80),
    ];
    // Deliberately pass a misleading `done` that, if used, would yield Δ=0.
    const done = [mk("eng", "2025-04-01", 80)];
    const info = computeTrendInfo({
      hasData: true,
      hasPrevData: false,
      avg: 60,
      prevAvg: 0,
      done,
      allDone,
      isAllTerms: true,
      weighted: false,
    });
    expect(info.mode).toBe("all-history");
    // earlier=[40,50] avg 45 ; later=[70,80] avg 75 → +30
    expect(info.delta).toBeCloseTo(30, 5);
  });
});

describe("computeTrendInfo — other modes", () => {
  it("uses prev-term delta when previous-term data exists", () => {
    const info = computeTrendInfo({
      hasData: true,
      hasPrevData: true,
      avg: 82,
      prevAvg: 75,
      done: [],
      allDone: [],
      isAllTerms: false,
      weighted: false,
    });
    expect(info.mode).toBe("prev-term");
    expect(info.delta).toBeCloseTo(7, 5);
  });

  it("falls back to first-term-split when in a term with no previous and ≥2 tasks", () => {
    const done = [
      mk("sci", "2025-09-01", 60),
      mk("sci", "2025-09-10", 70),
      mk("sci", "2025-09-20", 80),
      mk("sci", "2025-09-30", 90),
    ];
    const info = computeTrendInfo({
      hasData: true,
      hasPrevData: false,
      avg: 75,
      prevAvg: 0,
      done,
      allDone: done,
      isAllTerms: false,
      weighted: false,
    });
    expect(info.mode).toBe("first-term-split");
    // earlier=[60,70] avg 65 ; later=[80,90] avg 85 → +20
    expect(info.delta).toBeCloseTo(20, 5);
  });

  it("returns insufficient (delta=null) when only 1 graded task exists and no prev term", () => {
    const done = [mk("sci", "2025-09-01", 60)];
    const info = computeTrendInfo({
      hasData: true,
      hasPrevData: false,
      avg: 60,
      prevAvg: 0,
      done,
      allDone: done,
      isAllTerms: false,
      weighted: false,
    });
    expect(info.mode).toBe("insufficient");
    expect(info.delta).toBeNull();
  });

  it("returns no-data when hasData is false", () => {
    const info = computeTrendInfo({
      hasData: false,
      hasPrevData: false,
      avg: 0,
      prevAvg: 0,
      done: [],
      allDone: [],
      isAllTerms: true,
      weighted: false,
    });
    expect(info.mode).toBe("no-data");
    expect(info.delta).toBeNull();
  });

  it("exposes a human-readable caption for every mode", () => {
    for (const m of [
      "prev-term",
      "all-history",
      "first-term-split",
      "insufficient",
      "no-data",
    ] as const) {
      expect(TREND_MODE_CAPTION[m]).toMatch(/\S/);
    }
  });
});