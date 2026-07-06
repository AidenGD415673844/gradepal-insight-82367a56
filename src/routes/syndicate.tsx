import { useMemo, useRef, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";
import { useUIPrefs } from "@/lib/ui-prefs";
import {
  COHORT_PROFILES,
  TIER_GROUPS,
  quartiles,
  syntheticScores,
  type CohortProfile,
} from "@/lib/cohort-presets";
import { Activity, Crosshair, Layers, Lock } from "lucide-react";

export const Route = createFileRoute("/syndicate")({
  head: () => ({
    meta: [
      { title: "Academic Syndicate Hub — GradeCalc" },
      { name: "description", content: "Cohort analytics, frontier contour map, and box-and-whisker overlays — fully client-side." },
      { property: "og:title", content: "Academic Syndicate Hub — GradeCalc" },
      { property: "og:description", content: "Cohort analytics, frontier contour map, and box-and-whisker overlays — fully client-side." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/syndicate" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/syndicate" }],
  }),
  component: SyndicatePage,
});

function SyndicatePage() {
  const { courses, tasks, settings } = useGrades();
  const [prefs] = useUIPrefs();
  const [selectedId, setSelectedId] = useState<string>("c5");

  // Build "user" pseudo-profile from current gradebook
  const userProfile = useMemo(() => {
    const subjects = courses.map((c) => calcAverage(tasks.filter((t) => t.courseId === c.id), settings.weighted));
    const valid = subjects.filter((v) => Number.isFinite(v) && v > 0);
    const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    const mean = avg;
    const variance = valid.length
      ? valid.reduce((s, v) => s + (v - mean) ** 2, 0) / valid.length
      : 0;
    const stdDev = Math.sqrt(variance);
    return { avg, stdDev, mastery: Math.max(0, Math.min(100, avg)), scores: valid.length ? valid : [avg || 70] };
  }, [courses, tasks, settings.weighted]);

  const cohort = COHORT_PROFILES.find((p) => p.id === selectedId)!;

  if (!prefs.advancedStatsMode) {
    return (
      <AppShell title="Academic Syndicate Hub">
        <Card className="p-8 text-center max-w-xl mx-auto">
          <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-bold mb-2">Advanced Statistics Mode required</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Cohort simulator, Syndicate Frontier, and box-and-whisker overlays are gated under Advanced Mode.
          </p>
          <Link to="/settings"><Button>Open Settings</Button></Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="Academic Syndicate Hub">
      <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-5">
        <div className="hidden xl:block">
          <CohortSidebar selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        <div className="space-y-5">
          <div className="xl:hidden animate-rise gpu-crisp">
            <CohortPicker selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="animate-rise gpu-crisp" style={{ animationDelay: "80ms" }}>
            <CohortHeader cohort={cohort} user={userProfile} />
          </div>
          <div className="animate-rise gpu-crisp" style={{ animationDelay: "160ms" }}>
            <FrontierMap cohort={cohort} user={userProfile} />
          </div>
          <div className="animate-rise gpu-crisp" style={{ animationDelay: "240ms" }}>
            <BoxplotOverlay cohort={cohort} user={userProfile} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// =============== Compact Cohort Picker (small / mobile) ===============
function CohortPicker({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compare against cohort</h2>
      </div>
      <select
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {TIER_GROUPS.map((g) => (
          <optgroup key={g.id} label={g.label}>
            {COHORT_PROFILES.filter((p) => p.tier === g.id).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.avg.toFixed(1)}%
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </Card>
  );
}

// =============== Cohort Sidebar ===============
function CohortSidebar({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  return (
    <Card className="p-3 h-fit sticky top-4 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center gap-2 mb-3 px-1">
        <Layers className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">Simulated Global Cohorts</h2>
      </div>
      {TIER_GROUPS.map((g) => {
        const items = COHORT_PROFILES.filter((p) => p.tier === g.id);
        return (
          <div key={g.id} className="mb-3">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              {g.label}
            </div>
            <div className="space-y-1">
              {items.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelect(p.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition flex items-center gap-2 ${
                      active
                        ? "bg-primary text-primary-foreground shadow"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-xs font-medium truncate">{p.name}</span>
                    <span className={`ml-auto text-[10px] tabular-nums ${active ? "opacity-80" : "text-muted-foreground"}`}>
                      {p.avg.toFixed(1)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

// =============== Cohort Header ===============
function CohortHeader({ cohort, user }: { cohort: CohortProfile; user: { avg: number; stdDev: number } }) {
  const stats = [
    { label: "Avg", peer: cohort.avg, you: user.avg, unit: "%" },
    { label: "Std Dev", peer: cohort.stdDev, you: user.stdDev, unit: "" },
    { label: "Mastery", peer: cohort.mastery, you: Math.round(user.avg), unit: "%" },
    { label: "Velocity", peer: cohort.velocity, you: 0, unit: "" },
  ];
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0"
          style={{ background: cohort.color }}>
          {cohort.name.split(" ").slice(-1)[0][0]}
        </div>
        <div>
          <div className="text-lg font-bold leading-tight">{cohort.name}</div>
          <Badge variant="outline" className="mt-1 text-[10px]">{cohort.tierLabel}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border p-3 bg-muted/30">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{s.label}</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg font-bold tabular-nums">{s.peer.toFixed(1)}{s.unit}</span>
              <span className="text-[10px] text-muted-foreground">you {s.you.toFixed(1)}{s.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============== Syndicate Frontier Contour Map ===============
function FrontierMap({ cohort, user }: { cohort: CohortProfile; user: { avg: number; stdDev: number } }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    // Axes: x = Syllabus Concept Mastery (0..100), y = Score Volatility StdDev (0..18 clamp)
    const PAD = 40;
    const x = (m: number) => PAD + (m / 100) * (W - PAD * 2);
    const y = (s: number) => H - PAD - (Math.min(s, 18) / 18) * (H - PAD * 2);

    // Background gradient field — blue valley (high mastery, low stddev) to crimson heat (low mastery, high stddev)
    const img = ctx.createImageData(W, H);
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const mx = ((px - PAD) / (W - PAD * 2)) * 100;
        const sy = (1 - (py - PAD) / (H - PAD * 2)) * 18;
        const friction = (100 - mx) / 100 * 0.55 + (Math.min(sy, 18) / 18) * 0.45;
        const t = Math.max(0, Math.min(1, friction));
        // blue (#1e3a8a) -> purple -> crimson (#dc2626)
        const r = Math.round(30 + t * (220 - 30));
        const g = Math.round(58 + t * (38 - 58));
        const b = Math.round(138 + t * (38 - 138));
        const a = 38;
        const i = (py * W + px) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = a;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Concentric contour rings centred on each anchor
    const drawRings = (cx: number, cy: number, color: string) => {
      for (let r = 18; r <= 110; r += 18) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.18;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    drawRings(x(cohort.mastery), y(cohort.stdDev), "#a855f7");
    drawRings(x(user.avg), y(user.stdDev), "#3b82f6");

    // Axes
    ctx.strokeStyle = "rgba(100,116,139,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, H - PAD); ctx.lineTo(W - PAD, H - PAD);
    ctx.moveTo(PAD, H - PAD); ctx.lineTo(PAD, PAD);
    ctx.stroke();

    ctx.fillStyle = "rgba(100,116,139,0.85)";
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.fillText("Syllabus Concept Mastery →", PAD, H - 12);
    ctx.save();
    ctx.translate(14, H - PAD);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Score Volatility (σ) →", 0, 0);
    ctx.restore();

    // Gridlines + ticks
    ctx.strokeStyle = "rgba(148,163,184,0.18)";
    for (let m = 0; m <= 100; m += 20) {
      ctx.beginPath();
      ctx.moveTo(x(m), PAD); ctx.lineTo(x(m), H - PAD);
      ctx.stroke();
      ctx.fillText(String(m), x(m) - 6, H - PAD + 14);
    }
    for (let s = 0; s <= 18; s += 3) {
      ctx.beginPath();
      ctx.moveTo(PAD, y(s)); ctx.lineTo(W - PAD, y(s));
      ctx.stroke();
      ctx.fillText(String(s), 18, y(s) + 3);
    }

    // Nodes
    const node = (cx: number, cy: number, color: string, label: string) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = "rgba(15,23,42,0.92)";
      ctx.font = "bold 11px ui-sans-serif, system-ui";
      ctx.fillText(label, cx + 12, cy + 4);
    };
    node(x(cohort.mastery), y(cohort.stdDev), cohort.color, cohort.name);
    node(x(user.avg), y(user.stdDev), "#3b82f6", "You");
  }, [cohort, user]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Syndicate Frontier Axis</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          Mastery × Volatility contour map
        </Badge>
      </div>
      <canvas ref={ref} width={900} height={420} className="w-full h-auto rounded-xl border bg-card" />
      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
        Crimson heat rings flag blind-spot intersections (low mastery × high volatility). Blue valley paths highlight complementary mastery assets — proximity to your node indicates the most actionable peer-leverage targets.
      </p>
    </Card>
  );
}

// =============== SVG Box-and-Whisker Overlay ===============
function BoxplotOverlay({ cohort, user }: { cohort: CohortProfile; user: { scores: number[] } }) {
  const cohortScores = useMemo(() => syntheticScores(cohort), [cohort]);
  const yq = useMemo(() => quartiles(user.scores), [user.scores]);
  const cq = useMemo(() => quartiles(cohortScores), [cohortScores]);

  const W = 880, H = 200, PAD = 40;
  const x = (v: number) => PAD + (v / 100) * (W - PAD * 2);

  const Box = ({ q, color, label, y, opacity = 1 }: { q: ReturnType<typeof quartiles>; color: string; label: string; y: number; opacity?: number }) => (
    <g opacity={opacity}>
      {/* whiskers */}
      <line x1={x(q.min)} x2={x(q.max)} y1={y} y2={y} stroke={color} strokeWidth={1.5} />
      <line x1={x(q.min)} x2={x(q.min)} y1={y - 12} y2={y + 12} stroke={color} strokeWidth={1.5} />
      <line x1={x(q.max)} x2={x(q.max)} y1={y - 12} y2={y + 12} stroke={color} strokeWidth={1.5} />
      {/* IQR box */}
      <rect
        x={x(q.q1)}
        y={y - 18}
        width={x(q.q3) - x(q.q1)}
        height={36}
        fill={color}
        fillOpacity={0.22}
        stroke={color}
        strokeWidth={1.5}
        rx={4}
      />
      {/* median */}
      <line x1={x(q.median)} x2={x(q.median)} y1={y - 18} y2={y + 18} stroke={color} strokeWidth={2.5} />
      <text x={PAD} y={y - 24} fontSize="11" fontWeight="bold" fill={color}>{label}</text>
      <text x={x(q.median) + 4} y={y - 22} fontSize="10" fill={color} fontWeight="bold">
        med {q.median.toFixed(1)}
      </text>
    </g>
  );

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Box-and-Whisker Distribution Overlay</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">Brand-blue (you) over ghosted purple (cohort)</Badge>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {/* axis */}
        <line x1={PAD} x2={W - PAD} y1={H - 24} y2={H - 24} stroke="rgba(148,163,184,0.5)" />
        {Array.from({ length: 11 }).map((_, i) => (
          <g key={i}>
            <line x1={x(i * 10)} x2={x(i * 10)} y1={H - 24} y2={H - 20} stroke="rgba(148,163,184,0.6)" />
            <text x={x(i * 10) - 6} y={H - 8} fontSize="10" fill="rgba(100,116,139,0.85)">{i * 10}</text>
          </g>
        ))}
        {/* cohort ghosted purple underneath */}
        <Box q={cq} color="#a855f7" label={cohort.name} y={H / 2 + 18} opacity={0.55} />
        {/* user brand-blue on top */}
        <Box q={yq} color="#3b82f6" label="You" y={H / 2 - 18} />
      </svg>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-[11px]">
        {(["min", "q1", "median", "q3", "max"] as const).map((k) => (
          <div key={k} className="rounded-lg border p-2 bg-muted/30">
            <div className="text-[9px] uppercase font-bold text-muted-foreground">{k}</div>
            <div className="font-bold text-primary tabular-nums">{yq[k].toFixed(1)}</div>
            <div className="text-[10px] text-purple-500 tabular-nums">{cq[k].toFixed(1)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}