export type Bullets = [string, string, string, string, string];
export type Bracket = { min: number; max: number; bullets: Bullets };

/**
 * Strict continuous-tier lookup. Returns the bracket whose [min,max]
 * inclusively contains `value`. Clamps to the top bracket if value
 * exceeds the highest tier (fix for "flipped lookup glitch" where
 * high scores wrongly defaulted to the 1–4% tier).
 */
export function lookupBracket(arr: Bracket[], value: number): Bracket {
  const sorted = [...arr].sort((a, b) => b.min - a.min);
  const v = Number(value);
  const hit = sorted.find((b) => v >= b.min && v <= b.max);
  if (hit) return hit;
  if (v > sorted[0].max) return sorted[0];
  return sorted[sorted.length - 1];
}

/**
 * 25-tier 4%-wide main grade brackets — preserved verbatim from the
 * original report-card text engine. Do NOT shorten or remove copy here.
 */
export const BRACKETS: Bracket[] = [
  // === injected from original AcademicFeedback BRACKETS array ===
];

/**
 * 23-tier B2 (Grade Trends) pool. Lookup key is the delta between the
 * current term's weighted average and the previous term's weighted
 * average. Tone shifts from "WARNING / urgent reset" at the bottom to
 * "celebratory leap forward" at the top.
 */
export const TREND_BRACKETS: Bracket[] = [
  mkTrend(-100, -50.01, "WARNING: The student's academic trajectory has collapsed by more than fifty percentage points this term. This is a critical-emergency level shift that demands immediate intervention, a complete reset of study habits, and active pastoral and family involvement to arrest the decline."),
  mkTrend(-50, -45.01, "WARNING: Performance has fallen by 45–50 points relative to the previous term — a severe and highly concerning downward trajectory. Urgent diagnostic conferencing and a structured recovery plan are required without delay."),
  mkTrend(-45, -40.01, "WARNING: A drop of 40–45 points indicates a sharp and alarming reversal of prior achievement. Immediate intervention with the subject teacher and a revised weekly study schedule are absolutely required."),
  mkTrend(-40, -35.01, "WARNING: The trajectory shows a serious 35–40 point regression this term. This level of decline is not self-correcting and demands urgent, structured remediation."),
  mkTrend(-35, -30.01, "Performance has regressed by 30–35 points, signaling a severe negative trend. Targeted intervention and a renegotiated revision routine are required to stop further slippage."),
  mkTrend(-30, -25.01, "A 25–30 point decline this term indicates a significant and worrying loss of momentum. The student must urgently re-engage with feedback and core revision practice."),
  mkTrend(-25, -20.01, "The student's average has dropped by 20–25 points compared to the previous term, a major and concerning regression. Immediate reset of study habits is required to reverse this trajectory."),
  mkTrend(-20, -15.01, "A 15–20 point decline marks a clear and notable downward shift in performance. Structured re-engagement with revision and feedback cycles is needed promptly."),
  mkTrend(-15, -10.01, "Performance has slipped by 10–15 points this term, indicating a meaningful negative trend. The student should review their study routine and act on returned feedback more deliberately."),
  mkTrend(-10, -5.01, "A mild 5–10 point decline this term suggests a small but real loss of momentum. A modest tightening of study habits should be enough to halt and reverse the slide."),
  mkTrend(-5, -0.01, "Performance has dipped slightly compared to the previous term, under five points. The trend is minor but worth monitoring with sharper focus on weaker topics."),
  mkTrend(0, 0, "The student's average has held exactly steady relative to the previous term. Consistency is positive, but a deliberate next-step study target is now needed to convert stability into growth."),
  mkTrend(0.01, 4.99, "A small but positive shift of under five points marks early upward movement this term. Sustained study habits should consolidate this into a more decisive improvement next cycle."),
  mkTrend(5, 9.99, "Performance has improved by 5–10 points compared to the previous term, reflecting steady academic progress and clearly positive momentum. Maintain this trajectory by continuing current revision routines."),
  mkTrend(10, 14.99, "A solid 10–15 point gain this term indicates strong, encouraging academic growth. The student should be commended for sustained, deliberate effort."),
  mkTrend(15, 19.99, "Performance has jumped by 15–20 points — a substantial and very positive improvement. This signals effective study strategies and growing confidence with the material."),
  mkTrend(20, 24.99, "The student has made an outstanding, highly impressive leap forward this term, gaining 20–25 points and displaying incredible determination and a stellar shift in work momentum."),
  mkTrend(25, 29.99, "A remarkable 25–30 point surge this term reflects exceptional commitment and a transformative shift in academic engagement. This is a genuinely celebratory result."),
  mkTrend(30, 34.99, "An extraordinary 30–35 point improvement places the student on a powerful upward arc. This level of progress is rare and reflects truly disciplined effort."),
  mkTrend(35, 39.99, "A spectacular 35–40 point gain this term is a standout achievement. The student's growth deserves the highest commendation."),
  mkTrend(40, 44.99, "An exceptional 40–45 point improvement marks a complete transformation of academic trajectory. This is elite-level growth, sustained and rewarded by visible mastery."),
  mkTrend(45, 49.99, "A near-historic 45–50 point gain reflects extraordinary determination and total recalibration of study habits. The student should be celebrated for this dramatic shift."),
  mkTrend(50, 100, "A monumental 50+ point leap forward this term is among the most dramatic positive trajectories possible. This is a stellar, celebratory result reflecting exceptional resilience and momentum."),
];

