import { useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * Slide-down toast banner for PeerJS / WebRTC errors. Solid dark red, white
 * text, auto-fades after 7s, manual close button. Completely background — never
 * throws into React render paths so chart/grade components never crash.
 */
type Banner = {
  id: number;
  text: string;
  code: string;
  link?: { label: string; href: string };
};

let listeners: Array<(b: Banner) => void> = [];
let _id = 0;

export type PeerErrorType =
  | "peer-not-found"
  | "unavailable-id"
  | "network"
  | "disconnected"
  | "browser-incompatible"
  | "socket-error"
  | "socket-closed"
  | "server-error"
  | "unknown";

const MAP: Record<Exclude<PeerErrorType, "unknown">, { text: string; code: string }> = {
  "peer-not-found": {
    text: "Could not find your friend! Please double-check their ID link and try again.",
    code: "122",
  },
  "unavailable-id": {
    text: "This session ID is already taken. Please try generating a new link.",
    code: "123",
  },
  network: {
    text: "Network connection lost! Please check your internet and try again.",
    code: "124",
  },
  disconnected: {
    text: "Network connection lost! Please check your internet and try again.",
    code: "124",
  },
  "browser-incompatible": {
    text: "Your browser or network blocks peer connections!",
    code: "125",
  },
  "socket-error": {
    text: "Connection handshake timed out! Please refresh.",
    code: "126",
  },
  "socket-closed": {
    text: "Connection handshake timed out! Please refresh.",
    code: "126",
  },
  "server-error": {
    text: "Server too busy, try again later!",
    code: "121",
  },
};

const FATAL = {
  text: "Warning: A critical, unsafe error occurred. Please check the PeerJS GitHub Issues page for support.",
  code: "6x001002x",
  link: { label: "PeerJS GitHub Issues page", href: "https://github.com" },
};

/** Dispatch a Peer error to the global toast banner. Never throws. */
export function notifyPeerError(typeRaw: unknown, _extra?: unknown) {
  try {
    const type = String(typeRaw ?? "unknown").toLowerCase();
    let banner: Banner;
    if (type in MAP) {
      const m = MAP[type as Exclude<PeerErrorType, "unknown">];
      banner = { id: ++_id, text: m.text, code: m.code };
    } else {
      banner = { id: ++_id, text: FATAL.text, code: FATAL.code, link: FATAL.link };
    }
    listeners.forEach((l) => l(banner));
  } catch {
    /* swallow — never crash app */
  }
}

/**
 * Top-center sliding banner host. Mount once at the root. Multiple errors
 * stack vertically.
 */
export function PeerErrorToastHost() {
  const [items, setItems] = useState<Banner[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const cb = (b: Banner) => {
      setItems((cur) => [...cur, b]);
      setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== b.id)), 7000);
    };
    listeners.push(cb);
    return () => {
      listeners = listeners.filter((l) => l !== cb);
    };
  }, []);
  const dismiss = (id: number) => setItems((cur) => cur.filter((x) => x.id !== id));
  if (!mounted) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-[min(640px,calc(100vw-1.5rem))]">
      {items.map((b) => (
        <div
          key={b.id}
          role="alert"
          className="pointer-events-auto animate-[peer-toast-down_0.35s_ease-out] rounded-xl shadow-lg border border-red-900/40 px-4 py-3 flex items-start gap-3"
          style={{ background: "#7f1d1d", color: "#ffffff" }}
        >
          <div className="flex-1 text-sm leading-snug">
            <span>{b.text}</span>
            {b.link && (
              <>
                {" "}
                <a
                  href={b.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  {b.link.label}
                </a>
              </>
            )}{" "}
            <span className="opacity-80 text-xs">Error code: {b.code}</span>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => dismiss(b.id)}
            className="shrink-0 rounded-md hover:bg-white/10 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes peer-toast-down {
          0% { transform: translateY(-120%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}