// Client-only Study Streak Multiplier engine. Watches Kanban status changes
// and records a streak when 5+ consecutive task progressions stay under 48h
// between updates.

import { useEffect, useState } from "react";

const K_LOG = "gradecalc_streak_log_v1"; // ordered list of update timestamps
const K_STREAK = "gradecalc_streak_state_v1";
const EVT = "gradecalc-streak-change";
const FORTY_EIGHT_H = 48 * 3600 * 1000;

export type StreakState = {
  active: boolean;
  count: number;       // consecutive sub-48h progressions
  multiplier: number;  // 1.0, 1.2, 1.5, 2.0
  updatedAt: number;
};

const DEFAULT: StreakState = { active: false, count: 0, multiplier: 1, updatedAt: 0 };

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : fb;
  } catch { return fb; }
}
function write(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new CustomEvent(EVT));
}

function multiplierFor(count: number): number {
  if (count >= 15) return 2.0;
  if (count >= 10) return 1.5;
  if (count >= 5) return 1.2;
  return 1;
}

/** Record a Kanban progression event (call when a task is moved forward). */
export function recordKanbanProgress() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const log = read<number[]>(K_LOG, []);
  const prev = log[log.length - 1] ?? 0;
  const next = [...log.slice(-50), now];
  localStorage.setItem(K_LOG, JSON.stringify(next));

  const cur = read<StreakState>(K_STREAK, DEFAULT);
  let count = cur.count;
  if (prev && now - prev <= FORTY_EIGHT_H) {
    count += 1;
  } else {
    count = 1;
  }
  const mult = multiplierFor(count);
  const state: StreakState = {
    active: count >= 5,
    count,
    multiplier: mult,
    updatedAt: now,
  };
  write(K_STREAK, state);
}

/** Drop streak if user hasn't progressed in >48h. Call on load. */
export function reconcileStreak() {
  if (typeof window === "undefined") return;
  const cur = read<StreakState>(K_STREAK, DEFAULT);
  if (cur.updatedAt && Date.now() - cur.updatedAt > FORTY_EIGHT_H) {
    write(K_STREAK, DEFAULT);
  }
}

export function getStreak(): StreakState {
  return read<StreakState>(K_STREAK, DEFAULT);
}

export function useStreak(): StreakState {
  const [s, set] = useState<StreakState>(DEFAULT);
  useEffect(() => {
    reconcileStreak();
    const sync = () => set(getStreak());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return s;
}

/** Elite phrase pool unlocked while a streak is active. */
export const ELITE_PHRASES = [
  "Commendable sustained discipline — performance metrics reflect a top-decile work ethic.",
  "The cadence of completion is exemplary; momentum is decisively in your favour.",
  "Your consistency curve has entered a high-stability regime worthy of formal recognition.",
  "Recommendation: maintain the present trajectory — outcomes are projected toward apex tier benchmarks.",
];

export function pickElitePhrase(seed: number): string {
  return ELITE_PHRASES[Math.abs(seed) % ELITE_PHRASES.length];
}