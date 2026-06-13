import { useEffect, useState } from "react";

export type UIPrefs = {
  darkMode: boolean;
  hideCharts: boolean;
  quickAdd: boolean;
  welcomeDismissed: boolean;
  aspirationalAuto: boolean;
};

const KEY = "gradecalc-ui-prefs-v1";
const EVT = "gradecalc-ui-prefs-change";

const DEFAULTS: UIPrefs = {
  darkMode: false,
  hideCharts: false,
  quickAdd: false,
  welcomeDismissed: false,
  aspirationalAuto: false,
};

function read(): UIPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function getUIPrefs(): UIPrefs {
  return read();
}

export function setUIPrefs(patch: Partial<UIPrefs>) {
  const next = { ...read(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVT));
  applyDarkMode(next.darkMode);
}

export function applyDarkMode(on: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", on);
}

export function useUIPrefs(): [UIPrefs, (p: Partial<UIPrefs>) => void] {
  const [prefs, setPrefs] = useState<UIPrefs>(DEFAULTS);
  useEffect(() => {
    const sync = () => setPrefs(read());
    sync();
    applyDarkMode(read().darkMode);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [prefs, setUIPrefs];
}

export function resetAllLocalData() {
  // Wipe every gradecalc-* localStorage key, then reload
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("gradecalc-")) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
  window.location.href = "/";
}
