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
  if (v >= sorted[0].max) return sorted[0];
  // Snap to the highest bracket whose min is ≤ value. This handles
  // fractional scores that fall in the gap between integer-wide tiers
  // (e.g. 96.3 between 93–96 and 97–100) without dropping to the lowest.
  const hit = sorted.find((b) => v >= b.min);
  return hit ?? sorted[sorted.length - 1];
}

/**
 * 25-tier 4%-wide main grade brackets — preserved verbatim from the
 * original report-card text engine. Do NOT shorten or remove copy here.
 */
export const BRACKETS: Bracket[] = [
  { min: 97, max: 100, bullets: [
    "The student exhibits complete and authoritative command of every concept presented across the course, integrating advanced ideas with extraordinary precision and depth. Their explanations consistently surpass the expected rubric ceiling, revealing original interpretations and sophisticated analytical reasoning. This level of mastery places them firmly among the highest-performing learners observed at this stage.",
    "Their performance trajectory is unwavering at the absolute apex of the scale, sustaining flawless or near-flawless outcomes across every assessment instrument. There is no observable variance or regression, indicating total internalization of the subject framework. This near-perfect stability demonstrates an exemplary calibration between effort, comprehension, and execution.",
    "Every submitted task reflects elite craftsmanship, with meticulous structure, polished presentation, and exhaustive evidence of independent extension work. They routinely exceed minimum requirements, supplying enriched commentary, additional research, and refined synthesis. Such consistent excellence sets a definitive benchmark for peers in the classroom.",
    "Demonstrates impeccable ownership of all academic responsibilities, submitting work ahead of schedule with complete documentation and full procedural compliance. Their self-management is faultless, treating every deadline as an opportunity to refine rather than merely complete their output.",
    "To preserve this elite standing, channel additional effort into stretch challenges, competition-level questions, and university-style extension reading. Continuing to push beyond the syllabus will safeguard the A* boundary and cultivate deeper mastery for future advanced study.",
  ]},
  { min: 93, max: 96, bullets: [
    "The student displays exceptionally strong command of the curriculum, handling advanced material with confident accuracy and well-developed conceptual reasoning. Their work shows sharp insight and a refined ability to articulate nuanced relationships between ideas. This consistently high level of comprehension marks them as a clear top-tier performer.",
    "Performance metrics remain extremely high with only the smallest fluctuations between assessments, indicating sustained excellence rather than occasional brilliance. The trend line shows tight clustering at the upper band of the grading distribution. Such reliability reflects mature study habits and confident retention of prior content.",
    "Submissions are polished, thoroughly evidenced, and aligned precisely with the highest descriptors of the marking rubric. Each task demonstrates careful planning, clean presentation, and an evident pride in academic craftsmanship. Their willingness to refine work before submission underpins their elevated standing.",
    "Maintains outstanding responsibility for personal learning, organizing materials, deadlines, and revision cycles without external prompting. They proactively seek clarification when uncertainty arises, ensuring no gap is left unresolved before assessment.",
    "To convert near-mastery into full mastery, target the few residual error patterns in advanced application questions and refine answer structure under timed conditions. Sustained micro-improvements at this band reliably push outcomes into the A* threshold above 91%.",
  ]},
  { min: 89, max: 92, bullets: [
    "The student shows strong, well-rounded understanding of core and extended concepts, applying them accurately across diverse task formats. Their reasoning is clear, structured, and supported by relevant evidence drawn from across the syllabus. This solid analytical foundation enables confident engagement with progressively harder material.",
    "The performance trajectory is stable and firmly positioned in the upper achievement band, with consistent results across recent assessment cycles. Minor variances are quickly recovered through targeted review rather than persisting as weaknesses. The overall trend reflects entrenched competence and dependable execution.",
    "Work is well-researched, neatly structured, and aligned closely with rubric expectations for high-tier responses. Assignments show evident planning, careful editing, and a disciplined approach to academic presentation. Their consistent effort highlights a genuine commitment to maximizing classroom outcomes.",
    "Demonstrates strong personal accountability, meeting deadlines reliably and tracking rubric criteria carefully before submission. Independent study schedules are managed maturely, with proactive review of feedback after each task.",
    "Focus targeted revision on the structural principles behind the lowest-scoring questions and re-examine past execution errors. Closing these small gaps will lift performance cleanly toward the A* boundary above 91%.",
  ]},
  { min: 85, max: 88, bullets: [
    "The student demonstrates confident and capable understanding of nearly all curriculum content, applying concepts accurately in standard task formats. Their explanations are coherent and well-supported, though the very highest-tier extension questions occasionally reveal minor gaps. Overall comprehension remains firmly within the high-achiever range.",
    "Recent results have been consistently strong, sitting comfortably above the class median with only occasional dips on the most demanding tasks. The trend indicates dependable performance rather than dramatic peaks or troughs. This stable pattern reflects well-established study routines.",
    "Submissions are thorough, organized, and meet most upper-band rubric descriptors with clear evidence of preparation. Tasks show good editing discipline and a steady commitment to presentation quality. Continued attention to detail reinforces a strong academic profile.",
    "Manages responsibilities with maturity, meeting deadlines and completing required materials without prompting. Tracks progress proactively and responds positively to feedback in subsequent submissions.",
    "Target the specific high-tier exam techniques and extended-response structures that currently cap performance just below the highest band. Sharpening these advanced skills will convert reliable A-range work into top-band outcomes.",
  ]},
  { min: 81, max: 84, bullets: [
    "The student shows solid command of core curriculum concepts and applies standard techniques accurately across most task formats. Analytical depth is developing well, though extended-response questions sometimes lack the full sophistication of higher-band responses. The overall foundation is strong and ready for further refinement.",
    "Performance has been steady within the high-achievement band, with predictable results across multiple assessment cycles. Variance between tasks is small, indicating consistent preparation and reliable recall. The trajectory points toward continued upward movement with focused effort.",
    "Work is well-prepared, generally well-structured, and addresses the main rubric criteria with clear competence. Presentation is tidy and submissions reflect a healthy work ethic. Sustained attention to upper-band descriptors will strengthen overall outcomes.",
    "Maintains good ownership of academic responsibilities, submitting work on time and engaging constructively with teacher feedback. Independent organization of notes and revision is largely effective.",
    "Concentrate revision on the analytical depth and command terms that distinguish A-band responses from B-band ones. Practicing higher-order question types will systematically push results above the 85% threshold.",
  ]},
  { min: 77, max: 80, bullets: [
    "The student demonstrates secure understanding of most foundational concepts and can apply them accurately to familiar problem types. Less-familiar contexts occasionally expose minor reasoning gaps, but core comprehension remains dependable. There is clear evidence of genuine engagement with the subject material.",
    "Results sit consistently within the upper-middle achievement band, with only modest fluctuations between assessment cycles. The trend is steady rather than rapidly ascending, suggesting that further growth requires targeted intervention. Reliability of execution remains a positive feature.",
    "Submissions are competent and address the central rubric requirements with reasonable clarity and structure. Presentation is acceptable, though additional polish and evidence would lift work into higher bands. The student takes visible pride in their academic output.",
    "Generally responsible with deadlines and required materials, though occasional lapses in revision depth are evident. Responds positively when prompted to engage more thoroughly with feedback.",
    "Prioritize deliberate practice on the question types that consistently underperform, and rehearse rubric-aligned structures under timed conditions. These focused gains will move outcomes toward the low-A band.",
  ]},
  { min: 73, max: 76, bullets: [
    "The student understands the majority of core curriculum content and can apply standard techniques to routine questions with reasonable accuracy. Conceptual depth is moderate, with extended-response tasks sometimes lacking developed reasoning. The foundation is workable and supports further academic progress with focused effort.",
    "Performance has been broadly stable within the upper-middle band, with some variability between stronger and weaker units. The trend is neither rising nor falling sharply, indicating a plateau that responds to targeted intervention. Consistency of effort is the primary lever for growth.",
    "Work is generally complete and addresses the main rubric points, though structural refinement and evidential depth remain inconsistent. Presentation standards meet baseline expectations with room to elevate. There is a clear willingness to engage with subject content.",
    "Meets most deadlines and submits required tasks, though occasional gaps in self-checking and revision discipline appear. Engages with feedback when explicitly directed to specific improvements.",
    "Focus on building stronger answer scaffolds for extended-response tasks and on reviewing the conceptual links between weaker units. Disciplined practice in these areas will steadily lift outcomes into the high-B band.",
  ]},
  { min: 69, max: 72, bullets: [
    "The student shows a solid working grasp of foundational concepts and is steadily building command of more advanced material. Procedural questions are handled confidently, and analytical reasoning is developing in encouraging ways. With continued effort, deeper mastery is well within reach.",
    "Recent results sit reliably in the upper-middle band, signaling consistency and a strong base to grow from. The trajectory is stable, which is a real strength — small targeted shifts in study habits will translate quickly into upward movement. Momentum is on the student's side.",
    "Submissions consistently address the central rubric requirements and show genuine care in preparation. Adding a little more development and evidence to each task will lift work into the next band. The willingness to engage is clearly present.",
    "Meets most submission deadlines and engages positively with feedback when prompted. With slightly more independent follow-through, self-management will become a real personal strength.",
    "Build a short, structured weekly revision routine focused on the recurring weak topics. Pairing this with rubric-aligned answer practice will steadily lift performance toward the high-B range.",
  ]},
  { min: 65, max: 68, bullets: [
    "The student has a clear grasp of the broad outlines of the syllabus and a workable command of many detailed concepts. Routine procedural tasks are handled well, and there is real potential to extend this into higher-order questions with focused practice. The foundation is solid and ready to grow.",
    "Performance shows a steady middle-band pattern with clear strengths on familiar topics. Small, deliberate shifts in study approach will unlock the next level — the capacity is clearly there. Treat this as a launchpad, not a ceiling.",
    "Work addresses the central rubric criteria reliably and reflects honest effort. Adding stronger reasoning and a little more supporting evidence will be the key to lifting submissions into a higher band. Progress here is very achievable.",
    "Generally meets deadlines and shows growing ownership of academic responsibilities. Sharpening the habit of revisiting feedback in detail will pay off quickly.",
    "Focus revision time on the two weakest units and rehearse extended-response structures regularly. These targeted, manageable gains will lead naturally into the B band.",
  ]},
  { min: 61, max: 64, bullets: [
    "The student has built a workable baseline of knowledge across the syllabus and is developing genuine understanding of underlying frameworks. Procedural questions are handled with reasonable accuracy, and analytical depth is growing with practice. The trajectory is one of steady development.",
    "Recent performance shows a stable middle-band pattern with clear room to climb. Small, consistent adjustments to preparation will translate quickly into more reliable outcomes. The potential to push higher is clearly present.",
    "Submissions meet most baseline rubric requirements and reflect honest engagement. Investing a little extra time in planning and editing will start extending work into higher-band territory. Real progress is well within reach.",
    "Deadlines are usually met and the student is building stronger self-management habits. A slightly more deliberate routine around feedback will accelerate growth noticeably.",
    "Set aside a short weekly slot to diagnose the weakest topics and rehearse rubric-aligned responses. Steady, focused practice here will lift outcomes toward the upper C and lower B bands.",
  ]},
  { min: 57, max: 60, bullets: [
    "The student has a developing understanding of core curriculum concepts and shows real capacity to handle familiar tasks. With a little more practice in less familiar contexts, comprehension will become much steadier. The foundation is forming and ready to be reinforced.",
    "Performance has held in the lower-middle band, which provides a useful base to grow from. Small, regular adjustments to study habits will produce visible gains over the next few cycles. Stabilizing and then building is a very realistic goal.",
    "Submissions cover the most basic rubric criteria and demonstrate willingness to engage. A modest increase in planning and editing time will noticeably improve quality. Each task is an opportunity to take a small step forward.",
    "Submission punctuality is becoming more consistent, and feedback engagement is developing. Building a simple weekly checklist will strengthen independence quickly.",
    "Commit to a short, structured study schedule with one clear daily target on the weakest curriculum area. Combined with rubric-aligned practice, this will produce measurable, encouraging upward movement.",
  ]},
  { min: 53, max: 56, bullets: [
    "The student has a developing grasp of foundational curriculum content and shows clear potential to build on it. Concept application is becoming more accurate with practice, and extended responses are starting to take shape. With steady support, the underlying knowledge base will consolidate well.",
    "Recent results have clustered in the lower-middle band, which gives a clear starting line for growth. Adjusting study habits in small, deliberate ways will improve reliability over time. The capacity for upward movement is genuinely there.",
    "Submissions partially address rubric requirements and show willingness to engage with each task. Adding a planning step and a quick self-check before submitting will lift quality noticeably. Each refinement is real progress.",
    "Deadlines are being met more regularly, and engagement with feedback is improving. Adopting a simple study routine will accelerate the development of independent self-management.",
    "Build a consistent revision routine focused on the most fundamental curriculum knowledge. Pair this with regular rubric-aligned task practice to move performance back toward the C band.",
  ]},
  { min: 49, max: 52, bullets: [
    "The student is beginning to build understanding of core curriculum content, and there are clear moments of insight to grow from. Procedural fluency is developing, and analytical reasoning will strengthen with focused practice. A workable academic foundation is within reach with steady effort.",
    "Performance sits near the pass/fail boundary, which makes the next few weeks a real opportunity to push upward. Small, consistent changes in study habits will translate quickly into more reliable outcomes. Momentum is achievable with the right routine.",
    "Submissions are sometimes incomplete, but each completed task shows the student can engage when supported. Building a habit of finishing and self-checking will lift quality significantly. Each step forward counts.",
    "Deadline reliability is developing, and engagement with feedback is starting to grow. A simple checklist and a regular study slot will strengthen independence quickly.",
    "Adopt a supportive remediation plan with the teacher focused on rebuilding the weakest units. Short daily revision sessions combined with rubric practice will produce steady, encouraging recovery.",
  ]},
  { min: 45, max: 48, bullets: [
    "The student is in the early stages of building command of core curriculum content, and supported practice will make a real difference. Routine application is developing, and higher-order reasoning will follow with structured guidance. Baseline competence is a very reachable next step.",
    "Recent results have clustered in the lower band, which provides a clear, honest starting line. Even modest changes in approach will produce visible gains over the coming cycles. There is genuine room and time to grow.",
    "Submissions are starting to take shape but often miss key components. Working through one task at a time with a planning step will quickly lift quality. Each completed piece is a real win.",
    "Deadlines are sometimes missed, but a simple weekly plan will make a meaningful difference. Engaging more actively with returned feedback will accelerate growth.",
    "Begin a focused recovery program with clear weekly micro-goals on the most fundamental skills. Active teacher or tutor support will protect progress and build steady confidence.",
  ]},
  { min: 41, max: 44, bullets: [
    "The student shows recall of some foundational content and the early building blocks of application. With scaffolded practice, procedural accuracy and analytical depth will steadily grow. Rebuilding competence is a realistic and achievable goal.",
    "Performance has been in the lower band, which makes this an important window for a fresh, supportive routine. Small wins compound quickly at this stage, and a clear plan will produce visible movement. Growth is genuinely possible.",
    "Submissions are sometimes incomplete, but every attempt is an opportunity to practice the habits that lift outcomes. Focusing on finishing one task fully before moving on will build momentum. Progress builds from small consistent steps.",
    "Deadlines need more consistent attention, and a simple visual planner will help. Building the habit of acting on feedback even in a small way each week will pay off.",
    "Establish a teacher-supported recovery plan focused on the most basic curriculum skills first. Short, frequent revision sessions paired with rubric-guided practice will steadily move outcomes upward.",
  ]},
  { min: 37, max: 40, bullets: [
    "The student presents only sparse and unreliable knowledge of core curriculum content. Most assessment items reveal significant misconceptions or missing prerequisites. Comprehensive foundational re-teaching is required to begin meaningful academic recovery.",
    "Recent performance has remained well within the failing band with no measurable upward trend. The trajectory indicates a serious risk of continued underachievement. Immediate structured intervention is warranted.",
    "Submissions are typically incomplete, late, or absent, and rarely reflect any planning or revision effort. Rubric alignment is largely missing. Fundamental change in task engagement is urgently required.",
    "Deadlines are consistently missed and feedback is not acted upon in any meaningful way. Personal academic self-management is currently non-functional and needs full external support.",
    "Initiate a formal recovery program with daily teacher-supported study targets focused on rebuilding prerequisite knowledge. Without this structured support, further decline is likely.",
  ]},
  { min: 33, max: 36, bullets: [
    "The student exhibits major gaps across nearly every area of the curriculum, with foundational misconceptions evident in most responses. Even routine procedural tasks are frequently mishandled. A full programmatic re-teaching of fundamentals is necessary.",
    "Performance has been persistently low across all recent assessment cycles, with no positive trajectory. The pattern indicates entrenched underachievement that will not self-correct. Urgent structured intervention is essential.",
    "Submitted work is rarely complete and usually fails to engage with the central rubric requirements. Presentation and effort quality are well below acceptable standards. Comprehensive change in academic engagement is required.",
    "Deadlines are habitually missed and feedback engagement is absent. Personal organization of study and materials requires complete external scaffolding.",
    "An urgent, fully supported recovery plan is required, ideally including teacher conferencing, tutoring, and structured daily study targets. Without this, sustained academic failure is the most likely outcome.",
  ]},
  { min: 29, max: 32, bullets: [
    "The student demonstrates very little reliable understanding of curriculum content, with foundational concepts largely absent from responses. Almost all assessment items reveal serious misconceptions. Intensive intervention focused on fundamentals is now critical.",
    "Recent results sit deeply within the failing band with no indication of recovery. The trajectory points toward continued deterioration without immediate action. Risk of long-term academic disengagement is high.",
    "Submissions are minimal, late, or missing, and reflect negligible preparation effort. Rubric alignment is essentially absent. Fundamental change in engagement is urgently needed.",
    "Deadlines are routinely unmet and feedback engagement is non-existent. Independent academic functioning is currently not in place.",
    "Engage immediately in a formally structured recovery program with daily supervised study and prerequisite skill rebuilding. Family and pastoral involvement are advisable to support this turnaround.",
  ]},
  { min: 25, max: 28, bullets: [
    "The student shows almost no functional grasp of core curriculum content, with responses lacking even baseline accuracy. Foundational prerequisites appear largely absent. A complete re-teaching of fundamentals is now required as an emergency priority.",
    "Performance has been continuously in the deep-failing band across all recent assessment cycles. The trajectory shows no upward signal whatsoever. Risk of permanent academic disengagement is acute.",
    "Submitted tasks are rare, incomplete, and demonstrate negligible effort. Presentation and rubric engagement are effectively absent. Immediate and substantive change is essential.",
    "Submission compliance has effectively collapsed, and feedback is not engaged with in any form. External academic scaffolding is now required on a daily basis.",
    "Initiate emergency academic intervention immediately, including teacher, tutor, and pastoral support. Sustained daily structured study under supervision is the minimum requirement for any recovery.",
  ]},
  { min: 21, max: 24, bullets: [
    "The student exhibits critical deficits across the curriculum, with responses showing little to no engagement with the subject material. Foundational knowledge appears effectively absent. Comprehensive re-teaching beginning from prerequisites is required.",
    "All recent assessment cycles have produced results in the critical-risk band with no recovery trend. The trajectory signals deepening disengagement. Urgent action is required to prevent terminal academic failure.",
    "Submitted work is sporadic, incomplete, and reflects no meaningful preparation. Rubric requirements are not addressed in any substantive way. Immediate intervention in academic engagement is essential.",
    "Deadline compliance and feedback engagement have effectively ceased. Independent academic functioning is non-existent and requires complete external support.",
    "Begin formal academic emergency procedures including supervised daily study, tutoring, and family engagement. Recovery is possible only with sustained and structured intervention.",
  ]},
  { min: 17, max: 20, bullets: [
    "The student demonstrates effectively no usable grasp of curriculum content, with responses showing pervasive confusion and missing foundations. The current academic state requires emergency-level remediation. Substantive re-teaching from baseline prerequisites is the only viable path forward.",
    "Performance has been entrenched in the critical-risk band across every recent assessment, with no positive signals. The trajectory indicates ongoing deterioration. Without immediate intervention, full academic failure is imminent.",
    "Submissions are largely absent or unusable, and rubric engagement is non-existent. Effort indicators suggest disengagement from the subject. A foundational change in approach is required immediately.",
    "Submission and feedback engagement have effectively collapsed. The student is no longer operating with any independent academic structure.",
    "Emergency academic intervention is required without delay, including daily supervised study, tutoring, and full pastoral and family support. Recovery requires a complete restart of academic routines.",
  ]},
  { min: 13, max: 16, bullets: [
    "The student presents no reliable evidence of curriculum understanding across recent assessments. Responses indicate fundamental gaps that extend well below the expected entry level. Full remedial reteaching from absolute basics is now mandatory.",
    "All recent results are deeply within the critical-failure band, with no upward trajectory whatsoever. The pattern indicates entrenched, advanced-stage academic disengagement. Without immediate, intensive intervention, terminal failure is the predicted outcome.",
    "Submissions are essentially absent and rubric engagement is entirely missing. There is no current evidence of meaningful task investment. Comprehensive change is required immediately.",
    "Deadline and feedback engagement have entirely ceased. The student is operating without any functional academic self-management.",
    "Implement emergency academic recovery procedures immediately, with daily supervised study, formal tutoring, and pastoral/family coordination. Recovery is possible only through total restructuring of academic routines.",
  ]},
  { min: 9, max: 12, bullets: [
    "The student demonstrates no functional engagement with the curriculum at this stage, with assessments revealing near-total absence of subject knowledge. The academic situation is critical and requires immediate large-scale intervention. Recovery will require sustained foundational reteaching.",
    "All recent assessment cycles have produced results at the extreme low end of the scale with no recovery signal. The trajectory signals total academic collapse. Immediate emergency action is the only viable response.",
    "Submissions are effectively non-existent and rubric engagement is wholly absent. There is no current evidence of academic effort. The situation demands immediate, comprehensive change.",
    "All forms of academic responsibility have effectively ceased. The student is not currently operating within a functional academic framework.",
    "Emergency intervention must begin immediately with full pastoral, teacher, tutor, and family involvement. Daily supervised study targeting absolute foundational skills is essential to any recovery effort.",
  ]},
  { min: 5, max: 8, bullets: [
    "The student shows essentially no engagement with curriculum content, and assessment responses contain no meaningful subject knowledge. This represents an extreme academic emergency requiring immediate intensive support. Reteaching must begin from the most basic prerequisites.",
    "All recent results are at the floor of the achievement scale with no recovery indicators whatsoever. The trajectory points to total disengagement. Without immediate intervention, sustained academic failure is certain.",
    "Submissions are absent and rubric engagement is completely missing. There is no detectable evidence of task preparation or effort. Comprehensive change is required without delay.",
    "Academic responsibility behaviors are entirely absent. The student is not currently functioning within any academic structure.",
    "Immediate emergency academic intervention is essential, involving teachers, tutors, pastoral staff, and family. Recovery requires a complete and supervised restart of academic routines and expectations.",
  ]},
  { min: 1, max: 4, bullets: [
    "The student demonstrates total absence of curriculum engagement, with assessments showing no usable academic content. The situation represents the most severe category of academic risk. Recovery requires immediate, intensive, and sustained foundational intervention.",
    "All recent performance metrics are at the absolute floor of the scale with no positive movement. The trajectory indicates complete academic collapse. Emergency response is the only appropriate action.",
    "Submissions are entirely absent and rubric engagement is non-existent. There is no current evidence of any academic effort. Comprehensive structural change is mandatory.",
    "All academic responsibility behaviors have effectively disappeared. The student is no longer operating within any functional academic system.",
    "Initiate the highest tier of academic emergency intervention immediately, with full institutional, pastoral, and family coordination. Without sustained supervised support, recovery from this position is not possible.",
  ]},
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