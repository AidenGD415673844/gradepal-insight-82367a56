// =============================================================================
// AI Analyser background turn manager — keeps OpenRouter requests alive across
// route changes and tab visibility drops. Resolves directly into localStorage
// so the chat hydrates losslessly when the component remounts.
// =============================================================================
import { callOpenRouter, OpenRouterError, type ORMessage, type ORModel } from "./openrouter";
import { sanitizeAIOutput } from "./ai-sanitize";
import { refundCredits } from "./ai-credits";

export type AnalyserMsg = { role: "user" | "assistant"; content: string; ts: number };

const STORE_KEY = "gradecalc_ai_pro_chat_v1";
const PENDING_KEY = "gradecalc_ai_pro_pending_v1";
const EVT = "gradecalc-ai-inflight";

type Pending = {
  ts: number;
  cost: number;
  feature: ORModel;
};

function readMsgs(): AnalyserMsg[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeMsgs(arr: AnalyserMsg[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE_KEY, JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent(EVT));
}
function setPending(p: Pending | null) {
  if (typeof window === "undefined") return;
  if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
  else localStorage.removeItem(PENDING_KEY);
  window.dispatchEvent(new CustomEvent(EVT));
}
export function getPending(): Pending | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || "null");
  } catch {
    return null;
  }
}

/**
 * Fire an AI turn that survives unmount/navigation. The user message must
 * already be appended to localStorage by the caller; this function appends
 * the assistant reply (or refunds + surfaces an error) once the network
 * round-trip completes.
 */
export async function runAnalyserTurn(opts: {
  feature: ORModel;
  messages: ORMessage[];
  cost: number;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ ok: true; content: string } | { ok: false; reason: string; refunded: number }> {
  setPending({ ts: Date.now(), cost: opts.cost, feature: opts.feature });
  try {
    const reply = await callOpenRouter({
      feature: opts.feature,
      maxTokens: opts.maxTokens ?? 6000,
      temperature: opts.temperature ?? 0.6,
      messages: opts.messages,
    });
    const cleaned = sanitizeAIOutput(reply || "");
    // Empty / pathological response → refund and surface failure without
    // mutating the chat log with a blank assistant bubble.
    if (!cleaned.trim() || cleaned.trim().length < 6) {
      refundCredits(opts.cost);
      setPending(null);
      return { ok: false, reason: "Empty AI response — credits refunded.", refunded: opts.cost };
    }
    const next: AnalyserMsg = { role: "assistant", content: cleaned, ts: Date.now() };
    writeMsgs([...readMsgs(), next]);
    setPending(null);
    return { ok: true, content: cleaned };
  } catch (e) {
    refundCredits(opts.cost);
    setPending(null);
    const msg =
      e instanceof OpenRouterError && e.busy
        ? "AI server is busy — credits refunded, please retry."
        : e instanceof Error
          ? e.message
          : "Request failed — credits refunded.";
    return { ok: false, reason: msg, refunded: opts.cost };
  }
}

export function subscribeInflight(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(EVT, fn);
    window.removeEventListener("storage", fn);
  };
}

export const INFLIGHT_STORE_KEY = STORE_KEY;