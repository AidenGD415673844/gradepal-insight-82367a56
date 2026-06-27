// =============================================================================
// Zero-Knowledge Local Vault — Base64 + XOR rotational scrambler keyed off the
// user's 4-digit PIN. Encrypts a defined allow-list of localStorage registries
// (subjects, peer logs, chat history, timetable blocks). Entering the PIN
// descrambles in-memory and re-emits change events so charts/cards re-render.
//
// NOTE: This is intentionally NOT cryptographically strong — it is a local
// privacy shroud (frosted-glass effect) that hides plaintext from casual
// browser inspection of localStorage. A determined attacker with code access
// could still recover data. We surface this in the UI.
// =============================================================================

import { useEffect, useState } from "react";

const PIN_META = "gradecalc_pin_meta_v1";
const PIN_LOCKED = "gradecalc_pin_locked_v1";
const SCRAMBLE_PREFIX = "GPENC1::";
const EVT = "gradecalc-pin-vault-change";

// Allow-list of registry keys that get scrambled. Infra keys (auth, theme,
// preferences, premium tier) are intentionally excluded so the app shell
// remains operable under lock.
export const VAULT_KEYS = [
  "gradecalc-tasks-v1",
  "gradecalc-courses-v1",
  "gradecalc-terms-v1",
  "gradecalc-scale-v1",
  "gradecalc-attendance-v1",
  "gradecalc-timetable-v1",
  "gradecalc-kanban-status-v1",
  "gradecalc_ai_pro_chat_v1",
  "gradecalc-peer-network-v1",
  "gradecalc-peer-chat-v1",
  "gradecalc-group-chat-v1",
  "syllabus-mastery-v1",
];

type PinMeta = { pinHashHex: string; updatedAt: number };

function fire() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT));
}

function read<T>(key: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const r = localStorage.getItem(key);
    return r ? (JSON.parse(r) as T) : fb;
  } catch {
    return fb;
  }
}

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const out = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(out))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function xorScramble(text: string, pin: string): string {
  if (!pin) return text;
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    out.push(text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
  }
  const bin = String.fromCharCode(...out);
  return SCRAMBLE_PREFIX + btoa(unescape(encodeURIComponent(bin)));
}

function xorDescramble(scrambled: string, pin: string): string | null {
  if (!scrambled.startsWith(SCRAMBLE_PREFIX)) return scrambled;
  try {
    const bin = decodeURIComponent(escape(atob(scrambled.slice(SCRAMBLE_PREFIX.length))));
    const out: number[] = [];
    for (let i = 0; i < bin.length; i++) {
      out.push(bin.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return String.fromCharCode(...out);
  } catch {
    return null;
  }
}

export function isPinConfigured(): boolean {
  return !!read<PinMeta | null>(PIN_META, null);
}
export function isVaultLocked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PIN_LOCKED) === "1";
}

export async function configurePin(pin: string): Promise<void> {
  if (!/^\d{4}$/.test(pin)) throw new Error("PIN must be exactly 4 digits.");
  const meta: PinMeta = { pinHashHex: await sha256Hex(pin), updatedAt: Date.now() };
  localStorage.setItem(PIN_META, JSON.stringify(meta));
  // Scramble the allow-list immediately and lock.
  for (const key of VAULT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && !raw.startsWith(SCRAMBLE_PREFIX)) {
      localStorage.setItem(key, xorScramble(raw, pin));
    }
  }
  localStorage.setItem(PIN_LOCKED, "1");
  fire();
}

export async function unlockVault(pin: string): Promise<boolean> {
  const meta = read<PinMeta | null>(PIN_META, null);
  if (!meta) return true;
  if ((await sha256Hex(pin)) !== meta.pinHashHex) return false;
  for (const key of VAULT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && raw.startsWith(SCRAMBLE_PREFIX)) {
      const plain = xorDescramble(raw, pin);
      if (plain) localStorage.setItem(key, plain);
    }
  }
  localStorage.removeItem(PIN_LOCKED);
  fire();
  // Re-broadcast core change events so charts/cards re-render.
  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("syllabus-mastery-change"));
  return true;
}

export async function lockVaultNow(pin: string): Promise<boolean> {
  const meta = read<PinMeta | null>(PIN_META, null);
  if (!meta) return false;
  if ((await sha256Hex(pin)) !== meta.pinHashHex) return false;
  for (const key of VAULT_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw && !raw.startsWith(SCRAMBLE_PREFIX)) {
      localStorage.setItem(key, xorScramble(raw, pin));
    }
  }
  localStorage.setItem(PIN_LOCKED, "1");
  fire();
  return true;
}

/** Remove PIN entirely. Requires the correct PIN to descramble first. */
export async function disablePin(pin: string): Promise<boolean> {
  const ok = await unlockVault(pin);
  if (!ok) return false;
  localStorage.removeItem(PIN_META);
  localStorage.removeItem(PIN_LOCKED);
  fire();
  return true;
}

export function usePinVault() {
  const [state, setState] = useState({
    configured: isPinConfigured(),
    locked: isVaultLocked(),
  });
  useEffect(() => {
    const refresh = () => setState({ configured: isPinConfigured(), locked: isVaultLocked() });
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return state;
}
