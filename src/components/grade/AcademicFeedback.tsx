import { useEffect, useMemo, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter, filterByTerm } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Printer, GraduationCap } from "lucide-react";

type Meta = {
  teachers: Record<string, string>;
  goals: Record<string, string>;
  prevLetters: Record<string, string>;
  manual: Record<string, string>;
  manualOn: Record<string, boolean>;
};

const META_KEY = "gradecalc-report-meta-v1";

const defaultMeta: Meta = {
  teachers: {},
  goals: {},
  prevLetters: {},
  manual: {},
  manualOn: {},
};

/**
 * 5-bullet report-card feedback engine.
 *
 * BRACKETS array spans 4% increments from 100% down to 4%.
 * Each bracket holds exactly 5 bullet strings (B1 Strengths, B2 Trends,
 * B3 Commendations, B4 Responsibility, B5 Improvement). Only the
 * 88%-91% bracket ships with concrete copy as the template model;
 * every other bracket is intentionally stubbed with empty strings so
 * the user can paste the remaining tier text manually later.
 *
 * IMPORTANT: positive trend logic — when the student's recent half
 * outperforms the earlier half (delta > 0), the bullet phrasing
 * must reflect positive growth, never a decline.
 */
type Bullets = [string, string, string, string, string];
type Bracket = { min: number; max: number; bullets: Bullets };

/**
 * 25-tier 4%-wide bracket map spanning 100% down to 1%.
 * Tiers: 97-100, 93-96.99, 89-92.99, 85-88.99, 81-84.99, 77-80.99, 73-76.99, 69-72.99,
 *        65-68.99, 61-64.99, 57-60.99, 53-56.99, 49-52.99, 45-48.99, 41-44.99, 37-40.99,
 *        33-36.99, 29-32.99, 25-28.99, 21-24.99, 17-20.99, 13-16.99, 9-12.99, 5-8.99, 1-4.99.
 * Each tier has 5 bullets: B1 Strengths, B2 Trends, B3 Commendations,
 * B4 Responsibility, B5 Actionable Improvement. Tone degrades step-by-step
 * from absolute mastery to critical academic risk.
 */
