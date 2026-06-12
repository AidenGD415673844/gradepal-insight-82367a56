import { Component, useEffect, useState, type ReactNode } from "react";

type State = { error: Error | null };

function ErrorOverlay({ message, onReload }: { message: string; onReload: () => void }) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <div className="max-w-md w-full rounded-lg border bg-card text-card-foreground shadow-xl p-6 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground break-words">
          {message || "An unexpected error occurred while loading the app."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={onReload}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Reload page
          </button>
          <button
            onClick={() => location.assign("/")}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

class ReactErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error("[GlobalErrorBoundary]", error);
  }
  render() {
    if (this.state.error) {
      return (
        <ErrorOverlay
          message={this.state.error.message}
          onReload={() => location.reload()}
        />
      );
    }
    return this.props.children;
  }
}

function isChunkLoadError(reason: unknown): boolean {
  const msg =
    (reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "") || "";
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /dynamically imported module/i.test(msg)
  );
}

function RuntimeErrorListener() {
  const [error, setError] = useState<{ message: string } | null>(null);
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (isChunkLoadError(e.error ?? e.message)) {
        setError({ message: "A required module failed to load. Reload to try again." });
      }
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkLoadError(e.reason)) {
        setError({ message: "A required module failed to load. Reload to try again." });
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  if (!error) return null;
  return <ErrorOverlay message={error.message} onReload={() => location.reload()} />;
}

export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ReactErrorBoundary>
      <RuntimeErrorListener />
      {children}
    </ReactErrorBoundary>
  );
}