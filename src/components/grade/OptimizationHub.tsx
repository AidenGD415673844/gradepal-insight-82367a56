import { useEffect, useMemo, useState } from "react";
import { useGrades, type FutureClass, type NoteChecklist } from "@/lib/grade-store";
import { calcAverage, calcGPA, getLetter } from "@/lib/grade-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Shield,
  Timer,
  TrendingUp,
  GraduationCap,
  ListChecks,
  MessageCircle,
  BarChart3,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Target,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

/* ===================== 1. Vocabulary & Quiz Builder ===================== */
type Term = { id: string; term: string; definition: string };

export function VocabQuizBuilder() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [term, setTerm] = useState("");
  const [def, setDef] = useState("");
  const [mode, setMode] = useState<"build" | "flash" | "quiz">("build");
  const [flashIdx, setFlashIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quizIdx, setQuizIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const quiz = useMemo(() => {
    if (terms.length < 2) return [];
    const pool = [...terms].sort(() => Math.random() - 0.5).slice(0, Math.min(5, terms.length));
    return pool.map((t) => {
      const distractors = terms
        .filter((x) => x.id !== t.id)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map((x) => x.definition);
      const choices = [t.definition, ...distractors].sort(() => Math.random() - 0.5);
      return { ...t, choices };
    });
  }, [mode === "quiz" ? terms.length : terms]);

  const add = () => {
    if (!term.trim() || !def.trim()) return;
    setTerms((t) => [...t, { id: crypto.randomUUID(), term: term.trim(), definition: def.trim() }]);
    setTerm("");
    setDef("");
  };

  const startQuiz = () => {
    if (terms.length < 4) {
      toast.error("Add at least 4 terms to start a quiz");
      return;
    }
    setQuizIdx(0);
    setScore(0);
    setSelected(null);
    setMode("quiz");
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Vocabulary & Quiz Builder</h3>
      </div>

      <div className="flex gap-2 mb-3">
        <Button size="sm" variant={mode === "build" ? "default" : "outline"} onClick={() => setMode("build")}>
          Build
        </Button>
        <Button
          size="sm"
          variant={mode === "flash" ? "default" : "outline"}
          onClick={() => {
            if (!terms.length) return toast.error("Add terms first");
            setFlashIdx(0);
            setFlipped(false);
            setMode("flash");
          }}
        >
          Flashcards
        </Button>
        <Button size="sm" variant={mode === "quiz" ? "default" : "outline"} onClick={startQuiz}>
          Quiz (5)
        </Button>
      </div>

      {mode === "build" && (
        <>
          <div className="grid gap-2 mb-3">
            <Input placeholder="Term / question" value={term} onChange={(e) => setTerm(e.target.value)} />
            <Textarea
              placeholder="Definition / answer"
              value={def}
              onChange={(e) => setDef(e.target.value)}
              rows={2}
            />
            <Button onClick={add} className="gap-2">
              <Plus className="h-4 w-4" /> Add term
            </Button>
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1">
            {terms.map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/40">
                <span className="font-medium">{t.term}</span>
                <span className="text-muted-foreground truncate flex-1">— {t.definition}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setTerms((arr) => arr.filter((x) => x.id !== t.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {!terms.length && <p className="text-xs text-muted-foreground">No terms yet.</p>}
          </div>
        </>
      )}

      {mode === "flash" && terms.length > 0 && (
        <div>
          <div
            onClick={() => setFlipped((f) => !f)}
            className="h-40 rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-center px-4 cursor-pointer select-none"
          >
            <div>
              <div className="text-xs uppercase text-muted-foreground mb-2 tracking-wider">
                {flipped ? "Definition" : "Term"}
              </div>
              <div className="text-lg font-semibold">
                {flipped ? terms[flashIdx].definition : terms[flashIdx].term}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFlipped(false);
                setFlashIdx((i) => (i - 1 + terms.length) % terms.length);
              }}
            >
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              {flashIdx + 1} / {terms.length}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFlipped(false);
                setFlashIdx((i) => (i + 1) % terms.length);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {mode === "quiz" && quiz.length > 0 && quizIdx < quiz.length && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            Question {quizIdx + 1} / {quiz.length}
          </div>
          <div className="font-semibold mb-3">{quiz[quizIdx].term}</div>
          <div className="space-y-2">
            {quiz[quizIdx].choices.map((c) => {
              const isCorrect = c === quiz[quizIdx].definition;
              const tone =
                selected === null
                  ? "border-border hover:bg-muted/50"
                  : c === selected
                    ? isCorrect
                      ? "bg-success/15 border-success"
                      : "bg-destructive/15 border-destructive"
                    : isCorrect
                      ? "bg-success/10 border-success/50"
                      : "border-border opacity-60";
              return (
                <button
                  key={c}
                  disabled={selected !== null}
                  onClick={() => {
                    setSelected(c);
                    if (isCorrect) setScore((s) => s + 1);
                  }}
                  className={`w-full text-left text-sm p-2.5 rounded-lg border transition ${tone}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => {
                setSelected(null);
                setQuizIdx((i) => i + 1);
              }}
            >
              Next
            </Button>
          )}
        </div>
      )}
      {mode === "quiz" && quiz.length > 0 && quizIdx >= quiz.length && (
        <div className="p-4 rounded-xl bg-primary/10 text-center">
          <div className="text-3xl font-bold text-primary">
            {score} / {quiz.length}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Quiz complete</p>
          <Button className="mt-3" onClick={startQuiz}>
            Retake
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ===================== 2. Grade Protection Calculator ===================== */
export function GradeProtectionCalculator() {
  const { courses, tasks, scale, settings } = useGrades();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [finalWeight, setFinalWeight] = useState("20");
  const [targetLetter, setTargetLetter] = useState(scale[0]?.letter ?? "A");

  const course = courses.find((c) => c.id === courseId);
  const ct = tasks.filter((t) => t.courseId === courseId && !t.pending);
  const currentAvg = ct.length ? calcAverage(ct, settings.weighted) : 0;
  const targetRow = scale.find((s) => s.letter === targetLetter);
  const targetPct = targetRow?.min ?? 0;
  const fw = Math.max(0, Math.min(100, Number(finalWeight) || 0));
  const remaining = 100 - fw;
  // Treat current avg as 'remaining%' weight contribution, final as fw.
  const needed = fw > 0 ? (targetPct * 100 - currentAvg * remaining) / fw : 0;
  const status = needed <= 0 ? "guaranteed" : needed <= 100 ? "ok" : "impossible";

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Grade Protection Calculator</h3>
      </div>
      <div className="grid gap-2 mb-3">
        <div>
          <Label className="text-xs">Subject</Label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Final weight %</Label>
            <Input
              type="number"
              value={finalWeight}
              onChange={(e) => setFinalWeight(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">Target letter</Label>
            <select
              value={targetLetter}
              onChange={(e) => setTargetLetter(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              {scale.map((s) => (
                <option key={s.id} value={s.letter}>
                  {s.letter} ({s.min}+)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div
        className={`p-4 rounded-xl text-sm ${
          status === "ok"
            ? "bg-primary/10 border border-primary/30"
            : status === "guaranteed"
              ? "bg-success/10 border border-success/30"
              : "bg-destructive/10 border border-destructive/30"
        }`}
      >
        <div className="text-xs text-muted-foreground mb-1">
          Current avg in {course?.name}: <span className="font-semibold">{currentAvg.toFixed(1)}%</span>
        </div>
        {status === "guaranteed" && (
          <p>You've already locked in <strong>{targetLetter}</strong> regardless of the final.</p>
        )}
        {status === "ok" && (
          <p>
            You need a <strong className="text-primary text-lg">{needed.toFixed(1)}%</strong> on
            the final to maintain your goal of <strong>{targetLetter}</strong>.
          </p>
        )}
        {status === "impossible" && (
          <p>
            Even a 100% final can't reach <strong>{targetLetter}</strong>. Consider a lower target
            or extra-credit work.
          </p>
        )}
      </div>
    </Card>
  );
}

/* ===================== 3. Study Timer (Pomodoro) ===================== */
const POMO_TOTAL = 25 * 60;
export function StudyTimer() {
  const { courses, addStudyMinutes, studyMinutes, settings, pomodoroState, setPomodoroState } = useGrades();
  const [courseId, setCourseId] = useState(
    settings.selectedCourse !== "all" ? settings.selectedCourse : courses[0]?.id ?? "",
  );

  // Derive the current per-subject state, restoring elapsed time if running.
  const stored = pomodoroState[courseId];
  const computeRemaining = (st: typeof stored): number => {
    if (!st) return POMO_TOTAL;
    if (st.running && st.startedAt) {
      const elapsed = Math.floor((Date.now() - st.startedAt) / 1000);
      return Math.max(0, st.seconds - elapsed);
    }
    return st.seconds;
  };

  const [seconds, setSeconds] = useState(() => computeRemaining(stored));
  const [running, setRunning] = useState(!!stored?.running);

  // When the user switches subjects, restore that subject's saved state.
  useEffect(() => {
    const s = pomodoroState[courseId];
    setRunning(!!s?.running);
    setSeconds(computeRemaining(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Tick once per second while running.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Completion side-effect.
  useEffect(() => {
    if (seconds > 0) return;
    setRunning(false);
    addStudyMinutes(courseId, 25);
    setPomodoroState(courseId, { seconds: POMO_TOTAL, running: false, startedAt: null });
    toast.success(`+25 min logged to ${courses.find((c) => c.id === courseId)?.name ?? "subject"}`);
    setSeconds(POMO_TOTAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds]);

  const toggle = () => {
    if (running) {
      setRunning(false);
      setPomodoroState(courseId, { seconds, running: false, startedAt: null });
    } else {
      setRunning(true);
      setPomodoroState(courseId, { seconds, running: true, startedAt: Date.now() });
    }
  };
  const reset = () => {
    setRunning(false);
    setSeconds(POMO_TOTAL);
    setPomodoroState(courseId, { seconds: POMO_TOTAL, running: false, startedAt: null });
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const total = studyMinutes[courseId] ?? 0;

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Study Timer</h3>
      </div>
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="w-full h-9 rounded-md border bg-background px-3 text-sm mb-3"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="text-center my-4">
        <div className="text-6xl font-bold tabular-nums tracking-tight">
          {mm}:{ss}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {total} min logged for this subject
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={toggle} className="flex-1 gap-2">
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button variant="outline" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
    </Card>
  );
}

/* ===================== 4. Mathematical Trend Predictor ===================== */
export function TrendPredictor() {
  const { tasks, courses, scale, settings } = useGrades();
  const courseId =
    settings.selectedCourse !== "all" ? settings.selectedCourse : courses[0]?.id ?? "";
  const ct = tasks
    .filter((t) => t.courseId === courseId && !t.pending)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Weighted moving average: weights linear with recency
  const series = ct.map((t) => (t.score / t.maxScore) * 100);
  let wma = 0;
  if (series.length) {
    const recent = series.slice(-5);
    const weights = recent.map((_, i) => i + 1);
    const wSum = weights.reduce((a, b) => a + b, 0);
    wma = recent.reduce((s, v, i) => s + v * weights[i], 0) / wSum;
  }
  const slope =
    series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : 0;

  const projection = Array.from({ length: 4 }, (_, i) => {
    const v = Math.max(0, Math.min(100, wma + slope * (i + 1) * 0.5));
    return { step: `+${i + 1}`, projected: Number(v.toFixed(1)) };
  });
  const chartData = [
    ...series.map((v, i) => ({ step: `T${i + 1}`, actual: Number(v.toFixed(1)) })),
    ...projection.map((p) => ({ step: p.step, projected: p.projected })),
  ];

  const courseName = courses.find((c) => c.id === courseId)?.name ?? "—";
  const letter = getLetter(wma, scale)?.letter ?? "—";

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Mathematical Trend Predictor</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Weighted moving average + slope-based projection for {courseName}.
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="text-xs text-muted-foreground">Predicted next</div>
          <div className="text-2xl font-bold">{wma.toFixed(1)}%</div>
          <div className="text-xs text-primary">{letter}</div>
        </div>
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="text-xs text-muted-foreground">Trend</div>
          <div className={`text-2xl font-bold ${slope >= 0 ? "text-success" : "text-destructive"}`}>
            {slope >= 0 ? "▲" : "▼"} {Math.abs(slope).toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">per task</div>
        </div>
      </div>
      <div className="h-44">
        {chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="step" fontSize={10} stroke="var(--muted-foreground)" />
              <YAxis domain={[0, 100]} fontSize={10} stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="actual" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="var(--primary)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                opacity={0.6}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No data yet for this subject
          </div>
        )}
      </div>
    </Card>
  );
}

/* ===================== 5. GPA Transcript Simulator ===================== */
export function GpaTranscriptSimulator() {
  const { futureClasses, addFutureClass, deleteFutureClass, courses, tasks, scale } = useGrades();
  const [name, setName] = useState("");
  const [credits, setCredits] = useState("3");
  const [letter, setLetter] = useState(scale[0]?.letter ?? "A");
  const [semester, setSemester] = useState("Next Semester");

  const currentGpa = calcGPA(courses, tasks.filter((t) => !t.pending), scale);
  const currentCredits = courses.reduce((s, c) => s + c.credits, 0);

  const semesters = useMemo(() => {
    const groups: Record<string, FutureClass[]> = {};
    futureClasses.forEach((f) => {
      (groups[f.semester] ||= []).push(f);
    });
    return groups;
  }, [futureClasses]);

  let totalCredits = currentCredits;
  let totalPts = currentGpa * currentCredits;
  const projection: { semester: string; gpa: number }[] = [
    { semester: "Now", gpa: Number(currentGpa.toFixed(2)) },
  ];
  Object.entries(semesters).forEach(([sem, list]) => {
    list.forEach((f) => {
      const row = scale.find((s) => s.letter === f.expectedLetter);
      totalPts += (row?.gpa ?? 0) * f.credits;
      totalCredits += f.credits;
    });
    projection.push({
      semester: sem,
      gpa: totalCredits ? Number((totalPts / totalCredits).toFixed(2)) : 0,
    });
  });

  const add = () => {
    if (!name.trim()) return;
    addFutureClass({
      id: crypto.randomUUID(),
      name: name.trim(),
      credits: Number(credits) || 0,
      expectedLetter: letter,
      semester: semester.trim() || "Next Semester",
    });
    setName("");
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">GPA Transcript Simulator</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input placeholder="Class name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="Semester" value={semester} onChange={(e) => setSemester(e.target.value)} />
        <Input
          type="number"
          placeholder="Credits"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />
        <select
          value={letter}
          onChange={(e) => setLetter(e.target.value)}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {scale.map((s) => (
            <option key={s.id} value={s.letter}>
              {s.letter} ({s.gpa.toFixed(1)})
            </option>
          ))}
        </select>
      </div>
      <Button size="sm" onClick={add} className="w-full gap-2 mb-3">
        <Plus className="h-4 w-4" /> Add hypothetical class
      </Button>

      <div className="max-h-32 overflow-y-auto space-y-1 mb-3">
        {futureClasses.map((f) => (
          <div key={f.id} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/40">
            <Badge variant="secondary">{f.semester}</Badge>
            <span className="flex-1 truncate">{f.name}</span>
            <span className="text-xs text-muted-foreground">
              {f.credits}cr · {f.expectedLetter}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => deleteFutureClass(f.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {!futureClasses.length && (
          <p className="text-xs text-muted-foreground">No future classes added.</p>
        )}
      </div>

      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={projection} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="semester" fontSize={10} stroke="var(--muted-foreground)" />
            <YAxis domain={[0, 4]} fontSize={10} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
            />
            <Area
              type="monotone"
              dataKey="gpa"
              stroke="var(--primary)"
              fill="var(--primary)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ===================== 6. Study Note Checklist Maker ===================== */
export function NoteChecklistMaker() {
  const { checklists, addChecklist, updateChecklist, deleteChecklist, courses } = useGrades();
  const [title, setTitle] = useState("");
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [examDate, setExamDate] = useState("");
  const [itemText, setItemText] = useState<Record<string, string>>({});

  const create = () => {
    if (!title.trim()) return;
    addChecklist({
      id: crypto.randomUUID(),
      title: title.trim(),
      courseId,
      examDate,
      items: [],
    });
    setTitle("");
  };

  const addItem = (cl: NoteChecklist) => {
    const text = (itemText[cl.id] || "").trim();
    if (!text) return;
    updateChecklist(cl.id, {
      items: [...cl.items, { id: crypto.randomUUID(), text, done: false }],
    });
    setItemText((s) => ({ ...s, [cl.id]: "" }));
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Study Note Checklists</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input placeholder="Checklist title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
      </div>
      <div className="flex gap-2 mb-3">
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="flex-1 h-9 rounded-md border bg-background px-3 text-sm"
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button onClick={create} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New
        </Button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto">
        {checklists.map((cl) => {
          const course = courses.find((c) => c.id === cl.courseId);
          const done = cl.items.filter((i) => i.done).length;
          return (
            <div key={cl.id} className="border rounded-xl p-3 bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: course?.color }} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{cl.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {course?.name} {cl.examDate && `· exam ${cl.examDate}`} · {done}/{cl.items.length}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => deleteChecklist(cl.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1 mb-2">
                {cl.items.map((it) => (
                  <label key={it.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={it.done}
                      onChange={() =>
                        updateChecklist(cl.id, {
                          items: cl.items.map((x) =>
                            x.id === it.id ? { ...x, done: !x.done } : x,
                          ),
                        })
                      }
                    />
                    <span className={it.done ? "line-through text-muted-foreground" : ""}>
                      {it.text}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add a note…"
                  value={itemText[cl.id] || ""}
                  onChange={(e) => setItemText((s) => ({ ...s, [cl.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addItem(cl)}
                  className="h-8 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => addItem(cl)}>
                  Add
                </Button>
              </div>
            </div>
          );
        })}
        {!checklists.length && (
          <p className="text-xs text-muted-foreground">No checklists yet.</p>
        )}
      </div>
    </Card>
  );
}

/** Maps a current grade % to a band-specific preset message. */
function gradeBandFeedback(pct: number): { label: string; msg: string } {
  if (pct >= 91) return { label: "Elite Status", msg: "Elite Status! You have exceptional mastery of this course. Keep pushing this exact rhythm to lock in a perfect finish." };
  if (pct >= 84) return { label: "Excellent Progress", msg: "Excellent Progress! You have a commanding grip on this subject. Spot-check your minor assignment errors to push into the top tier." };
  if (pct >= 75) return { label: "Good Effort", msg: "Good effort! You have a great grip on the material covered, but there is slight room for improvement, check for mistakes to turn this into a higher A, overall keep this up!" };
  if (pct >= 65) return { label: "Satisfactory & Solid", msg: "Satisfactory & Solid! Performance is good, but there is room to climb. Review your recent quiz topics to turn this into a clear A." };
  if (pct >= 55) return { label: "Warning Zone", msg: "Warning! You are passing, but hovering in the academic danger zone. Prioritize your upcoming high-weight tasks immediately to secure your average. Consider studying more or use our AI grading bot to see the quality of your work." };
  if (pct >= 46) return { label: "Serious Help Needed", msg: "Serious help needed! You are now slightly below the passing mark, you should use the Grade Protection Calculator now to see what you need on the next graded task to recover, consider tutoring and more studying, always ask your teacher for more help if you are unsure." };
  if (pct >= 26) return { label: "Turn-Around Mode", msg: "Turn around mode activated! Your score is currently a heavy uphill climb, but completely recoverable. Focus entirely on completing any missing assignments and securing partial credit on upcoming tasks to lift your baseline." };
  return { label: "Academic Emergency", msg: "Academic Emergency! Your current average is in a critical deficit. Meet directly with your instructor immediately to discuss extra credit opportunities or a modified recovery plan before the semester closes." };
}


/* ===================== 7. Local Grade Feedback Engine ===================== */
/** Maps a relative trend % (predicted vs current) to one of 11 preset tiers. */
function trendFeedback(relPct: number): { tier: string; msg: string; tone: "up" | "flat" | "down" } {
  if (relPct >= 50)
    return { tier: "+50% or more", tone: "up", msg: "Phenomenal! Your trajectory is skyrocketing at an rapid pace. You have completely transformed your approach—maintain this incredible momentum!" };
  if (relPct >= 25)
    return { tier: "+25% to +50%", tone: "up", msg: "Superb acceleration! Your grades are climbing rapidly. The extra effort you are putting in is paying off massively—keep pushing toward the top!" };
  if (relPct >= 10)
    return { tier: "+10% to +25%", tone: "up", msg: "Strong positive growth! Your grades are going up at a stable, impressive speed. You are building excellent study habits—keep this up!" };
  if (relPct >= 5)
    return { tier: "+5% to +10%", tone: "up", msg: "Steady improvement! Your trajectory is moving upward at a solid pace. You are sharpening your skills—stay consistent to lock in the gain." };
  if (relPct >= 0.1)
    return { tier: "+0.1% to +5%", tone: "up", msg: "Stable ground! You are doing well and maintaining or slightly improving with a highly consistent, steady pace. Your foundation is rock-solid—keep up this exact rhythm. If you are at a lower grade, use the grade protection calculator to plan your grades carefully." };
  if (relPct > -0.1)
    return { tier: "0% (flat)", tone: "flat", msg: "Excellent! You are maintaining your strong position, your foundation is solid—keep up the good work, if you are at a low grade you should consider tutoring and ask for help to improve, use the grade protection calculator to plan your grades." };
  if (relPct > -5)
    return { tier: "-5% to -0.1%", tone: "down", msg: "Slight drift. Your trajectory shows a minor backward slip. Catch it early—review your very last assignment errors to return to stable ground. If you're at a low grade, stop immediately and ask your teacher for support." };
  if (relPct > -10)
    return { tier: "-10% to -5%", tone: "down", msg: "Warning slip. Your average is starting to drop at a noticeable speed. Prioritize your next high-weight task immediately to halt this downward trend. If you're at a low grade, stop immediately and ask your teacher for support." };
  if (relPct > -25)
    return { tier: "-25% to -10%", tone: "down", msg: "Heavy slide detected. Your grades are declining rapidly over recent tasks. Stop the bleed—open the Grade Protection Planner right now to map out a recovery. If you're at a low grade, stop immediately and ask your teacher for support." };
  if (relPct > -50)
    return { tier: "-50% to -25%", tone: "down", msg: "Academic Emergency. Your trajectory is in a massive downward spiral. Immediate intervention needed—halt non-essential tasks and dedicate tonight entirely to core concept review. If you're at a low grade, stop immediately and ask your teacher for support." };
  return { tier: "-50% or worse", tone: "down", msg: "Critical Collapse. Your course standing has experienced a severe drop. Breathe, reset, and immediately schedule a meeting with your instructor to discuss a modified academic recovery plan. If you're at a low grade, stop immediately and ask your teacher for support." };
}

export function FeedbackEngine() {
  const { courses, tasks, scale, scaleOverrides, settings, subjectGoals } = useGrades();
  const [courseId, setCourseId] = useState(
    settings.selectedCourse !== "all" ? settings.selectedCourse : courses[0]?.id ?? "",
  );
  const effectiveScale = scaleOverrides[courseId] ?? scale;
  const ct = tasks
    .filter((t) => t.courseId === courseId && !t.pending)
    .sort((a, b) => a.date.localeCompare(b.date));
  const avg = ct.length ? calcAverage(ct, settings.weighted) : 0;
  const letterRow = getLetter(avg, effectiveScale);
  const letter = letterRow?.letter ?? "—";
  const goal = subjectGoals[courseId] ?? settings.goal;

  // Predicted grade via weighted moving avg + slope (1 step ahead)
  const series = ct.map((t) => (t.score / t.maxScore) * 100);
  let predicted = avg;
  if (series.length) {
    const recent = series.slice(-5);
    const weights = recent.map((_, i) => i + 1);
    const wSum = weights.reduce((a, b) => a + b, 0);
    const wma = recent.reduce((s, v, i) => s + v * weights[i], 0) / wSum;
    const slope = series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : 0;
    predicted = Math.max(0, Math.min(100, wma + slope));
  }
  const predictedLetterRow = getLetter(predicted, effectiveScale);
  const predictedLetter = predictedLetterRow?.letter ?? "—";
  const rel = avg > 0 ? ((predicted - avg) / avg) * 100 : 0;
  const { tier, msg: trendMsg, tone } = trendFeedback(rel);
  const band = gradeBandFeedback(avg);
  const lowest = ct.length
    ? ct.reduce((min, t) => (t.score / t.maxScore < min.score / min.maxScore ? t : min))
    : null;

  // Confidence: based on (a) sample size, (b) trend consistency (low std dev of deltas),
  // (c) recency of most recent task.
  const confidence = useMemo(() => {
    if (series.length < 2) {
      return { score: 20, label: "Very Low", rationale: "Not enough completed tasks to project reliably." };
    }
    const sizeScore = Math.min(50, series.length * 8); // up to 50 for 6+ tasks
    // Consistency: std deviation of step-to-step deltas (lower = more consistent)
    const deltas = series.slice(1).map((v, i) => v - series[i]);
    const dMean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const dVar = deltas.reduce((s, v) => s + (v - dMean) ** 2, 0) / deltas.length;
    const dStd = Math.sqrt(dVar);
    const consistencyScore = Math.max(0, 30 - dStd); // up to 30 when std=0
    // Recency: newest task in last 7 days = full points
    const lastDate = ct.length ? new Date(ct[ct.length - 1].date).getTime() : 0;
    const days = lastDate ? (Date.now() - lastDate) / 86400000 : 999;
    const recencyScore = days <= 7 ? 20 : days <= 14 ? 12 : days <= 30 ? 6 : 0;
    const score = Math.round(Math.min(100, sizeScore + consistencyScore + recencyScore));
    const label = score >= 80 ? "Very High" : score >= 60 ? "High" : score >= 40 ? "Moderate" : score >= 20 ? "Low" : "Very Low";
    const rationale = `Based on ${series.length} task${series.length === 1 ? "" : "s"}, step-to-step volatility ±${dStd.toFixed(1)}%, last entry ${days < 1 ? "today" : `${Math.floor(days)}d ago`}.`;
    return { score, label, rationale };
  }, [series, ct]);

  // Distance to goal
  const distToGoal = goal - avg;
  const goalStatus = distToGoal <= 0 ? "locked" : distToGoal <= 5 ? "close" : "behind";

  // Distance to next grade up
  const sortedScale = [...effectiveScale].sort((a, b) => b.min - a.min);
  const currentTierIndex = sortedScale.findIndex((r) => r.letter === letter);
  const nextTier = currentTierIndex >= 0 && currentTierIndex < sortedScale.length - 1
    ? sortedScale[currentTierIndex + 1]
    : null;
  const distToNext = nextTier ? nextTier.min - avg : null;

  // Drilldown: contribution of each task to current weighted average.
  const drilldown = useMemo(() => {
    const empty: { task: typeof ct[number]; pct: number; contribution: number }[] = [];
    if (!ct.length) return { top: empty, lowest: empty };
    const totalW = ct.reduce((s, t) => s + (t.weight || 1), 0) || 1;
    const scored = ct.map((t) => {
      const pct = (t.score / t.maxScore) * 100;
      const contribution = (pct * (t.weight || 1)) / totalW;
      return { task: t, pct, contribution };
    });
    const top = [...scored].sort((a, b) => b.contribution - a.contribution).slice(0, 3);
    const lows = [...scored].sort((a, b) => a.pct - b.pct).slice(0, 3);
    return { top, lowest: lows };
  }, [ct]);

  const [showDrilldown, setShowDrilldown] = useState(false);

  const toneClass =
    tone === "up"
      ? "from-success/15 to-success/5 border-success/30"
      : tone === "down"
        ? "from-destructive/15 to-destructive/5 border-destructive/30"
        : "from-primary/15 to-primary/5 border-primary/20";
  const ToneIcon = tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : Minus;
  const toneColor = tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "text-muted-foreground";

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Grade Feedback Engine</h3>
      </div>
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="w-full h-9 rounded-md border bg-background px-3 text-sm mb-3"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {/* Grade Snapshot Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="p-3 rounded-xl bg-muted/40 text-center">
          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <Target className="h-3 w-3" /> Current
          </div>
          <div className="text-2xl font-bold">{avg.toFixed(1)}%</div>
          <Badge variant="secondary" className="mt-1">{letter}</Badge>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 text-center">
          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <Zap className="h-3 w-3" /> Predicted
          </div>
          <div className="text-2xl font-bold">{predicted.toFixed(1)}%</div>
          <Badge variant="secondary" className="mt-1">{predictedLetter}</Badge>
        </div>
        <div className="p-3 rounded-xl bg-muted/40 text-center">
          <div className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
            <TrendingUp className="h-3 w-3" /> Trend
          </div>
          <div className={`text-2xl font-bold flex items-center justify-center gap-1 ${toneColor}`}>
            <ToneIcon className="h-5 w-5" />
            {rel >= 0 ? "+" : ""}{rel.toFixed(1)}%
          </div>
          <div className={`text-xs mt-1 font-medium ${toneColor}`}>{tier}</div>
        </div>
      </div>

      {/* Confidence indicator for the prediction */}
      {ct.length > 0 && (
        <div className="p-3 rounded-lg border bg-muted/30 mb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-foreground">Prediction confidence</span>
            <span className={
              confidence.score >= 60 ? "text-success font-semibold" :
              confidence.score >= 40 ? "text-primary font-semibold" :
              "text-destructive font-semibold"
            }>{confidence.label} ({confidence.score}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${confidence.score}%`,
                background: confidence.score >= 60 ? "var(--success)" : confidence.score >= 40 ? "var(--primary)" : "var(--destructive)",
              }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">{confidence.rationale}</p>
        </div>
      )}

      {/* Goal & Next Grade Status */}
      {ct.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={`p-2.5 rounded-lg border text-sm ${goalStatus === "locked" ? "bg-success/10 border-success/30" : goalStatus === "close" ? "bg-primary/10 border-primary/30" : "bg-destructive/10 border-destructive/30"}`}>
            <div className="text-xs text-muted-foreground mb-0.5">Goal ({goal}%)</div>
            <div className="font-semibold">
              {goalStatus === "locked"
                ? "Locked in"
                : goalStatus === "close"
                  ? `${distToGoal.toFixed(1)}% to go`
                  : `${distToGoal.toFixed(1)}% behind`}
            </div>
          </div>
          {distToNext !== null && distToNext > 0 ? (
            <div className="p-2.5 rounded-lg border bg-primary/10 border-primary/30 text-sm">
              <div className="text-xs text-muted-foreground mb-0.5">Next grade ({nextTier!.letter})</div>
              <div className="font-semibold">+{distToNext.toFixed(1)}% needed</div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg border bg-success/10 border-success/30 text-sm">
              <div className="text-xs text-muted-foreground mb-0.5">Grade ceiling</div>
              <div className="font-semibold">At top tier</div>
            </div>
          )}
        </div>
      )}

      {/* Main Feedback Panel */}
      <div className={`p-4 rounded-xl bg-gradient-to-br border ${toneClass}`}>
        {/* Band feedback (current % bucket) */}
        {ct.length > 0 && (
          <div className="mb-3 p-3 rounded-lg bg-background/60 border border-border/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">{band.label}</div>
            <p className="text-sm leading-relaxed">{band.msg}</p>
          </div>
        )}

        <div className="flex items-center gap-1.5 mb-2">
          <span className={toneColor}>
            <ToneIcon className="h-4 w-4 inline" />
          </span>
          <span className={`text-xs font-semibold uppercase tracking-wider ${toneColor}`}>Trend · {tier}</span>
        </div>
        <p className="text-sm leading-relaxed mb-3">{trendMsg}</p>

        {/* Focus Area */}
        {lowest && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border border-border/50">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-foreground mb-0.5">Focus Area</div>
              <p className="text-sm text-muted-foreground">
                Your lowest score is <strong className="text-foreground">'{lowest.name}'</strong> at{" "}
                {((lowest.score / lowest.maxScore) * 100).toFixed(1)}%. Review this material to stop it from dragging your average down.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Drilldown */}
      {ct.length > 0 && (
        <div className="mt-3">
          <Button size="sm" variant="outline" className="w-full" onClick={() => setShowDrilldown((v) => !v)}>
            {showDrilldown ? "Hide" : "Show"} contribution drilldown
          </Button>
          {showDrilldown && (
            <div className="mt-3 grid gap-3">
              <DrilldownList
                title="Top contributors to current grade"
                items={drilldown.top.map((d) => ({
                  name: d.task.name,
                  meta: `${d.pct.toFixed(1)}% · weight ${d.task.weight || 1}`,
                  value: `+${d.contribution.toFixed(1)}pt`,
                  tone: "primary",
                }))}
              />
              <DrilldownList
                title="Lowest scores (drag predicted grade down)"
                items={drilldown.lowest.map((d) => ({
                  name: d.task.name,
                  meta: `${d.task.category || "—"} · weight ${d.task.weight || 1}`,
                  value: `${d.pct.toFixed(1)}%`,
                  tone: "destructive",
                }))}
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function DrilldownList({
  title,
  items,
}: {
  title: string;
  items: { name: string; meta: string; value: string; tone: "primary" | "destructive" }[];
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="text-xs font-semibold mb-2">{title}</div>
      {items.length ? (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="flex items-center justify-between text-xs gap-2 pr-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-muted-foreground">{it.meta}</div>
              </div>
              <span className={`font-semibold tabular-nums shrink-0 text-right ${it.tone === "primary" ? "text-primary" : "text-destructive"}`}>
                {it.value}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No data.</p>
      )}
    </div>
  );
}

/* ============= Per-Subject Grade Scale Override ============= */
export function PerSubjectScale() {
  const { courses, scale, scaleOverrides, setScaleOverride } = useGrades();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const current = scaleOverrides[courseId] ?? scale;
  const hasOverride = !!scaleOverrides[courseId];
  const [draft, setDraft] = useState(current);

  // Reset draft when subject changes
  useEffect(() => {
    setDraft(scaleOverrides[courseId] ?? scale);
  }, [courseId, scaleOverrides, scale]);

  const updateRow = (id: string, patch: Partial<typeof draft[number]>) =>
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) => setDraft((d) => d.filter((r) => r.id !== id));
  const addRow = () =>
    setDraft((d) => [...d, { id: crypto.randomUUID(), min: 0, letter: "?", description: "New", gpa: 0 }]);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Per-Subject Grade Scale</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Override the global scale for one subject only (e.g. an IB or AP class with different
        thresholds). Affects this subject's letter grade in the Feedback Engine & Protection
        Calculator.
      </p>
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="w-full h-9 rounded-md border bg-background px-3 text-sm mb-3"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} {scaleOverrides[c.id] ? "· custom" : ""}
          </option>
        ))}
      </select>
      <div className="max-h-56 overflow-y-auto space-y-1 mb-3">
        {[...draft]
          .sort((a, b) => b.min - a.min)
          .map((r) => (
            <div key={r.id} className="grid grid-cols-[55px_60px_1fr_28px] gap-1.5 items-center">
              <Input
                type="number"
                value={r.min}
                onChange={(e) => updateRow(r.id, { min: Number(e.target.value) })}
                className="h-8 text-xs"
              />
              <Input
                value={r.letter}
                onChange={(e) => updateRow(r.id, { letter: e.target.value })}
                className="h-8 text-xs font-semibold"
              />
              <Input
                value={r.description}
                onChange={(e) => updateRow(r.id, { description: e.target.value })}
                className="h-8 text-xs"
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeRow(r.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={addRow} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Row
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setScaleOverride(courseId, draft);
            toast.success("Custom scale applied to this subject");
          }}
        >
          Save override
        </Button>
        {hasOverride && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setScaleOverride(courseId, null);
              toast.success("Reverted to global scale");
            }}
          >
            Use global
          </Button>
        )}
      </div>
    </Card>
  );
}

/* ===================== 8. Peer Grade Curve Anonymizer ===================== */
export function PeerCurveAnonymizer() {
  const [input, setInput] = useState("");
  const grades = useMemo(
    () =>
      input
        .split(/[,\s\n]+/)
        .map((v) => Number(v.trim()))
        .filter((v) => !isNaN(v) && v >= 0 && v <= 100),
    [input],
  );

  const stats = useMemo(() => {
    if (!grades.length) return null;
    const mean = grades.reduce((a, b) => a + b, 0) / grades.length;
    const variance = grades.reduce((s, v) => s + (v - mean) ** 2, 0) / grades.length;
    const std = Math.sqrt(variance) || 1;
    return { mean, std };
  }, [grades]);

  const curve = useMemo(() => {
    if (!stats) return [];
    const { mean, std } = stats;
    const pts: { x: number; density: number }[] = [];
    for (let x = 0; x <= 100; x += 2) {
      const density =
        (1 / (std * Math.sqrt(2 * Math.PI))) *
        Math.exp(-0.5 * ((x - mean) / std) ** 2);
      pts.push({ x, density: Number((density * 100).toFixed(3)) });
    }
    return pts;
  }, [stats]);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Peer Grade Curve Anonymizer</h3>
      </div>
      <Textarea
        rows={2}
        placeholder="Paste comma-separated grades (e.g. 88, 92, 75, 81, 90)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="mb-3"
      />
      {stats ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
            <div className="p-2 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">n</div>
              <div className="font-bold">{grades.length}</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">Mean</div>
              <div className="font-bold">{stats.mean.toFixed(1)}</div>
            </div>
            <div className="p-2 rounded-lg bg-muted/40">
              <div className="text-xs text-muted-foreground">σ</div>
              <div className="font-bold">{stats.std.toFixed(1)}</div>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="x" fontSize={10} stroke="var(--muted-foreground)" />
                <YAxis fontSize={10} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="density"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <ReferenceLine x={Math.round(stats.mean)} stroke="var(--primary)" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Enter at least one grade to plot the curve.</p>
      )}
    </Card>
  );
}

/* ===================== 9. Exam Study Guide Generator ===================== */
export function ExamStudyGuideGenerator() {
  const { courses, tasks, scale, checklists, settings } = useGrades();
  const [courseId, setCourseId] = useState<string>("all");
  const [notes, setNotes] = useState("");

  const markdown = useMemo(() => {
    const scope = courseId === "all" ? courses : courses.filter((c) => c.id === courseId);
    const lines: string[] = [];
    lines.push(`# Exam Study Guide`);
    lines.push(`_Generated ${new Date().toLocaleDateString()}_`);
    lines.push("");
    for (const c of scope) {
      const ct = tasks.filter((t) => t.courseId === c.id && !t.pending);
      const avg = ct.length ? calcAverage(ct, settings.weighted) : 0;
      const letter = getLetter(avg, scale)?.letter ?? "—";
      lines.push(`## ${c.name}  —  ${avg.toFixed(1)}% (${letter})`);
      const lowest = [...ct]
        .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
        .slice(0, 3);
      if (lowest.length) {
        lines.push(`**Focus Areas (lowest scores):**`);
        for (const t of lowest) {
          const pct = ((t.score / t.maxScore) * 100).toFixed(1);
          lines.push(`- ${t.name} — ${pct}% (${t.category})`);
        }
      }
      const upcoming = tasks.filter((t) => t.courseId === c.id && t.pending);
      if (upcoming.length) {
        lines.push(`**Upcoming Assignments:**`);
        for (const t of upcoming) lines.push(`- [ ] ${t.name} (due ${t.date})`);
      }
      const cls = checklists.filter((ch) => ch.courseId === c.id);
      for (const ch of cls) {
        lines.push(`**Checklist: ${ch.title}** _(exam ${ch.examDate})_`);
        for (const it of ch.items) lines.push(`- [${it.done ? "x" : " "}] ${it.text}`);
      }
      lines.push("");
    }
    if (notes.trim()) {
      lines.push(`## Personal Notes`);
      lines.push(notes.trim());
    }
    return lines.join("\n");
  }, [courseId, courses, tasks, scale, settings.weighted, checklists, notes]);

  const copy = async () => {
    await navigator.clipboard.writeText(markdown);
    toast.success("Study guide copied to clipboard");
  };
  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-guide-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Exam Study Guide Generator</h3>
      </div>
      <div className="grid gap-2 mb-3">
        <Label className="text-xs">Scope</Label>
        <select
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          className="w-full h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="all">All subjects</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Label className="text-xs">Additional notes (optional)</Label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything to include..."
        />
      </div>
      <Textarea
        readOnly
        value={markdown}
        rows={8}
        className="font-mono text-xs bg-muted/30"
      />
      <div className="flex gap-2 mt-3">
        <Button size="sm" className="flex-1" onClick={copy}>
          Copy Markdown
        </Button>
        <Button size="sm" variant="outline" className="flex-1" onClick={download}>
          Download .md
        </Button>
      </div>
    </Card>
  );
}

/* ===================== 10. Weighted Assignment Simulator ===================== */
export function WeightedAssignmentSimulator() {
  const { courses, tasks, settings, scale } = useGrades();
  const [courseId, setCourseId] = useState(courses[0]?.id ?? "");
  const [weights, setWeights] = useState<Record<string, number>>({});

  const ct = tasks.filter((t) => t.courseId === courseId && !t.pending);
  const usedCats = useMemo(
    () => Array.from(new Set(ct.map((t) => t.category).filter(Boolean))),
    [ct],
  );

  useEffect(() => {
    setWeights((prev) => {
      const next: Record<string, number> = {};
      const base = usedCats.length ? Math.round(100 / usedCats.length) : 0;
      for (const c of usedCats) next[c] = prev[c] ?? base;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, usedCats.join("|")]);

  const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  const originalAvg = ct.length ? calcAverage(ct, settings.weighted) : 0;
  const simulatedAvg = useMemo(() => {
    if (!ct.length || !usedCats.length) return 0;
    let sum = 0;
    let wTotal = 0;
    for (const cat of usedCats) {
      const catTasks = ct.filter((t) => t.category === cat);
      if (!catTasks.length) continue;
      const catAvg =
        catTasks.reduce((s, t) => s + (t.score / t.maxScore) * 100, 0) / catTasks.length;
      const w = (weights[cat] ?? 0) / totalW;
      sum += catAvg * w;
      wTotal += w;
    }
    return wTotal ? sum / wTotal : 0;
  }, [ct, usedCats, weights, totalW]);

  const delta = simulatedAvg - originalAvg;
  const origLetter = getLetter(originalAvg, scale)?.letter ?? "—";
  const newLetter = getLetter(simulatedAvg, scale)?.letter ?? "—";

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Weighted Assignment Simulator</h3>
      </div>
      <Label className="text-xs">Subject</Label>
      <select
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        className="w-full h-9 rounded-md border bg-background px-3 text-sm mb-3"
      >
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      {usedCats.length ? (
        <div className="space-y-3 mb-3">
          {usedCats.map((cat) => {
            const pct = Math.round(((weights[cat] ?? 0) / totalW) * 100);
            return (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{cat}</span>
                  <span className="text-muted-foreground">{pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[cat] ?? 0}
                  onChange={(e) =>
                    setWeights((w) => ({ ...w, [cat]: Number(e.target.value) }))
                  }
                  className="w-full accent-primary"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-3">No graded tasks in this subject yet.</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-muted/40">
          <div className="text-xs text-muted-foreground">Current</div>
          <div className="text-xl font-bold">{originalAvg.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">{origLetter}</div>
        </div>
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">Simulated</div>
          <div className="text-xl font-bold text-primary">{simulatedAvg.toFixed(1)}%</div>
          <div className={`text-xs ${delta >= 0 ? "text-success" : "text-destructive"}`}>
            {newLetter} ({delta >= 0 ? "+" : ""}
            {delta.toFixed(1)})
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ===================== 11. Smart Grade Protection Planner ===================== */
export function SmartGradeProtectionPlanner() {
  const { courses, tasks, scale } = useGrades();
  const [targetLetter, setTargetLetter] = useState(scale[0]?.letter ?? "A");
  const [windowDays, setWindowDays] = useState(14);

  const targetRow = scale.find((s) => s.letter === targetLetter);
  const targetPct = targetRow?.min ?? 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() + windowDays * 86400000);

  const rows = courses.map((c) => {
    const completed = tasks.filter((t) => t.courseId === c.id && !t.pending);
    const upcoming = tasks
      .filter((t) => {
        if (t.courseId !== c.id || !t.pending) return false;
        const d = new Date(t.date);
        return d >= today && d <= cutoff;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const completedW = completed.reduce((s, t) => s + (t.weight || 1), 0);
    const completedSum = completed.reduce(
      (s, t) => s + (t.score / t.maxScore) * 100 * (t.weight || 1),
      0,
    );
    const upcomingW = upcoming.reduce((s, t) => s + (t.weight || 1), 0);
    const totalW = completedW + upcomingW;

    const currentAvg = completedW ? completedSum / completedW : 0;
    const needed =
      upcomingW > 0 ? (targetPct * totalW - completedSum) / upcomingW : null;
    const status =
      needed === null
        ? currentAvg >= targetPct
          ? "ok"
          : "no-upcoming"
        : needed <= 0
          ? "locked"
          : needed <= 100
            ? "achievable"
            : "impossible";

    return { course: c, upcoming, currentAvg, needed, status };
  });

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Smart Grade Protection Planner</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div>
          <Label className="text-xs">Target letter</Label>
          <select
            value={targetLetter}
            onChange={(e) => setTargetLetter(e.target.value)}
            className="w-full h-9 rounded-md border bg-background px-3 text-sm"
          >
            {scale.map((s) => (
              <option key={s.id} value={s.letter}>
                {s.letter} ({s.min}+)
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Window (days)</Label>
          <Input
            type="number"
            min={1}
            max={60}
            value={windowDays}
            onChange={(e) => setWindowDays(Math.max(1, Number(e.target.value) || 14))}
          />
        </div>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {rows.map(({ course, upcoming, currentAvg, needed, status }) => (
          <div key={course.id} className="p-3 rounded-lg border bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">{course.name}</div>
              <Badge
                variant="outline"
                className={
                  status === "locked"
                    ? "bg-success/15 text-success border-success/40"
                    : status === "achievable"
                      ? "bg-primary/15 text-primary border-primary/40"
                      : status === "impossible"
                        ? "bg-destructive/15 text-destructive border-destructive/40"
                        : ""
                }
              >
                {status === "locked"
                  ? "Locked in"
                  : status === "achievable"
                    ? `Need ${needed?.toFixed(1)}% avg`
                    : status === "impossible"
                      ? "Out of reach"
                      : status === "ok"
                        ? "On track"
                        : "No upcoming"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              Current avg: {currentAvg.toFixed(1)}% · Target {targetLetter} ({targetPct}%)
            </div>
            {upcoming.length ? (
              <ul className="space-y-1">
                {upcoming.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between text-xs p-2 rounded bg-background border"
                  >
                    <span className="truncate">
                      <span className="font-medium">{t.name}</span>
                      <span className="text-muted-foreground"> · {t.date}</span>
                    </span>
                    <span
                      className={`font-semibold tabular-nums ${
                        needed === null || needed <= 0
                          ? "text-success"
                          : needed > 100
                            ? "text-destructive"
                            : "text-primary"
                      }`}
                    >
                      {needed === null || needed <= 0
                        ? "—"
                        : needed > 100
                          ? ">100%"
                          : `${needed.toFixed(1)}%`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No pending assignments in this window.
              </p>
            )}
          </div>
        ))}
        {!rows.length && (
          <p className="text-xs text-muted-foreground">Add subjects to start planning.</p>
        )}
      </div>
    </Card>
  );
}

/* ===================== 12. Final Exam Countdown Timer ===================== */
export function FinalExamCountdown() {
  const { checklists, courses } = useGrades();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Use checklists with exam dates as "final exams" (links to existing data).
  const upcoming = useMemo(() => {
    const now = Date.now();
    return checklists
      .filter((c) => !!c.examDate)
      .map((c) => {
        const ms = new Date(c.examDate).getTime() - now;
        return { ...c, ms };
      })
      .filter((c) => c.ms > -86400000) // include same-day
      .sort((a, b) => a.ms - b.ms);
  }, [checklists]);

  const target = upcoming[0];
  const breakdown = (ms: number) => {
    const m = Math.max(0, ms);
    const days = Math.floor(m / 86400000);
    const hours = Math.floor((m % 86400000) / 3600000);
    const mins = Math.floor((m % 3600000) / 60000);
    return { days, hours, mins };
  };

  // Circular progress: assume a 30-day reference window for fill.
  const ringSize = 140;
  const stroke = 12;
  const r = (ringSize - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const windowMs = 30 * 86400000;
  const progress = target ? Math.max(0, Math.min(1, 1 - target.ms / windowMs)) : 0;

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <Timer className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Final Exam Countdown</h3>
      </div>
      {target ? (
        <>
          <div className="flex flex-col items-center">
            <div className="relative" style={{ width: ringSize, height: ringSize }}>
              <svg width={ringSize} height={ringSize} className="-rotate-90">
                <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={r}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - progress)}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                {(() => {
                  const { days, hours, mins } = breakdown(target.ms);
                  return (
                    <>
                      <div className="text-3xl font-bold tabular-nums">{days}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">days</div>
                      <div className="text-xs text-muted-foreground mt-1 tabular-nums">
                        {hours}h {mins}m
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div className="text-center mt-3">
              <div className="font-semibold">{target.title}</div>
              <div className="text-xs text-muted-foreground">
                {courses.find((c) => c.id === target.courseId)?.name ?? "—"} · {target.examDate}
              </div>
            </div>
          </div>
          {upcoming.length > 1 && (
            <div className="mt-4 space-y-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Next up</div>
              {upcoming.slice(1, 4).map((u) => {
                const { days } = breakdown(u.ms);
                return (
                  <div key={u.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                    <span className="truncate font-medium">{u.title}</span>
                    <span className="text-muted-foreground tabular-nums">{days}d</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No exam dates yet. Add an exam date in a Study Note Checklist to start the countdown.
        </p>
      )}
    </Card>
  );
}

/* ===================== 13. Smart Study Streak Calendar ===================== */
export function StudyStreakCalendar() {
  const { activityDates } = useGrades();
  const [offset, setOffset] = useState(0); // months from current
  const now = new Date();
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const monthName = view.toLocaleString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const startWeekday = new Date(view.getFullYear(), view.getMonth(), 1).getDay();
  const activeSet = useMemo(() => new Set(activityDates), [activityDates]);
  const todayISO = now.toISOString().slice(0, 10);

  // Compute current streak from today backwards.
  const currentStreak = useMemo(() => {
    let s = 0;
    const d = new Date();
    while (activeSet.has(d.toISOString().slice(0, 10))) {
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  }, [activeSet]);
  const monthActive = useMemo(() => {
    let n = 0;
    for (let i = 1; i <= daysInMonth; i++) {
      const iso = new Date(view.getFullYear(), view.getMonth(), i).toISOString().slice(0, 10);
      if (activeSet.has(iso)) n++;
    }
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSet, view.getFullYear(), view.getMonth(), daysInMonth]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card className="p-5 shadow-soft">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Study Streak Calendar</h3>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3 text-center">
        <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30">
          <div className="text-xs text-muted-foreground">Current streak</div>
          <div className="text-xl font-bold text-primary">{currentStreak}d</div>
        </div>
        <div className="p-2.5 rounded-lg bg-muted/40">
          <div className="text-xs text-muted-foreground">Active days this month</div>
          <div className="text-xl font-bold">{monthActive}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <Button size="sm" variant="outline" onClick={() => setOffset((o) => o - 1)}>‹</Button>
        <div className="text-sm font-semibold">{monthName}</div>
        <Button size="sm" variant="outline" onClick={() => setOffset((o) => o + 1)}>›</Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground mb-1">
        {["S","M","T","W","T","F","S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const iso = new Date(view.getFullYear(), view.getMonth(), d).toISOString().slice(0, 10);
          const active = activeSet.has(iso);
          const isToday = iso === todayISO;
          return (
            <div
              key={i}
              className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium border transition-colors ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 border-transparent text-muted-foreground"
              } ${isToday ? "ring-2 ring-primary/60" : ""}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">
        Days are highlighted when you complete a study timer session or add a new task/grade.
      </p>
    </Card>
  );
}

/* ===================== Container ===================== */
import { AttendanceTimetable } from "./AttendanceTimetable";
import { MicroTrendDrawer } from "./MicroTrendDrawer";

export function OptimizationHub() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="lg:col-span-2">
        <MicroTrendDrawer />
      </div>
      <AttendanceTimetable />
      <FinalExamCountdown />
      <StudyStreakCalendar />
      <VocabQuizBuilder />
      <GradeProtectionCalculator />
      <StudyTimer />
      <TrendPredictor />
      <GpaTranscriptSimulator />
      <NoteChecklistMaker />
      <FeedbackEngine />
      <PerSubjectScale />
      <PeerCurveAnonymizer />
      <ExamStudyGuideGenerator />
      <WeightedAssignmentSimulator />
      <SmartGradeProtectionPlanner />
    </div>
  );
}
