import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Task = {
  id: string;
  courseId: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  category: string;
  date: string;
  pending?: boolean;
  hypothetical?: boolean;
};

export type Course = {
  id: string;
  name: string;
  credits: number;
  color: string;
};

export type GradeScaleRow = {
  id: string;
  min: number;
  letter: string;
  description: string;
  gpa: number;
};

export type Settings = {
  weighted: boolean;
  goal: number;
  selectedCourse: string;
  hypotheticalMode: boolean;
  gpaTarget: number;
  dangerThreshold: number;
  parentView: boolean;
  streak: number;
  streakLastDate: string | null;
};

export type FutureClass = {
  id: string;
  name: string;
  credits: number;
  expectedLetter: string;
  semester: string;
};

export type NoteChecklist = {
  id: string;
  title: string;
  courseId: string;
  examDate: string;
  items: { id: string; text: string; done: boolean }[];
};

type PomoState = { seconds: number; running: boolean; startedAt: number | null };

export type Term = { id: string; name: string; start: string; end: string };

type State = {
  courses: Course[];
  tasks: Task[];
  scale: GradeScaleRow[];
  categories: string[];
  settings: Settings;
  studyMinutes: Record<string, number>;
  futureClasses: FutureClass[];
  checklists: NoteChecklist[];
  scaleOverrides: Record<string, GradeScaleRow[]>;
  subjectGoals: Record<string, number>;
  activityDates: string[];
  pomodoroState: Record<string, PomoState>;
  terms: Term[];
  activeTermId: string | null;
};


const DEFAULT_SCALE: GradeScaleRow[] = [
  { id: "astar", min: 91, letter: "A*", description: "Outstanding", gpa: 4.0 },
  { id: "a", min: 81, letter: "A", description: "Excellent", gpa: 4.0 },
  { id: "b", min: 71, letter: "B", description: "Good", gpa: 3.0 },
  { id: "c", min: 61, letter: "C", description: "Satisfactory", gpa: 2.0 },
  { id: "d", min: 51, letter: "D", description: "Passing", gpa: 1.5 },
  { id: "e", min: 41, letter: "E", description: "Borderline", gpa: 1.0 },
  { id: "f", min: 31, letter: "F", description: "Fail", gpa: 0.0 },
];

const DEFAULT_COURSES: Course[] = [
  { id: "math", name: "Mathematics", credits: 4, color: "oklch(0.55 0.22 275)" },
  { id: "sci", name: "Science", credits: 4, color: "oklch(0.6 0.16 155)" },
  { id: "eng", name: "English", credits: 3, color: "oklch(0.72 0.17 65)" },
];

const DEFAULT_CATEGORIES = ["Homework", "Quizzes", "Tests", "Projects", "Participation"];

const sample = (id: string, courseId: string, name: string, score: number, max: number, weight: number, cat: string, days: number): Task => ({
  id, courseId, name, score, maxScore: max, weight, category: cat,
  date: new Date(Date.now() - days * 86400000).toISOString().slice(0, 10),
});

const DEFAULT_TASKS: Task[] = [
  sample("t1", "math", "Algebra Quiz", 92, 100, 1, "Quizzes", 28),
  sample("t2", "math", "Midterm Exam", 88, 100, 2, "Tests", 20),
  sample("t3", "sci", "Lab Report", 95, 100, 1, "Homework", 15),
  sample("t4", "sci", "Unit Test", 97, 100, 2, "Tests", 10),
  sample("t5", "eng", "Essay", 89, 100, 1.5, "Homework", 7),
  sample("t6", "eng", "Reading Quiz", 94, 100, 1, "Quizzes", 4),
  sample("t7", "math", "Problem Set", 98, 100, 1, "Homework", 1),
];

const DEFAULT_STATE: State = {
  courses: DEFAULT_COURSES,
  tasks: DEFAULT_TASKS,
  scale: DEFAULT_SCALE,
  categories: DEFAULT_CATEGORIES,
  settings: {
    weighted: true,
    goal: 90,
    selectedCourse: "all",
    hypotheticalMode: false,
    gpaTarget: 3.7,
    dangerThreshold: 70,
    parentView: false,
    streak: 0,
    streakLastDate: null,
  },
  studyMinutes: {},
  futureClasses: [],
  checklists: [],
  scaleOverrides: {},
  subjectGoals: {},
  activityDates: [],
  pomodoroState: {},
  terms: [],
  activeTermId: null,
};


const KEY = "gradecalc-state-v2";

