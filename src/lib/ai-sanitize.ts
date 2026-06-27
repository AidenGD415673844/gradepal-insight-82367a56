// Cleans AI output before it is rendered to the user.
// Strips safety flag lines, raw scratchpad calc dumps, and stray bracket noise.
const SAFETY_LINES = [
  /^\s*user\s*safety\s*:?\s*safe\s*$/i,
  /^\s*response\s*safety\s*:?\s*safe\s*$/i,
  /^\s*safety\s*assessment\s*:.*$/i,
];

const SCRATCHPAD_LINES = [
  /^\s*sum\s*x\s*[=:].*/i,
  /^\s*sum\s*xy\s*[=:].*/i,
  /^\s*sum\s*x\^?2\s*[=:].*/i,
  /^\s*sst\s*sum\s*[=:].*/i,
  /^\s*ssr\s*sum\s*[=:].*/i,
  /^\s*sse\s*sum\s*[=:].*/i,
  /^\s*mean\s*x\s*[=:].*/i,
  /^\s*mean\s*y\s*[=:].*/i,
  /^\s*n\s*[=:]\s*\d+\s*$/i,
  /^\s*slope\s*[=:].*\d/i,
];

export function sanitizeAIOutput(raw: string): string {
  if (!raw) return raw;
  const lines = raw.split(/\r?\n/);
  const cleaned: string[] = [];
  for (let line of lines) {
    if (SAFETY_LINES.some((re) => re.test(line))) continue;
    if (SCRATCHPAD_LINES.some((re) => re.test(line))) continue;
    // strip leftover orphan brackets like "[ ]" or "{ ... internal calc ... }"
    line = line.replace(/^\s*[\[\{]\s*[\]\}]\s*$/g, "");
    cleaned.push(line);
  }
  // collapse 3+ blank lines down to one
  return cleaned.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Detect tiny greetings so we can replace them with a formal academic greeting. */
export function isTrivialGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 24) return false;
  return /^(hi|hello|hey|yo|sup|hola|good (morning|afternoon|evening))[!.\s]*$/.test(t);
}

export const FORMAL_GREETING =
  "Good day. I am your GradePal Analysis assistant — calibrated against your full graded ledger. Whenever you are ready, share a focused question (a target grade, a struggling subject, an upcoming assessment, or a trajectory check) and I will produce a concise reasoning summary followed by a polished analytical narrative.";
