// =============================================================================
// Server-only premium logic. The cipher SALT and admin gate credentials live
// here and never reach the client bundle. Defaults are kept for backwards
// compatibility but can be overridden by environment variables.
// =============================================================================
import { createServerFn } from "@tanstack/react-start";

const SALT = (process.env.PREMIUM_CIPHER_SALT ?? "SYSOP-LO6130-99X72-GLOBAL").trim();
const ADMIN_TOKEN = (process.env.ADMIN_SYSOP_TOKEN ?? "SYSOP-LO6130-99X72-GLOBAL").trim();
const ADMIN_PASS = (process.env.ADMIN_DEV_PASSWORD ?? "grADecaLC-2026-aiden63-smart").trim();
const ADMIN_PIN = (process.env.ADMIN_MASTER_PIN ?? "8752948803").trim();

const TIER_CODES = ["PW", "PM", "PA", "SW", "SM", "SA"] as const;
type TierCode = (typeof TIER_CODES)[number];
const TIER_BY_CODE: Record<TierCode, string> = {
  PW: "pro_weekly",
  PM: "pro_monthly",
  PA: "pro_annual",
  SW: "student_weekly",
  SM: "student_monthly",
  SA: "student_annual",
};

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0").toUpperCase();
}
function checkChars(prefix: string, body: string): string {
  return fnv1a(`${SALT}|${prefix}|${body}`).slice(0, 4);
}
function rand36(len: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function adminOk(t: string, p: string, n: string): boolean {
  return t === ADMIN_TOKEN && p === ADMIN_PASS && n === ADMIN_PIN;
}

/** Server-side cipher verification — SALT never leaves the server. */
export const verifyCipherTokenFn = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string }) => {
    if (!input || typeof input.code !== "string") throw new Error("Bad input");
    if (input.code.length > 64) throw new Error("Too long");
    return { code: input.code.trim().toUpperCase() };
  })
  .handler(async ({ data }): Promise<{ tier: string | null }> => {
    const m = /^GP-(PW|PM|PA|SW|SM|SA)-([A-Z0-9]{4,10})-([A-F0-9]{4})$/.exec(data.code);
    if (!m) return { tier: null };
    const [, code, body, check] = m;
    if (checkChars(code, body) !== check) return { tier: null };
    return { tier: TIER_BY_CODE[code as TierCode] };
  });

/** Admin gate verification — credentials live only on the server. */
export const verifyAdminGateFn = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; pass: string; pin: string }) => {
    if (
      !input ||
      typeof input.token !== "string" ||
      typeof input.pass !== "string" ||
      typeof input.pin !== "string"
    )
      throw new Error("Bad input");
    return input;
  })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    return { ok: adminOk(data.token, data.pass, data.pin) };
  });

/** Generate a cipher token — gated by the admin three-factor check. */
export const generateCipherTokenFn = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { tier: string; token: string; pass: string; pin: string }) => {
      if (!input || typeof input !== "object") throw new Error("Bad input");
      if (typeof input.tier !== "string") throw new Error("Bad input");
      const codeMeta = Object.entries(TIER_BY_CODE).find(([, v]) => v === input.tier);
      if (!codeMeta) throw new Error("Unknown tier");
      return input;
    },
  )
  .handler(
    async ({ data }): Promise<{ ok: true; token: string } | { ok: false; message: string }> => {
      if (!adminOk(data.token, data.pass, data.pin)) {
        return { ok: false, message: "Admin verification failed." };
      }
      const entry = Object.entries(TIER_BY_CODE).find(([, v]) => v === data.tier)!;
      const prefix = entry[0];
      const body = rand36(6);
      const check = checkChars(prefix, body);
      return { ok: true, token: `GP-${prefix}-${body}-${check}` };
    },
  );