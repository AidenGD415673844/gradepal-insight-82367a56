import { useEffect, useState } from "react";
import { GLOBAL_PROMOS, type GlobalPromo } from "./premium-codes";
import { BROADCAST_MASTERS, BROADCAST_PROMOS } from "./premium-broadcast";
import { verifyCipherTokenFn } from "./premium.functions";

// ===== Storage keys ============================================================
const K_TIER = "gradecalc_premium_v1";
const K_WALLET = "gradecalc_wallet_balance";
const K_REDEEMED = "gradecalc_redeemed_codes";
const K_MASTERS = "gradecalc_master_licenses";
const K_LOCAL_PROMOS = "gradecalc_local_promos";
export const K_SYSOP = "gradecalc_sysop_token";

const EVT = "gradecalc-premium-change";
const fire = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT));
};

// ===== Types ===================================================================
export type Tier =
  | "pro_weekly"
  | "pro_monthly"
  | "pro_annual"
  | "student_weekly"
  | "student_monthly"
  | "student_annual";

export type TierMeta = {
  id: Tier;
  label: string;
  hkd: number;
  family: "pro" | "student";
  durationDays: number;
  code: string; // 2-letter cipher prefix
};

export const TIERS: TierMeta[] = [
  { id: "pro_weekly", label: "Pro Weekly", hkd: 7, family: "pro", durationDays: 7, code: "PW" },
  { id: "pro_monthly", label: "Pro Monthly", hkd: 25, family: "pro", durationDays: 30, code: "PM" },
  { id: "pro_annual", label: "Pro Annual", hkd: 160, family: "pro", durationDays: 365, code: "PA" },
  { id: "student_weekly", label: "Student Weekly", hkd: 14, family: "student", durationDays: 7, code: "SW" },
  { id: "student_monthly", label: "Student Monthly", hkd: 40, family: "student", durationDays: 30, code: "SM" },
  { id: "student_annual", label: "Student Annual", hkd: 320, family: "student", durationDays: 365, code: "SA" },
];

export type ActiveTier = { tier: Tier; expiresAt: number; source: string } | null;

// ===== JSON helpers ============================================================
function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : fb;
  } catch {
    return fb;
  }
}
function write(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(k, JSON.stringify(v));
  fire();
}

// ===== Tier state ==============================================================
export function getActiveTier(): ActiveTier {
  const a = read<ActiveTier>(K_TIER, null);
  if (!a) return null;
  if (a.expiresAt < Date.now()) return null;
  return a;
}
export function isPro(): boolean {
  const a = getActiveTier();
  return !!a && a.tier.startsWith("pro_");
}
export function isStudent(): boolean {
  const a = getActiveTier();
  return !!a && a.tier.startsWith("student_");
}
export function activateTier(tier: Tier, source: string) {
  const meta = TIERS.find((t) => t.id === tier)!;
  const current = getActiveTier();
  // Extend if same tier already active
  const base = current && current.tier === tier ? current.expiresAt : Date.now();
  const expiresAt = base + meta.durationDays * 86400_000;
  write(K_TIER, { tier, expiresAt, source });
}
export function clearTier() {
  localStorage.removeItem(K_TIER);
  fire();
}

/**
 * Switch back to the free plan with zero cost. Any remaining paid time is
 * forfeited gracefully (no wallet refund, but the wallet itself is preserved).
 */
export function downgradeToFree(): void {
  localStorage.removeItem(K_TIER);
  fire();
}

// ===== Wallet ==================================================================
export const WALLET_CAP = 50;
export function getWallet(): number {
  return read<number>(K_WALLET, 0);
}
export function setWallet(n: number) {
  const clamped = Math.max(0, Math.min(WALLET_CAP, Math.round(n * 100) / 100));
  write(K_WALLET, clamped);
}
export function addWallet(delta: number): number {
  const next = Math.min(WALLET_CAP, Math.max(0, getWallet() + delta));
  setWallet(next);
  return next;
}
export function spendWallet(amount: number): boolean {
  const w = getWallet();
  if (w < amount) return false;
  setWallet(w - amount);
  return true;
}

// ===== Smart purchase logic ===================================================
function tierRank(t: Tier): number {
  const meta = TIERS.find((x) => x.id === t)!;
  const fam = meta.family === "pro" ? 1000 : 100;
  return fam + meta.durationDays;
}

export type PurchaseCheck =
  | { kind: "block"; reason: string }
  | { kind: "free"; reason: string }
  | { kind: "charge" };