/**
 * 20-tier B3 (Completion / Responsibility) pool. Lookup key is the
 * student's task-completion percentage. Continuous 5% steps from 100% to 0%.
 */
export const COMPLETION_BRACKETS: Bracket[] = [
  mkComp(95, 100, "Task completion is exemplary, with virtually every assigned piece submitted on time and to full rubric specification. This level of reliability reflects elite ownership of academic responsibility."),
  mkComp(90, 94.99, "Completion sits at an excellent 90–95%, with deadlines almost always met and follow-through on feedback consistently strong. Responsibility habits are firmly embedded."),
  mkComp(85, 89.99, "A strong completion rate of 85–90% reflects dependable submission habits and mature self-management. Minor lapses should be tightened to push into the elite band."),
  mkComp(80, 84.99, "Completion of 80–85% is solid and largely reliable, though a small number of missed tasks remain. Sharper deadline tracking will lift this into the highest tier."),
  mkComp(75, 79.99, "A 75–80% completion rate is acceptable but reveals an emerging pattern of missed work. The student should adopt a written deadline tracker to close these gaps."),
  mkComp(70, 74.99, "Completion at 70–75% indicates inconsistent submission discipline, with a notable share of work outstanding. A structured weekly review of pending tasks is now needed."),
  mkComp(65, 69.99, "A 65–70% completion rate signals a meaningful responsibility gap. The student must prioritize clearing backlog and reinstating reliable submission routines."),
  mkComp(60, 64.99, "Completion of 60–65% reflects weak follow-through, with too many assignments missed or late. Direct teacher check-ins and a daily task log are recommended."),
  mkComp(55, 59.99, "At 55–60% completion, academic responsibility is significantly underdeveloped. A structured intervention plan with explicit daily targets is now required."),
  mkComp(50, 54.99, "Completion at 50–55% indicates that nearly half of expected work is not being submitted. This represents a serious responsibility concern requiring immediate corrective action."),
  mkComp(45, 49.99, "A 45–50% completion rate reflects a major collapse in submission discipline. Teacher, tutor, and family coordination are warranted to rebuild basic routines."),
  mkComp(40, 44.99, "At 40–45% completion, the majority of work is going unfinished. This is a critical responsibility failure that demands urgent structured intervention."),
  mkComp(35, 39.99, "Completion of 35–40% signals near-total breakdown of academic responsibility. A formal recovery plan with daily supervised study is essential."),
  mkComp(30, 34.99, "A 30–35% completion rate represents a severe responsibility crisis. Pastoral involvement and a comprehensive scaffolded plan are required."),
  mkComp(25, 29.99, "At 25–30% completion, academic engagement has effectively collapsed. Emergency-level intervention from teachers, tutors, and family is necessary."),
  mkComp(20, 24.99, "Completion of 20–25% indicates that the student is no longer operating within any functional submission framework. Immediate institutional response is required."),
  mkComp(15, 19.99, "A 15–20% completion rate represents the near-complete absence of academic responsibility. Full structured intervention must begin without delay."),
  mkComp(10, 14.99, "At 10–15% completion, almost no assigned work is being submitted. This is a top-tier academic emergency requiring the most intensive available support."),
  mkComp(5, 9.99, "A 5–10% completion rate reflects total collapse of submission behavior. Emergency procedures must be invoked with pastoral and family coordination."),
  mkComp(0, 4.99, "Completion under 5% indicates that essentially no work is being submitted. This is the most severe responsibility failure category and demands immediate, comprehensive emergency intervention."),
];

function mkTrend(min: number, max: number, sentence: string): Bracket {
  return { min, max, bullets: [sentence, sentence, sentence, sentence, sentence] as Bullets };
}
function mkComp(min: number, max: number, sentence: string): Bracket {
  return { min, max, bullets: [sentence, sentence, sentence, sentence, sentence] as Bullets };
}