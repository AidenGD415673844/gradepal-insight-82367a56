// =============================================================================
// AiThought — decoupled AI conversational middleware interceptor.
//
// Runs BEFORE any OpenRouter call fires:
//   • Anti-gibberish cognitive checker — blocks the request, spares credits,
//     and returns a friendly redirect message.
//   • Length / empty-content guard.
//   • Trivial-greeting short-circuit (delegates to ai-sanitize).
//
// Zero side effects on the network layer — the caller decides what to do
// with the verdict.
// =============================================================================
import { isTrivialGreeting, FORMAL_GREETING } from "@/lib/ai-sanitize";

export type AiVerdict =
  | { ok: true }
  | { ok: false; reason: "empty" | "gibberish" | "greeting"; reply: string };

const GIBBERISH_REPLY =
  "I am unable to decode your current message template. Please provide a clear request regarding your active course assignments, grades, or study trajectories so we can evaluate your path together!";

// Curated dictionary of academic anchor tokens — the request only needs to
// contain ONE of these (or a numeric metric, or basic English structure) to
// pass the coherence gate. Everything else is treated as random keyboard mash.
const ACADEMIC_WORDS = [
  "grade","grades","gpa","average","class","classes","course","courses","subject","subjects",
  "math","english","science","physics","chemistry","biology","history","geography","chinese","spanish","french",
  "test","tests","exam","exams","quiz","assignment","assignments","homework","project","projects","essay",
  "score","scores","mark","marks","percent","percentage","cumulative","term","semester","year",
  "predict","project","projection","trajectory","trend","improve","study","studying","review","revise","revising",
  "help","advice","tip","tips","recommend","recommendation","strategy","plan","schedule","week","weekly","month",
  "target","goal","goals","aspirational","insulation","cushion","weakest","strongest","best","worst",
  "how","what","why","when","which","should","could","would","can","will","do","does","is","are","am",
  "analyse","analyze","analysis","summary","summarise","summarize","report","feedback","reflect","reflection",
  "hi","hello","hey","thanks","thank","please","tell","show","calculate","estimate","forecast","teacher","student",
  "syllabus","topic","unit","mastery","weight","weights","category","rubric","credit","credits","letter",
  "chart","graph","curve","distribution","pareto","monte","carlo","skewness","sensitivity","boxplot",
];

function coherent(text: string): boolean {
  const t = text.toLowerCase();
  if (/\d/.test(t)) return true;                                   // any digit → grade/percentage context
  if (/[.,?!]/.test(t)) return true;                                // punctuated → assume real sentence
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 5) return true;                               // long-form phrasing
  for (const w of words) {
    const clean = w.replace(/[^a-z]/g, "");
    if (clean.length >= 2 && ACADEMIC_WORDS.includes(clean)) return true;
  }
  // Long single-token strings with no vowels are almost certainly keyboard mash
  // (e.g. "bvabkbdsabadskf"). Coherent English words carry vowels.
  const joined = words.join("");
  const vowels = (joined.match(/[aeiou]/g) || []).length;
  const ratio = joined.length ? vowels / joined.length : 0;
  if (joined.length >= 10 && ratio < 0.15) return false;
  // Repeated single-letter runs (aaaaaa, sdsdsdsd) → gibberish.
  if (/(.)\1{4,}/.test(joined)) return false;
  if (words.length === 1 && words[0].length >= 12 && !ACADEMIC_WORDS.includes(words[0])) return false;
  return true;
}

/**
 * Inspect a user-typed prompt and decide whether it should hit the network.
 * The caller must respect the verdict — if `ok: false`, no request should
 * fire and no credits should be debited; render `reply` as an assistant bubble.
 */
export function inspectAiPrompt(text: string): AiVerdict {
  const trimmed = (text || "").trim();
  if (!trimmed) return { ok: false, reason: "empty", reply: "" };
  if (isTrivialGreeting(trimmed)) return { ok: false, reason: "greeting", reply: FORMAL_GREETING };
  if (!coherent(trimmed)) return { ok: false, reason: "gibberish", reply: GIBBERISH_REPLY };
  return { ok: true };
}

// Optional React re-export — components may render nothing but wrap this
// middleware as a hook-friendly helper.
export default function AiThought() { return null; }