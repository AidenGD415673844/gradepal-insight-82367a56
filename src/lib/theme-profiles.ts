import { useEffect, useState } from "react";

export type ThemeProfile = "default" | "managebac" | "aero" | "cyber" | "eink";

const K = "gradecalc_theme_profile";
const EVT = "gradecalc-theme-profile-change";

export const THEME_META: Record<ThemeProfile, {
  label: string;
  blurb: string;
  swatch: string[];
  supportsOpacity: boolean;
}> = {
  default:   { label: "GradeCalc Default", blurb: "Bright violet, soft cards — the original look.",                  swatch: ["#faf9fc","#ffffff","#6e3ad6","#1b1530"], supportsOpacity: false },
  managebac: { label: "ManageBac Dark",    blurb: "High-contrast midnight gray with crisp emerald borders.",        swatch: ["#1f242c","#2a313b","#10b981","#f7faff"], supportsOpacity: false },
  aero:      { label: "Aero Glass",        blurb: "Soft gradient backdrop with frosted, blurred glass cards.",      swatch: ["#dde9ff","#ffffff","#3a73f5","#1b1530"], supportsOpacity: true  },
  cyber:     { label: "Cyberpunk Neon",    blurb: "Obsidian frames with glowing violet borders and magenta accents.", swatch: ["#0d0a1f","#1a1230","#b653ff","#ff3ec2"], supportsOpacity: true  },
  eink:      { label: "Monochrome E-Ink",  blurb: "Stark, print-optimized paper white — ideal for desk reports.",   swatch: ["#ffffff","#f1efe8","#111111","#666666"], supportsOpacity: false },
};

const fire = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(EVT));

export function getThemeProfile(): ThemeProfile {
  if (typeof window === "undefined") return "default";
  return (localStorage.getItem(K) as ThemeProfile) ?? "default";
}
export function setThemeProfile(p: ThemeProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K, p);
  applyThemeProfile(p);
  fire();
}

/** Card opacity slider (Aero / Cyberpunk) — value 0..100 */
const K_OP = "gradecalc_theme_card_opacity";
export function getCardOpacity(): number {
  if (typeof window === "undefined") return 100;
  const v = Number(localStorage.getItem(K_OP));
  return Number.isFinite(v) && v > 0 ? v : 100;
}
export function setCardOpacity(v: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K_OP, String(v));
  applyCardOpacity(v);
  fire();
}

export function applyThemeProfile(p: ThemeProfile) {
  if (typeof document === "undefined") return;
  if (p === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", p);
  applyCardOpacity(getCardOpacity());
}
export function applyCardOpacity(v: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--gp-card-opacity", String(Math.max(0.1, v / 100)));
}

export function useThemeProfile(): [ThemeProfile, (p: ThemeProfile) => void] {
  const [p, setP] = useState<ThemeProfile>("default");
  useEffect(() => {
    const sync = () => setP(getThemeProfile());
    sync();
    applyThemeProfile(getThemeProfile());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return [p, setThemeProfile];
}