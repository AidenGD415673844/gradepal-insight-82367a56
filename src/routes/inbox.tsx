import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  usePeerNetwork,
  markInboxRead,
  deleteInbox,
  forceWeeklyReview,
  type InboxItem,
  type WeeklyReview,
} from "@/lib/peer-network";
import { useGrades } from "@/lib/grade-store";
import {
  Inbox as InboxIcon,
  Trash2,
  Sparkles,
  TrendingUp,
  Award,
  Target,
  Compass,
  Activity,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Local Inbox — GradeCalc" },
      { name: "description", content: "Automated weekly performance reviews, peer sync notices and academic diagnostics — generated locally on your device." },
      { property: "og:title", content: "Local Inbox — GradeCalc" },
      { property: "og:description", content: "Automated weekly performance reviews, peer sync notices and academic diagnostics — generated locally on your device." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/inbox" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/inbox" }],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { inbox } = usePeerNetwork();
  const { tasks } = useGrades();
  const [openReview, setOpenReview] = useState<WeeklyReview | null>(null);

  if (openReview) {
    return (
      <AppShell title="Weekly Academic Performance Review">
        <Button variant="ghost" size="sm" className="mb-3 gap-1" onClick={() => setOpenReview(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to Inbox
        </Button>
        <WeeklyReviewView review={openReview} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Local Inbox">
      <div className="flex items-center gap-2 mb-3">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => {
            const r = forceWeeklyReview(tasks);
            if (!r) toast.error("No tasks in the last 7 days to compile a review.");
            else toast.success("Weekly review generated.");
          }}
        >
          <RefreshCw className="h-4 w-4" /> Generate Weekly Review Now
        </Button>
      </div>
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <InboxIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Inbox</h2>
          <span className="text-xs text-muted-foreground ml-auto">{inbox.length} messages</span>
        </div>
        {inbox.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages. Weekly reviews appear here automatically.</p>
        ) : (
          <ul className="space-y-2">
            {inbox.map((i) => (
              <li
                key={i.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition hover:shadow-sm ${i.read ? "bg-card/50" : "bg-primary/5 border-primary/30"}`}
              >
                <button
                  onClick={() => {
                    markInboxRead(i.id);
                    if (i.kind === "weekly" && i.payload) setOpenReview(i.payload);
                  }}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    {i.kind === "weekly" ? (
                      <Sparkles className="h-4 w-4 text-violet-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="font-semibold text-sm">{i.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(i.ts).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{i.body}</p>
                </button>
                <Button size="icon" variant="ghost" onClick={() => deleteInbox(i.id)} title="Delete">
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}

// =============== Weekly Review View ===============
function WeeklyReviewView({ review }: { review: WeeklyReview }) {
  const letter =
    review.avg >= 92 ? "A* — Outstanding" :
    review.avg >= 85 ? "A — Excellent" :
    review.avg >= 75 ? "B — Good" :
    review.avg >= 65 ? "C — Satisfactory" :
    review.avg >= 50 ? "D — Borderline" : "F — Critical";

  return (
    <div className="space-y-5">
      {/* Header stats row */}
      <Card className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <Stat label="Tasks Graded This Week" value={String(review.count)} />
          <Stat label="Std Dev" value={`${review.std.toFixed(1)}%`} />
          <Stat label="Highest" value={`${review.max.toFixed(1)}%`} />
          <Stat label="Lowest" value={`${review.min.toFixed(1)}%`} />
          <Stat label="Pass Rate" value={`${review.passRate.toFixed(0)}%`} />
        </div>
      </Card>

      {/* Section A */}
      <Card className="p-5">
        <h3 className="font-bold text-base mb-4">Personalized Performance Feedback</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FeedbackRow Icon={Award} title="Strengths" body={review.strengths} accent="emerald" />
          <FeedbackRow Icon={Activity} title="Trends" body={review.trends} accent="blue" />
          <FeedbackRow Icon={Sparkles} title="Commendations" body={review.commendations} accent="amber" />
          <FeedbackRow Icon={TrendingUp} title="Performance" body={review.tier} accent="violet" />
          <FeedbackRow Icon={Target} title="Improvements" body={review.improvements} accent="rose" />
          <FeedbackRow Icon={Compass} title="Future Outlook" body={review.outlook} accent="cyan" />
        </div>
      </Card>

      {/* Section B */}
      <Card className="p-5">
        <h3 className="font-bold text-base mb-4">Advanced Statistical Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <DataCard title="Weighted Average" main={`${review.avg.toFixed(1)}%`} note={letter} />
          <DataCard title="Median Score" main={`${review.median.toFixed(1)}%`} note="middle of sorted array" />
          <DataCard
            title="Score Range"
            main={`${review.range.spread.toFixed(1)}% Spread`}
            note={`${review.range.lo.toFixed(1)}–${review.range.hi.toFixed(1)}%`}
          />
          <DataCard title="Consistency Rating" main={review.consistency} note={`σ = ${review.std.toFixed(2)}`} />
          <DataCard
            title="Momentum Tracker"
            main={`${review.momentum >= 0 ? "+" : ""}${review.momentum.toFixed(1)}pp`}
            note="last 5 vs prior"
          />
          <DataCard
            title="Split-Term Metrics"
            main={`H1 ${review.firstHalfAvg.toFixed(1)}% / H2 ${review.secondHalfAvg.toFixed(1)}%`}
            note={`Δ ${(review.secondHalfAvg - review.firstHalfAvg).toFixed(1)}pp`}
          />
        </div>
      </Card>

      {/* Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-bold text-sm mb-3">Score Distribution Histogram</h3>
          <Histogram scores={review.scores} />
        </Card>
        <Card className="p-5">
          <h3 className="font-bold text-sm mb-3">Category Performance Radar</h3>
          <Radar data={review.byCategory} />
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xl font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

const ACCENTS: Record<string, string> = {
  emerald: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
  blue: "from-blue-500/15 to-blue-500/5 border-blue-500/30",
  amber: "from-amber-500/15 to-amber-500/5 border-amber-500/30",
  violet: "from-violet-500/15 to-violet-500/5 border-violet-500/30",
  rose: "from-rose-500/15 to-rose-500/5 border-rose-500/30",
  cyan: "from-cyan-500/15 to-cyan-500/5 border-cyan-500/30",
};

function FeedbackRow({
  Icon, title, body, accent,
}: { Icon: any; title: string; body: string; accent: string }) {
  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${ACCENTS[accent] || ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="font-bold text-sm">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function DataCard({ title, main, note }: { title: string; main: string; note: string }) {
  return (
    <div className="rounded-xl border bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="text-lg font-bold tabular-nums mt-1">{main}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{note}</div>
    </div>
  );
}

// =============== Histogram ===============
function Histogram({ scores }: { scores: number[] }) {
  const bins = [0, 50, 60, 70, 80, 90, 100];
  const counts = new Array(bins.length - 1).fill(0);
  for (const s of scores) {
    for (let i = 0; i < bins.length - 1; i++) {
      if (s >= bins[i] && s < bins[i + 1]) { counts[i]++; break; }
      if (i === bins.length - 2 && s >= bins[i + 1] - 0.01) counts[i]++;
    }
  }
  const max = Math.max(1, ...counts);
  const W = 320, H = 180, pad = 24;
  const bw = (W - pad * 2) / counts.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
      {counts.map((c, i) => {
        const h = ((H - pad * 2) * c) / max;
        const x = pad + i * bw + 4;
        const y = H - pad - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 8} height={h} rx={4} fill="hsl(var(--primary))" opacity={0.85} />
            <text x={x + (bw - 8) / 2} y={H - 6} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
              {bins[i]}-{bins[i + 1]}
            </text>
            {c > 0 && (
              <text x={x + (bw - 8) / 2} y={y - 3} textAnchor="middle" fontSize="9" fontWeight="bold" fill="hsl(var(--foreground))">
                {c}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// =============== Radar ===============
function Radar({ data }: { data: { name: string; avg: number }[] }) {
  if (data.length < 3) {
    return <p className="text-xs text-muted-foreground">Need 3+ categories with scored tasks to render the radar.</p>;
  }
  const W = 280, H = 280, cx = W / 2, cy = H / 2, R = 100;
  const angleFor = (i: number) => (Math.PI * 2 * i) / data.length - Math.PI / 2;
  const pt = (i: number, frac: number) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * R * frac, cy + Math.sin(a) * R * frac];
  };
  const poly = data.map((d, i) => pt(i, d.avg / 100).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-72">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle key={f} cx={cx} cy={cy} r={R * f} fill="none" stroke="hsl(var(--border))" strokeWidth={0.8} />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" strokeWidth={0.8} />;
      })}
      <polygon points={poly} fill="hsl(var(--primary))" fillOpacity={0.25} stroke="hsl(var(--primary))" strokeWidth={1.5} />
      {data.map((d, i) => {
        const [x, y] = pt(i, 1.15);
        return (
          <text key={d.name} x={x} y={y} textAnchor="middle" fontSize="10" fill="hsl(var(--foreground))">
            {d.name}
          </text>
        );
      })}
    </svg>
  );
}