const BRACKETS: Bracket[] = [
  { min: 97, max: 100, bullets: [
    "The student exhibits complete and authoritative command of every concept presented across the course, integrating advanced ideas with extraordinary precision and depth. Their explanations consistently surpass the expected rubric ceiling, revealing original interpretations and sophisticated analytical reasoning. This level of mastery places them firmly among the highest-performing learners observed at this stage.",
    "Their performance trajectory is unwavering at the absolute apex of the scale, sustaining flawless or near-flawless outcomes across every assessment instrument. There is no observable variance or regression, indicating total internalization of the subject framework. This near-perfect stability demonstrates an exemplary calibration between effort, comprehension, and execution.",
    "Every submitted task reflects elite craftsmanship, with meticulous structure, polished presentation, and exhaustive evidence of independent extension work. They routinely exceed minimum requirements, supplying enriched commentary, additional research, and refined synthesis. Such consistent excellence sets a definitive benchmark for peers in the classroom.",
    "Demonstrates impeccable ownership of all academic responsibilities, submitting work ahead of schedule with complete documentation and full procedural compliance. Their self-management is faultless, treating every deadline as an opportunity to refine rather than merely complete their output.",
    "To preserve this elite standing, channel additional effort into stretch challenges, competition-level questions, and university-style extension reading. Continuing to push beyond the syllabus will safeguard the A* boundary and cultivate deeper mastery for future advanced study.",
  ]},
  { min: 93, max: 96.99, bullets: [
    "The student displays exceptionally strong command of the curriculum, handling advanced material with confident accuracy and well-developed conceptual reasoning. Their work shows sharp insight and a refined ability to articulate nuanced relationships between ideas. This consistently high level of comprehension marks them as a clear top-tier performer.",
    "Performance metrics remain extremely high with only the smallest fluctuations between assessments, indicating sustained excellence rather than occasional brilliance. The trend line shows tight clustering at the upper band of the grading distribution. Such reliability reflects mature study habits and confident retention of prior content.",
    "Submissions are polished, thoroughly evidenced, and aligned precisely with the highest descriptors of the marking rubric. Each task demonstrates careful planning, clean presentation, and an evident pride in academic craftsmanship. Their willingness to refine work before submission underpins their elevated standing.",
    "Maintains outstanding responsibility for personal learning, organizing materials, deadlines, and revision cycles without external prompting. They proactively seek clarification when uncertainty arises, ensuring no gap is left unresolved before assessment.",
    "To convert near-mastery into full mastery, target the few residual error patterns in advanced application questions and refine answer structure under timed conditions. Sustained micro-improvements at this band reliably push outcomes into the A* threshold above 91%.",
  ]},
  { min: 89, max: 92.99, bullets: [
    "The student shows strong, well-rounded understanding of core and extended concepts, applying them accurately across diverse task formats. Their reasoning is clear, structured, and supported by relevant evidence drawn from across the syllabus. This solid analytical foundation enables confident engagement with progressively harder material.",
    "The performance trajectory is stable and firmly positioned in the upper achievement band, with consistent results across recent assessment cycles. Minor variances are quickly recovered through targeted review rather than persisting as weaknesses. The overall trend reflects entrenched competence and dependable execution.",
    "Work is well-researched, neatly structured, and aligned closely with rubric expectations for high-tier responses. Assignments show evident planning, careful editing, and a disciplined approach to academic presentation. Their consistent effort highlights a genuine commitment to maximizing classroom outcomes.",
    "Demonstrates strong personal accountability, meeting deadlines reliably and tracking rubric criteria carefully before submission. Independent study schedules are managed maturely, with proactive review of feedback after each task.",
    "Focus targeted revision on the structural principles behind the lowest-scoring questions and re-examine past execution errors. Closing these small gaps will lift performance cleanly toward the A* boundary above 91%.",
  ]},
  { min: 85, max: 88.99, bullets: [
    "The student demonstrates confident and capable understanding of nearly all curriculum content, applying concepts accurately in standard task formats. Their explanations are coherent and well-supported, though the very highest-tier extension questions occasionally reveal minor gaps. Overall comprehension remains firmly within the high-achiever range.",
    "Recent results have been consistently strong, sitting comfortably above the class median with only occasional dips on the most demanding tasks. The trend indicates dependable performance rather than dramatic peaks or troughs. This stable pattern reflects well-established study routines.",
    "Submissions are thorough, organized, and meet most upper-band rubric descriptors with clear evidence of preparation. Tasks show good editing discipline and a steady commitment to presentation quality. Continued attention to detail reinforces a strong academic profile.",
    "Manages responsibilities with maturity, meeting deadlines and completing required materials without prompting. Tracks progress proactively and responds positively to feedback in subsequent submissions.",
    "Target the specific high-tier exam techniques and extended-response structures that currently cap performance just below the highest band. Sharpening these advanced skills will convert reliable A-range work into top-band outcomes.",
  ]},
  { min: 81, max: 84.99, bullets: [
    "The student shows solid command of core curriculum concepts and applies standard techniques accurately across most task formats. Analytical depth is developing well, though extended-response questions sometimes lack the full sophistication of higher-band responses. The overall foundation is strong and ready for further refinement.",
    "Performance has been steady within the high-achievement band, with predictable results across multiple assessment cycles. Variance between tasks is small, indicating consistent preparation and reliable recall. The trajectory points toward continued upward movement with focused effort.",
    "Work is well-prepared, generally well-structured, and addresses the main rubric criteria with clear competence. Presentation is tidy and submissions reflect a healthy work ethic. Sustained attention to upper-band descriptors will strengthen overall outcomes.",
    "Maintains good ownership of academic responsibilities, submitting work on time and engaging constructively with teacher feedback. Independent organization of notes and revision is largely effective.",
    "Concentrate revision on the analytical depth and command terms that distinguish A-band responses from B-band ones. Practicing higher-order question types will systematically push results above the 85% threshold.",
  ]},
  { min: 77, max: 80.99, bullets: [
    "The student demonstrates secure understanding of most foundational concepts and can apply them accurately to familiar problem types. Less-familiar contexts occasionally expose minor reasoning gaps, but core comprehension remains dependable. There is clear evidence of genuine engagement with the subject material.",
    "Results sit consistently within the upper-middle achievement band, with only modest fluctuations between assessment cycles. The trend is steady rather than rapidly ascending, suggesting that further growth requires targeted intervention. Reliability of execution remains a positive feature.",
    "Submissions are competent and address the central rubric requirements with reasonable clarity and structure. Presentation is acceptable, though additional polish and evidence would lift work into higher bands. The student takes visible pride in their academic output.",
    "Generally responsible with deadlines and required materials, though occasional lapses in revision depth are evident. Responds positively when prompted to engage more thoroughly with feedback.",
    "Prioritize deliberate practice on the question types that consistently underperform, and rehearse rubric-aligned structures under timed conditions. These focused gains will move outcomes toward the low-A band.",
  ]},
  { min: 73, max: 76.99, bullets: [
    "The student understands the majority of core curriculum content and can apply standard techniques to routine questions with reasonable accuracy. Conceptual depth is moderate, with extended-response tasks sometimes lacking developed reasoning. The foundation is workable and supports further academic progress with focused effort.",
    "Performance has been broadly stable within the upper-middle band, with some variability between stronger and weaker units. The trend is neither rising nor falling sharply, indicating a plateau that responds to targeted intervention. Consistency of effort is the primary lever for growth.",
    "Work is generally complete and addresses the main rubric points, though structural refinement and evidential depth remain inconsistent. Presentation standards meet baseline expectations with room to elevate. There is a clear willingness to engage with subject content.",
    "Meets most deadlines and submits required tasks, though occasional gaps in self-checking and revision discipline appear. Engages with feedback when explicitly directed to specific improvements.",
    "Focus on building stronger answer scaffolds for extended-response tasks and on reviewing the conceptual links between weaker units. Disciplined practice in these areas will steadily lift outcomes into the high-B band.",
  ]},
  { min: 69, max: 72.99, bullets: [
    "The student shows reasonable grasp of foundational concepts but demonstrates uneven command of more advanced material across the syllabus. Standard procedural questions are typically handled well, while application and analysis questions often expose unresolved misconceptions. Overall comprehension is functional but inconsistent.",
    "Recent results have hovered around the middle-upper achievement band with noticeable fluctuation between assessment cycles. The trajectory is essentially flat, indicating that current study habits sustain but do not advance performance. Consistency rather than ability is the limiting factor.",
    "Submissions cover the principal rubric requirements but frequently miss opportunities for deeper development and stronger evidence. Presentation is adequate yet would benefit from more careful editing. Engagement is present, though depth of preparation varies.",
    "Meets most submission deadlines but occasionally relies on prompting for revision, organization, and follow-through on feedback. Independent management of study time is developing but not yet fully consistent.",
    "Establish a structured weekly revision routine targeting the recurring weak units identified in recent feedback. Combined with rubric-aligned answer practice, this will steadily lift performance into the high-B range.",
  ]},
  { min: 65, max: 68.99, bullets: [
    "The student understands the broad outlines of the syllabus but demonstrates only partial command of detailed concepts and their applications. Routine procedural tasks are usually completed adequately, while higher-order questions expose persistent gaps in reasoning. The foundation supports further growth only with deliberate intervention.",
    "Performance has been variable within the middle achievement band, with stronger results on familiar topics and weaker ones on synthesis-style questions. The overall trend is essentially static, signaling a plateau that requires changed study habits to break. Reliability of output is presently a concern.",
    "Work generally addresses the central rubric criteria but lacks the developed reasoning and evidential support of higher bands. Presentation is acceptable, though structural and editorial refinement is needed. Effort is visible but inconsistent in depth.",
    "Submission punctuality is mostly satisfactory but slips occur, and engagement with returned feedback is sometimes superficial. Greater consistency in self-organization is required to support upward movement.",
    "Adopt a focused remediation plan on the weakest two units identified in recent assessments, and rehearse extended-response structures regularly. Closing these targeted gaps is the most efficient route into the B band.",
  ]},
  { min: 61, max: 64.99, bullets: [
    "The student has acquired baseline knowledge across the syllabus but shows uneven mastery of the underlying conceptual frameworks. Procedural questions are answered with mixed accuracy, while analytical questions frequently lack precision and depth. Overall understanding is developing but requires systematic strengthening.",
    "Recent performance sits within the middle achievement band with pronounced variation between assessment cycles. The trajectory is broadly flat, indicating that current preparation strategies are insufficient to advance outcomes. Inconsistency is currently the dominant performance signal.",
    "Submissions meet most baseline rubric requirements but rarely extend into higher-band territory in terms of analysis or evidence. Presentation standards are acceptable, though planning and editing are often rushed. There remains clear capacity for improvement with focused effort.",
    "Deadlines are usually met but with diminishing thoroughness, and engagement with feedback is inconsistent across submissions. Self-management of study time requires more deliberate structure.",
    "Implement a weekly diagnostic review of weakest topics and dedicate sustained revision time to those areas. Coupled with rubric-aligned practice, this approach will lift outcomes toward the upper C and lower B bands.",
  ]},
  { min: 57, max: 60.99, bullets: [
    "The student demonstrates partial understanding of core curriculum concepts with frequent gaps in application and analysis. Familiar procedural tasks are sometimes handled adequately, while less familiar contexts often produce confused or incomplete responses. The foundation requires significant strengthening to support upward progress.",
    "Performance has remained in the lower-middle achievement band over recent assessment cycles with notable inconsistency. The trend line is essentially flat or slightly declining, indicating that current effort levels are not producing measurable growth. Stabilization is the immediate priority.",
    "Submissions cover only the most basic rubric criteria, with limited evidence of planning, editing, or extension. Presentation quality is variable and often suggests rushed completion. Greater investment in each task is needed to lift outcomes.",
    "Submission punctuality is inconsistent, and engagement with returned feedback is intermittent at best. Independent organization of materials and revision time requires considerable strengthening.",
    "Commit to a structured study schedule with explicit daily targets for the weakest curriculum areas. Combined with active rehearsal of rubric-aligned responses, this will provide the foundation for measurable upward movement.",
  ]},
  { min: 53, max: 56.99, bullets: [
    "The student shows limited but identifiable understanding of foundational curriculum content. Application of concepts is frequently inaccurate, and extended-response tasks rarely reach the developed reasoning expected at this stage. Significant remediation is required to consolidate the underlying knowledge base.",
    "Recent results have clustered in the lower-middle achievement band with marked fluctuation. The trajectory does not indicate growth, suggesting that current study habits are insufficient and require substantive change. Performance reliability is presently low.",
    "Submissions partially address rubric requirements but commonly omit key components or lack supporting evidence. Presentation standards are inconsistent, with frequent indications of rushed or last-minute completion. Improvement requires a deliberate uplift in effort and planning.",
    "Deadlines are met irregularly, and feedback is often not acted upon between assessment cycles. Independent self-management of study time is underdeveloped and needs structured support.",
    "Establish a consistent revision routine focused on rebuilding the most fundamental curriculum knowledge. Pair this with regular rubric-aligned task practice to begin moving performance back toward the C band.",
  ]},
  { min: 49, max: 52.99, bullets: [
    "The student has gained only fragmentary understanding of core curriculum content, with frequent misconceptions across multiple units. Procedural fluency is unreliable, and analytical reasoning is generally underdeveloped. Substantial intervention is required to rebuild a workable academic foundation.",
    "Performance sits at the boundary between pass and fail bands with significant variability. The trajectory shows no clear sign of upward movement, indicating an entrenched plateau. Without changes to study habits, regression risk is realistic.",
    "Submissions are often incomplete or fail to meet baseline rubric expectations, with limited evidence of planning or revision. Presentation quality is generally poor. There is a clear and urgent need to elevate task investment.",
    "Deadlines are missed more frequently than is acceptable, and feedback is rarely acted upon meaningfully. Independent academic self-management is significantly underdeveloped.",
    "Adopt a structured remediation plan, ideally with teacher or tutor support, focused on rebuilding the weakest curriculum units. Daily short revision sessions combined with rubric practice are essential to begin recovery.",
  ]},
  { min: 45, max: 48.99, bullets: [
    "The student demonstrates very limited grasp of core curriculum content, with substantial gaps across most units. Application of concepts is unreliable even in routine contexts, and higher-order reasoning is largely absent. Comprehensive intervention is necessary to establish baseline competence.",
    "Recent results have clustered in the lower achievement band with persistent low performance across most assessment cycles. The trend is flat or declining, indicating that current strategies are insufficient. Immediate recalibration of approach is required.",
    "Submissions rarely meet baseline rubric expectations and frequently omit essential components. Presentation and evidence quality are well below the required standard. There is a pressing need for fundamental change in task preparation.",
    "Deadlines are frequently missed, and engagement with returned feedback is minimal or absent. Personal organization of study materials and revision time is largely ineffective.",
    "Begin a focused recovery program with explicit weekly micro-goals on the most fundamental skills. Engaging actively with teacher or tutor support is essential to prevent further regression.",
  ]},
  { min: 41, max: 44.99, bullets: [
    "The student shows fragmentary recall of foundational content but lacks reliable understanding of how to apply it. Procedural attempts frequently contain core errors, and analytical responses are largely undeveloped. Significant scaffolded remediation is required to begin rebuilding competence.",
    "Performance has stayed in the lower achievement band with little or no upward movement across recent assessment cycles. The trajectory indicates entrenchment rather than growth. Without intervention, sustained low performance is likely.",
    "Submissions are frequently incomplete and seldom reflect serious preparation effort. Presentation standards are poor and rubric alignment is minimal. Substantive change in approach is essential.",
    "Deadlines are routinely missed and feedback engagement is consistently weak. Independent academic responsibility requires direct support to develop.",
    "Establish a teacher-supported recovery plan focused on the most basic curriculum skills first. Short, frequent revision sessions combined with rubric-guided practice are necessary to move outcomes upward.",
  ]},
  { min: 37, max: 40.99, bullets: [
    "The student presents only sparse and unreliable knowledge of core curriculum content. Most assessment items reveal significant misconceptions or missing prerequisites. Comprehensive foundational re-teaching is required to begin meaningful academic recovery.",
    "Recent performance has remained well within the failing band with no measurable upward trend. The trajectory indicates a serious risk of continued underachievement. Immediate structured intervention is warranted.",
    "Submissions are typically incomplete, late, or absent, and rarely reflect any planning or revision effort. Rubric alignment is largely missing. Fundamental change in task engagement is urgently required.",
    "Deadlines are consistently missed and feedback is not acted upon in any meaningful way. Personal academic self-management is currently non-functional and needs full external support.",
    "Initiate a formal recovery program with daily teacher-supported study targets focused on rebuilding prerequisite knowledge. Without this structured support, further decline is likely.",
  ]},
  { min: 33, max: 36.99, bullets: [
    "The student exhibits major gaps across nearly every area of the curriculum, with foundational misconceptions evident in most responses. Even routine procedural tasks are frequently mishandled. A full programmatic re-teaching of fundamentals is necessary.",
    "Performance has been persistently low across all recent assessment cycles, with no positive trajectory. The pattern indicates entrenched underachievement that will not self-correct. Urgent structured intervention is essential.",
    "Submitted work is rarely complete and usually fails to engage with the central rubric requirements. Presentation and effort quality are well below acceptable standards. Comprehensive change in academic engagement is required.",
    "Deadlines are habitually missed and feedback engagement is absent. Personal organization of study and materials requires complete external scaffolding.",
    "An urgent, fully supported recovery plan is required, ideally including teacher conferencing, tutoring, and structured daily study targets. Without this, sustained academic failure is the most likely outcome.",
  ]},
  { min: 29, max: 32.99, bullets: [
    "The student demonstrates very little reliable understanding of curriculum content, with foundational concepts largely absent from responses. Almost all assessment items reveal serious misconceptions. Intensive intervention focused on fundamentals is now critical.",
    "Recent results sit deeply within the failing band with no indication of recovery. The trajectory points toward continued deterioration without immediate action. Risk of long-term academic disengagement is high.",
    "Submissions are minimal, late, or missing, and reflect negligible preparation effort. Rubric alignment is essentially absent. Fundamental change in engagement is urgently needed.",
    "Deadlines are routinely unmet and feedback engagement is non-existent. Independent academic functioning is currently not in place.",
    "Engage immediately in a formally structured recovery program with daily supervised study and prerequisite skill rebuilding. Family and pastoral involvement are advisable to support this turnaround.",
  ]},
  { min: 25, max: 28.99, bullets: [
    "The student shows almost no functional grasp of core curriculum content, with responses lacking even baseline accuracy. Foundational prerequisites appear largely absent. A complete re-teaching of fundamentals is now required as an emergency priority.",
    "Performance has been continuously in the deep-failing band across all recent assessment cycles. The trajectory shows no upward signal whatsoever. Risk of permanent academic disengagement is acute.",
    "Submitted tasks are rare, incomplete, and demonstrate negligible effort. Presentation and rubric engagement are effectively absent. Immediate and substantive change is essential.",
    "Submission compliance has effectively collapsed, and feedback is not engaged with in any form. External academic scaffolding is now required on a daily basis.",
    "Initiate emergency academic intervention immediately, including teacher, tutor, and pastoral support. Sustained daily structured study under supervision is the minimum requirement for any recovery.",
  ]},
  { min: 21, max: 24.99, bullets: [
    "The student exhibits critical deficits across the curriculum, with responses showing little to no engagement with the subject material. Foundational knowledge appears effectively absent. Comprehensive re-teaching beginning from prerequisites is required.",
    "All recent assessment cycles have produced results in the critical-risk band with no recovery trend. The trajectory signals deepening disengagement. Urgent action is required to prevent terminal academic failure.",
    "Submitted work is sporadic, incomplete, and reflects no meaningful preparation. Rubric requirements are not addressed in any substantive way. Immediate intervention in academic engagement is essential.",
    "Deadline compliance and feedback engagement have effectively ceased. Independent academic functioning is non-existent and requires complete external support.",
    "Begin formal academic emergency procedures including supervised daily study, tutoring, and family engagement. Recovery is possible only with sustained and structured intervention.",
  ]},
  { min: 17, max: 20.99, bullets: [
    "The student demonstrates effectively no usable grasp of curriculum content, with responses showing pervasive confusion and missing foundations. The current academic state requires emergency-level remediation. Substantive re-teaching from baseline prerequisites is the only viable path forward.",
    "Performance has been entrenched in the critical-risk band across every recent assessment, with no positive signals. The trajectory indicates ongoing deterioration. Without immediate intervention, full academic failure is imminent.",
    "Submissions are largely absent or unusable, and rubric engagement is non-existent. Effort indicators suggest disengagement from the subject. A foundational change in approach is required immediately.",
    "Submission and feedback engagement have effectively collapsed. The student is no longer operating with any independent academic structure.",
    "Emergency academic intervention is required without delay, including daily supervised study, tutoring, and full pastoral and family support. Recovery requires a complete restart of academic routines.",
  ]},
  { min: 13, max: 16.99, bullets: [
    "The student presents no reliable evidence of curriculum understanding across recent assessments. Responses indicate fundamental gaps that extend well below the expected entry level. Full remedial reteaching from absolute basics is now mandatory.",
    "All recent results are deeply within the critical-failure band, with no upward trajectory whatsoever. The pattern indicates entrenched, advanced-stage academic disengagement. Without immediate, intensive intervention, terminal failure is the predicted outcome.",
    "Submissions are essentially absent and rubric engagement is entirely missing. There is no current evidence of meaningful task investment. Comprehensive change is required immediately.",
    "Deadline and feedback engagement have entirely ceased. The student is operating without any functional academic self-management.",
    "Implement emergency academic recovery procedures immediately, with daily supervised study, formal tutoring, and pastoral/family coordination. Recovery is possible only through total restructuring of academic routines.",
  ]},
  { min: 9, max: 12.99, bullets: [
    "The student demonstrates no functional engagement with the curriculum at this stage, with assessments revealing near-total absence of subject knowledge. The academic situation is critical and requires immediate large-scale intervention. Recovery will require sustained foundational reteaching.",
    "All recent assessment cycles have produced results at the extreme low end of the scale with no recovery signal. The trajectory signals total academic collapse. Immediate emergency action is the only viable response.",
    "Submissions are effectively non-existent and rubric engagement is wholly absent. There is no current evidence of academic effort. The situation demands immediate, comprehensive change.",
    "All forms of academic responsibility have effectively ceased. The student is not currently operating within a functional academic framework.",
    "Emergency intervention must begin immediately with full pastoral, teacher, tutor, and family involvement. Daily supervised study targeting absolute foundational skills is essential to any recovery effort.",
  ]},
  { min: 5, max: 8.99, bullets: [
    "The student shows essentially no engagement with curriculum content, and assessment responses contain no meaningful subject knowledge. This represents an extreme academic emergency requiring immediate intensive support. Reteaching must begin from the most basic prerequisites.",
    "All recent results are at the floor of the achievement scale with no recovery indicators whatsoever. The trajectory points to total disengagement. Without immediate intervention, sustained academic failure is certain.",
    "Submissions are absent and rubric engagement is completely missing. There is no detectable evidence of task preparation or effort. Comprehensive change is required without delay.",
    "Academic responsibility behaviors are entirely absent. The student is not currently functioning within any academic structure.",
    "Immediate emergency academic intervention is essential, involving teachers, tutors, pastoral staff, and family. Recovery requires a complete and supervised restart of academic routines and expectations.",
  ]},
  { min: 1, max: 4.99, bullets: [
    "The student demonstrates total absence of curriculum engagement, with assessments showing no usable academic content. The situation represents the most severe category of academic risk. Recovery requires immediate, intensive, and sustained foundational intervention.",
    "All recent performance metrics are at the absolute floor of the scale with no positive movement. The trajectory indicates complete academic collapse. Emergency response is the only appropriate action.",
    "Submissions are entirely absent and rubric engagement is non-existent. There is no current evidence of any academic effort. Comprehensive structural change is mandatory.",
    "All academic responsibility behaviors have effectively disappeared. The student is no longer operating within any functional academic system.",
    "Initiate the highest tier of academic emergency intervention immediately, with full institutional, pastoral, and family coordination. Without sustained supervised support, recovery from this position is not possible.",
  ]},
];

