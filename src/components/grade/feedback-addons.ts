// Universal feedback addon pool (B1..B5 add-ons + new B6 Future Outlook).
// Continuous 5% increment lookup across 0–100. Each tier returns six
// fully-formed sentences that are APPENDED to the existing bracket
// bullets — they do not replace any prior text.

import { lookupBracket, type Bracket } from "./feedback-data";

type Tier = "high" | "steady" | "urgent";

const POOL: Record<Tier, [string, string, string, string, string, string]> = {
  high: [
    "Strengths: Exhibits an elite conceptual grasp of material, consistently executing advanced problem-solving methodologies with outstanding structural precision and clarity.",
    "Trends: Consistently maintains an optimal performance trajectory across consecutive assessment blocks, displaying a tight, minimal score variance under pressure.",
    "Engagement: Displays exemplary self-regulation and an outstanding, proactive attitude, routinely taking independent initiative to elevate group dynamics and discourse.",
    "Commendation: Commended for demonstrating an elite degree of academic independence, routinely seeking out advanced concepts and setting an exemplary benchmark for analytical precision.",
    "Action Item: To further cultivate their advanced skillset, the student should focus on exploring non-routine edge cases and mentoring peers through complex workflows to safely lock in this top tier long-term.",
    "Future Outlook: Looking ahead, the student possesses the cognitive tools and work ethic required to excel in advanced, higher-level elective criteria. The primary focus moving forward is to maintain this stellar academic momentum across upcoming final terms.",
  ],
  steady: [
    "Strengths: Demonstrates a dependable and highly structured approach to daily tasks, consistently applying core methodologies accurately during routine classroom assessments.",
    "Trends: Tracks a steady, upward growth vector over the term, successfully eliminating old error patterns through systematic review and steady work pacing.",
    "Engagement: Maintains a reliable, highly organized workflow during independent study periods, consistently delivering solid contributions that align with criteria.",
    "Commendation: Commended for maintaining a highly dependable, organized work ethic and showing clear receptive growth when applying constructive suggestions.",
    "Action Item: The student should focus on tightening technical precision under timed conditions. Utilizing local tracking tools to review past error patterns before major assessments will bridge the remaining gap.",
    "Future Outlook: The student is well-positioned to break into the top performance bracket in the subsequent term. Solidifying foundational definitions over the break and entering the next unit with high confidence will unlock this trajectory.",
  ],
  urgent: [
    "Strengths: Displays distinct flashes of creative thinking and genuine resilience when tackling difficult concepts head-on during practical application sessions.",
    "Trends: Performance trends show a notable degree of volatility, frequently experiencing bottlenecks due to uneven preparation or delayed task completions.",
    "Engagement: Struggles to engage with material independently, frequently falling behind due to a lack of class preparation or hesitation during practical execution blocks.",
    "Commendation: Commended for showing authentic resilience and a positive attitude during targeted instruction periods, providing an excellent foundation to build upon.",
    "Action Item: Immediate priority must be placed on establishing a structured daily assignment logging routine and breaking large projects down into clear checklist items to reverse this trend.",
    "Future Outlook: A comprehensive academic reset is highly achievable for the upcoming term. By strictly binding their workflow to the Pomodoro timer widget and completing prerequisite checks, the student can confidently aim for a complete upward grade correction.",
  ],
};

function tierFor(min: number): Tier {
  if (min >= 92) return "high";
  if (min >= 60) return "steady";
  return "urgent";
}

// Build 20 continuous 5%-wide tiers (0–4.99, 5–9.99, ..., 95–100).
function buildTiers(): Bracket[] {
  const out: Bracket[] = [];
  for (let i = 0; i < 20; i++) {
    const min = i * 5;
    const max = i === 19 ? 100 : min + 4.99;
    const t = tierFor(min);
    const base = POOL[t];
    const bullets = base.map((line) => line) as unknown as [
      string, string, string, string, string,
    ];
    // Bracket type only declares 5 bullets; we stash the 6th via a parallel
    // array indexed identically. Keep both in lockstep.
    out.push({ min, max, bullets });
  }
  return out;
}

export const ADDON_BRACKETS: Bracket[] = buildTiers();

// Parallel pool for the 6th bullet (Future Outlook), keyed by the same
// 5% tier ladder so a single lookup powers both arrays.
export const ADDON_B6: { min: number; max: number; text: string }[] = (() => {
  const out: { min: number; max: number; text: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const min = i * 5;
    const max = i === 19 ? 100 : min + 4.99;
    const t = tierFor(min);
    out.push({ min, max, text: POOL[t][5] });
  }
  return out;
})();

export function addonBulletsFor(pct: number): {
  b1: string; b2: string; b3: string; b4: string; b5: string; b6: string;
} {
  const bracket = lookupBracket(ADDON_BRACKETS, pct);
  const six = ADDON_B6.find((r) => pct >= r.min && pct <= r.max)
    ?? ADDON_B6[ADDON_B6.length - 1];
  return {
    b1: bracket.bullets[0],
    b2: bracket.bullets[1],
    b3: bracket.bullets[2],
    b4: bracket.bullets[3],
    b5: bracket.bullets[4],
    b6: six.text,
  };
}
