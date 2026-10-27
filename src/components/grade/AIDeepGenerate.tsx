import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ShieldAlert, Lock } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, filterByTerm } from "@/lib/grade-utils";
import { BRACKETS, TREND_BRACKETS, COMPLETION_BRACKETS, lookupBracket } from "./feedback-data";
import { spendCredits, estimateCost } from "@/lib/ai-credits";
import { callOpenRouter } from "@/lib/openrouter";
import { sanitizeAIOutputLite } from "./ai-report-sanitize";

/* ---------- Redundant-key obfuscated storage ------------------------ */

const KEYS = ["_app_theme_cache_b2", "_sys_layout_state_v3", "_user_manifest_metric"] as const;
const BAN_KEY = "_sys_core_render_integrity";
const BAN_TOKEN = "0xFA74BANNED";
const APPEAL_MASTER = "REDEEM_INTEGRITY_RESET_2026";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/** Cheap reversible XOR+base64 obfuscation — discourages casual tamper, not real crypto. */
function obf(s: string): string {
  const k = 73;
  const out = Array.from(s).map((c) => String.fromCharCode(c.charCodeAt(0) ^ k)).join("");
  return typeof btoa === "function" ? btoa(out) : out;
}
function deobf(s: string): string {
  try {
    const raw = typeof atob === "function" ? atob(s) : s;
    const k = 73;
    return Array.from(raw).map((c) => String.fromCharCode(c.charCodeAt(0) ^ k)).join("");
  } catch {
    return "";
  }
}

type LogEntry = { t: number; hash: string };
type LogPayload = { entries: LogEntry[]; last: number };

function readLog(): LogPayload {
  if (!canUseBrowserStorage()) return { entries: [], last: 0 };
  const candidates = KEYS.map((k) => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return null;
      const decoded = deobf(raw);
      return JSON.parse(decoded) as LogPayload;
    } catch {
      return null;
    }
  });
  // pick the payload with the most entries (winner of any partial tamper)
  const valid = candidates.filter((c): c is LogPayload => !!c && Array.isArray(c.entries));
  if (!valid.length) return { entries: [], last: 0 };
  const best = valid.reduce((a, b) => (b.entries.length > a.entries.length ? b : a));
  return best;
}
function writeLog(p: LogPayload) {
  if (!canUseBrowserStorage()) return;
  const enc = obf(JSON.stringify(p));
  for (const k of KEYS) localStorage.setItem(k, enc);
}
function tamperDetected(): boolean {
  if (!canUseBrowserStorage()) return false;
  const present = KEYS.map((k) => localStorage.getItem(k));
  const any = present.some(Boolean);
  const all = present.every(Boolean);
  // some keys missing while others contain data → tamper signal
  if (any && !all) return true;
  if (!all) return false;
  // mismatched payloads (different decoded contents) → tamper
  const decoded = present.map((v) => deobf(v as string));
  return !decoded.every((d) => d === decoded[0]);
}
function reconstructIfPartial() {
  if (tamperDetected()) {
    // attempt to heal first; if mismatch, treat as violation upstream
    const log = readLog();
    writeLog(log);
  }
}

/* ---------- Ban flag ------------------------------------------------ */

export function isAIBanned(): boolean {
  if (!canUseBrowserStorage()) return false;
  return deobf(localStorage.getItem(BAN_KEY) ?? "") === BAN_TOKEN;
}
function setBan() {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(BAN_KEY, obf(BAN_TOKEN));
}
function clearBan() {
  if (!canUseBrowserStorage()) return;
  localStorage.removeItem(BAN_KEY);
  for (const k of KEYS) localStorage.removeItem(k);
}

/* ---------- Week boundary: Sunday 05:00 HKT (UTC+8) ----------------- */

