import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Brain, Sparkles, BookOpen } from "lucide-react";
import { hasOpenRouterKey, onOpenRouterKeyCheck } from "@/lib/openrouter";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/ai")({
  head: () => ({
    meta: [
      { title: "AI Hub — GradePal" },
      { name: "description", content: "Unified AI hub: pro analyser, AI grader, and homework helper with server-side OpenRouter routing." },
      { property: "og:title", content: "AI Hub — GradePal" },
      { property: "og:description", content: "Three specialised AI tools combined into one workspace: grading, analysis and homework help." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/ai" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/ai" }],
  }),
  component: AIHub,
});

const TABS = [
  { to: "/ai/analyser", label: "AI Analysis Pro", desc: "Detailed analytical study feedback", Icon: Brain },
  { to: "/ai/grader", label: "AI Grader", desc: "Fast rubric-based grading", Icon: Sparkles },
  { to: "/ai/helper", label: "Homework Helper", desc: "Large-context homework assistance", Icon: BookOpen },
] as const;

function AIHub() {
  const loc = useLocation();
  const [keyPresent, setKeyPresent] = useState(() => hasOpenRouterKey());
  useEffect(() => onOpenRouterKeyCheck(setKeyPresent), []);
  const onIndex = loc.pathname === "/ai" || loc.pathname === "/ai/";
  return (
    <AppShell title="AI Hub">
      <div className="space-y-4">
        {!keyPresent && (
          <Card className="p-4 border-amber-500/40 bg-amber-500/10 text-xs">
            <b>AI key not configured.</b> Add <code className="font-mono">AI_API_KEY</code> (and optionally{" "}
            <code className="font-mono">AI_API_KEY_2</code> as a fallback) in Project Settings → Secrets and reload.
          </Card>
        )}
        <Card className="p-2 flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = loc.pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex-1 min-w-[180px] rounded-lg px-3 py-2.5 transition border flex items-center gap-2 text-sm ${
                  active ? "bg-primary text-primary-foreground border-primary shadow" : "bg-muted/40 hover:bg-muted border-transparent"
                }`}
              >
                <t.Icon className="h-4 w-4 shrink-0" />
                <span className="font-semibold truncate">{t.label}</span>
              </Link>
            );
          })}
        </Card>
        {onIndex ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TABS.map((t) => (
              <Link key={t.to} to={t.to} className="group">
                <Card className="p-5 hover:shadow-lg hover:-translate-y-0.5 transition h-full">
                  <t.Icon className="h-7 w-7 text-primary mb-2" />
                  <h3 className="font-bold">{t.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Outlet />
        )}
      </div>
    </AppShell>
  );
}