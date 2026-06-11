// Local-only custom criteria store. View-only for students; editable by
// teachers (the page only renders edit affordances when the teacher
// gradebook is unlocked via TeacherAuthGate / useTeacherMode).
// Persisted in localStorage with no server traffic and no influence on
// numerical averages.

import { useEffect, useState } from "react";

export const CRITERIA_STORE_KEY = "gradecalc-criteria-store-v1";
export const CRITERIA_STORE_EVT = "gradecalc-criteria-store-change";
export const CRITERIA_SEED_KEY = "gradecalc-criteria-seeded-v1";

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

export type GradeEntry = { letter: AllowedGrade; description: string };

export type Criterion = {
  id: string;
  title: string;
  description: string;
  grades: GradeEntry[];
  preset?: boolean;
  createdAt: string;
  updatedAt: string;
};

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CRITERIA_STORE_EVT));
  }
}

/** Normalises a single record from any prior schema. Older shape stored
 *  `grades: string[]`; new shape stores `Array<{ letter, description }>`. */
function normalise(raw: any): Criterion | null {
  if (!raw || typeof raw.id !== "string") return null;
  const grades: GradeEntry[] = Array.isArray(raw.grades)
    ? (raw.grades as unknown[])
        .map((g): GradeEntry | null => {
          if (typeof g === "string" && (ALLOWED_GRADES as readonly string[]).includes(g)) {
            return { letter: g as AllowedGrade, description: "" };
          }
          const obj = g as { letter?: unknown; description?: unknown } | null | undefined;
          if (
            obj &&
            typeof obj.letter === "string" &&
            (ALLOWED_GRADES as readonly string[]).includes(obj.letter)
          ) {
            return {
              letter: obj.letter as AllowedGrade,
              description: typeof obj.description === "string" ? obj.description : "",
            };
          }
          return null;
        })
        .filter((g: GradeEntry | null): g is GradeEntry => g != null)
    : [];
  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : "Untitled criterion",
    description: typeof raw.description === "string" ? raw.description : "",
    grades: dedupe(grades),
    preset: !!raw.preset,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

export function loadCriteriaList(): Criterion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CRITERIA_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalise).filter((c): c is Criterion => c != null);
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
  input: Pick<Criterion, "title" | "description"> & {
    grades?: GradeEntry[];
    preset?: boolean;
  },
): Criterion {
  const now = new Date().toISOString();
  const next: Criterion = {
    id: uid(),
    title: input.title.trim() || "Untitled criterion",
    description: input.description.trim(),
    grades: dedupe(input.grades ?? []),
    preset: !!input.preset,
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
  if (!(ALLOWED_GRADES as readonly string[]).includes(grade)) return;
  const list = loadCriteriaList().map((c) => {
    if (c.id !== id) return c;
    const has = c.grades.some((g) => g.letter === grade);
    return {
      ...c,
      grades: has
        ? c.grades.filter((g) => g.letter !== grade)
        : [...c.grades, { letter: grade, description: "" }],
      updatedAt: new Date().toISOString(),
    };
  });
  persist(list);
}

export function setGradeDescription(
  id: string,
  grade: AllowedGrade,
  description: string,
): void {
  const list = loadCriteriaList().map((c) => {
    if (c.id !== id) return c;
    return {
      ...c,
      grades: c.grades.map((g) =>
        g.letter === grade ? { ...g, description } : g,
      ),
      updatedAt: new Date().toISOString(),
    };
  });
  persist(list);
}

function dedupe(grades: GradeEntry[]): GradeEntry[] {
  const seen = new Set<AllowedGrade>();
  const out: GradeEntry[] = [];
  for (const g of grades) {
    if ((ALLOWED_GRADES as readonly string[]).includes(g.letter) && !seen.has(g.letter)) {
      seen.add(g.letter);
      out.push(g);
    }
  }
  return out;
}

/** Default criteria seeded on first visit. Teachers may delete any of
 *  them; deletions persist so we never re-add the same preset after the
 *  user has cleared it. The seed flag is independent of the list itself. */
const PRESETS: Array<Pick<Criterion, "title" | "description"> & { grades: GradeEntry[] }> = [
  {
    title: "Criterion A — Knowing & Understanding",
    description:
      "Recall, recognise and apply subject-specific terminology, facts and concepts to familiar and unfamiliar situations.",
    grades: [
      { letter: "A*", description: "Comprehensive, precise recall across the entire syllabus." },
      { letter: "A", description: "Strong recall with only minor gaps." },
      { letter: "B", description: "Solid working knowledge of most topics." },
      { letter: "C", description: "Adequate recall of core material." },
      { letter: "D", description: "Limited understanding of key concepts." },
    ],
  },
  {
    title: "Criterion B — Investigating",
    description:
      "Plan and carry out structured investigations, evaluating sources and methods.",
    grades: [
      { letter: "A*", description: "Sophisticated, fully justified investigation plan." },
      { letter: "A", description: "Clear, methodical planning with strong justification." },
      { letter: "B", description: "Reasonable plan with some justification." },
      { letter: "C", description: "Basic plan with limited reasoning." },
    ],
  },
  {
    title: "Criterion C — Communicating",
    description:
      "Use a range of formats to communicate information accurately, fluently and for a chosen audience.",
    grades: [
      { letter: "A*", description: "Polished, audience-aware communication throughout." },
      { letter: "A", description: "Consistently clear and well-structured." },
      { letter: "B", description: "Mostly clear with occasional lapses in structure." },
      { letter: "C", description: "Communicates the main idea but lacks polish." },
    ],
  },
  {
    title: "Criterion D — Thinking Critically",
    description:
      "Analyse, evaluate and synthesise ideas, justifying conclusions with evidence.",
    grades: [
      { letter: "A*", description: "Insightful, well-evidenced critical analysis." },
      { letter: "A", description: "Strong analysis with sound justification." },
      { letter: "B", description: "Some analysis with limited justification." },
      { letter: "C", description: "Descriptive rather than analytical." },
    ],
  },
];

/** Idempotent. Seeds the four preset criteria the first time it runs on
 *  a given device; subsequent calls are a no-op even if the user has
 *  deleted some/all of them. */
export function seedPresetCriteriaOnce(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(CRITERIA_SEED_KEY) === "1") return;
  const existing = loadCriteriaList();
  const now = new Date().toISOString();
  const next: Criterion[] = [
    ...PRESETS.map((p, i) => ({
      id: `preset-${i}-${Date.now().toString(36)}`,
      title: p.title,
      description: p.description,
      grades: dedupe(p.grades),
      preset: true,
      createdAt: now,
      updatedAt: now,
    })),
    ...existing,
  ];
  localStorage.setItem(CRITERIA_STORE_KEY, JSON.stringify(next));
  localStorage.setItem(CRITERIA_SEED_KEY, "1");
  emit();
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
