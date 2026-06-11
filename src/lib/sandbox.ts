// Local "Mock Report Card" sandbox. Snapshots the gradebook-related
// localStorage keys into a single backup blob, lets the user mutate
// state freely, and restores the original on exit. Backup itself is
// also stored in localStorage so a refresh mid-session does not lose
// the authentic dataset.

import { useEffect, useState } from "react";

const SANDBOX_FLAG = "sandbox-mode-v1";
const SANDBOX_BACKUP = "sandbox-backup-v1";

/** Keys that participate in the sandbox snapshot/restore cycle. */
const SNAPSHOT_KEYS = [
  "gradecalc-state-v2",
  "attendance-timetable-v1",
  "syllabus-mastery-v1",
  "study-blocks-v1",
  "criteria-store-v1",
];

type Backup = Record<string, string | null>;

function snapshot(): Backup {
  const b: Backup = {};
  for (const k of SNAPSHOT_KEYS) b[k] = localStorage.getItem(k);
  return b;
}

function restore(b: Backup) {
  for (const k of SNAPSHOT_KEYS) {
    const v = b[k];
    if (v === null || v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  }
}

export function isSandboxActive(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SANDBOX_FLAG) === "1";
}

export function enterSandbox() {
  if (typeof window === "undefined") return;
  if (isSandboxActive()) return;
  localStorage.setItem(SANDBOX_BACKUP, JSON.stringify(snapshot()));
  localStorage.setItem(SANDBOX_FLAG, "1");
  window.location.reload();
}

export function exitSandbox() {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(SANDBOX_BACKUP);
  if (raw) {
    try {
      restore(JSON.parse(raw) as Backup);
    } catch {
      // ignore — fall through to flag clear
    }
  }
  localStorage.removeItem(SANDBOX_BACKUP);
  localStorage.removeItem(SANDBOX_FLAG);
  window.location.reload();
}

/** React hook returning the live sandbox flag (SSR-safe). */
export function useSandbox(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isSandboxActive());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SANDBOX_FLAG) setOn(isSandboxActive());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return on;
}