/** Blocks unfair double-purchase, free-switches lateral/down moves. */
export function checkPurchase(targetTier: Tier): PurchaseCheck {
  const cur = getActiveTier();
  if (!cur) return { kind: "charge" };
  const curMeta = TIERS.find((t) => t.id === cur.tier)!;
  const tarMeta = TIERS.find((t) => t.id === targetTier)!;
  if (cur.tier === targetTier) {
    const remainingMs = cur.expiresAt - Date.now();
    if (remainingMs > 24 * 3600_000) {
      const days = Math.ceil(remainingMs / 86400_000);
      return {
        kind: "block",
        reason: `Already active for ~${days} more day${days === 1 ? "" : "s"}. Extension unlocks within 24h of expiry.`,
      };
    }
    return { kind: "charge" };
  }
  // Cross-family: only block when an upmarket Pro tier is active and the user
  // tries to slide laterally into a Student tier of greater or equal monetary
  // value (prevents free upgrade via the Student ladder).
  if (curMeta.family === "pro" && tarMeta.family === "student" && tarMeta.hkd >= curMeta.hkd) {
    return {
      kind: "block",
      reason: `You're on ${curMeta.label}. Student tiers of equal or greater value require a wait-out or a new purchase.`,
    };
  }
  // Same family OR cross-family downgrade — allow a free, value-proportionate switch.
  if (tierRank(cur.tier) >= tierRank(targetTier)) {
    return { kind: "free", reason: "Free switch — remaining value carries over proportionally." };
  }
  return { kind: "charge" };
}

/** Switch tier without wallet debit, carrying remaining value proportionally. */
export function switchTierFree(target: Tier, source: string) {
  const cur = getActiveTier();
  const tm = TIERS.find((t) => t.id === target)!;
  if (!cur) {
    write(K_TIER, { tier: target, expiresAt: Date.now() + tm.durationDays * 86400_000, source });
    return;
  }
  const cm = TIERS.find((t) => t.id === cur.tier)!;
  const remainingMs = Math.max(0, cur.expiresAt - Date.now());
  // Convert remaining time into "currency value" then re-denominate against
  // the target tier's daily rate. Clamp the carry-over so a downgrade never
  // blows past the target's natural duration (prevents the 174↔200 marker
  // leakage bug where mismatched daily rates produced runaway expiry dates).
  const dailyCur = cm.hkd / cm.durationDays;
  const dailyTarget = tm.hkd / tm.durationDays;
  const remainingDays = remainingMs / 86400_000;
  const remainingValue = remainingDays * dailyCur;
  const targetDays = dailyTarget > 0 ? remainingValue / dailyTarget : remainingDays;
  const clampedDays = Math.max(0, Math.min(targetDays, tm.durationDays));
  const carryMs = clampedDays * 86400_000;
  write(K_TIER, { tier: target, expiresAt: Date.now() + carryMs, source });
}

// ===== Cipher token =============================================================
// Verification happens server-side; the SALT lives only in
// `premium.functions.ts` and never reaches the client bundle.
const CIPHER_SHAPE = /^GP-(PW|PM|PA|SW|SM|SA)-[A-Z0-9]{4,10}-[A-F0-9]{4}$/;
/** Cheap client-side shape check (does NOT validate authenticity). */
export function looksLikeCipherToken(raw: string): boolean {
  return CIPHER_SHAPE.test(raw.trim().toUpperCase());
}
/** Async, server-verified cipher check. Returns the unlocked Tier or null. */
export async function verifyCipherToken(raw: string): Promise<Tier | null> {
  if (!looksLikeCipherToken(raw)) return null;
  try {
    const r = await verifyCipherTokenFn({ data: { code: raw } });
    return (r?.tier as Tier | null) ?? null;
  } catch {
    return null;
  }
}

