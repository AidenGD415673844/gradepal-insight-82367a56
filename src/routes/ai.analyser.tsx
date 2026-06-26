import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, calcGPA, filterByTerm } from "@/lib/grade-utils";
import { spendCredits, estimateCost } from "@/lib/ai-credits";
import { Send, Loader2, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { callOpenRouter, OpenRouterError } from "@/lib/openrouter";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
const K = "gradecalc_ai_pro_chat_v1";

const SUGGESTIONS = [
  "Based on my data, how long would it take to reach an A grade?",
  "What is my weakest subject and what should I prioritise this week?",
  "Project my GPA if I score 95% on all upcoming assessments.",
  "Give me long-form encouraging analysis on my recent trajectory.",
];

export const Route = createFileRoute("/ai/analyser")({ component: AnalyserTab });

function loadMsgs(): Msg[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch { return []; }
}

function AnalyserTab() {
  const { courses, tasks, scale, settings, terms, activeTermId } = useGrades();
  const [msgs, setMsgs] = useState<Msg[]>(() => loadMsgs());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(K, JSON.stringify(msgs));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  // Maximum-fidelity context: every subject, recent task list, GPA, scale.
  const dataContext = useMemo(() => {
    const activeTerm = terms.find((t) => t.id === activeTermId);
    const lines: string[] = [];
    lines.push(`Active term: ${activeTerm?.name ?? "—"}`);
    lines.push(`Weighted mode: ${settings.weighted ? "on" : "off"} · Goal: ${settings.goal}`);
    lines.push(`Cumulative GPA: ${calcGPA(courses, tasks, scale).toFixed(2)} of 4.0`);
    lines.push(`Grade scale: ${scale.map((s) => `${s.letter}≥${s.min}`).join(", ")}`);
    lines.push("");
    for (const c of courses) {
      const ct = filterByTerm(tasks.filter((t) => t.courseId === c.id), activeTerm ?? null).filter((t) => !t.pending);
      const avg = calcAverage(ct, settings.weighted);
      lines.push(`SUBJECT ${c.name} — avg ${avg.toFixed(1)}% across ${ct.length} task(s)`);
      const recent = [...ct].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
      for (const t of recent) {
        const pct = t.maxScore > 0 ? ((t.score / t.maxScore) * 100).toFixed(1) : "?";
        lines.push(`  · ${t.date} · ${t.name} (${t.category}) → ${pct}%`);
      }
    }
    return lines.join("\n").slice(0, 7800);
  }, [courses, tasks, scale, settings, terms, activeTermId]);

  const cost = estimateCost("analyser", { chars: input.length + dataContext.length, items: msgs.length });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const spend = spendCredits("analyser", { chars: content.length + dataContext.length, items: msgs.length });
    if (!spend.ok) {
      toast.error(`Need ${spend.need.toFixed(1)} credits, have ${spend.have.toFixed(1)}. Top up in Pro Shop.`);
      return;
    }
    const userMsg: Msg = { role: "user", content, ts: Date.now() };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const reply = await callOpenRouter({
        feature: "analyser",
        maxTokens: 1400,
        temperature: 0.6,
        messages: [
          {
            role: "system",
            content: `You are GradePal's AI Analysis Pro — a long-form, detailed, encouraging analytical study coach.\n\nMANDATORY OUTPUT FORMAT — reply with EXACTLY two sections, in order:\n\n**Chain of Thought:**\n3-6 short italic-style bullet points explaining your reasoning trace before you answer. Example bullets: "I need to focus on the user's score consistency and trends to give an accurate result", "I'll cross-check the weakest subject against recent task velocity", "I should weight the most recent four tasks more heavily".\n\n**Analysis:**\nThen give a substantive, multi-paragraph evidence-based answer that cites exact averages, trends, and subjects from the snapshot. Be motivational but quantitative.\n\n### STUDENT DATA SNAPSHOT\n${dataContext}`,
          },
          ...[...msgs, userMsg].slice(-12).map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      setMsgs((m) => [...m, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e) {
      const msg =
        e instanceof OpenRouterError && e.busy
          ? "The AI Analysis Pro server is busy. Please try again in a few seconds — the request was not charged twice."
          : e instanceof Error
            ? e.message
            : "Request failed";
      toast.error(msg);
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <Card className="p-0 overflow-hidden flex flex-col h-[74vh]">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-fuchsia-500/10">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-bold text-sm">AI Analysis Pro</h2>
            <p className="text-[10px] text-muted-foreground">
              Mistral-7B (free) · full grade dataset injected · ~{cost.toFixed(1)} cr/turn
            </p>
          </div>
          {msgs.length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto gap-1" onClick={() => confirm("Clear chat?") && setMsgs([])}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgs.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">
              Ask anything analytical — your full graded ledger is auto-attached.
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted/60"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="bg-muted/60 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Analysing your data…
            </div>
          )}
        </div>
        <div className="border-t p-3 space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask the analyser anything…"
            rows={2}
            className="resize-none"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              ~{cost.toFixed(1)} credits · <Link to="/shop" className="underline text-primary">Top up</Link>
            </span>
            <Button size="sm" onClick={() => send(input)} disabled={loading || !input.trim()} className="gap-2">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Suggested prompts</div>
          <div className="space-y-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={loading}
                className="w-full text-left text-xs rounded-md border bg-muted/30 hover:bg-muted/60 p-2 transition disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Live context snapshot</div>
          <pre className="text-[10px] font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-2 max-h-72 overflow-y-auto">{dataContext}</pre>
          <Badge variant="outline" className="mt-2 text-[9px]">Auto-sent with every message</Badge>
        </Card>
      </div>
    </div>
  );
}