function bracketFor(pct: number): Bracket {
  // 1. Force explicit float conversion and fallback to 0 if pct is a string or NaN
  const cleanScore = typeof pct === 'number' ? pct : parseFloat(pct as any);
  const verifiedScore = isNaN(cleanScore) ? 0 : cleanScore;
  
  // 2. Round the verified score cleanly to clear out floating-point gaps
  const roundedPct = Math.round(verifiedScore);
  
  // 3. Scan the array securely
  return (
    BRACKETS.find((b) => roundedPct >= b.min && roundedPct <= b.max) ??
    BRACKETS.find((b) => roundedPct >= b.min) ?? 
    BRACKETS[BRACKETS.length - 1]
  );
}

  );
}

  );
}

  );
}

  );
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function AcademicFeedback() {
  const { courses, tasks, scale, terms, activeTermId, settings } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const prevTerm = useMemo(() => {
    if (!activeTerm) return null;
    const sorted = [...terms].sort((a, b) => a.start.localeCompare(b.start));
    const idx = sorted.findIndex((t) => t.id === activeTerm.id);
    return idx > 0 ? sorted[idx - 1] : null;
  }, [terms, activeTerm]);

  const [meta, setMeta] = useState<Meta>(defaultMeta);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (raw) setMeta({ ...defaultMeta, ...JSON.parse(raw) });
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  }, [meta]);

  const update = <K extends keyof Meta>(key: K, id: string, val: Meta[K][string]) =>
    setMeta((m) => ({ ...m, [key]: { ...m[key], [id]: val } }));

  const hasPrevTerm = !!prevTerm;
  const rows = courses.map((c) => {
    const allCourseTasks = tasks.filter((t) => t.courseId === c.id);
    const current = filterByTerm(allCourseTasks, activeTerm);
    const previous = filterByTerm(allCourseTasks, prevTerm);
    const done = current.filter((t) => !t.pending);
    const hasData = done.length > 0;
    const avg = hasData ? calcAverage(done, settings.weighted) : 0;
    // Report-card-local A* override: any subject avg strictly above 91%
    // (i.e. 92%–100% inclusive after rounding to the displayed tenth)
    // renders as A*, independent of the global scale rules.
    const rawLetter = hasData ? (getLetter(avg, scale)?.letter ?? "—") : "N/A";
    // Report-card-local A* override: 92%–100% inclusive renders A*.
    const letter = hasData && avg >= 92 ? "A*" : rawLetter;
    const avgDisplay = hasData ? `${avg.toFixed(1)}%` : "N/A%";
    const prevAvg = calcAverage(
      previous.filter((t) => !t.pending),
      settings.weighted,
    );
    const prevLetterAuto = previous.length ? (getLetter(prevAvg, scale)?.letter ?? "—") : "";
    const completion = current.length
      ? Math.round((done.length / current.length) * 100)
      : 100;
    const lowest = done.length
      ? done.reduce((lo, t) =>
          t.score / t.maxScore < lo.score / lo.maxScore ? t : lo,
        )
      : null;
    return {
      course: c,
      avg,
      letter,
      avgDisplay,
      hasData,
      prevLetterAuto,
      completion,
      lowest,
      done,
      current,
    };
  });

  const buildComment = (r: (typeof rows)[number]): string[] => {
    if (!r.hasData) {
      const msg =
        "No tasks has been ever submitted or added in this term. It is important to complete your work if you haven’t submitted anything.";
      return [msg, msg, msg, msg, msg];
    }
    // Look up the 4%-increment bracket and emit its 5 bullets verbatim.
    // Empty (un-populated) tier slots fall back to a clear placeholder so
    // the user knows that bracket still needs sentence copy.
    const bracket = bracketFor(r.avg);
    return [...bracket.bullets];
  };

  const handlePrint = () => window.print();

  const handleCSV = () => {
    const header = [
      "Subject",
      "Teacher",
      "Aspirational",
      "Previous Term",
      "Current Term",
      "Average %",
      "Comment",
    ];
    const lines = rows.map((r) => {
      const teacher = meta.teachers[r.course.id] ?? "";
      const goal = meta.goals[r.course.id] ?? "";
      const prev = meta.prevLetters[r.course.id] ?? r.prevLetterAuto;
      const comment = (meta.manualOn[r.course.id]
        ? (meta.manual[r.course.id] ?? "")
        : buildComment(r).join(" ")
      ).replace(/\s+/g, " ");
      return [r.course.name, teacher, goal, prev, r.letter, r.avg.toFixed(1), comment]
        .map(csvEscape)
        .join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-card-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Skeleton loading buffer: re-trigger on initial mount and term switch.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 420);
    return () => clearTimeout(id);
  }, [activeTermId]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #academic-report, #academic-report * { visibility: visible !important; }
          #academic-report { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      <div className="space-y-5">
        <Card className="p-5" id="academic-report">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Academic Report Card</h2>
            </div>
            <div className="text-xs text-muted-foreground">
              {activeTerm
                ? `${activeTerm.name} · ${activeTerm.start} → ${activeTerm.end}`
                : "All terms"}
            </div>
          </div>

          <div className="flex gap-2 mt-4 no-print">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> PDF Export
            </Button>
            <Button variant="outline" onClick={handleCSV} className="gap-2">
              <FileDown className="h-4 w-4" /> Spreadsheet Export
            </Button>
          </div>

          {loading ? (
            <div className="mt-2 space-y-4">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="p-4 space-y-3 animate-pulse">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Skeleton className="h-7 col-span-2 md:col-span-1" />
                    <Skeleton className="h-7" />
                    <Skeleton className="h-7" />
                    <Skeleton className="h-7" />
                    <Skeleton className="h-7" />
                  </div>
                  <div className="space-y-2 pt-2">
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-10/12" />
                    <Skeleton className="h-3 w-9/12" />
                    <Skeleton className="h-3 w-8/12" />
                    <Skeleton className="h-3 w-7/12" />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mt-2 space-y-5">
              {rows.map((r) => {
                const bullets = buildComment(r);
                const manualOn = !!meta.manualOn[r.course.id];
                const urgent = r.avg < 50;
                const labels = [
                  "Strengths",
                  "Trends",
                  "Commendations",
                  "Responsibility",
                  "Improvement",
                ];
                return (
                  <Card
                    key={r.course.id}
                    className="p-4 md:p-5 border-l-4 animate-fade-in"
                    style={{ borderLeftColor: r.course.color }}
                  >
                    {/* Unified metrics header — sits ENTIRELY on top of the comment block */}
                    <div className="border-b pb-3 mb-4">
                      <div className="flex items-baseline gap-3 flex-wrap mb-3">
                        <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                          {r.course.name}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {r.done.length} task{r.done.length === 1 ? "" : "s"} graded · {r.completion}% completion
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Teacher</div>
                          <Input
                            className="h-8 no-print"
                            value={meta.teachers[r.course.id] ?? ""}
                            onChange={(e) => update("teachers", r.course.id, e.target.value)}
                            placeholder="Teacher name"
                          />
                          <div className="hidden print:block text-sm font-medium">
                            {meta.teachers[r.course.id] || "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Aspirational</div>
                          <Input
                            className="h-8 no-print"
                            value={meta.goals[r.course.id] ?? ""}
                            onChange={(e) => update("goals", r.course.id, e.target.value)}
                            placeholder="A*"
                          />
                          <div className="hidden print:block text-sm font-medium">
                            {meta.goals[r.course.id] || "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Previous Term {prevTerm ? `(${prevTerm.name})` : ""}
                          </div>
                          <div className="inline-flex items-center justify-center h-8 w-full rounded-md border bg-muted/40 text-sm font-semibold tabular-nums">
                            {meta.prevLetters[r.course.id] || r.prevLetterAuto || "—"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Current Term {activeTerm ? `(${activeTerm.name})` : ""}
                          </div>
                          <div className="inline-flex items-center justify-center gap-2 h-8 w-full rounded-md border bg-primary/10 border-primary/30 text-sm font-bold">
                            <span>{r.letter}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{r.avgDisplay}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5-bullet feedback compiler — sits directly UNDERNEATH the header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between no-print">
                        <h4 className="text-sm font-semibold">Teacher Comments</h4>
                        <label className="text-xs flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={manualOn}
                            onChange={(e) => update("manualOn", r.course.id, e.target.checked)}
                          />
                          Manual mode
                        </label>
                      </div>
                      {manualOn ? (
                        <Textarea
                          rows={5}
                          value={meta.manual[r.course.id] ?? ""}
                          onChange={(e) => update("manual", r.course.id, e.target.value)}
                          placeholder="Write your custom feedback..."
                        />
                      ) : (
                        <ul className="space-y-1.5 text-sm">
                          {bullets.map((b, i) => (
                            <li
                              key={i}
                              className={`leading-relaxed ${
                                i === 4 && urgent
                                  ? "text-destructive font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span className="font-semibold text-foreground">
                                B{i + 1} ({labels[i]}):
                              </span>{" "}
                              {b}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
