// =============================================================================
// Server-side OpenRouter proxy. The API key NEVER reaches the client bundle.
// =============================================================================
import { createServerFn } from "@tanstack/react-start";

export const OR_MODELS = {
  grader: "google/gemini-flash-1.5-8b:free",
  analyser: "google/gemini-flash-1.5-8b:free",
  helper: "google/gemini-flash-1.5-8b:free",
} as const;

export type ORFeature = keyof typeof OR_MODELS;

type ORContentBlock =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export type ORMessage = {
  role: "system" | "user" | "assistant";
  content: string | ORContentBlock[];
};

export type ORProxyInput = {
  feature: ORFeature;
  messages: ORMessage[];
  maxTokens?: number;
  temperature?: number;
};

export type ORProxyResult =
  | { ok: true; content: string }
  | { ok: false; status: number; busy: boolean; message: string };

function getServerKeys(): string[] {
  const k1 =
    (process.env.VITE_AI_API_KEY ?? process.env.AI_API_KEY ?? "").trim();
  const k2 =
    (process.env.VITE_AI_API_KEY_2 ?? process.env.AI_API_KEY_2 ?? "").trim();
  return [k1, k2].filter((x) => x.length > 8);
}

export const hasOpenRouterKeyFn = createServerFn({ method: "GET" }).handler(
  async () => getServerKeys().length > 0,
);

export const openrouterProxy = createServerFn({ method: "POST" })
  .inputValidator((input: ORProxyInput) => {
    if (!input || typeof input !== "object") throw new Error("Bad input");
    if (!input.feature || !(input.feature in OR_MODELS)) {
      throw new Error("Unknown feature");
    }
    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new Error("messages required");
    }
    return input;
  })
  .handler(async ({ data }): Promise<ORProxyResult> => {
    const keys = getServerKeys();
    if (!keys.length) {
      return {
        ok: false,
        status: 0,
        busy: false,
        message: "AI key missing. Add AI_API_KEY in project secrets.",
      };
    }
    const model = OR_MODELS[data.feature];
    let last: ORProxyResult | null = null;
    for (let i = 0; i < keys.length; i++) {
      try {
        const res = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${keys[i]}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://gradepal-insight.lovable.app",
              "X-Title": "GradePal",
            },
            body: JSON.stringify({
              model,
              messages: data.messages,
              max_tokens: data.maxTokens ?? 1200,
              temperature: data.temperature ?? 0.7,
            }),
          },
        );
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          const busy = res.status === 429 || res.status === 503 || res.status === 502;
          if ((busy || res.status === 401 || res.status === 402) && i < keys.length - 1) {
            last = { ok: false, status: res.status, busy, message: txt.slice(0, 200) };
            continue;
          }
          if (busy) {
            return {
              ok: false,
              status: res.status,
              busy: true,
              message:
                "This AI model's free server is busy right now. Please retry in a few seconds.",
            };
          }
          return {
            ok: false,
            status: res.status,
            busy: false,
            message: `OpenRouter ${res.status} — ${txt.slice(0, 200) || "no response body"}`,
          };
        }
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = json?.choices?.[0]?.message?.content ?? "";
        return { ok: true, content: String(content) };
      } catch (e) {
        if (i < keys.length - 1) {
          last = {
            ok: false,
            status: 0,
            busy: false,
            message: e instanceof Error ? e.message : "request failed",
          };
          continue;
        }
        return {
          ok: false,
          status: 0,
          busy: false,
          message: e instanceof Error ? e.message : "request failed",
        };
      }
    }
    return last ?? { ok: false, status: 0, busy: false, message: "OpenRouter request failed." };
  });