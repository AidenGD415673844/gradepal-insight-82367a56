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
import { MarkdownMath } from "@/components/grade/MarkdownMath";
import { sanitizeAIOutput, isTrivialGreeting, FORMAL_GREETING } from "@/lib/ai-sanitize";
import { runAnalyserTurn, getPending, subscribeInflight, INFLIGHT_STORE_KEY } from "@/lib/ai-inflight";

type Msg = { role: "user" | "assistant"; content: string; ts: number };
const K = INFLIGHT_STORE_KEY;

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
  const [loading, setLoading] = useState<boolean>(() => !!getPending());
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Re-hydrate timeline + inflight state from localStorage whenever the
  // background worker, another tab, or a visibility wake fires an event.
  useEffect(() => {
    const sync = () => {
      setMsgs(loadMsgs());
      setLoading(!!getPending());
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      });
    };
    sync();
    const off = subscribeInflight(sync);
    const onVis = () => { if (!document.hidden) sync(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { off(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

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
      // FULL chronological dump — every recorded task across the entire academic
      // year (Aug→June). No slicing, no truncation. Earlier entries for tracking
      // subjects (Chinese, humanities, etc.) must reach the model.
      const ct = tasks
        .filter((t) => t.courseId === c.id && !t.pending)
        .sort((a, b) => a.date.localeCompare(b.date));
      const ctTerm = filterByTerm(ct, activeTerm ?? null);
      const avgAll = calcAverage(ct, settings.weighted);
      const avgTerm = calcAverage(ctTerm, settings.weighted);
      lines.push(
        `SUBJECT ${c.name} — all-time avg ${avgAll.toFixed(1)}% across ${ct.length} task(s); active-term avg ${avgTerm.toFixed(1)}% across ${ctTerm.length} task(s)`,
      );
      for (const t of ct) {
        const pct = t.maxScore > 0 ? ((t.score / t.maxScore) * 100).toFixed(1) : "?";
        lines.push(`  · ${t.date} · ${t.name} (${t.category}) → ${pct}%`);
      }
      lines.push("");
    }
    return lines.join("\n");
  }, [courses, tasks, scale, settings, terms, activeTermId]);

  const cost = estimateCost("analyser", { chars: input.length + dataContext.length, items: msgs.length });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    if (isTrivialGreeting(content)) {
      const userMsg: Msg = { role: "user", content, ts: Date.now() };
      setMsgs((m) => [...m, userMsg, { role: "assistant", content: FORMAL_GREETING, ts: Date.now() + 1 }]);
      setInput("");
      return;
    }
    const spend = spendCredits("analyser", { chars: content.length + dataContext.length, items: msgs.length });
    if (!spend.ok) {
      toast.error(`Need ${spend.need.toFixed(1)} credits, have ${spend.have.toFixed(1)}. Top up in Pro Shop.`);
      return;
    }
    const cost = estimateCost("analyser", { chars: content.length + dataContext.length, items: msgs.length });
    const userMsg: Msg = { role: "user", content, ts: Date.now() };
    const baseHistory = [...msgs, userMsg];
    // Persist the user turn IMMEDIATELY so a navigation/tab switch never
    // loses the prompt.
    localStorage.setItem(K, JSON.stringify(baseHistory));
    setMsgs(baseHistory);
    setInput("");
    setLoading(true);
    // Slice the most recent 3 user/assistant exchanges (6 rows) so the model
    // never forgets task variables split across two prompts.
    const recentTurns = baseHistory.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    const result = await runAnalyserTurn({
      feature: "analyser",
      cost,
      maxTokens: 6000,
      temperature: 0.6,
      messages: [
          {
            role: "system",
            content: `You are GradePal's AI Analysis Pro — a formal, evidence-based academic study coach.

STRICT OUTPUT RULES — your reply MUST contain EXACTLY these two sections and nothing else:

**Reasoning Summary:**
- 3 to 6 short bullets summarising the evidence considered.
- Bullets are auditable evidence ONLY (e.g. "Chinese trending +2.4pp over last 4 tasks"). Never dump raw sums, intermediate calculations, or running totals like "Sum x = 46", "Sum xy = 4075", "SST = ...". Never print loose brackets.

**Analysis:**
- 3 to 6 short, complete paragraphs of clean narrative analysis. Reference exact averages, trends and subjects from the snapshot. Finish every sentence — never cut off mid-thought.
- Favour concise, narrative sentence structures over long lists, so the analysis stays inside the response window while still answering the user completely.
- For any equation, use LaTeX delimiters $...$ for inline math and $$...$$ for display math (KaTeX renders them). Do NOT paste raw scratchpad calculations into prose; describe pacing and trajectory in words and use math only where it adds clarity.
- Do NOT include "User Safety: safe", "Response Safety: safe", or any other safety/system flags in the visible output.
- Per subject, give at most one short paragraph. Do not produce multi-paragraph reviews for a single subject.

### STUDENT DATA SNAPSHOT (authoritative — covers Aug→Jun, every recorded task)
${dataContext}`,
          },
        ...recentTurns,
      ],
    });
    if (!result.ok) {
      toast.error(result.reason);
    }
    // Hydrate from localStorage regardless of outcome — the worker has already
    // appended the assistant reply (if any) and handled the refund.
    setMsgs(loadMsgs());
    setLoading(!!getPending());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
      <Card className="p-0 overflow-hidden flex flex-col h-[74vh]">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-fuchsia-500/10">
          <Brain className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-bold text-sm">AI Analysis Pro</h2>
            <p className="text-[10px] text-muted-foreground">
              Verified OpenRouter route · full grade dataset injected · ~{cost.toFixed(1)} cr/turn
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
              {m.role === "assistant" ? <AssistantBubble content={m.content} /> : m.content}
            </div>
          ))}
          {loading && (
            <ThinkingBubble />
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

function AssistantBubble({ content }: { content: string }) {
  // Split the chain-of-thought trace from the final answer for distinct styling.
  const cotMatch = content.match(/\*\*(?:Reasoning Summary|Chain of Thought):?\*\*([\s\S]*?)(?:\*\*Analysis:?\*\*|$)/i);
  const analysisMatch = content.match(/\*\*Analysis:?\*\*([\s\S]*)/i);
  if (!cotMatch && !analysisMatch) return <MarkdownMath content={content} />;
  const cot = cotMatch?.[1]?.trim() ?? "";
  const analysis = analysisMatch?.[1]?.trim() ?? content;
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {cot && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full text-left rounded-lg border border-dashed border-fuchsia-500/40 bg-fuchsia-500/5 px-3 py-2 hover:bg-fuchsia-500/10 transition"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-fuchsia-700 dark:text-fuchsia-300">
            <Brain className="h-3 w-3" /> Reasoning Summary
            <span className="ml-auto normal-case tracking-normal text-[10px] text-muted-foreground">
              {open ? "Hide ▴" : "Show ▾"}
            </span>
          </div>
          {open && (
            <div className="mt-1.5 text-[12px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {cot}
            </div>
          )}
        </button>
      )}
      <MarkdownMath content={analysis} />
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="bg-muted/60 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" /> Analysing your data…
    </div>
  );
}