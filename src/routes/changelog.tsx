import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GitCommit, Sparkles, Wrench, Shield, LineChart } from "lucide-react";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "System Update Log — GradeCalc" },
      { name: "description", content: "Chronological development milestones and shipped feature timeline." },
      { property: "og:title", content: "System Update Log — GradeCalc" },
      { property: "og:description", content: "Chronological development milestones and shipped feature timeline for the GradeCalc school companion app." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/changelog" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/changelog" }],
  }),
  component: ChangelogPage,
});

type Category = "feature" | "fix" | "analytics" | "security";
const CAT_STYLES: Record<Category, { label: string; cls: string; Icon: any }> = {
  feature: { label: "Feature", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", Icon: Sparkles },
  fix: { label: "Fix", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", Icon: Wrench },
  analytics: { label: "Analytics", cls: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30", Icon: LineChart },
  security: { label: "Security", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", Icon: Shield },
};

type LogEntry = {
  version: string;
  title: string;
  date: string;
  category: Category;
  bullets: string[];
};

const LOG: LogEntry[] = [
  {
    version: "v3.0.0",
    title: "Big Decentralisation Update",
    date: "2026-06-17",
    category: "feature",
    bullets: [
      "Peer Network Hub — establish friend connections without any cloud server or websockets.",
      "Base64 Token connection engine — copy your profile, paste a friend's token to sync locally.",
      "localStorage life-cycle states — pending, accepted, and blocked peer registries.",
      "Fullscreen Academic Sync with Stealth Blur Toggling — anonymise peer identifiers with one click.",
      "Color-coded delta badges — emerald, amber, and crimson variance pills across the sync grid.",
      "100-Message FIFO chat queue with status receipt ticks (sending, delivered, read).",
      "Timetable study planners — propose joint study sessions that drop straight into peer chat.",
      "Automated client-side Weekly Performance Review engine with histogram and category radar.",
    ],
  },
  {
    version: "v2.6.0",
    title: "Strategic Analytics Expansion",
    date: "2026-06-16",
    category: "analytics",
    bullets: [
      "System Update Log timeline portal added to navigation.",
      "Subject-by-subject Academic Balance Radar chart on the dashboard.",
      "Teacher Intervention Matrix sub-panel with crimson row alerts.",
      "Advanced Mode toggle now hides Strategic Forecasting & Advanced Features cards when off.",
    ],
  },
  {
    version: "v2.5.0",
    title: "Advanced Features Portal",
    date: "2026-06-15",
    category: "feature",
    bullets: [
      "Pareto Yield Matrix, EMA sparklines, Black Swan stress test.",
      "Third-Moment Skewness archetype profiler.",
      "Convergence Anchor required-average calculator.",
      "Pro/Simplified terminology toggle in Settings.",
    ],
  },
  {
    version: "v2.4.0",
    title: "Strategic Forecasting Hub",
    date: "2026-06-12",
    category: "analytics",
    bullets: [
      "Cone of Uncertainty trajectory with five toggleable helper paths.",
      "Monte Carlo probability matrix (100 trials per subject).",
      "GPA Velocity Vector gauge with derivative needles.",
      "Workload Stress Index thermometer.",
    ],
  },
  {
    version: "v2.3.0",
    title: "Report Card Generator Overhaul",
    date: "2026-06-08",
    category: "feature",
    bullets: [
      "Mid A* and High A* tier splits introduced.",
      "Bullets 8, 9, 10 expanded with buffer, stability, and syllabus metrics.",
      "Auto-Aspirational Mode in Settings.",
      "Clickable achievement badges with popover explanations.",
    ],
  },
  {
    version: "v2.2.0",
    title: "Chart & GPA Fixes",
    date: "2026-06-02",
    category: "fix",
    bullets: [
      "Y-axis letter grades aligned across all bar charts.",
      "Goal line highlighted in green with consistent legend styling.",
      "GPA Safety Monitor false-positive within-2% bug squashed.",
      "Mobile UI polish for subject selector and grade calculator.",
    ],
  },
  {
    version: "v2.1.0",
    title: "Comment Bank & Term Manager",
    date: "2026-05-20",
    category: "feature",
    bullets: [
      "Per-subject comment hide/show to prevent lag.",
      "Bullet preset comment summaries.",
      "Multi-term filtering across the report card.",
    ],
  },
  {
    version: "v2.0.0",
    title: "Local-First Architecture",
    date: "2026-04-15",
    category: "security",
    bullets: [
      "Full migration to client-side localStorage state.",
      "Zero-server calculation engine for all averages and predictions.",
      "Backup & Restore JSON export added.",
    ],
  },
];

function ChangelogPage() {
  return (
    <AppShell
      title="System Update Log"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Home</Link>
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto">
        <Card className="p-5 mb-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <GitCommit className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-base">Development Timeline</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            A chronological record of shipped features, fixes, and analytics expansions through June 16, 2026.
          </p>
        </Card>

        <ol className="relative border-l-2 border-border ml-3 space-y-5">
          {LOG.map((entry) => {
            const meta = CAT_STYLES[entry.category];
            const Icon = meta.Icon;
            return (
              <li key={entry.version} className="ml-5 animate-fade-in">
                <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-primary ring-4 ring-background">
                  <Icon className="h-3 w-3 text-primary-foreground" />
                </span>
                <Card className="p-4 md:p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="outline" className="font-mono text-xs">{entry.version}</Badge>
                    <Badge className={`text-xs border ${meta.cls}`} variant="outline">{meta.label}</Badge>
                    <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">{entry.date}</span>
                  </div>
                  <h3 className="font-bold text-base mb-2">{entry.title}</h3>
                  <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
                    {entry.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ol>
      </div>
    </AppShell>
  );
}