// =============================================================================
// GradeCalc AI Credit Engine — 100% client-side, localStorage only.
// Rolling balance with daily refill + Pro/Student top-ups.
// Variable cost per feature, soft cap, week-reset for free tier.
// =============================================================================

import { useEffect, useState } from "react";
import { getActiveTier, isPro, isStudent, TIERS } from "./premium";

const K_STATE = "gradecalc_ai_credits_v1";
const EVT = "gradecalc-ai-credits-change";

const FREE_DAILY = 10;        // free baseline tokens added per day (catch up)
const FREE_WEEK_CAP = 20;     // free baseline soft-cap (cannot accumulate past)
const PRO_TOPUP = 50;         // one-shot grant on Pro activation
const STUDENT_TOPUP = 25;     // one-shot grant on Student activation
const PRO_WEEKLY = 35;        // weekly auto-refill while Pro
const STUDENT_WEEKLY = 15;    // weekly auto-refill while Student
const PAID_CAP = 200;         // hard cap including top-ups

export const AI_COST: Record<string, number> = {
  ai_grader: 6.5,
  ai_deep_generate: 3.0,
  homework_helper: 0.8,
  analyser: 1.2,
  feedback_bullets: 2.0,
  default: 1.0,
};

export function costFor(feature: string): number {
  return estimateCost(feature);
}

/**
 * Variable cost engine — replaces the old fixed `AI_COST` map.
 * Returns a credit charge between 0.5 and 7.5 that scales with how much
 * work the AI has to do (chars of input, number of items, rubric depth).
 */
export function estimateCost(
  feature: string,
  payload?: { chars?: number; items?: number; depth?: number; hasImage?: boolean },
): number {
  // Pricing tuned per Phase-2 spec: every AI call falls in the 1.5 – 5
  // credit window, scaling with the volume of work for the model.
  const base: Record<string, number> = {
    ai_grader: 2.5,
    ai_deep_generate: 1.8,
    homework_helper: 1.8,
    analyser: 2.0,
    feedback_bullets: 2.0,
    ai_chat: 1.8,
    default: 1.5,
  };
  const b = base[feature] ?? base.default;
  const chars = payload?.chars ?? 0;
  const items = payload?.items ?? 0;
  const depth = payload?.depth ?? 0;
  const image = payload?.hasImage ? 0.8 : 0;
  const raw = b + (chars / 1200) * 1.0 + items * 0.25 + depth * 0.5 + image;
  return Math.max(1.5, Math.min(5, Math.round(raw * 10) / 10));
}

type CreditState = {
  balance: number;
  // Last day we did a free refill (YYYY-MM-DD local).
  lastDailyRefill: string;
  // Last ISO-week we did a paid-tier auto-refill (YYYY-Www).
  lastWeeklyRefill: string;
  // Track active tier id we already gave the top-up bonus for (so each fresh activation grants once).
  lastTopupTier: string | null;
  lastTopupExpiresAt: number | null;
};

const DEFAULTS: CreditState = {
  balance: FREE_WEEK_CAP, // start friendly
  lastDailyRefill: "",
  lastWeeklyRefill: "",
  lastTopupTier: null,
  lastTopupExpiresAt: null,
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function weekKey(): string {
  const d = new Date();
  const onejan = new Date(d.getFullYear(), 0, 1);
  const dayMs = 86400000;
  const dayOfYear = Math.floor((d.getTime() - onejan.getTime()) / dayMs);
  const w = Math.ceil((dayOfYear + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(w).padStart(2, "0")}`;
}

function read(): CreditState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const r = localStorage.getItem(K_STATE);
    return r ? { ...DEFAULTS, ...JSON.parse(r) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}
function write(s: CreditState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K_STATE, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVT));
}

/** Run all auto-refill checks; idempotent. Returns the updated state. */
function reconcile(): CreditState {
  const s = read();
  let changed = false;

  // ---- Daily free refill ----
  const today = todayKey();
  if (s.lastDailyRefill !== today) {
    // Top free portion up to FREE_WEEK_CAP — but never reduce above-cap balance.
    if (s.balance < FREE_WEEK_CAP) {
      s.balance = Math.min(FREE_WEEK_CAP, s.balance + FREE_DAILY);
    }
    s.lastDailyRefill = today;
    changed = true;
  }

  // ---- Tier activation top-up (once per (tier, expiresAt) tuple) ----
  const active = getActiveTier();
  if (active) {
    const key = `${active.tier}|${active.expiresAt}`;
    const cur = `${s.lastTopupTier}|${s.lastTopupExpiresAt}`;
    if (key !== cur) {
      const bonus = active.tier.startsWith("pro_") ? PRO_TOPUP : STUDENT_TOPUP;
      s.balance = Math.min(PAID_CAP, s.balance + bonus);
      s.lastTopupTier = active.tier;
      s.lastTopupExpiresAt = active.expiresAt;
      changed = true;
    }

    // ---- Weekly tier auto-refill ----
    const wk = weekKey();
    if (s.lastWeeklyRefill !== wk) {
      const bonus = active.tier.startsWith("pro_") ? PRO_WEEKLY : STUDENT_WEEKLY;
      s.balance = Math.min(PAID_CAP, s.balance + bonus);
      s.lastWeeklyRefill = wk;
      changed = true;
    }
  }

  if (changed) write(s);
  return s;
}

export function getCredits(): number {
  return reconcile().balance;
}

export type SpendResult = { ok: true; remaining: number } | { ok: false; need: number; have: number };

/** Try to spend credits for a feature. Accepts an optional payload so the
 *  charge scales with the amount of work the AI is doing. */
export function spendCredits(
  feature: string,
  payload?: { chars?: number; items?: number; depth?: number; hasImage?: boolean },
): SpendResult {
  const cost = estimateCost(feature, payload);
  const s = reconcile();
  if (s.balance < cost) {
    return { ok: false, need: cost, have: s.balance };
  }
  s.balance = Math.round((s.balance - cost) * 100) / 100;
  write(s);
  return { ok: true, remaining: s.balance };
}

/** Admin/dev: grant credits directly. */
export function grantCredits(n: number) {
  const s = reconcile();
  s.balance = Math.min(PAID_CAP, Math.round((s.balance + n) * 100) / 100);
  write(s);
}

export function useAICredits() {
  const [bal, setBal] = useState<number>(0);
  const [tierLabel, setTierLabel] = useState<string>("Free");
  useEffect(() => {
    const sync = () => {
      setBal(getCredits());
      const a = getActiveTier();
      if (a) {
        setTierLabel(TIERS.find((t) => t.id === a.tier)?.label ?? "Plan");
      } else {
        setTierLabel("Free");
      }
    };
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("gradecalc-premium-change", sync);
    const id = setInterval(sync, 60_000); // catch midnight rollover
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("gradecalc-premium-change", sync);
      clearInterval(id);
    };
  }, []);
  return { balance: bal, tierLabel, isPro: isPro(), isStudent: isStudent(), cap: PAID_CAP };
}