// ===== Master license registry (admin Tab B) ===================================
// Lines of "KEY=AMOUNT_HKD" or "KEY=tier:pro_monthly"
export type MasterEntry = { key: string; kind: "wallet" | "tier"; amount?: number; tier?: Tier };
/** Only the locally-saved (device-only) master entries. */
export function getLocalMasters(): MasterEntry[] {
  return read<MasterEntry[]>(K_MASTERS, []);
}
/** All effective masters = bundled BROADCAST + local. */
export function getMasters(): MasterEntry[] {
  const local = getLocalMasters();
  const seen = new Set<string>();
  return [...BROADCAST_MASTERS, ...local].filter((m) => {
    const k = m.key.toUpperCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
export function setMasters(list: MasterEntry[]) {
  write(K_MASTERS, list);
}
export function parseMasterRegistry(text: string): MasterEntry[] {
  const out: MasterEntry[] = [];
  for (const raw of text.split(/[\n,]+/)) {
    const line = raw.trim();
    if (!line) continue;
    const [keyRaw, valRaw] = line.split("=");
    if (!keyRaw || !valRaw) continue;
    const key = keyRaw.trim().toUpperCase();
    const val = valRaw.trim();
    if (val.toLowerCase().startsWith("tier:")) {
      const t = val.slice(5).trim() as Tier;
      if (TIERS.find((x) => x.id === t)) out.push({ key, kind: "tier", tier: t });
    } else {
      const n = Number(val);
      if (Number.isFinite(n) && n > 0) out.push({ key, kind: "wallet", amount: n });
    }
  }
  return out;
}

// ===== Local promos (admin Tab C live, before export) =========================
export function getLocalPromos(): GlobalPromo[] {
  return read<GlobalPromo[]>(K_LOCAL_PROMOS, []);
}
export function setLocalPromos(list: GlobalPromo[]) {
  write(K_LOCAL_PROMOS, list);
}
export function allPromos(): GlobalPromo[] {
  const seen = new Set<string>();
  const merge = [...GLOBAL_PROMOS, ...BROADCAST_PROMOS, ...getLocalPromos()];
  return merge.filter((p) => {
    const k = p.code.toUpperCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ===== Redemption guard ========================================================
export function getRedeemed(): string[] {
  return read<string[]>(K_REDEEMED, []);
}
function markRedeemed(code: string) {
  const r = getRedeemed();
  if (!r.includes(code)) write(K_REDEEMED, [...r, code]);
}
/** Admin: forget a redeemed code so it can be reused for testing. */
export function deleteRedeemed(code: string) {
  write(K_REDEEMED, getRedeemed().filter((c) => c.toUpperCase() !== code.toUpperCase()));
}
/** Admin: wipe entire redemption log. */
export function clearRedeemed() {
  write(K_REDEEMED, []);
}

// ===== Code evaluation (the "Enter Code Here" gateway) =========================
export type RedeemResult =
  | { ok: true; kind: "tier"; tier: Tier; message: string }
  | { ok: true; kind: "wallet"; hkd: number; message: string }
  | { ok: false; message: string };

export async function redeemCode(raw: string): Promise<RedeemResult> {
  const code = raw.trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a code." };

  // 1) Cipher token (one-shot per device)
  const cipherTier = await verifyCipherToken(code);
  if (cipherTier) {
    if (getRedeemed().includes(code))
      return { ok: false, message: "Invalid code or already redeemed." };
    activateTier(cipherTier, "cipher");
    markRedeemed(code);
    const meta = TIERS.find((t) => t.id === cipherTier)!;
    return { ok: true, kind: "tier", tier: cipherTier, message: `${meta.label} unlocked!` };
  }

  // 2) Master license registry (admin Tab B, one-shot per device)
  const master = getMasters().find((m) => m.key === code);
  if (master) {
    if (getRedeemed().includes(code))
      return { ok: false, message: "Invalid code or already redeemed." };
    markRedeemed(code);
    if (master.kind === "tier" && master.tier) {
      activateTier(master.tier, "master");
      const meta = TIERS.find((t) => t.id === master.tier)!;
      return { ok: true, kind: "tier", tier: master.tier, message: `${meta.label} unlocked!` };
    }
    if (master.kind === "wallet" && master.amount) {
      const before = getWallet();
      addWallet(master.amount);
      const credited = getWallet() - before;
      return {
        ok: true,
        kind: "wallet",
        hkd: credited,
        message: `Promo Code Applied: +$${credited.toFixed(2)} HKD added to wallet balance`,
      };
    }
  }

  // 3) Promo word codes (global + local), one redemption per profile
  const promo = allPromos().find((p) => p.code.toUpperCase() === code);
  if (promo) {
    if (getRedeemed().includes(code))
      return { ok: false, message: "Invalid code or already redeemed." };
    markRedeemed(code);
    const before = getWallet();
    addWallet(promo.hkd);
    const credited = getWallet() - before;
    return {
      ok: true,
      kind: "wallet",
      hkd: credited,
      message: `Promo Code Applied: +$${credited.toFixed(2)} HKD added to wallet balance`,
    };
  }

  return { ok: false, message: "Invalid code or already redeemed." };
}

// ===== React hook ==============================================================
export function usePremium() {
  const [v, set] = useState({
    tier: null as ActiveTier,
    wallet: 0,
    pro: false,
    student: false,
  });
  useEffect(() => {
    const sync = () =>
      set({
        tier: getActiveTier(),
        wallet: getWallet(),
        pro: isPro(),
        student: isStudent(),
      });
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return v;
}