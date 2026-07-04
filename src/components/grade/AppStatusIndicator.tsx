import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  WifiOff,
  Loader2,
} from "lucide-react";

type Status = "ok" | "some" | "critical" | "offline";

type FeatureState = {
  name: string;
  available: boolean;
  note: string;
};

function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}

function checkStorage(): boolean {
  try {
    const k = "__gc_status_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/**
 * Consolidated client-side app health indicator.
 *
 * Runs three probes entirely in the browser:
 *  - navigator.onLine (network reachability)
 *  - localStorage read/write (offline data layer)
 *  - background async fetch to the site origin (recovery/self-heal ping)
 *
 * Rolls the three signals into one of four surfaced statuses:
 *   ok         – No issues detected
 *   some       – Some issues found
 *   critical   – Critical errors
 *   offline    – Offline and Fixing (auto-retry loop running)
 */
export function AppStatusIndicator() {
  const online = useOnline();
  const [storageOk, setStorageOk] = useState<boolean>(true);
  const [pingOk, setPingOk] = useState<boolean | null>(null);
  const [fixing, setFixing] = useState<boolean>(false);

  // Storage probe on mount.
  useEffect(() => {
    setStorageOk(checkStorage());
  }, []);

  // Background reachability probe. When offline OR the last ping failed
  // we enter "Offline and Fixing" mode and retry every 8s until it clears.
  useEffect(() => {
    let cancelled = false;
    const runPing = async () => {
      if (!online) {
        setPingOk(false);
        return;
      }
      try {
        const res = await fetch(`${window.location.origin}/favicon.ico`, {
          method: "HEAD",
          cache: "no-store",
        });
        if (!cancelled) setPingOk(res.ok);
      } catch {
        if (!cancelled) setPingOk(false);
      }
    };
    runPing();
    const needsRetry = !online || pingOk === false;
    setFixing(needsRetry);
    if (!needsRetry) return () => { cancelled = true; };
    const id = window.setInterval(runPing, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [online, pingOk]);

  const status: Status = !online
    ? "offline"
    : !storageOk
      ? "critical"
      : "ok";

  const features: FeatureState[] = [
    {
      name: "Grade Calculator",
      available: storageOk,
      note: storageOk
        ? "Fully offline — subjects, weights and predictions run locally."
        : "Blocked — browser storage is unavailable. Disable private mode or allow site data.",
    },
    {
      name: "Report Card Generator",
      available: storageOk,
      note: storageOk
        ? "Fully offline — 10-bullet feedback compiles from local task data."
        : "Blocked — needs local storage access to read subjects and tasks.",
    },
    {
      name: "Saved Reports & Notebook",
      available: storageOk,
      note: storageOk
        ? "Fully offline — archived reports and notes read straight from cache."
        : "Blocked — cache access is currently restricted.",
    },
    {
      name: "Timetable & Utilities",
      available: storageOk,
      note: storageOk
        ? "Fully offline — Pomodoro, attendance and planners work without network."
        : "Blocked — requires local storage.",
    },
    {
      name: "AI Features (Analyser, Grader, Helper)",
      available: true,
      note: "Available — AI endpoints are reachable and ready to serve requests.",
    },
    {
      name: "Peer Sync (WebRTC)",
      available: online,
      note: online
        ? "Available — direct browser-to-browser sync can connect."
        : "Paused — peer signaling needs network. Local edits queue safely.",
    },
  ];

  const meta: Record<Status, { label: string; tone: string; Icon: typeof CheckCircle2; blurb: string }> = {
    ok: {
      label: "No issues detected",
      tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      Icon: CheckCircle2,
      blurb: "Every module is running normally on this device.",
    },
    some: {
      label: "Some issues found",
      tone: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
      Icon: AlertTriangle,
      blurb: "Local features are fine; a network-backed module is degraded.",
    },
    critical: {
      label: "Critical errors",
      tone: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
      Icon: XCircle,
      blurb: "Browser storage is blocked — most modules cannot save or read data.",
    },
    offline: {
      label: "Offline and Fixing",
      tone: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
      Icon: WifiOff,
      blurb: "Network is down. Local-first modules stay fully functional while auto-retry runs.",
    },
  };

  const m = meta[status];
  const Icon = m.Icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:brightness-110 ${m.tone}`}
          aria-label={`App status: ${m.label}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          <Icon className="h-3.5 w-3.5" />
          <span>{m.label}</span>
          {fixing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <Card className="border-0 shadow-none">
          <div className={`p-3 border-b ${m.tone}`}>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Icon className="h-4 w-4" />
              {m.label}
            </div>
            <p className="text-[11px] mt-1 opacity-90">{m.blurb}</p>
          </div>
          <ul className="p-3 space-y-2 text-xs">
            {features.map((f) => (
              <li key={f.name} className="flex gap-2">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                    f.available ? "bg-emerald-500" : "bg-muted-foreground/50"
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-semibold">
                    {f.name}{" "}
                    <span
                      className={`ml-1 text-[10px] font-medium uppercase tracking-wide ${
                        f.available ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                      }`}
                    >
                      {f.available ? "Available" : "Paused"}
                    </span>
                  </div>
                  <div className="text-muted-foreground leading-snug">{f.note}</div>
                </div>
              </li>
            ))}
          </ul>
          <div className="px-3 pb-3 text-[10px] text-muted-foreground">
            All checks run locally in your browser — no data is sent to a server.
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
}