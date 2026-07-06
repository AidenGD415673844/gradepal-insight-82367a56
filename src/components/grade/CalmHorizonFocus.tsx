import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Waves, Trees, Pause, Play, RotateCcw, Sparkles } from "lucide-react";

// Phase types
type Phase = "dawn" | "day" | "dusk" | "sunset" | "night";
type Scene = "sea" | "forest";

/** Read Kanban backlog count from localStorage. Falls back to 0 when absent. */
function readKanbanBacklog(): number {
  if (typeof window === "undefined") return 0;
  const keys = ["kanban-board-v1", "kanban-tasks-v1", "kanban-v1"];
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const todo = parsed.filter(
          (t: any) => (t?.status ?? t?.column ?? "").toLowerCase() === "todo" ||
                      (t?.status ?? t?.column ?? "").toLowerCase() === "backlog",
        );
        return todo.length;
      }
      if (parsed && typeof parsed === "object") {
        const todo = parsed.todo ?? parsed.backlog ?? parsed["To Do"] ?? [];
        if (Array.isArray(todo)) return todo.length;
      }
    } catch { /* ignore */ }
  }
  return 0;
}

function phaseFor(minutes: number): Phase {
  if (minutes < 4) return "dawn";
  if (minutes < 12) return "day";
  if (minutes < 20) return "dusk";
  if (minutes < 28) return "sunset";
  return "night";
}

const SKY_GRAD: Record<Phase, string> = {
  dawn:   "linear-gradient(180deg, #ffd3a5 0%, #fd9a5f 45%, #7f6dbb 100%)",
  day:    "linear-gradient(180deg, #74c7f1 0%, #a8dbf5 55%, #e8f4fb 100%)",
  dusk:   "linear-gradient(180deg, #fbbf24 0%, #f97316 45%, #7c3aed 100%)",
  sunset: "linear-gradient(180deg, #7c2d92 0%, #db2777 45%, #1e1b4b 100%)",
  night:  "linear-gradient(180deg, #0b1027 0%, #1e1b4b 55%, #312e81 100%)",
};

const PHASE_LABEL: Record<Phase, string> = {
  dawn: "Dawn light", day: "Bright daylight", dusk: "Golden dusk",
  sunset: "Sunset glow", night: "Starfield hush",
};

export function CalmHorizonFocus() {
  const [enabled, setEnabled] = useState(false);
  const [scene, setScene] = useState<Scene>("sea");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [backlog, setBacklog] = useState(0);
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  // Poll kanban backlog every 2s
  useEffect(() => {
    const sync = () => setBacklog(readKanbanBacklog());
    sync();
    const id = window.setInterval(sync, 2000);
    window.addEventListener("storage", sync);
    return () => { window.clearInterval(id); window.removeEventListener("storage", sync); };
  }, []);

  // Tick timer using rAF for smooth animation
  useEffect(() => {
    if (!running) return;
    last.current = performance.now();
    const step = (t: number) => {
      const dt = (t - last.current) / 1000;
      last.current = t;
      setSeconds((s) => s + dt);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [running]);

  const minutes = seconds / 60;
  const phase = phaseFor(minutes);
  const foggy = backlog >= 4;
  const sunny = backlog === 0;
  const mm = Math.floor(seconds / 60);
  const ss = Math.floor(seconds % 60);

  const reset = () => { setSeconds(0); setRunning(false); };

  return (
    <Card className="p-5 space-y-4 gpu-crisp">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-base">Calm Horizon Focus Engine</h3>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">
          Ambient study viewport
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs font-semibold">Activate Calm Horizon View</span>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {enabled ? (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm" variant={scene === "sea" ? "default" : "outline"}
              className="gap-1" onClick={() => setScene("sea")}
            ><Waves className="h-3.5 w-3.5" /> Open Sea</Button>
            <Button
              size="sm" variant={scene === "forest" ? "default" : "outline"}
              className="gap-1" onClick={() => setScene("forest")}
            ><Trees className="h-3.5 w-3.5" /> Quiet Forest</Button>
            <span className="ml-auto text-[11px] text-muted-foreground">
              Sky · <b className="text-foreground">{PHASE_LABEL[phase]}</b>
              {" · "}Backlog {backlog}{foggy ? " (foggy)" : sunny ? " (clear)" : ""}
            </span>
          </div>

          <HorizonStage scene={scene} phase={phase} foggy={foggy} sunny={sunny} minutes={minutes} />

          <div className="flex items-center gap-3">
            <div className="text-3xl font-black tabular-nums">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              Focus minutes drive the sky.<br />
              Kanban ≥4 items rolls fog in.
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => setRunning((r) => !r)} className="gap-1">
                {running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Focus</>}
              </Button>
              <Button size="sm" variant="outline" onClick={reset} className="gap-1">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Toggle on to swap the default countdown for a minimalist ambient horizon that shifts
          from dawn → day → dusk → sunset → starfield as focus minutes accrue.
        </p>
      )}
    </Card>
  );
}

