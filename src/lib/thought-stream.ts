// =============================================================================
// Live "<thought_process>" stream store — a tiny event-emitting singleton
// the AI Analyser writes to as it accumulates chain-of-thought chunks. The
// AI Reasoning Core sidebar in AILogicTrack subscribes to render the raw
// tutor scratchpad as it flows in — no static presets, no rotating quotes.
// =============================================================================
import { useEffect, useState } from "react";

const EVT = "gradepal-thought-stream";
let _buf = "";
let _open = false;

export function resetThought() { _buf = ""; _open = false; fire(); }
export function openThought()  { _open = true; fire(); }
export function closeThought() { _open = false; fire(); }
export function appendThought(chunk: string) {
  if (!chunk) return;
  _buf += chunk;
  fire();
}
export function getThought(): string { return _buf; }
export function isThoughtOpen(): boolean { return _open; }

function fire() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT));
}

export function useThoughtStream(): { buf: string; open: boolean } {
  const [s, setS] = useState({ buf: _buf, open: _open });
  useEffect(() => {
    const sync = () => setS({ buf: _buf, open: _open });
    window.addEventListener(EVT, sync);
    return () => window.removeEventListener(EVT, sync);
  }, []);
  return s;
}

/**
 * Simulate an incremental chunk feed from a completed response. The real
 * OpenRouter route call in this codebase is non-streaming, so we sub-slice
 * the <thought_process>…</thought_process> segment into paced fragments the
 * moment the reply arrives, so the sidebar still feels "live".
 */
export function simulateThoughtStream(fullText: string, opts?: { chunkChars?: number; delayMs?: number }): Promise<void> {
  const m = fullText.match(/<thought_process>([\s\S]*?)<\/thought_process>/i);
  if (!m) return Promise.resolve();
  const raw = m[1].trim();
  const chunk = opts?.chunkChars ?? 18;
  const delay = opts?.delayMs ?? 45;
  resetThought();
  openThought();
  return new Promise((resolve) => {
    let i = 0;
    const id = setInterval(() => {
      if (i >= raw.length) {
        clearInterval(id);
        closeThought();
        resolve();
        return;
      }
      appendThought(raw.slice(i, i + chunk));
      i += chunk;
    }, delay);
  });
}

/** Strip the <thought_process> wrapper from a reply before display. */
export function stripThoughtBlock(text: string): string {
  return text.replace(/<thought_process>[\s\S]*?<\/thought_process>\s*/i, "").trim();
}