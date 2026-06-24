// =============================================================================
// OpenRouter client — direct frontend fetch with VITE_AI_API_KEY + fallback to
// VITE_AI_API_KEY_2. Multi-model architecture per feature.
// All keys are pulled from import.meta.env so raw values never appear in
// component source. Use this module everywhere instead of hard-coding fetch.
// =============================================================================

export const OR_MODELS = {
  grader: "meta-llama/llama-3-8b-instruct:free",
  analyser: "mistralai/mistral-7b-instruct:free",
  helper: "google/gemini-flash-1.5-8b:free",
} as const;

export type ORModel = keyof typeof OR_MODELS;

type ORMessage = { role: "system" | "user" | "assistant"; content: string };

function getKeys(): string[] {
  const k1 = (import.meta.env.VITE_AI_API_KEY as string | undefined)?.trim();
  const k2 = (import.meta.env.VITE_AI_API_KEY_2 as string | undefined)?.trim();
  return [k1, k2].filter((x): x is string => !!x && x.length > 8);
}

export function hasOpenRouterKey(): boolean {
  return getKeys().length > 0;
}

export class OpenRouterError extends Error {
  status: number;
  busy: boolean;
  constructor(message: string, status: number, busy = false) {
    super(message);
    this.status = status;
    this.busy = busy;
  }
}

/**
 * Call OpenRouter directly from the browser. Tries the primary key, then
 * automatically retries on the fallback key for rate-limit / auth failures.
 * Throws OpenRouterError on hard failure.
 */
export async function callOpenRouter(opts: {
  feature: ORModel;
  messages: ORMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const keys = getKeys();
  if (!keys.length) {
    throw new OpenRouterError(
      "AI key missing. Add VITE_AI_API_KEY in project secrets.",
      0,
    );
  }
  const model = OR_MODELS[opts.feature];
  let lastErr: OpenRouterError | null = null;
  for (let i = 0; i < keys.length; i++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keys[i]}`,
          "Content-Type": "application/json",
          "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://gradepal-insight.lovable.app",
          "X-Title": "GradePal",
        },
        body: JSON.stringify({
          model,
          messages: opts.messages,
          max_tokens: opts.maxTokens ?? 1200,
          temperature: opts.temperature ?? 0.7,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        const busy = res.status === 429 || res.status === 503 || res.status === 502;
        // Retry on next key if rate-limited or auth/credit error
        if ((busy || res.status === 401 || res.status === 402) && i < keys.length - 1) {
          lastErr = new OpenRouterError(`${res.status}: ${txt.slice(0, 200)}`, res.status, busy);
          continue;
        }
        if (busy) {
          throw new OpenRouterError(
            "This AI model's free server is busy right now. Please retry in a few seconds.",
            res.status,
            true,
          );
        }
        throw new OpenRouterError(
          `OpenRouter ${res.status} — ${txt.slice(0, 200) || "no response body"}`,
          res.status,
        );
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content ?? "";
      return String(content);
    } catch (e) {
      if (e instanceof OpenRouterError && i < keys.length - 1) {
        lastErr = e;
        continue;
      }
      throw e;
    }
  }
  throw lastErr ?? new OpenRouterError("OpenRouter request failed.", 0);
}