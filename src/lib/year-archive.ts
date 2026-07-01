// =============================================================================
// End-of-Year automated archive engine. Deep-clones the active dataset into
// a year-stamped immutable archive, then surgically resets the volatile
// student components while preserving long-lived assets (saved reports, peer
// hub, WebRTC tokens, chat backlogs, PIN/password locks).
// 100% client-side — uses localStorage only.
// =============================================================================

import { useEffect, useState } from "react";

const PROMPT_FLAG_KEY = "gradepal_eoy_prompted_year";
// New canonical vault key. The old `gradecalc_archive_` prefix is still read
// on listing for backward compatibility.
const ARCHIVE_PREFIX = "gradecalc_vault_archive_";
const LEGACY_ARCHIVE_PREFIX = "gradecalc_archive_";
const EVT = "gradepal-archive-change";

// Active-data keys that get cloned + reset on rollover.
const VOLATILE_KEYS = [
  "gradecalc_courses",
  "gradecalc_tasks",
  "gradecalc_categories",
  "gradecalc_settings",
  "gradecalc_studyMinutes",
  "gradecalc_futureClasses",
  "gradecalc_checklists",
  "gradecalc_scaleOverrides",
  "gradecalc_subjectGoals",
  "gradecalc_activityDates",
  "gradecalc_terms",
  "gradecalc_activeTermId",
  "gradecalc_kanban_v1",
  "gradecalc_syllabus_mastery",
  "gradecalc_weekly_review_v1",
  "gradecalc_attendance",
  "gradecalc_streak",
];

// Keys explicitly preserved through the reset.
export const PRESERVED_KEYS = [
  "gradecalc_saved_reports",
  "gradecalc_saved_report_pdfs",
  "gradecalc_peers",
  "gradepal_peer_identity",
  "gradecalc_peer_chat_v1",
  "gradecalc_group_chat_v1",
  "gradecalc_webrtc_peers",
  "gradecalc_pin_vault_v1",
  "gradecalc_teacher_auth",
  "gradecalc_premium_v1",
  "gradecalc_wallet_balance",
  "gradepal_peerjs_id",
];

export type ArchiveEntry = {
  year: number;
  archivedAt: number;
  payload: Record<string, unknown>;
};

function fire() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT));
}

function currentAcademicYear(now = new Date()): number {
  // Hong Kong academic year runs Sept→Aug. June/July/Aug graduates the year
  // that started the previous September.
  return now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
}

/** True when calendar sits inside the summer rollover window (Jun 20 – Aug 31). */
export function isInSummerRolloverWindow(now = new Date()): boolean {
  const m = now.getMonth();
  const d = now.getDate();
  if (m === 5 && d >= 20) return true; // late June
  if (m === 6 || m === 7) return true; // July, August
  return false;
}

export function shouldPromptRollover(now = new Date()): boolean {
  if (typeof window === "undefined") return false;
  if (!isInSummerRolloverWindow(now)) return false;
  const year = currentAcademicYear(now);
  const flagged = localStorage.getItem(PROMPT_FLAG_KEY);
  if (flagged === String(year)) return false;
  return true;
}

export function dismissRolloverPrompt(now = new Date()) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROMPT_FLAG_KEY, String(currentAcademicYear(now)));
  fire();
}

/** Deep-clone snapshot all volatile keys into a year-stamped archive bucket. */
export function archiveCurrentYear(now = new Date()): ArchiveEntry {
  const year = currentAcademicYear(now);
  const payload: Record<string, unknown> = {};
  for (const k of VOLATILE_KEYS) {
    const raw = localStorage.getItem(k);
    if (raw == null) continue;
    try { payload[k] = JSON.parse(raw); }
    catch { payload[k] = raw; }
  }
  const entry: ArchiveEntry = {
    year,
    archivedAt: Date.now(),
    // structuredClone gives us a true immutable deep-clone for the museum view.
    payload: typeof structuredClone === "function" ? structuredClone(payload) : JSON.parse(JSON.stringify(payload)),
  };
  localStorage.setItem(ARCHIVE_PREFIX + year, JSON.stringify(entry));
  fire();
  return entry;
}

/** Wipe the volatile keys — preserved keys are never touched. */
export function freshSlateReset() {
  for (const k of VOLATILE_KEYS) {
    localStorage.removeItem(k);
  }
  fire();
}

/** Archive-and-reset pipeline used by the EoY modal. */
export function executeYearRollover(now = new Date()): ArchiveEntry {
  const entry = archiveCurrentYear(now);
  freshSlateReset();
  dismissRolloverPrompt(now);
  return entry;
}

export function listArchives(): ArchiveEntry[] {
  if (typeof window === "undefined") return [];
  const out: ArchiveEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || (!k.startsWith(ARCHIVE_PREFIX) && !k.startsWith(LEGACY_ARCHIVE_PREFIX))) continue;
    try { out.push(JSON.parse(localStorage.getItem(k) || "")); } catch { /* skip */ }
  }
  return out.sort((a, b) => b.year - a.year);
}

export function deleteArchive(year: number) {
  localStorage.removeItem(ARCHIVE_PREFIX + year);
  localStorage.removeItem(LEGACY_ARCHIVE_PREFIX + year);
  fire();
}

/** Read-only summary numbers for the timeline view. */
export function summariseArchive(entry: ArchiveEntry): { courses: number; tasks: number; reports: number } {
  const c = entry.payload["gradecalc_courses"];
  const t = entry.payload["gradecalc_tasks"];
  return {
    courses: Array.isArray(c) ? c.length : 0,
    tasks: Array.isArray(t) ? t.length : 0,
    reports: 0,
  };
}

export function useArchives(): ArchiveEntry[] {
  const [list, setList] = useState<ArchiveEntry[]>(() => listArchives());
  useEffect(() => {
    const sync = () => setList(listArchives());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}