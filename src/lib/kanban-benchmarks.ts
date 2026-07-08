// =============================================================================
// Client-only Kanban benchmark registry. Holds target-score capsules produced
// by the Academic Flight Simulator so they can appear as motivational cards
// inside the real Kanban board's To-Do column. 100% serverless.
// =============================================================================
export type KanbanBenchmark = {
  id: string;
  label: string;
  detail: string;
  target: number; // percentage
  createdAt: number;
  source: "flight-simulator";
};

const KEY = "kanban-benchmarks-v1";
const EVT = "kanban-benchmarks-changed";

export function readBenchmarks(): KanbanBenchmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as KanbanBenchmark[]) : [];
  } catch {
    return [];
  }
}

function write(list: KanbanBenchmark[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function addBenchmarks(items: Omit<KanbanBenchmark, "id" | "createdAt" | "source">[]) {
  const now = Date.now();
  const list = readBenchmarks();
  const added: KanbanBenchmark[] = items.map((b, i) => ({
    ...b,
    id: `bmk-${now}-${i}`,
    createdAt: now,
    source: "flight-simulator",
  }));
  write([...added, ...list].slice(0, 40));
  return added.length;
}

export function removeBenchmark(id: string) {
  write(readBenchmarks().filter((b) => b.id !== id));
}

export function subscribeBenchmarks(fn: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}