function HorizonStage({
  scene, phase, foggy, sunny, minutes,
}: { scene: Scene; phase: Phase; foggy: boolean; sunny: boolean; minutes: number }) {
  const stars = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      cx: (i * 137.508) % 100,
      cy: (i * 47.31) % 45,
      r: 0.4 + ((i * 13) % 7) / 10,
      d: (i * 200) % 1800,
    }));
  }, []);
  const sunY = 62 - Math.min(52, minutes * 1.8); // rises then sets
  const showStars = phase === "sunset" || phase === "night";
  return (
    <div
      className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden border shadow-inner gpu-crisp"
      style={{ background: SKY_GRAD[phase] }}
    >
      {/* Stars (fade in near dusk/night) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {showStars && stars.map((s, i) => (
          <circle
            key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white"
            style={{ animation: `twinkle 3s ${s.d}ms infinite ease-in-out` }}
            opacity={phase === "night" ? 0.9 : 0.55}
          />
        ))}
        {/* Sun/Moon */}
        <circle
          cx={50} cy={sunY} r={phase === "night" ? 5 : 6}
          fill={phase === "night" ? "#f8fafc" : phase === "sunset" ? "#fef3c7" : "#fef9c3"}
          opacity={0.95}
          style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))" }}
        />
      </svg>

      {/* Scene layer */}
      {scene === "sea" ? <SeaLayer phase={phase} /> : <ForestLayer phase={phase} />}

      {/* Fog overlay */}
      {foggy && (
        <div
          className="absolute inset-0 pointer-events-none animate-fade-in"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(226,232,240,0.35) 60%, rgba(148,163,184,0.15) 100%)",
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      {sunny && !foggy && (
        <div className="absolute top-3 left-3 rounded-full bg-white/60 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-amber-700 shadow">
          ☀︎ All clear
        </div>
      )}
      <style>{`@keyframes twinkle { 0%,100% { opacity: 0.2 } 50% { opacity: 0.95 } }
                @keyframes bob    { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }`}</style>
    </div>
  );
}

function SeaLayer({ phase }: { phase: Phase }) {
  const seaColor = phase === "night" ? "#1e1b4b" : phase === "sunset" ? "#4c1d95" : phase === "dusk" ? "#0369a1" : "#0ea5e9";
  const foam = phase === "night" ? "#c7d2fe" : "#e0f2fe";
  return (
    <svg className="absolute inset-x-0 bottom-0 w-full h-1/2" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden>
      <path d="M0 20 Q25 10 50 18 T100 20 L100 50 L0 50 Z" fill={seaColor} opacity={0.9} />
      <path d="M0 26 Q25 20 50 26 T100 26 L100 50 L0 50 Z" fill={seaColor} opacity={0.75} />
      <path d="M0 34 Q30 30 60 34 T100 32 L100 50 L0 50 Z" fill={foam} opacity={0.25} style={{ animation: "bob 6s ease-in-out infinite" }} />
    </svg>
  );
}
function ForestLayer({ phase }: { phase: Phase }) {
  const near = phase === "night" ? "#052e16" : phase === "sunset" ? "#1a2e05" : "#166534";
  const far = phase === "night" ? "#14532d" : phase === "sunset" ? "#3f3f46" : "#22c55e";
  return (
    <svg className="absolute inset-x-0 bottom-0 w-full h-2/3" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden>
      {/* far ridge */}
      <path d="M0 40 L8 32 L16 38 L24 30 L34 36 L44 28 L54 34 L64 30 L74 36 L84 30 L94 34 L100 30 L100 60 L0 60 Z" fill={far} opacity={0.7} />
      {/* near trees */}
      <g fill={near}>
        {[6, 18, 32, 46, 62, 78, 92].map((x, i) => (
          <polygon key={i} points={`${x - 4},60 ${x},${44 - (i % 3) * 3} ${x + 4},60`} />
        ))}
      </g>
      <rect x={0} y={54} width={100} height={6} fill={near} />
    </svg>
  );
}
