import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, getLetter } from "@/lib/grade-utils";
import { applyAStarOverride } from "./a-star-override";
import {
  Plane,
  AlertTriangle,
  Target,
  RotateCcw,
  Play,
  Shield,
  Zap,
} from "lucide-react";

type Scenario = {
  id: string;
  title: string;
  body: string;
  // returns the simulated next-point delta in pct
  apply: (
    state: { avg: number; momentum: number },
    input: number,
  ) => { delta: number; note: string };
  inputLabel: string;
  inputHint: string;
  defaultInput: number;
  icon: typeof AlertTriangle;
};

const SCENARIOS: Scenario[] = [
  {
    id: "popquiz",
    title: "Surprise pop-quiz announced for tomorrow",
    body: "An unannounced quiz drops into your timeline. Your input estimate is the defensive baseline score you can realistically secure with one evening of revision.",
    inputLabel: "Estimated defensive baseline score (%)",
    inputHint: "Lower = riskier; higher = more buffer.",
    defaultInput: 72,
    icon: AlertTriangle,
    apply: ({ avg }, input) => {
      const delta = (input - avg) * 0.18;
      return {
        delta,
        note:
          input >= avg
            ? "Defensive score lifts the floor — net positive shock."
            : "Below-mean defensive score drags the running margin downward.",
      };
    },
  },
  {
    id: "deadline",
    title: "Heavily-weighted project deadline moved forward 5 days",
    body: "A flagship project is pulled in. The execution reduction percentage is how much of your planned quality you expect to lose under compression.",
    inputLabel: "Execution-strategy reduction (%)",
    inputHint: "0 = no loss; 30 = a third of polish sacrificed.",
    defaultInput: 12,
    icon: Zap,
    apply: ({ avg }, input) => {
      const reduction = Math.max(0, Math.min(60, input));
      const delta = -(reduction / 100) * (avg * 0.45);
      return {
        delta,
        note: `${reduction}% polish loss on a heavyweight component compresses the margin.`,
      };
    },
  },
  {
    id: "rubric",
    title: "Examiner re-calibrates rubric — top band narrows",
    body: "Top-band thresholds tighten unexpectedly. Input the % of top-band marks you expect to retain under the stricter rubric.",
    inputLabel: "Top-band retention rate (%)",
    inputHint: "100 = no impact, 70 = lose ~30% of top-band marks.",
    defaultInput: 85,
    icon: Target,
    apply: ({ avg }, input) => {
      const retention = Math.max(0, Math.min(100, input)) / 100;
      const delta = (retention - 0.9) * avg * 0.3;
      return {
        delta,
        note:
          retention >= 0.9
            ? "You absorbed the rubric shift cleanly."
            : "Lost ground in the top band — margin compresses toward mid-tier.",
      };
    },
  },
  {
    id: "burnout",
    title: "Burnout spike — two missed revision blocks",
    body: "Two key revision blocks were missed. Input the recovery efficiency you can deliver in the next 48 hours.",
    inputLabel: "Recovery efficiency (%)",
    inputHint: "Higher recovery = smaller permanent hit.",
    defaultInput: 60,
    icon: Shield,
    apply: ({ avg }, input) => {
      const eff = Math.max(0, Math.min(100, input)) / 100;
      const delta = -((1 - eff) * 6);
      return {
        delta,
        note: `${Math.round((1 - eff) * 100)}% of the missed blocks bleed into the running margin.`,
      };
    },
  },
];

type Mission = {
  id: string;
  label: string;
  desc: string;
  threshold: number;
  letter: string;
};

const MISSIONS: Mission[] = [
  { id: "astar", label: "Protect the A* Tier", desc: "Keep your average ≥ 91%.", threshold: 91, letter: "A*" },
  { id: "a", label: "Hold the A Band", desc: "Keep your average ≥ 81%.", threshold: 81, letter: "A" },
  { id: "b", label: "Secure the Honor Roll (B+)", desc: "Keep your average ≥ 75%.", threshold: 75, letter: "B+" },
  { id: "pass", label: "Defend the Pass Line", desc: "Keep your average ≥ 50%.", threshold: 50, letter: "Pass" },
];