type Ctx = State & {
  setCourses: (c: Course[]) => void;
  setTasks: (t: Task[]) => void;
  setScale: (s: GradeScaleRow[]) => void;
  setCategories: (c: string[]) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  addTask: (t: Task) => void;
  updateTask: (id: string, t: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addCourse: (c: Course) => void;
  deleteCourse: (id: string) => void;
  addStudyMinutes: (courseId: string, mins: number) => void;
  addFutureClass: (c: FutureClass) => void;
  deleteFutureClass: (id: string) => void;
  addChecklist: (c: NoteChecklist) => void;
  updateChecklist: (id: string, patch: Partial<NoteChecklist>) => void;
  deleteChecklist: (id: string) => void;
  setScaleOverride: (courseId: string, scale: GradeScaleRow[] | null) => void;
  renameCourse: (id: string, name: string) => void;
  setSubjectGoal: (courseId: string, goal: number | null) => void;
  markActivity: (date?: string) => void;
  setPomodoroState: (courseId: string, state: PomoState) => void;
  setTerms: (terms: Term[]) => void;
  setActiveTerm: (id: string | null) => void;
  reset: () => void;

};

const GradeContext = createContext<Ctx | null>(null);

export function GradeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          ...DEFAULT_STATE,
          ...parsed,
          settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
          categories: parsed.categories ?? DEFAULT_CATEGORIES,
        });
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, loaded]);

  const value: Ctx = {
    ...state,
    setCourses: (courses) => setState((s) => ({ ...s, courses })),
    setTasks: (tasks) => setState((s) => ({ ...s, tasks })),
    setScale: (scale) => setState((s) => ({ ...s, scale })),
    setCategories: (categories) => setState((s) => ({ ...s, categories })),
    addCategory: (name) =>
      setState((s) =>
        s.categories.includes(name) ? s : { ...s, categories: [...s.categories, name] },
      ),
    deleteCategory: (name) =>
      setState((s) => ({ ...s, categories: s.categories.filter((c) => c !== name) })),
    setSettings: (p) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } })),
    addTask: (t) =>
      setState((s) => {
        const today = new Date().toISOString().slice(0, 10);
        const streak =
          s.settings.streakLastDate === today
            ? s.settings.streak
            : s.settings.streakLastDate ===
                new Date(Date.now() - 86400000).toISOString().slice(0, 10)
              ? s.settings.streak + 1
              : 1;
        const activityDates = s.activityDates.includes(today)
          ? s.activityDates
          : [...s.activityDates, today];
        return {
          ...s,
          tasks: [...s.tasks, t],
          settings: { ...s.settings, streak, streakLastDate: today },
          activityDates,
        };
      }),
    updateTask: (id, patch) =>
      setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    deleteTask: (id) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
    addCourse: (c) => setState((s) => ({ ...s, courses: [...s.courses, c] })),
    deleteCourse: (id) =>
      setState((s) => ({
        ...s,
        courses: s.courses.filter((c) => c.id !== id),
        tasks: s.tasks.filter((t) => t.courseId !== id),
      })),
    addStudyMinutes: (courseId, mins) =>
      setState((s) => {
        const today = new Date().toISOString().slice(0, 10);
        const activityDates = s.activityDates.includes(today)
          ? s.activityDates
          : [...s.activityDates, today];
        return {
          ...s,
          studyMinutes: { ...s.studyMinutes, [courseId]: (s.studyMinutes[courseId] ?? 0) + mins },
          activityDates,
        };
      }),
    addFutureClass: (c) => setState((s) => ({ ...s, futureClasses: [...s.futureClasses, c] })),
    deleteFutureClass: (id) =>
      setState((s) => ({ ...s, futureClasses: s.futureClasses.filter((c) => c.id !== id) })),
    addChecklist: (c) => setState((s) => ({ ...s, checklists: [...s.checklists, c] })),
    updateChecklist: (id, patch) =>
      setState((s) => ({
        ...s,
        checklists: s.checklists.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      })),
    deleteChecklist: (id) =>
      setState((s) => ({ ...s, checklists: s.checklists.filter((c) => c.id !== id) })),
    setScaleOverride: (courseId, scale) =>
      setState((s) => {
        const next = { ...s.scaleOverrides };
        if (scale && scale.length) next[courseId] = scale;
        else delete next[courseId];
        return { ...s, scaleOverrides: next };
      }),
    renameCourse: (id, name) =>
      setState((s) => ({
        ...s,
        courses: s.courses.map((c) => (c.id === id ? { ...c, name: name.slice(0, 25) } : c)),
      })),
    setSubjectGoal: (courseId, goal) =>
      setState((s) => {
        const next = { ...s.subjectGoals };
        if (goal === null || isNaN(goal)) delete next[courseId];
        else next[courseId] = goal;
        return { ...s, subjectGoals: next };
      }),
    markActivity: (date) =>
      setState((s) => {
        const d = date ?? new Date().toISOString().slice(0, 10);
        if (s.activityDates.includes(d)) return s;
        return { ...s, activityDates: [...s.activityDates, d] };
      }),
    setPomodoroState: (courseId, pomo) =>
      setState((s) => ({
        ...s,
        pomodoroState: { ...s.pomodoroState, [courseId]: pomo },
      })),
    setTerms: (terms) =>
      setState((s) => ({
        ...s,
        terms: terms.slice(0, 6),
        activeTermId:
          s.activeTermId && terms.some((t) => t.id === s.activeTermId)
            ? s.activeTermId
            : null,
      })),
    setActiveTerm: (id) => setState((s) => ({ ...s, activeTermId: id })),
    reset: () => setState(DEFAULT_STATE),
  };

  return <GradeContext.Provider value={value}>{children}</GradeContext.Provider>;
}

export function useGrades() {
  const ctx = useContext(GradeContext);
  if (!ctx) throw new Error("useGrades must be inside GradeProvider");
  return ctx;
}
