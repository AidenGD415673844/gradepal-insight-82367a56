// =============================================================================
// Server-side OpenRouter proxy. The API key NEVER reaches the client bundle.
// =============================================================================
import { createServerFn } from "@tanstack/react-start";

export const OR_MODELS = {
  grader: "openrouter/free",
  analyser: "openrouter/free",
  helper: "openrouter/free",
} as const;

const OR_MODEL_CANDIDATES = {
  grader: [
    { id: "openrouter/free", label: "Free Vision Router", vision: true },
    { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B Vision", vision: true },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", vision: false },
  ],
  analyser: [
    { id: "openrouter/free", label: "Free Analysis Router", vision: true },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", vision: false },
    { id: "openai/gpt-oss-120b:free", label: "GPT OSS 120B", vision: false },
  ],
  helper: [
    { id: "openrouter/free", label: "Free Homework Router", vision: true },
    { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B", vision: true },
    { id: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B", vision: false },
  ],
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
  | { ok: true; content: string; model: string; modelLabel: string }
  | { ok: false; status: number; busy: boolean; message: string };

function hasImagePayload(messages: ORMessage[]): boolean {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === "image_url"));
}

function hasInlineImageInText(messages: ORMessage[]): boolean {
  return messages.some((m) => typeof m.content === "string" && /data:image\/[a-z0-9.+-]+;base64,/i.test(m.content));
}

function getServerKeys(): string[] {
  const k1 = (process.env.AI_API_KEY ?? "").trim();
  const k2 = (process.env.AI_API_KEY_2 ?? "").trim();
  const k3 = (process.env.AI_API_KEY_3 ?? "").trim();
  return [k1, k2, k3].filter((x) => x.length > 8);
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
    // Reject any image_url that isn't an inline data: URI. Forwarding arbitrary
    // external URLs would let callers proxy fetches through OpenRouter and
    // consume image-processing quota against external hosts.
    for (const m of input.messages) {
      if (Array.isArray(m.content)) {
        for (const block of m.content) {
          if (block && block.type === "image_url") {
            const url = block.image_url?.url;
            if (typeof url !== "string" || !/^data:image\/[a-z0-9.+-]+;base64,/i.test(url)) {
              throw new Error("image_url must be an inline data:image/* base64 URI");
            }
          }
        }
      }
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
    if (hasInlineImageInText(data.messages)) {
      return {
        ok: false,
        status: 400,
        busy: false,
        message: "Image uploads must be sent as image blocks, not pasted into the text prompt.",
      };
    }
    const needsVision = hasImagePayload(data.messages);
    const candidates = OR_MODEL_CANDIDATES[data.feature].filter((m) => !needsVision || m.vision);
    let last: ORProxyResult | null = null;
    for (let i = 0; i < keys.length; i++) {
      for (const candidate of candidates) {
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
                model: candidate.id,
                messages: data.messages,
                max_tokens: Math.min(data.maxTokens ?? 4000, 8000),
                temperature: data.temperature ?? 0.7,
              }),
            },
          );
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            const lower = txt.toLowerCase();
            const modelMissing = res.status === 404 || lower.includes("no endpoints found") || lower.includes("model not found");
            const busy = res.status === 429 || res.status === 503 || res.status === 502;
            if (modelMissing && candidate !== candidates[candidates.length - 1]) {
              last = {
                ok: false,
                status: res.status,
                busy: false,
                message: `${candidate.id} is unavailable; trying fallback model.`,
              };
              continue;
            }
            if ((busy || res.status === 401 || res.status === 402) && i < keys.length - 1) {
              last = { ok: false, status: res.status, busy, message: txt.slice(0, 200) };
              break;
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
            if (modelMissing) {
              return {
                ok: false,
                status: res.status,
                busy: false,
                message:
                  "No currently available OpenRouter endpoint could handle this request. Try again shortly or switch to a text-only prompt.",
              };
            }
            return {
              ok: false,
              status: res.status,
              busy: false,
              message: `OpenRouter ${res.status} — ${txt.slice(0, 260) || "no response body"}`,
            };
          }
          const json = (await res.json()) as {
            choices?: { message?: { content?: string | { text?: string }[] } }[];
          };
          const rawContent = json?.choices?.[0]?.message?.content ?? "";
          const content = Array.isArray(rawContent)
            ? rawContent.map((part) => part.text ?? "").join("\n")
            : rawContent;
          return { ok: true, content: String(content), model: candidate.id, modelLabel: candidate.label };
        } catch (e) {
          if (candidate !== candidates[candidates.length - 1]) {
            last = {
              ok: false,
              status: 0,
              busy: false,
              message: e instanceof Error ? e.message : "request failed",
            };
            continue;
          }
          if (i < keys.length - 1) {
            last = {
              ok: false,
              status: 0,
              busy: false,
              message: e instanceof Error ? e.message : "request failed",
            };
            break;
          }
          return {
            ok: false,
            status: 0,
            busy: false,
            message: e instanceof Error ? e.message : "request failed",
          };
        }
      }
    }
    return last ?? { ok: false, status: 0, busy: false, message: "OpenRouter request failed." };
  });