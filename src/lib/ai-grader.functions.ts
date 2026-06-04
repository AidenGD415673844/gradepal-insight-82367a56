import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ScaleRowSchema = z.object({
  min: z.number(),
  letter: z.string(),
  description: z.string().optional(),
  gpa: z.number().optional(),
});

const InputSchema = z.object({
  text: z.string().optional(),
  imageDataUrl: z.string().optional(),
  rubric: z.string().optional(),
  scale: z.array(ScaleRowSchema).optional(),
});

export const gradeWork = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI not configured");

    const userContent: Array<Record<string, unknown>> = [];

    const scale = (data.scale ?? []).sort((a, b) => b.min - a.min);
    const letters = scale.map((s) => s.letter);
    const scaleText = scale.length
      ? `\n\nUSE THIS CUSTOM GRADE SCALE STRICTLY (do not use any other scale). Map the numeric score to the letter using these thresholds (score >= min → letter):\n${scale
          .map((s) => `  ${s.min}+ → ${s.letter}${s.description ? ` (${s.description})` : ""}`)
          .join("\n")}\nAllowed letters: ${letters.join(", ")}.`
      : "";

    const instruction = `You are a strict but fair teacher grading student work. Provide a score out of 100, then derive the letter grade by applying the user's custom grade scale below. Also give 2-3 strengths and 2-3 areas for improvement. Output ONLY JSON: {"score": number, "letter": string, "summary": string, "strengths": string[], "improvements": string[]}.${data.rubric ? ` Rubric: ${data.rubric}.` : ""}${scaleText}`;

    if (data.text) userContent.push({ type: "text", text: `Student work:\n${data.text}` });
    if (data.imageDataUrl) {
      userContent.push({ type: "text", text: "Student work (image attached):" });
      userContent.push({ type: "image_url", image_url: { url: data.imageDataUrl } });
    }
    if (!userContent.length) throw new Error("Provide text or image");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      score: number;
      letter: string;
      summary: string;
      strengths: string[];
      improvements: string[];
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }
    // Enforce letter from custom scale on the server side as a safety net.
    if (scale.length) {
      const correct = scale.find((s) => parsed.score >= s.min) ?? scale[scale.length - 1];
      if (correct) parsed.letter = correct.letter;
    }
    return parsed;
  });
