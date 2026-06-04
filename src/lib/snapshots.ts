// Local-only snapshot / time-machine archive. Everything lives in localStorage.

export const SNAPSHOT_KEY = "gradecalc_snapshot_registry";
export const SNAPSHOT_MAX = 15;
export const SNAPSHOT_EVT = "gradecalc-snapshot-change";

// Any localStorage key that should be captured as part of "app state".
const APP_PREFIXES = ["gradecalc-", "attendance-"];

export type Snapshot = {
  id: string;
  name: string;
  createdAt: string; // ISO
  sizeBytes: number;
  payload: Record<string, string>;
};

function isAppKey(k: string) {
  if (k === SNAPSHOT_KEY) return false;
  return APP_PREFIXES.some((p) => k.startsWith(p));
}

export function listSnapshots(): Snapshot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRegistry(list: Snapshot[]) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(SNAPSHOT_EVT));
}

function buildPayload(): { payload: Record<string, string>; sizeBytes: number } {
  const payload: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !isAppKey(k)) continue;
    const v = localStorage.getItem(k);
    if (v !== null) payload[k] = v;
  }
  // Deep-cloned by JSON round-trip then measured.
  const serialised = JSON.stringify(payload);
  return { payload: JSON.parse(serialised), sizeBytes: new Blob([serialised]).size };
}

/** Manual snapshot. Returns null when the registry is already at the cap. */
export function createSnapshot(name: string): Snapshot | null {
  const list = listSnapshots();
  if (list.length >= SNAPSHOT_MAX) return null;
  const { payload, sizeBytes } = buildPayload();
  const snap: Snapshot = {
    id: crypto.randomUUID(),
    name: name.trim() || `Snapshot #${list.length + 1}`,
    createdAt: new Date().toISOString(),
    sizeBytes,
    payload,
  };
  writeRegistry([snap, ...list]);
  return snap;
}

/** Auto / system snapshot. Bumps the oldest entry when at capacity so the
 *  safety net always succeeds before a destructive action. */
export function createAutoSnapshot(name = "Pre-Reset Automated Safeguard"): Snapshot {
  const list = listSnapshots();
  const { payload, sizeBytes } = buildPayload();
  const snap: Snapshot = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    sizeBytes,
    payload,
  };
  const trimmed = list.length >= SNAPSHOT_MAX ? list.slice(0, SNAPSHOT_MAX - 1) : list;
  writeRegistry([snap, ...trimmed]);
  return snap;
}

export function renameSnapshot(id: string, name: string) {
  const list = listSnapshots().map((s) => (s.id === id ? { ...s, name: name.slice(0, 80) } : s));
  writeRegistry(list);
}

export function deleteSnapshot(id: string) {
  writeRegistry(listSnapshots().filter((s) => s.id !== id));
}

/** Wipe current app keys, write the snapshot payload, hard-reload. */
export function restoreSnapshot(id: string) {
  const snap = listSnapshots().find((s) => s.id === id);
  if (!snap) return;
  // Clear existing app keys (preserve the registry itself).
  const toClear: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && isAppKey(k)) toClear.push(k);
  }
  toClear.forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(snap.payload)) localStorage.setItem(k, v);
  window.location.reload();
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
