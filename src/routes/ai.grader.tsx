import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGrades } from "@/lib/grade-store";
import { spendCredits, estimateCost } from "@/lib/ai-credits";
import { callOpenRouter, OpenRouterError } from "@/lib/openrouter";

type Result = { score: number; letter: string; summary: string; strengths: string[]; improvements: string[] };

export const Route = createFileRoute("/ai/grader")({ component: GraderTab });

function safeParseJSON(s: string): Result | null {
  // Free routed models sometimes wrap JSON in ```json fences or trailing prose.
  const cleaned = s.replace(/```json|```/gi, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function GraderTab() {
  const { scale } = useGrades();
  const [text, setText] = useState("");
  const [rubric, setRubric] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const cost = estimateCost("ai_grader", { chars: text.length + rubric.length });

  const run = async () => {
    if (!text.trim()) {
      toast.error("Paste the student work first.");
      return;
    }
    const spend = spendCredits("ai_grader", { chars: text.length + rubric.length });
    if (!spend.ok) {
      toast.error(`Need ${spend.need.toFixed(1)} credits, have ${spend.have.toFixed(1)}.`);
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const sortedScale = [...scale].sort((a, b) => b.min - a.min);
      const scaleStr = sortedScale.map((s) => `${s.min}+ → ${s.letter}`).join(", ");
      const out = await callOpenRouter({
        feature: "grader",
        maxTokens: 700,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a strict but fair teacher. Reply ONLY with JSON: {"score": int 0-100, "letter": string, "summary": string, "strengths": string[], "improvements": string[]}. Use exactly the letters from this scale: ${scaleStr}. ${rubric ? "Rubric: " + rubric : ""}`,
          },
          { role: "user", content: `Grade this work:\n\n${text}` },
        ],
      });
      const parsed = safeParseJSON(out);
      if (!parsed) throw new Error("AI returned malformed grading output.");
      // Enforce letter from scale
      const correct = sortedScale.find((s) => parsed.score >= s.min);
      if (correct) parsed.letter = correct.letter;
      setResult(parsed);
    } catch (e) {
      const msg =
        e instanceof OpenRouterError && e.busy
          ? "The AI Grader's free server is busy. Try again in a few seconds."
          : e instanceof Error
            ? e.message
            : "Grading failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-bold">AI Grader</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">OpenRouter verified router · ~{cost.toFixed(1)} cr</span>
        </div>
        <div>
          <Label>Rubric (optional)</Label>
          <Input value={rubric} onChange={(e) => setRubric(e.target.value)} placeholder="e.g. 5th grade algebra homework" />
        </div>
        <div>
          <Label>Student work (text)</Label>
          <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the student's work here…" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full" size="lg">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Grading…</> : "Grade work"}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          <Link to="/shop" className="underline text-primary">Top up credits</Link>
        </p>
      </Card>

      <Card className="p-5">
        {!result && !loading && (
          <div className="text-sm text-muted-foreground text-center py-10">
            Results will appear here once the AI Grader returns a score.
          </div>
        )}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-4xl font-extrabold text-primary tabular-nums">{result.score}/100</div>
              <div className="h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-extrabold">
                {result.letter}
              </div>
            </div>
            <p className="text-sm">{result.summary}</p>
            {result.strengths?.length > 0 && (
              <div>
                <div className="text-sm font-bold text-emerald-600 mb-1">Strengths</div>
                <ul className="space-y-1">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.improvements?.length > 0 && (
              <div>
                <div className="text-sm font-bold text-amber-600 mb-1">Areas for improvement</div>
                <ul className="space-y-1">
                  {result.improvements.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2"><AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}