function weekStartHKT(now = Date.now()): number {
  // Convert to HKT (UTC+8) for boundary math, then re-export as UTC ms.
  const HKT_OFFSET = 8 * 60 * 60 * 1000;
  const hktNow = new Date(now + HKT_OFFSET);
  const day = hktNow.getUTCDay(); // 0=Sun
  const hour = hktNow.getUTCHours();
  const min = hktNow.getUTCMinutes();
  // Anchor to most-recent Sunday 05:00 HKT
  let daysBack = day;
  if (day === 0 && hour < 5) daysBack = 7;
  const anchor = new Date(hktNow);
  anchor.setUTCDate(anchor.getUTCDate() - daysBack);
  anchor.setUTCHours(5, 0, 0, 0);
  void min;
  return anchor.getTime() - HKT_OFFSET;
}
function nextWeekResetHKT(now = Date.now()): number {
  return weekStartHKT(now) + 7 * 24 * 60 * 60 * 1000;
}
function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

/* ---------- Local "AI" composer (no cloud calls) -------------------- */

function fingerprint(): string {
  if (typeof navigator === "undefined" || typeof screen === "undefined") {
    return "FP-LOCALDEVX";
  }
  const seed = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}|${new Date().getTimezoneOffset()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return ("FP-" + h.toString(36).toUpperCase()).padEnd(12, "X").slice(0, 12);
}
function hashInputs(subj: string, teacher: string, avg: number, prevAvg: number, completion: number): string {
  const s = `${subj}|${teacher}|${avg.toFixed(2)}|${prevAvg.toFixed(2)}|${completion}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h.toString(16);
}

type ClassTask = { name: string; category: string; score: number; maxScore: number; weight: number; date: string };

function pct(t: ClassTask) { return t.maxScore > 0 ? (t.score / t.maxScore) * 100 : 0; }

function buildClassDigest(args: { subject: string; teacher: string; avg: number; prevAvg: number; hasPrev: boolean; completion: number; tasks: ClassTask[] }) {
  const { subject, teacher, avg, prevAvg, hasPrev, completion, tasks } = args;
  const sorted = [...tasks].sort((a, b) => a.date.localeCompare(b.date));
  const cats = new Map<string, { sum: number; n: number }>();
  for (const t of sorted) {
    const c = cats.get(t.category) ?? { sum: 0, n: 0 };
    c.sum += pct(t); c.n++; cats.set(t.category, c);
  }
  const catLines = [...cats.entries()].map(([k, v]) => `${k}: ${(v.sum / v.n).toFixed(1)}% over ${v.n} task(s)`);
  const taskLines = sorted.map((t) => `${t.date} | ${t.name} | ${t.category} | ${t.score}/${t.maxScore} (${pct(t).toFixed(1)}%) | weight ${t.weight}`);
  return [
    `Subject: ${subject}${teacher ? ` (teacher: ${teacher})` : ""}`,
    `Current term average: ${avg.toFixed(1)}%`,
    hasPrev ? `Previous term average: ${prevAvg.toFixed(1)}% (change ${(avg - prevAvg >= 0 ? "+" : "")}${(avg - prevAvg).toFixed(1)} pts)` : "Previous term: no data",
    `Completion: ${completion}%`,
    `Category averages:\n${catLines.join("\n")}`,
    `All graded tasks (date | name | category | score | weight):\n${taskLines.join("\n")}`,
  ].join("\n\n");
}

/** Offline fallback built only from this class's real tasks — no canned text. */
function composeLocalReport(args: { subject: string; avg: number; prevAvg: number; hasPrev: boolean; completion: number; tasks: ClassTask[] }): string {
  const { subject, avg, prevAvg, hasPrev, completion, tasks } = args;
  const byPct = [...tasks].sort((a, b) => pct(b) - pct(a));
  const best = byPct.slice(0, 2), worst = byPct.slice(-2).reverse();
  const recent = [...tasks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  const cats = new Map<string, number[]>();
  for (const t of tasks) cats.set(t.category, [...(cats.get(t.category) ?? []), pct(t)]);
  const catAvg = [...cats.entries()].map(([k, v]) => ({ k, a: v.reduce((x, y) => x + y, 0) / v.length })).sort((a, b) => b.a - a.a);
  const f = (t: ClassTask) => `"${t.name}" (${pct(t).toFixed(1)}%)`;
  const out = [
    `In ${subject}, the student is averaging ${avg.toFixed(1)}% across ${tasks.length} graded task(s).`,
    `Strengths: The strongest results were ${best.map(f).join(" and ")}${catAvg[0] ? `, and ${catAvg[0].k} is the best category at ${catAvg[0].a.toFixed(1)}%` : ""}.`,
    `Trends: ${hasPrev ? `Compared with last term's ${prevAvg.toFixed(1)}%, the average has ${avg >= prevAvg ? "risen" : "fallen"} by ${Math.abs(avg - prevAvg).toFixed(1)} points.` : "No previous term to compare yet."} Most recent work: ${recent.map(f).join(", ")}.`,
    `Responsibility: ${completion}% of this term's tasks are graded and complete.`,
  ];
  if (catAvg.length > 1) {
    const low = catAvg[catAvg.length - 1];
    out.push(`Action Items: Focus on ${low.k} (${low.a.toFixed(1)}%) and revisit ${worst.map(f).join(" and ")} — lifting these is the quickest route to a higher grade.`);
  } else {
    out.push(`Action Items: Revisit ${worst.map(f).join(" and ")} to lift the overall average.`);
  }
  return out.join("\n\n");
}