function pickRandomScenario(seed: number): Scenario {
  return SCENARIOS[Math.floor(seed * SCENARIOS.length) % SCENARIOS.length];
}

export function FlightSimulator() {
  const { courses, tasks, scale, settings } = useGrades();
  const baseAvg = useMemo(() => {
    const all = tasks.filter(
      (t) =>
        !t.pending &&
        typeof t.score === "number" &&
        Number.isFinite(t.score) &&
        t.maxScore > 0,
    );
    return all.length ? calcAverage(all, settings.weighted) : 78;
  }, [tasks, settings.weighted]);

  const [missionId, setMissionId] = useState<string>("astar");
  const mission = MISSIONS.find((m) => m.id === missionId)!;

  const [running, setRunning] = useState(false);
  const [series, setSeries] = useState<number[]>([baseAvg]);
  const [log, setLog] = useState<{ title: string; note: string; delta: number }[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [input, setInput] = useState<number>(0);

  // Reset when the live ledger baseline changes meaningfully.
  useEffect(() => {
    if (!running) setSeries([baseAvg]);
  }, [baseAvg, running]);

  const current = series[series.length - 1];
  const onMission = current >= mission.threshold;
  const baseLetter = getLetter(current, scale)?.letter ?? "—";
  const letter = applyAStarOverride(current, baseLetter);

  function start() {
    setRunning(true);
    setSeries([baseAvg]);
    setLog([]);
    nextScenario();
  }

  function reset() {
    setRunning(false);
    setSeries([baseAvg]);
    setLog([]);
    setScenario(null);
  }

  function nextScenario() {
    const s = pickRandomScenario(Math.random());
    setScenario(s);
    setInput(s.defaultInput);
  }

  function applyScenario() {
    if (!scenario) return;
    const momentum =
      series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : 0;
    const { delta, note } = scenario.apply(
      { avg: current, momentum },
      input,
    );
    // Random macro-disruption noise: ±0.6
    const noise = (Math.random() - 0.5) * 1.2;
    const next = Math.max(0, Math.min(100, current + delta + noise));
    setSeries((s) => [...s, next]);
    setLog((l) => [{ title: scenario.title, note, delta: delta + noise }, ...l].slice(0, 8));
    if (series.length >= 9) {
      setScenario(null);
      setRunning(false);
      return;
    }
    nextScenario();
  }

  return (
    <Card className="p-5 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_60%)] border-slate-800/40 dark:border-slate-700/50">
      <div className="flex items-center gap-2 mb-1">
        <Plane className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">GPA Stress-Test Flight Simulator</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">Sandbox — does not touch your ledger</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Deep-clones your active grade ledger, then fires randomised real-world shocks. Use the throttle inputs to train numerical buffers around your active grading margin.
      </p>

      {/* Mission selector */}
      <div className="mb-4">
        <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
          Mission Objective
        </label>
        <div className="mt-1.5 grid grid-cols-2 md:grid-cols-4 gap-2">
          {MISSIONS.map((m) => {
            const active = m.id === missionId;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMissionId(m.id);
                  reset();
                }}
                className={`text-left rounded-xl border px-3 py-2 transition ${
                  active
                    ? "border-primary bg-primary/10 ring-1 ring-primary"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="text-xs font-bold">{m.label}</div>
                <div className="text-[10px] text-muted-foreground">{m.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCell label="Baseline" value={`${baseAvg.toFixed(1)}%`} />
        <StatCell label="Current" value={`${current.toFixed(1)}%`} highlight={onMission ? "good" : "bad"} />
        <StatCell label="Letter" value={letter} />
        <StatCell
          label="Mission"
          value={onMission ? "ON TARGET" : "AT RISK"}
          highlight={onMission ? "good" : "bad"}
        />
      </div>

      {/* Sparkline */}
      <Sparkline series={series} threshold={mission.threshold} />

      {/* Active scenario or controls */}
      {!running && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={start} className="gap-2">
            <Play className="h-4 w-4" /> Start Mission: {mission.label}
          </Button>
          {series.length > 1 && (
            <Button variant="outline" onClick={reset} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      )}

      {running && scenario && (
        <div className="mt-4 rounded-xl border bg-card/60 backdrop-blur p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <scenario.icon className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">
              Disruption {series.length} of 10
            </span>
          </div>
          <div className="text-sm font-semibold mb-1">{scenario.title}</div>
          <p className="text-xs text-muted-foreground mb-3">{scenario.body}</p>
          <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
            {scenario.inputLabel}
          </label>
          <div className="mt-1.5 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={input}
              onChange={(e) => setInput(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={input}
              onChange={(e) => setInput(Number(e.target.value))}
              className="w-20 rounded-lg border bg-background px-2 py-1 text-sm tabular-nums"
            />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{scenario.inputHint}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={applyScenario} className="gap-2">
              <Zap className="h-4 w-4" /> Lock-in & advance
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Abort mission
            </Button>
          </div>
        </div>
      )}

      {/* Recent shock log */}
      {log.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">
            Disruption Log
          </div>
          <div className="space-y-1.5">
            {log.map((e, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
              >
                <span
                  className={`tabular-nums font-bold shrink-0 ${
                    e.delta >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {e.delta >= 0 ? "+" : ""}
                  {e.delta.toFixed(2)}pp
                </span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{e.title}</div>
                  <div className="text-[10px] text-muted-foreground">{e.note}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "good" | "bad";
}) {
  const tone =
    highlight === "good"
      ? "text-emerald-500"
      : highlight === "bad"
        ? "text-rose-500"
        : "text-foreground";
  return (
    <div className="rounded-xl border p-3 bg-muted/30">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function Sparkline({ series, threshold }: { series: number[]; threshold: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const W = c.width;
    const H = c.height;
    ctx.clearRect(0, 0, W, H);

    const PAD = 22;
    const min = Math.max(0, Math.min(...series, threshold) - 6);
    const max = Math.min(100, Math.max(...series, threshold) + 6);
    const y = (v: number) =>
      H - PAD - ((v - min) / Math.max(1, max - min)) * (H - PAD * 2);
    const x = (i: number) =>
      PAD + (i / Math.max(series.length - 1, 1)) * (W - PAD * 2);

    // Threshold line
    ctx.strokeStyle = "rgba(245,158,11,0.85)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PAD, y(threshold));
    ctx.lineTo(W - PAD, y(threshold));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(245,158,11,0.95)";
    ctx.font = "10px ui-sans-serif, system-ui";
    ctx.fillText(`Mission floor ${threshold}%`, PAD + 6, y(threshold) - 4);

    // Filled area under the curve
    const grad = ctx.createLinearGradient(0, PAD, 0, H - PAD);
    grad.addColorStop(0, "rgba(59,130,246,0.45)");
    grad.addColorStop(1, "rgba(59,130,246,0.02)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x(0), H - PAD);
    series.forEach((v, i) => ctx.lineTo(x(i), y(v)));
    ctx.lineTo(x(series.length - 1), H - PAD);
    ctx.closePath();
    ctx.fill();

    // Trend line
    ctx.strokeStyle = "rgb(59,130,246)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((v, i) => (i === 0 ? ctx.moveTo(x(i), y(v)) : ctx.lineTo(x(i), y(v))));
    ctx.stroke();

    // Points
    series.forEach((v, i) => {
      ctx.fillStyle = v >= threshold ? "rgb(16,185,129)" : "rgb(244,63,94)";
      ctx.beginPath();
      ctx.arc(x(i), y(v), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [series, threshold]);
  return (
    <canvas
      ref={ref}
      width={720}
      height={180}
      className="w-full h-auto rounded-xl border bg-card"
    />
  );
}