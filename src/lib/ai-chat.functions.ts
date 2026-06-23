import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(8000),
});

const InputSchema = z.object({
  context: z.string().max(8000).optional(),
  messages: z.array(MessageSchema).max(30),
});

export const aiChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const system = `You are GradePal's AI Pro Analyser & Helper — an expert tutor and study strategist. The student is sharing their full grade data; you give precise, numerical, evidence-based advice. Cite their averages and trends when relevant. Help with homework when asked. Keep replies under 350 words unless the user requests deep analysis.${data.context ? `\n\n### STUDENT DATA SNAPSHOT\n${data.context}` : ""}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("AI chat error", res.status, t);
      if (res.status === 429) throw new Error("Too many requests. Please wait a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error("AI temporarily unavailable.");
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "";
    return { content: String(content) };
  });