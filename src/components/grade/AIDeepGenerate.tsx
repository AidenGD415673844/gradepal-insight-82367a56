import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ShieldAlert, Lock } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, filterByTerm } from "@/lib/grade-utils";
import { BRACKETS, TREND_BRACKETS, COMPLETION_BRACKETS, lookupBracket } from "./feedback-data";
import { spendCredits, costFor } from "@/lib/ai-credits";

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

function composeReport(args: {
  subject: string;
  teacher: string;
  avg: number;
  prevAvg: number;
  hasPrev: boolean;
  completion: number;
}): string {
  const { subject, teacher, avg, prevAvg, hasPrev, completion } = args;
  const main = lookupBracket(BRACKETS, avg);
  const b2 = hasPrev
    ? lookupBracket(TREND_BRACKETS, avg - prevAvg).bullets[1]
    : main.bullets[1];
  const b3 = lookupBracket(COMPLETION_BRACKETS, completion).bullets[2];
  const intro = `In ${subject}${teacher ? ` (taught by ${teacher})` : ""}, the student is currently averaging ${avg.toFixed(1)}%.`;
  return [
    intro,
    `Strengths: ${main.bullets[0]}`,
    `Trends: ${b2}`,
    `Responsibility: ${b3}`,
    `Commendations: ${main.bullets[2]}`,
    `Action Items: ${main.bullets[4]}`,
  ].join("\n\n");
}

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

  function handleGenerate() {
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
    // AI Credit gate
    const spend = spendCredits("ai_deep_generate");
    if (!spend.ok) {
      setError(`Not enough AI credits — need ${spend.need.toFixed(1)}, have ${spend.have.toFixed(1)}. Top up in the Pro Shop.`);
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
    const text = composeReport({
      subject: course.name,
      teacher,
      avg,
      prevAvg,
      hasPrev: prev.length > 0,
      completion,
    });
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
          {usedThisWeek}/3 this week · resets in {countdown} · {costFor("ai_deep_generate").toFixed(1)} cr/run
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
          disabled={limitReached}
          className={limitReached ? "grayscale opacity-60" : ""}
        >
          {limitReached ? "Locked" : "Generate"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[10px] text-muted-foreground mt-2">
        Local-only generation: assembles a long-form report from your scored grades. No network calls.
      </p>
    </Card>
  );
}