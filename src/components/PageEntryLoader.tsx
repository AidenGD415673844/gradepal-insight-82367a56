// =============================================================================
// PageEntryLoader — universal app-wide navigation loader with rotating
// motivational quotes. Mounted once at the router shell; listens to the
// TanStack Router state and blurs the viewport while a new route is loading.
// Zero servers, zero deps — pure client-side.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";

const QUOTES = [
  "Grades are markers of progress, not your personal worth — keep breathing, you've got this!",
  "Mistakes are just steps on the ladder of learning. Let's look at this together.",
  "Your potential is limitless, no matter what a report card says.",
  "Small effort, stacked daily, compounds into big wins — you're already showing up.",
  "One paper doesn't define you. The trend line is yours to shape.",
  "Kind mind first, sharp analysis second. Both matter.",
  "Rest is part of the plan. A tired brain can't compound learning.",
];

export function PageEntryLoader() {
  const status = useRouterState({ select: (s) => s.status });
  const [visible, setVisible] = useState(false);
  const [i, setI] = useState(0);
  const shownAt = useRef<number>(0);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    if (status === "pending") {
      setI(Math.floor(Math.random() * QUOTES.length));
      setVisible(true);
      shownAt.current = Date.now();
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    } else if (visible) {
      // Ensure the loader is visible for at least ~450ms so the fade is smooth.
      const elapsed = Date.now() - shownAt.current;
      const wait = Math.max(0, 450 - elapsed);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setVisible(false), wait);
    }
    return () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, [status]);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % QUOTES.length), 3800);
    return () => window.clearInterval(id);
  }, [visible]);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[80] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className={`absolute inset-0 bg-background/70 backdrop-blur-md transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} />
      <div className={`relative flex flex-col items-center gap-4 rounded-3xl border bg-card/90 backdrop-blur-xl shadow-2xl px-8 py-7 max-w-sm mx-4 text-center transition-transform duration-300 ${visible ? "scale-100" : "scale-95"}`}>
        <div className="relative">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <Sparkles className="absolute inset-0 m-auto h-4 w-4 text-fuchsia-500" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Loading workspace</div>
        <p
          key={i}
          className="text-sm leading-relaxed text-foreground/80 animate-fade-in"
        >
          💜 {QUOTES[i]}
        </p>
      </div>
    </div>
  );
}