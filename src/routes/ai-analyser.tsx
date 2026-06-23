import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiChat } from "@/lib/ai-chat.functions";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, calcGPA } from "@/lib/grade-utils";
import { spendCredits, estimateCost } from "@/lib/ai-credits";
import { Sparkles, Send, Loader2, Trash2, Brain } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

const K = "gradecalc_ai_pro_chat_v1";

const SUGGESTIONS = [
  "Based on my data, how long would it take to reach an A grade?",
  "Generate feedback on Mathematics without using presets.",
  "What is my weakest subject and what should I prioritize this week?",
  "Project my GPA if I score 95% on all upcoming assessments.",
];

export const Route = createFileRoute("/ai-analyser")({
  head: () => ({
    meta: [
      { title: "AI Pro Analyser & Helper — GradeCalc" },
      {
        name: "description",
        content:
          "Conversational AI that reads your full grade dataset to deliver homework help, trend analysis, and strategic study advice.",
      },
      { property: "og:title", content: "AI Pro Analyser & Helper" },
      { property: "og:description", content: "Personal AI tutor with full visibility into your grades, terms and trends." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/ai-analyser" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/ai-analyser" }],
  }),
  component: AIAnalyserPage,
});

function loadMsgs(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(K) || "[]");
  } catch {
    return [];
  }
}

function AIAnalyserPage() {
  const { courses, tasks, scale, settings, terms, activeTermId } = useGrades();
  const [msgs, setMsgs] = useState<Msg[]>(() => loadMsgs());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chat = useServerFn(aiChat);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem(K, JSON.stringify(msgs));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const dataContext = useMemo(() => {
    const activeTerm = terms.find((t) => t.id === activeTermId);
    const lines: string[] = [];
    lines.push(`Active term: ${activeTerm?.name ?? "—"}`);
    lines.push(`Weighted mode: ${settings.weighted ? "on" : "off"}`);
    lines.push(`Total tasks: ${tasks.length}`);
    const gpa = calcGPA(courses, tasks, scale);
    lines.push(`Cumulative GPA: ${gpa.toFixed(2)}`);
    lines.push("");
    lines.push("Subjects:");
    for (const c of courses) {
      const ct = tasks.filter((t) => t.courseId === c.id);
      const avg = calcAverage(ct, settings.weighted);
      lines.push(`- ${c.name}: avg ${avg.toFixed(1)}% over ${ct.length} task(s)`);
    }
    return lines.join("\n");
  }, [courses, tasks, scale, settings.weighted, terms, activeTermId]);

  const cost = estimateCost("ai_chat", {
    chars: input.length + dataContext.length,
    items: msgs.length,
  });

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;
    const spend = spendCredits("ai_chat", {
      chars: content.length + dataContext.length,
      items: msgs.length,
    });
    if (!spend.ok) {
      toast.error(`Need ${spend.need.toFixed(1)} credits, have ${spend.have.toFixed(1)}. Top up in Pro Shop.`);
      return;
    }
    const userMsg: Msg = { role: "user", content, ts: Date.now() };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const r = await chat({
        data: {
          context: dataContext,
          messages: [...msgs, userMsg].slice(-20).map(({ role, content }) => ({ role, content })),
        },
      });
      setMsgs((m) => [...m, { role: "assistant", content: r.content, ts: Date.now() }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
      setMsgs((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="AI Pro Analyser & Helper">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card className="p-0 overflow-hidden flex flex-col h-[78vh]">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-fuchsia-500/10">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold text-sm">AI Pro Analyser & Helper</h2>
              <p className="text-[10px] text-muted-foreground">
                Reads your full grade ledger · Variable credit cost (~{cost.toFixed(1)} per turn)
              </p>
            </div>
            {msgs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-1"
                onClick={() => {
                  if (confirm("Clear chat history?")) setMsgs([]);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {msgs.length === 0 && (
              <div className="text-center text-muted-foreground py-10">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/40" />
                <p className="text-sm font-semibold">Ask anything about your grades.</p>
                <p className="text-xs mt-1">Your full dataset is sent as context — no manual setup.</p>
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted/60"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="bg-muted/60 max-w-[85%] rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing your data…
              </div>
            )}
          </div>

          <div className="border-t p-3 space-y-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask the analyser anything… (Enter to send, Shift+Enter for newline)"
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
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              Suggested prompts
            </div>
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
            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
              Live context snapshot
            </div>
            <pre className="text-[10px] font-mono whitespace-pre-wrap bg-muted/30 rounded-md p-2 max-h-72 overflow-y-auto">
              {dataContext}
            </pre>
            <Badge variant="outline" className="mt-2 text-[9px]">
              Auto-sent with every message
            </Badge>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}