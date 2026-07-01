// =============================================================================
// AI Logic Track — the clickable replacement for the static
// "Analyzing your data…" string. Shows the active stepper phase, a live
// progress bar, and slides open a right-edge "AI Reasoning Core" sidebar
// with the full live-typing chain-of-thought log.
// =============================================================================
import { Loader2, Brain, ChevronRight, Circle, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEffect, useState } from "react";
import { useStepper, STEP_TABLE, type LogicEntry } from "@/lib/process-stepper";

const MOTIVATIONAL_QUOTES = [
  "Grades are markers of progress, not your personal worth — keep breathing, you've got this!",
  "Mistakes are just steps on the ladder of learning. Let's look at this together.",
  "Your potential is limitless, no matter what a report card says.",
  "Small consistent effort compounds into big wins — you're already showing up.",
  "One paper doesn't define you. The trend line does, and it's yours to shape.",
  "Kind mind first, sharp analysis second. Both matter.",
  "You are a whole human — the number I'm analysing is just today's snapshot.",
  "Rest is part of the plan. A tired brain can't compound learning.",
];

function useRotatingQuote(active: boolean) {
  const [i, setI] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setI((p) => (p + 1) % MOTIVATIONAL_QUOTES.length);
    }, 6500);
    return () => clearInterval(id);
  }, [active]);
  return MOTIVATIONAL_QUOTES[i];
}

export function AILogicTrack({ onRetry }: { onRetry?: () => void }) {
  const state = useStepper();
  const [open, setOpen] = useState(false);
  const quote = useRotatingQuote(state.busy);

  if (!state.busy && !state.error && state.key === "idle") return null;

  const tutorLine = strategyLine(state.key);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group w-full max-w-[85%] text-left rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-fuchsia-500/5 backdrop-blur px-4 py-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex items-center gap-2">
          {state.error ? (
            <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary">AI Logic Track</span>
          <span className="ml-auto tabular-nums text-[11px] font-bold text-primary">{state.pct}%</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="mt-1.5 text-sm font-medium leading-snug">
          {state.error ? state.error.message : state.label || "Preparing…"}
        </div>
        <div className="mt-2 text-[11px] text-muted-foreground italic line-clamp-1">
          {tutorLine}
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-500 ease-[cubic-bezier(.22,1.4,.36,1)] ${
              state.error ? "bg-destructive" : "bg-gradient-to-r from-primary to-fuchsia-500"
            }`}
            style={{ width: `${state.pct}%` }}
          />
        </div>
        {!state.error && (
          <div
            key={quote}
            className="mt-2 text-[11px] leading-snug text-fuchsia-700 dark:text-fuchsia-300 animate-fade-in"
          >
            💜 {quote}
          </div>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden">
          <SheetHeader className="px-5 pt-5 pb-3 border-b bg-gradient-to-br from-primary/10 to-fuchsia-500/5">
            <SheetTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Reasoning Core
            </SheetTitle>
            <SheetDescription className="text-[11px]">
              Live tutor strategy stream — what the model is reasoning about, right now.
            </SheetDescription>
          </SheetHeader>
          <div className="p-5 space-y-4 overflow-y-auto h-[calc(100vh-9rem)]">
            <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4">
              <div className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-700 dark:text-fuchsia-300 mb-1.5">
                Current focus
              </div>
              <TypingLine text={tutorLine} />
            </div>

            <div className="space-y-1.5">
              {Object.entries(STEP_TABLE)
                .filter(([k]) => k !== "idle")
                .map(([k, v]) => {
                  const reached = state.pct >= v.pct;
                  const active = state.key === k;
                  return (
                    <div
                      key={k}
                      className={`flex items-start gap-2 rounded-lg p-2 transition-all ${
                        active ? "bg-primary/10 ring-1 ring-primary/40" : reached ? "bg-muted/40" : "opacity-50"
                      }`}
                    >
                      {reached ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold tabular-nums text-muted-foreground">{v.pct}%</div>
                        <div className="text-xs font-medium leading-snug">{v.label}</div>
                        {active && <div className="text-[10px] text-muted-foreground mt-0.5">{v.reason}</div>}
                      </div>
                    </div>
                  );
                })}
            </div>

            {state.log.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">
                  Event log
                </div>
                <div className="space-y-1.5 text-[11px] font-mono">
                  {state.log.slice().reverse().map((e: LogicEntry, i) => (
                    <div key={i} className="border-l-2 border-primary/40 pl-2">
                      <span className="text-muted-foreground">
                        {new Date(e.ts).toLocaleTimeString()} · {e.pct}%
                      </span>{" "}
                      <span>{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {state.error && (
        <DiagnosticOverlay
          stage={state.error.stage}
          message={state.error.message}
          onRetry={() => { setOpen(false); onRetry?.(); }}
        />
      )}
    </>
  );
}

function TypingLine({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const id = setInterval(() => {
      setN((p) => (p < text.length ? p + 2 : p));
    }, 24);
    return () => clearInterval(id);
  }, [text]);
  return (
    <div className="text-sm leading-relaxed">
      {text.slice(0, n)}
      <span className="inline-block w-1.5 h-3 bg-fuchsia-500/80 align-middle animate-pulse ml-0.5" />
    </div>
  );
}

function strategyLine(key: string): string {
  const map: Record<string, string> = {
    mount:   "I'm warming up the workspace before I touch any data.",
    parse:   "Let me confirm the local data registry is well-formed before I read it.",
    crawl:   "I need to walk every recorded task across Aug→Jun to see the real trend.",
    weights: "I'll re-weight categories now so the averages reflect true effort.",
    encrypt: "Quick safety pass on local crypto/peer handshakes before sending anything.",
    regress: "I need to focus on trends and scoring consistency to predict when the student will rise to an A.",
    hydrate: "Streaming the first chunk back — wiring it into the reasoning canvas.",
    katex:   "Cross-checking syllabus mastery dots so my math references stay grounded.",
    wallet:  "Confirming wallet + tier so the user isn't double-charged on a retry.",
    polish:  "Final pass: smoothing the layout and unmounting skeletons.",
    done:    "Pipeline complete — handing the answer back to the canvas.",
  };
  return map[key] ?? "Tracking process…";
}

function DiagnosticOverlay({ stage, message, onRetry }: { stage: string; message: string; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-md" />
      <div className="relative w-full max-w-md rounded-2xl border border-destructive/40 bg-card/90 backdrop-blur-xl shadow-2xl p-6 animate-scale-in">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h3 className="font-bold text-base">System Diagnostic Notice: Operation Interrupted</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          The <span className="font-mono font-bold text-foreground">{stage}</span> stage halted unexpectedly.
        </p>
        <div className="mt-3 text-sm rounded-lg border bg-destructive/5 border-destructive/30 p-3 font-mono whitespace-pre-wrap break-words">
          {message}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onRetry} className="gap-2 bg-primary hover:bg-primary/90">
            <RefreshCw className="h-4 w-4" /> Retry Operation
          </Button>
        </div>
      </div>
    </div>
  );
}