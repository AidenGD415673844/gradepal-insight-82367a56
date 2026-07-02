// =============================================================================
// AI Logic Track — the clickable replacement for the static
// "Analyzing your data…" string. Shows the active stepper phase, a live
// progress bar, and slides open a right-edge "AI Reasoning Core" sidebar
// with the full live-typing chain-of-thought log.
// =============================================================================
import { Loader2, Brain, ChevronRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useEffect, useRef, useState } from "react";
import { useStepper } from "@/lib/process-stepper";
import { useThoughtStream } from "@/lib/thought-stream";

export function AILogicTrack({ onRetry }: { onRetry?: () => void }) {
  const state = useStepper();
  const [open, setOpen] = useState(false);
  const thought = useThoughtStream();

  if (!state.busy && !state.error && state.key === "idle") return null;

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
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-primary">Live reasoning</span>
          <span className="ml-auto tabular-nums text-[11px] font-bold text-primary">{state.pct}%</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-[width] duration-500 ease-[cubic-bezier(.22,1.4,.36,1)] ${
              state.error ? "bg-destructive" : "bg-gradient-to-r from-primary to-fuchsia-500"
            }`}
            style={{ width: `${state.pct}%` }}
          />
        </div>
        {state.error && (
          <div className="mt-2 text-[11px] text-destructive leading-snug">{state.error.message}</div>
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
              Live &lt;thought_process&gt; stream — the model's un-scripted math and grade-book scratchpad as it types.
            </SheetDescription>
          </SheetHeader>
          <ThoughtCanvas buf={thought.buf} open={thought.open || state.busy} />
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

function ThoughtCanvas({ buf, open }: { buf: string; open: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [buf]);
  return (
    <div ref={ref} className="p-5 overflow-y-auto h-[calc(100vh-9rem)] space-y-2">
      {!buf && (
        <div className="text-xs text-muted-foreground">
          Waiting for the model to enter its &lt;thought_process&gt; block…
        </div>
      )}
      <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-words">
        {buf}
        {open && (
          <span className="inline-block w-1.5 h-3 bg-fuchsia-500/80 align-middle animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
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