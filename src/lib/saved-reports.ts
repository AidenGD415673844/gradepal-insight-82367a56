// Local-only Saved Reports History Hub. Hard cap of 15 entries in localStorage.

export const SAVED_REPORTS_KEY = "gradecalc-saved-reports";
export const SAVED_REPORTS_MAX = 15;
export const SAVED_REPORTS_EVT = "gradecalc-saved-reports-change";

export type SavedReportRow = {
  courseId: string;
  courseName: string;
  color: string;
  teacher: string;
  goal: string;
  letter: string;
  avgDisplay: string;
  avg: number;
  prevLetter: string;
  prevAvgDisplay: string;
  bullets: [string, string, string, string, string];
  labels: [string, string, string, string, string];
  trendCaption: string;
  trendDelta: number | null;
};

export type SavedReport = {
  id: string;
  createdAt: string; // ISO
  termLabel: string;
  signatureDataUrl: string | null;
  rows: SavedReportRow[];
};

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SAVED_REPORTS_EVT));
  }
}

export function listSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_REPORTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: SavedReport[]) {
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(list));
  emit();
}

/** Returns {ok:true,snap} on success, {ok:false,reason:"cap"} when 15 slots full. */
export function saveReport(
  snap: Omit<SavedReport, "id" | "createdAt">,
): { ok: true; snap: SavedReport } | { ok: false; reason: "cap" } {
  const list = listSavedReports();
  if (list.length >= SAVED_REPORTS_MAX) return { ok: false, reason: "cap" };
  // Deep clone via JSON to detach from React state references.
  const cloned = JSON.parse(JSON.stringify(snap)) as Omit<SavedReport, "id" | "createdAt">;
  const full: SavedReport = {
    ...cloned,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  write([full, ...list]);
  return { ok: true, snap: full };
}

export function deleteSavedReport(id: string) {
  write(listSavedReports().filter((r) => r.id !== id));
}

export function formatSavedDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}