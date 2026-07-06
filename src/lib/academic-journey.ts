import { useEffect, useState } from "react";

export type JourneyEntry = {
  id: string;
  ts: number;
  weekKey: string;
  proudA: string;
  proudB: string;
  triggerTitle?: string;
};

const KEY = "my-academic-journey-v1";
const SEEN_KEY = "refocus-shard-seen-v1";
const EVT = "academic-journey-change";

function iso(d: Date) { return d.toISOString().slice(0, 10); }
export function weekKey(d = new Date()) {
  const x = new Date(d); const day = x.getDay();
  x.setDate(x.getDate() + ((day === 0 ? -6 : 1) - day));
  x.setHours(0, 0, 0, 0);
  return iso(x);
}

function read(): JourneyEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function commitJourney(entry: Omit<JourneyEntry, "id" | "ts">) {
  const all = read();
  const rec: JourneyEntry = { ...entry, id: crypto.randomUUID(), ts: Date.now() };
  all.unshift(rec);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(EVT));
  return rec;
}
export function useJourney(): JourneyEntry[] {
  const [xs, setXs] = useState<JourneyEntry[]>([]);
  useEffect(() => {
    const sync = () => setXs(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return xs;
}

/** Return an unshown high-weight exam that just passed, or null. */
export function useRefocusTrigger(tasks: any[]): { title: string; date: string } | null {
  const [trigger, setTrigger] = useState<{ title: string; date: string } | null>(null);
  useEffect(() => {
    if (!Array.isArray(tasks)) return;
    const now = Date.now();
    let seen: Record<string, number> = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch {}
    const wk = weekKey();
    // Heavy exam-ish task whose date passed <= 7 days ago and hasn't been seen this week
    const candidate = tasks
      .filter((t) => (t?.weight ?? 0) >= 20)
      .map((t) => ({ t, ts: new Date(t.date).getTime() }))
      .filter(({ ts }) => Number.isFinite(ts) && ts <= now && now - ts <= 7 * 86400000)
      .sort((a, b) => b.ts - a.ts)[0];
    if (!candidate) { setTrigger(null); return; }
    const seenKey = `${wk}|${candidate.t.id ?? candidate.t.name}`;
    if (seen[seenKey]) { setTrigger(null); return; }
    setTrigger({ title: candidate.t.name || "Heavy assessment", date: candidate.t.date });
  }, [tasks]);
  return trigger;
}

export function markRefocusSeen(triggerTitle: string) {
  let seen: Record<string, number> = {};
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}"); } catch {}
  seen[`${weekKey()}|${triggerTitle}`] = Date.now();
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  window.dispatchEvent(new CustomEvent(EVT));
}
