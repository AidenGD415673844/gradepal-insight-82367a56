// Local-only custom criteria store. View-only for students; editable by
// teachers (the page only renders edit affordances when the teacher
// gradebook is unlocked via TeacherAuthGate / useTeacherMode).
// Persisted in localStorage with no server traffic and no influence on
// numerical averages.

import { useEffect, useState } from "react";

export const CRITERIA_STORE_KEY = "gradecalc-criteria-store-v1";
export const CRITERIA_STORE_EVT = "gradecalc-criteria-store-change";

/** Allowed grade pool — fixed A* through NA. Teachers may only pick
 *  from this set when attaching grades to a criterion. */
export const ALLOWED_GRADES = [
  "A*",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "NA",
] as const;
export type AllowedGrade = (typeof ALLOWED_GRADES)[number];

export type Criterion = {
  id: string;
  title: string;
  description: string;
  grades: AllowedGrade[];
  createdAt: string;
  updatedAt: string;
};

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CRITERIA_STORE_EVT));
  }
}

export function loadCriteriaList(): Criterion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CRITERIA_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c) => c && typeof c.id === "string");
  } catch {
    return [];
  }
}

function persist(list: Criterion[]) {
  localStorage.setItem(CRITERIA_STORE_KEY, JSON.stringify(list));
  emit();
}

function uid(): string {
  return `crit-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function addCriterion(
  input: Pick<Criterion, "title" | "description"> & { grades?: AllowedGrade[] },
): Criterion {
  const now = new Date().toISOString();
  const next: Criterion = {
    id: uid(),
    title: input.title.trim() || "Untitled criterion",
    description: input.description.trim(),
    grades: dedupe(input.grades ?? []),
    createdAt: now,
    updatedAt: now,
  };
  persist([...loadCriteriaList(), next]);
  return next;
}

export function updateCriterion(
  id: string,
  patch: Partial<Pick<Criterion, "title" | "description" | "grades">>,
): void {
  const list = loadCriteriaList().map((c) =>
    c.id === id
      ? {
          ...c,
          ...patch,
          grades: patch.grades ? dedupe(patch.grades) : c.grades,
          updatedAt: new Date().toISOString(),
        }
      : c,
  );
  persist(list);
}

export function removeCriterion(id: string): void {
  persist(loadCriteriaList().filter((c) => c.id !== id));
}

export function toggleGrade(id: string, grade: AllowedGrade): void {
  if (!ALLOWED_GRADES.includes(grade)) return;
  const list = loadCriteriaList().map((c) => {
    if (c.id !== id) return c;
    const has = c.grades.includes(grade);
    return {
      ...c,
      grades: has ? c.grades.filter((g) => g !== grade) : [...c.grades, grade],
      updatedAt: new Date().toISOString(),
    };
  });
  persist(list);
}

function dedupe(grades: AllowedGrade[]): AllowedGrade[] {
  const seen = new Set<AllowedGrade>();
  const out: AllowedGrade[] = [];
  for (const g of grades) {
    if (ALLOWED_GRADES.includes(g) && !seen.has(g)) {
      seen.add(g);
      out.push(g);
    }
  }
  return out;
}

/** Reactive hook — re-renders on local edits and cross-tab storage events. */
export function useCriteriaList(): Criterion[] {
  const [list, setList] = useState<Criterion[]>(() => loadCriteriaList());
  useEffect(() => {
    const sync = () => setList(loadCriteriaList());
    window.addEventListener(CRITERIA_STORE_EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CRITERIA_STORE_EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return list;
}