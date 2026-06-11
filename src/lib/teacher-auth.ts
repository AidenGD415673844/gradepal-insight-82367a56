// Local-only teacher gradebook auth gate. Stores SHA-256 hashes of both
// the password and the auto-generated 16-digit recovery key. No plaintext
// secrets ever leave the device; nothing is sent to any server.

import { useEffect, useState } from "react";

export const TEACHER_AUTH_KEY = "gradecalc-teacher-auth";
export const TEACHER_UNLOCK_KEY = "gradecalc-teacher-unlocked";
export const TEACHER_AUTH_EVT = "gradecalc-teacher-auth-change";

export type TeacherAuth = {
  passwordHash: string;
  recoveryHash: string;
  updatedAt: string;
};

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const out = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(out))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashSecret(s: string): Promise<string> {
  return sha256(s.trim());
}

/** Generate XXXX-XXXX-XXXX-XXXX where each X is 0-9 or A-F (hex). */
export function generateRecoveryKey(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

export function loadAuth(): TeacherAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TEACHER_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TeacherAuth;
  } catch {
    return null;
  }
}

function emit() {
  window.dispatchEvent(new CustomEvent(TEACHER_AUTH_EVT));
}

export async function initialiseAuth(
  password: string,
): Promise<{ recoveryKey: string }> {
  const recoveryKey = generateRecoveryKey();
  const auth: TeacherAuth = {
    passwordHash: await hashSecret(password),
    recoveryHash: await hashSecret(recoveryKey),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(TEACHER_AUTH_KEY, JSON.stringify(auth));
  emit();
  return { recoveryKey };
}

export async function verifyPassword(password: string): Promise<boolean> {
  const auth = loadAuth();
  if (!auth) return false;
  return (await hashSecret(password)) === auth.passwordHash;
}

export async function resetWithRecovery(
  recoveryKey: string,
  newPassword: string,
): Promise<{ ok: true; recoveryKey: string } | { ok: false }> {
  const auth = loadAuth();
  if (!auth) return { ok: false };
  const hashed = await hashSecret(recoveryKey);
  if (hashed !== auth.recoveryHash) return { ok: false };
  // Issue a fresh recovery key on every reset.
  const fresh = generateRecoveryKey();
  const next: TeacherAuth = {
    passwordHash: await hashSecret(newPassword),
    recoveryHash: await hashSecret(fresh),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(TEACHER_AUTH_KEY, JSON.stringify(next));
  emit();
  return { ok: true, recoveryKey: fresh };
}

export function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TEACHER_UNLOCK_KEY) === "1";
}

export function setUnlocked(v: boolean) {
  if (v) sessionStorage.setItem(TEACHER_UNLOCK_KEY, "1");
  else sessionStorage.removeItem(TEACHER_UNLOCK_KEY);
  emit();
}

export function useTeacherMode() {
  const [unlocked, setU] = useState<boolean>(() => isUnlocked());
  const [hasAuth, setHA] = useState<boolean>(() => !!loadAuth());
  useEffect(() => {
    const sync = () => {
      setU(isUnlocked());
      setHA(!!loadAuth());
    };
    window.addEventListener(TEACHER_AUTH_EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TEACHER_AUTH_EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { unlocked, hasAuth };
}

// Teacher criteria store — kept 100% independent from numerical averages.
export const TEACHER_CRITERIA_KEY = "gradecalc-teacher-criteria";
export const CRITERIA_LETTERS = ["N/A", "A*", "A", "B", "C", "D", "E", "F", "G"] as const;
export type CriteriaLetter = (typeof CRITERIA_LETTERS)[number];

export type CourseCriteria = {
  A?: CriteriaLetter;
  B?: CriteriaLetter;
  C?: CriteriaLetter;
  D?: CriteriaLetter;
  IA?: CriteriaLetter; // Interdisciplinary: Evaluating
  IB?: CriteriaLetter; // Interdisciplinary: Synthesizing
  IC?: CriteriaLetter; // Interdisciplinary: Reflecting
  updatedAt?: string;
};

export function loadCriteria(): Record<string, CourseCriteria> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(TEACHER_CRITERIA_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function saveCriteria(courseId: string, key: keyof CourseCriteria, value: CriteriaLetter) {
  const all = loadCriteria();
  const prev = all[courseId] ?? {};
  all[courseId] = { ...prev, [key]: value, updatedAt: new Date().toISOString() };
  localStorage.setItem(TEACHER_CRITERIA_KEY, JSON.stringify(all));
}