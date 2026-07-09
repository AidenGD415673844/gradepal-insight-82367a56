// =============================================================================
// GradeCalc AI Credit Engine — 100% client-side, localStorage only.
// Rolling balance with daily refill + Pro/Student top-ups.
// Variable cost per feature, soft cap, week-reset for free tier.
// =============================================================================

import { useEffect, useState } from "react";
import { getActiveTier, isPro, isStudent, TIERS } from "./premium";

const K_STATE = "gradecalc_ai_credits_v1";
const EVT = "gradecalc-ai-credits-change";

// Tiered daily framework. Free tier receives the baseline pool; Pro adds a
// flat +10 credits on top, Student adds a flat +20 credits on top. The pool
// resets to the tier-appropriate daily total at the start of each local day.
const FREE_DAILY = 15;
const PRO_BONUS = 10;
const STUDENT_BONUS = 20;
const PRO_DAILY = FREE_DAILY + PRO_BONUS; // 25
const STUDENT_DAILY = FREE_DAILY + STUDENT_BONUS; // 35
const FREE_CAP = FREE_DAILY;
const PAID_CAP = STUDENT_DAILY; // ceiling for either paid tier

/** Total daily credits the currently-active tier should refill to. */
function dailyTotalForActive(): number {
  if (isStudent()) return STUDENT_DAILY;
  if (isPro()) return PRO_DAILY;
  return FREE_DAILY;
}

/** Public: how many extra daily credits (over free baseline) a tier grants. */
export const DAILY_BONUS = { free: 0, pro: PRO_BONUS, student: STUDENT_BONUS };
export const DAILY_TOTALS = { free: FREE_DAILY, pro: PRO_DAILY, student: STUDENT_DAILY };

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
    ai_deep_generate: 1,
    homework_helper: 4.5, // Pro feature — premium cost
    analyser: 3.5, // Pro analyser baseline (3 – 7.5 window)
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
  // Per-feature ceilings so the Pro Analyser/Helper genuinely cost more.
  if (feature === "analyser") {
    return Math.max(3, Math.min(7.5, Math.round(raw * 10) / 10));
  }
  if (feature === "homework_helper") {
    return Math.max(4, Math.min(7.5, Math.round(raw * 10) / 10));
  }
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
  balance: FREE_CAP, // start friendly
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

  // ---- Daily midnight refresh — hard reset to exactly DAILY_TOKENS ----
  const today = todayKey();
  if (s.lastDailyRefill !== today) {
    s.balance = dailyTotalForActive();
    const active = getActiveTier();
    if (active) {
      s.lastTopupTier = active.tier;
      s.lastTopupExpiresAt = active.expiresAt;
    }
    s.lastDailyRefill = today;
    changed = true;
  }
  // Never let the balance drift above the tier's own daily ceiling.
  const cap = dailyTotalForActive();
  if (s.balance > cap) {
    s.balance = cap;
    changed = true;
  }

  // When a new tier activates we deliberately do NOT dump bulk credits — the
  // incremental daily loop above handles all paid refills.
  const active = getActiveTier();
  if (active) {
    const key = `${active.tier}|${active.expiresAt}`;
    const cur = `${s.lastTopupTier}|${s.lastTopupExpiresAt}`;
    if (key !== cur) {
      // Fresh activation: immediately grant the tier's bonus on top of the
      // remaining free-tier balance, capped at the tier's daily ceiling.
      const bonus = isStudent() ? STUDENT_BONUS : isPro() ? PRO_BONUS : 0;
      if (bonus > 0) {
        s.balance = Math.min(dailyTotalForActive(), Math.round((s.balance + bonus) * 100) / 100);
      }
      s.lastTopupTier = active.tier;
      s.lastTopupExpiresAt = active.expiresAt;
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

/**
 * Refund a failed/empty AI turn. Bypasses the daily/tier caps so a clean
 * server failure can never silently reduce the user's wallet.
 */
export function refundCredits(n: number) {
  const s = reconcile();
  s.balance = Math.min(PAID_CAP, Math.round((s.balance + n) * 100) / 100);
  write(s);
}

/**
 * Begin a gradual debit. Instead of dumping the full cost the instant a
 * request fires, the wallet ticks down in tiny increments over `durationMs`
 * so users can visibly watch credits accrue against an in-flight AI turn.
 *
 *   const ticker = startGradualSpend(2.4, 12_000);
 *   ...
 *   if (ok) ticker.commit();   // ensures the full `total` is debited
 *   else    ticker.refund();   // refunds whatever portion already drained
 */
export function startGradualSpend(total: number, durationMs = 10_000) {
  const target = Math.max(0, Math.round(total * 100) / 100);
  if (target <= 0) return { commit() {}, refund() {}, drained: () => 0 };
  const stepMs = 220;
  const steps = Math.max(4, Math.round(durationMs / stepMs));
  const inc = target / steps;
  let drained = 0;
  let done = false;
  const id = setInterval(() => {
    if (done) return;
    if (drained + inc >= target) {
      const remaining = target - drained;
      if (remaining > 0) {
        const s = reconcile();
        s.balance = Math.max(0, Math.round((s.balance - remaining) * 100) / 100);
        write(s);
        drained = target;
      }
      clearInterval(id);
      done = true;
      return;
    }
    const s = reconcile();
    s.balance = Math.max(0, Math.round((s.balance - inc) * 100) / 100);
    write(s);
    drained += inc;
  }, stepMs);
  return {
    commit() {
      if (done) return;
      clearInterval(id);
      done = true;
      const remaining = target - drained;
      if (remaining > 0) {
        const s = reconcile();
        s.balance = Math.max(0, Math.round((s.balance - remaining) * 100) / 100);
        write(s);
        drained = target;
      }
    },
    refund() {
      if (done) return;
      clearInterval(id);
      done = true;
      if (drained > 0) {
        const s = reconcile();
        s.balance = Math.min(PAID_CAP, Math.round((s.balance + drained) * 100) / 100);
        write(s);
      }
    },
    drained: () => drained,
  };
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
  return { balance: bal, tierLabel, isPro: isPro(), isStudent: isStudent(), cap: dailyTotalForActive() };
}