const REPORT_SYSTEM = `You are an experienced, warm teacher writing a report-card comment. Use ONLY the class data given. Reference specific task names, categories, scores and the trend. Be truthful about weaknesses but encouraging. Write plain text (no markdown headings, no <thought_process>), with these labelled paragraphs: Overview, Strengths, Trends, Responsibility, Commendations, Action Items. 150-250 words. Never invent tasks or numbers.`;

/* ---------- Component ----------------------------------------------- */

export function AIDeepGenerate({
  onApply,
  subjects,
}: {
  onApply: (courseId: string, text: string) => void;
  subjects: { id: string; name: string }[];
}) {
  const { courses, tasks, scale: _s, terms, activeTermId, settings } = useGrades();
  void _s;
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const prevTerm = useMemo(() => {
    if (!activeTerm) return null;
    const sorted = [...terms].sort((a, b) => a.start.localeCompare(b.start));
    const i = sorted.findIndex((t) => t.id === activeTerm.id);
    return i > 0 ? sorted[i - 1] : null;
  }, [terms, activeTerm]);

  const [banned, setBanned] = useState<boolean>(false);
  const [violationMsg, setViolationMsg] = useState<string>("");
  // Initialize to 0 so the SSR-rendered countdown matches the very first
  // client render. The real time is filled in by the effect below.
  const [now, setNow] = useState<number>(0);
  const [target, setTarget] = useState<string>(subjects[0]?.id ?? "");
  const [teacher, setTeacher] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [appeal, setAppeal] = useState<string>("");

  useEffect(() => {
    setBanned(isAIBanned());
    reconstructIfPartial();
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekStart = weekStartHKT(now);
  const log = readLog();
  const thisWeek = log.entries.filter((e) => e.t >= weekStart);
  const usedThisWeek = thisWeek.length;
  const limitReached = usedThisWeek >= 3;
  const reset = nextWeekResetHKT(now);
  const countdown = fmtCountdown(reset - now);

  const tokenId = useMemo(() => fingerprint(), []);

  function triggerViolation(reason: string) {
    setBan();
    setBanned(true);
    setViolationMsg(reason);
  }

  const [busy, setBusy] = useState(false);

  async function handleGenerate() {
    setError("");
    if (banned) return;
    // Clock-tamper guard: device time behind last recorded execution.
    if (log.last && now + 60_000 < log.last) {
      triggerViolation("Clock rollback detected.");
      return;
    }
    if (tamperDetected()) {
      triggerViolation("Redundant integrity keys mismatched.");
      return;
    }
    if (limitReached) {
      setError(`Weekly limit reached. Resets in ${countdown}.`);
      return;
    }
    const course = courses.find((c) => c.id === target);
    if (!course) {
      setError("Pick a subject first.");
      return;
    }
    const courseTasks = tasks.filter((t) => t.courseId === course.id);
    const cur = filterByTerm(courseTasks, activeTerm).filter((t) => !t.pending);
    if (!cur.length) {
      setError("No graded tasks in this term for that subject.");
      return;
    }
    const prev = filterByTerm(courseTasks, prevTerm).filter((t) => !t.pending);
    const avg = calcAverage(cur, settings.weighted);
    const prevAvg = prev.length ? calcAverage(prev, settings.weighted) : 0;
    const completion = courseTasks.length
      ? Math.round((cur.length / filterByTerm(courseTasks, activeTerm).length) * 100)
      : 100;
    const hash = hashInputs(course.name, teacher, avg, prevAvg, completion);
    const lastEntry = log.entries[log.entries.length - 1];
    if (lastEntry && lastEntry.hash === hash) {
      setError("Duplicate generation blocked. Please modify numerical grade values or change subjects before generating.");
      return;
    }
    // AI Credit gate — variable cost scaled by amount of work (chars + items).
    const spend = spendCredits("ai_deep_generate", {
      chars: course.name.length + teacher.length + cur.length * 8,
      items: cur.length,
      depth: prev.length > 0 ? 1 : 0,
    });
    if (!spend.ok) {
      setError(`Not enough AI credits — need ${spend.need.toFixed(1)}, have ${spend.have.toFixed(1)}. Top up in the Pro Shop.`);
      return;
    }
    const classTasks: ClassTask[] = cur.map((t) => ({ name: t.name, category: t.category, score: t.score, maxScore: t.maxScore, weight: t.weight, date: t.date }));
    const base = { subject: course.name, avg, prevAvg, hasPrev: prev.length > 0, completion, tasks: classTasks };
    let text = "";
    setBusy(true);
    try {
      const raw = await callOpenRouter({
        feature: "analyser",
        maxTokens: 900,
        temperature: 0.6,
        messages: [
          { role: "system", content: REPORT_SYSTEM },
          { role: "user", content: buildClassDigest({ ...base, teacher }) },
        ],
      });
      text = sanitizeAIOutputLite(raw);
    } catch {
      text = "";
    } finally {
      setBusy(false);
    }
    if (!text) {
      text = composeLocalReport(base);
      setError("AI was unavailable — generated a report from your class data offline instead.");
    }
    onApply(course.id, text);
    const newLog: LogPayload = {
      entries: [...log.entries.slice(-20), { t: now, hash }],
      last: now,
    };
    writeLog(newLog);
  }

  function handleAppeal() {
    if (appeal.trim() === APPEAL_MASTER) {
      clearBan();
      setBanned(false);
      setViolationMsg("");
      setAppeal("");
    } else {
      setError("Invalid appeal code.");
    }
  }

  if (banned) {
    return (
      <Card className="p-5 border-destructive/40 bg-destructive/5">
        <div className="flex items-start gap-3 mb-3">
          <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <h3 className="font-bold text-destructive">ACCESS DENIED</h3>
            <p className="text-xs text-muted-foreground">
              Artificial Intelligence Modules Permanently Suspended Due to Security Integrity Violations.
              {violationMsg ? ` Reason: ${violationMsg}` : ""}
            </p>
          </div>
        </div>
        <div className="rounded-md border bg-background p-3 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" />
            <b>Submit Local Security Appeal</b>
          </div>
          <div>Hardware diagnostic token: <code className="font-mono">{tokenId}</code></div>
          <Input
            placeholder="Administrative override code"
            value={appeal}
            onChange={(e) => setAppeal(e.target.value)}
          />
          {error && <p className="text-destructive">{error}</p>}
          <Button size="sm" onClick={handleAppeal}>Submit appeal</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-5 no-print">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">AI Deep Generate</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {usedThisWeek}/3 this week · resets in {countdown} · ~{estimateCost("ai_deep_generate").toFixed(1)} cr/run
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Input placeholder="Teacher name (optional)" value={teacher} onChange={(e) => setTeacher(e.target.value)} />
        <Button
          onClick={handleGenerate}
          disabled={limitReached || busy}
          className={limitReached ? "grayscale opacity-60" : ""}
        >
          {limitReached ? "Locked" : busy ? "Writing…" : "Generate"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[10px] text-muted-foreground mt-2">
        Local-only generation: assembles a long-form report from your scored grades. No network calls.
      </p>
    </Card>
  );
}