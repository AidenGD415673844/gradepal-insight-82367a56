import { useEffect, useState } from "react";

export type MasteryLevel = "red" | "amber" | "green";

export type SyllabusUnit = {
  id: string;
  name: string;
  level: MasteryLevel;
  createdAt: number;
};

const KEY = "syllabus-mastery-v1";
type Store = Record<string, SyllabusUnit[]>; // courseId -> units

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function write(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("syllabus-mastery-change"));
}

export function useSyllabusUnits(courseId: string): SyllabusUnit[] {
  const [units, setUnits] = useState<SyllabusUnit[]>([]);
  useEffect(() => {
    const refresh = () => setUnits(read()[courseId] ?? []);
    refresh();
    const handler = () => refresh();
    window.addEventListener("syllabus-mastery-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("syllabus-mastery-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [courseId]);
  return units;
}

export function addUnit(courseId: string, name: string) {
  const s = read();
  const list = s[courseId] ?? [];
  s[courseId] = [
    ...list,
    {
      id: crypto.randomUUID(),
      name: name.trim().slice(0, 80),
      level: "red",
      createdAt: Date.now(),
    },
  ];
  write(s);
}

export function setUnitLevel(
  courseId: string,
  unitId: string,
  level: MasteryLevel,
) {
  const s = read();
  const list = s[courseId] ?? [];
  s[courseId] = list.map((u) => (u.id === unitId ? { ...u, level } : u));
  write(s);
}

export function removeUnit(courseId: string, unitId: string) {
  const s = read();
  const list = s[courseId] ?? [];
  s[courseId] = list.filter((u) => u.id !== unitId);
  write(s);
}

/** Ratio of green / total units, 0..100. Returns null when empty. */
export function masteryIndex(units: SyllabusUnit[]): number | null {
  if (!units.length) return null;
  const green = units.filter((u) => u.level === "green").length;
  return (green / units.length) * 100;
}