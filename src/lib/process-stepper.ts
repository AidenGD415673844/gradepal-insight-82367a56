// =============================================================================
// AI Logic Track — client-side process stepper. A singleton event-emitting
// state machine that the AI Analyser (and any other long-running flow) drives
// as it walks through real local-execution phases. The UI listens and renders
// a live progress bar, swappable sub-text, error overlay, and reasoning log.
// Zero servers — pure browser memory + a tiny localStorage echo so the bar
// hydrates across reloads.
// =============================================================================

import { useEffect, useState } from "react";

export type StepKey =
  | "idle"
  | "mount"
  | "parse"
  | "crawl"
  | "weights"
  | "encrypt"
  | "regress"
  | "hydrate"
  | "katex"
  | "wallet"
  | "polish"
  | "done";

export type LogicEntry = { ts: number; pct: number; key: StepKey; label: string; reason: string };

export type StepperState = {
  pct: number;
  key: StepKey;
  label: string;
  busy: boolean;
  error: { stage: string; message: string } | null;
  log: LogicEntry[];
};

export const STEP_TABLE: Record<StepKey, { pct: number; label: string; reason: string }> = {
  idle:    { pct: 0,   label: "Idle",                                                       reason: "" },
  mount:   { pct: 0,   label: "Initializing local interface shell and mounting visual framework modules…", reason: "Route mounted; painting first frames before data parse begins." },
  parse:   { pct: 12,  label: "Parsing local data blocks and initializing client context map…",            reason: "Walking localStorage registry keys to validate shape and version markers." },
  crawl:   { pct: 20,  label: "Crawling history registries and compiling chronological term metrics…",     reason: "Deep history crawler stitches every August→June task into the snapshot." },
  weights: { pct: 27,  label: "Evaluating subject weight multipliers and isolation buffer deltas…",        reason: "Weighted averages reconciled against category weights and term filters." },
  encrypt: { pct: 40,  label: "Running serverless encryption cycles and syncing local network states…",   reason: "PIN-vault hash check + WebRTC link readiness probe." },
  regress: { pct: 55,  label: "Calculating linear regressions and forecasting terminal grade trajectories…", reason: "OpenRouter prompt context builder attaches authoritative grade snapshot." },
  hydrate: { pct: 68,  label: "Hydrating interface canvas cards and rendering high-fidelity matrix modules…", reason: "First response chunks arrived; hydrating reasoning canvas." },
  katex:   { pct: 74,  label: "Cross-referencing syllabus mastery dots with active task indices…",        reason: "KaTeX intercepts $…$ tokens inside the markdown stream." },
  wallet:  { pct: 85,  label: "Verifying local wallet balance thresholds and license credential variables…", reason: "Wallet ledger + tier expiry verified after the spend." },
  polish:  { pct: 92,  label: "Polishing frosted-glass dashboard viewports and clearing rendering cache…", reason: "Layout containers finalize text boxes and unmount skeletons." },
  done:    { pct: 100, label: "Workspace operational. System alignment complete.",                         reason: "Pipeline closed cleanly." },
};

const EVT = "gradepal-stepper";
const LS = "gradepal_stepper_v1";

let _state: StepperState = {
  pct: 0, key: "idle", label: "", busy: false, error: null, log: [],
};

function rehydrate() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LS);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StepperState>;
      if (parsed && Array.isArray(parsed.log)) {
        _state = { ..._state, ...parsed, log: parsed.log.slice(-40) };
      }
    }
  } catch { /* noop */ }
}
rehydrate();

function emit() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS, JSON.stringify({ ..._state, log: _state.log.slice(-40) })); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(EVT));
}

export function getStepperState(): StepperState { return _state; }

export function stepBegin() {
  _state = { pct: 0, key: "mount", label: STEP_TABLE.mount.label, busy: true, error: null, log: [] };
  _pushLog("mount");
  emit();
}

function _pushLog(key: StepKey) {
  const t = STEP_TABLE[key];
  _state.log = [..._state.log, { ts: Date.now(), pct: t.pct, key, label: t.label, reason: t.reason }].slice(-40);
}

export function stepTo(key: StepKey) {
  const t = STEP_TABLE[key];
  _state.pct = t.pct;
  _state.key = key;
  _state.label = t.label;
  if (key === "done") { _state.busy = false; }
  else { _state.busy = true; }
  _pushLog(key);
  emit();
}

export function stepFail(stage: string, message: string) {
  _state.busy = false;
  _state.error = { stage, message };
  _state.log = [..._state.log, { ts: Date.now(), pct: _state.pct, key: _state.key, label: `⚠ ${stage} failed`, reason: message }].slice(-40);
  emit();
}

export function stepReset() {
  _state = { pct: 0, key: "idle", label: "", busy: false, error: null, log: [] };
  emit();
}

/** Wrap a unit of work with try/catch + auto stage transition. */
export async function stepRun<T>(key: StepKey, stage: string, work: () => Promise<T> | T): Promise<T> {
  stepTo(key);
  try {
    return await work();
  } catch (e) {
    stepFail(stage, e instanceof Error ? e.message : String(e));
    throw e;
  }
}

export function useStepper(): StepperState {
  const [s, setS] = useState<StepperState>(() => _state);
  useEffect(() => {
    const sync = () => setS({ ..._state });
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return s;
}