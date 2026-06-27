import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRef, useState } from "react";
import { BookOpen, Upload, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { spendCredits, estimateCost } from "@/lib/ai-credits";
import { callOpenRouter, OpenRouterError } from "@/lib/openrouter";
import { MarkdownMath } from "@/components/grade/MarkdownMath";
import { sanitizeAIOutput } from "@/lib/ai-sanitize";

type Attachment = { name: string; size: number; preview: string };

export const Route = createFileRoute("/ai/helper")({ component: HelperTab });

function HelperTab() {
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string>("");
  const ref = useRef<HTMLInputElement | null>(null);

  const totalChars = question.length + files.reduce((s, f) => s + f.preview.length, 0);
  const cost = estimateCost("homework_helper", { chars: totalChars });

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const out: Attachment[] = [];
    for (const f of Array.from(list).slice(0, 4)) {
      if (f.size > 200_000) {
        toast.error(`${f.name} is too large (max 200 KB).`);
        continue;
      }
      const txt = await f.text().catch(() => `[binary file — ${f.size} bytes]`);
      out.push({ name: f.name, size: f.size, preview: txt.slice(0, 12_000) });
    }
    setFiles((cur) => [...cur, ...out].slice(0, 4));
  };

  const run = async () => {
    if (!question.trim()) {
      toast.error("Type your homework question first.");
      return;
    }
    const spend = spendCredits("homework_helper", { chars: totalChars });
    if (!spend.ok) {
      toast.error(`Need ${spend.need.toFixed(1)} credits, have ${spend.have.toFixed(1)}.`);
      return;
    }
    setLoading(true);
    setAnswer("");
    try {
      const filePart = files.length
        ? "\n\n### Attached materials\n" +
          files.map((f) => `--- ${f.name} (${f.size} bytes) ---\n${f.preview}`).join("\n\n")
        : "";
      const out = await callOpenRouter({
        feature: "helper",
        maxTokens: 1800,
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content:
              "You are GradePal's Homework Helper. Walk the student through their problem step by step, show working clearly, cite formulas, then conclude with the final answer. Use LaTeX inside $...$ (inline) or $$...$$ (display) for any equation so KaTeX can render it. Do not include 'User Safety: safe', 'Response Safety: safe', or any internal scratchpad lines such as 'Sum x = …', 'SST sum = …'. Be patient and explanatory. Never just give the answer without reasoning.",
          },
          {
            role: "user",
            content: `${subject ? `Subject: ${subject}\n\n` : ""}Question:\n${question}${filePart}`,
          },
        ],
      });
      setAnswer(sanitizeAIOutput(out));
    } catch (e) {
      const msg =
        e instanceof OpenRouterError && e.busy
          ? "The Homework Helper's free model is busy. Please retry in a few seconds."
          : e instanceof Error
            ? e.message
            : "Request failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="font-bold">Homework Helper</h2>
          <span className="ml-auto text-[10px] text-muted-foreground">OpenRouter verified router · ~{cost.toFixed(1)} cr</span>
        </div>
        <div>
          <Label>Subject (optional)</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Calculus, History" />
        </div>
        <div>
          <Label>Your question</Label>
          <Textarea
            rows={6}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Paste the problem, describe what's confusing, or ask anything…"
          />
        </div>
        <div>
          <Label>Attach text files (≤200 KB each, up to 4)</Label>
          <div className="flex items-center gap-2 mt-1">
            <Button variant="outline" size="sm" onClick={() => ref.current?.click()} className="gap-1.5">
              <Upload className="h-4 w-4" /> Add file(s)
            </Button>
            {files.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setFiles([])}>Clear</Button>
            )}
          </div>
          <input
            ref={ref}
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.html,.js,.ts,.tsx,.py,.java,.cpp,.c"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="text-[11px] flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-3 w-3" /> {f.name} · {f.size} B
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button onClick={run} disabled={loading} className="w-full" size="lg">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Thinking…</> : "Get help"}
        </Button>
        <p className="text-[10px] text-muted-foreground text-center">
          <Link to="/shop" className="underline text-primary">Top up credits</Link>
        </p>
      </Card>

      <Card className="p-5">
        {!answer && !loading && (
          <div className="text-sm text-muted-foreground text-center py-10">
            Step-by-step explanations will appear here.
          </div>
        )}
        {loading && <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
        {answer && (
          <MarkdownMath content={answer} />
        )}
      </Card>
    </div>
  );
}