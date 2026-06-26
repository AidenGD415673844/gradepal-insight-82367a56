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
    version: "v4.1.0",
    title: "Portal Bridge Tokens · Wallet Pass · Briefing Sheets · Mailto Outbox · 16-Digit Recovery",
    date: "2026-06-25",
    category: "feature",
    bullets: [
      "Fixed fatal hydration mismatch on PeerErrorToastHost — SSR now matches client first paint.",
      "AI secrets now stay server-side only; AI_API_KEY / AI_API_KEY_2 are read through the secure OpenRouter proxy and are never bundled into browser code.",
      "Notebook Vault — Apple-Notes-style always-visible toolbar with New Note / New Folder buttons, plus persistent inline delete affordances on every folder & note row.",
      "Lorenz Dispersion Curve · Academic Gini now displays to 1 decimal place for cleaner reporting.",
      "Homework Helper repriced as a true Pro feature (4 – 7.5 credits per call); AI Analyser Pro window lifted to 3 – 7.5 credits.",
      "ManageBac IB Export added to the School Portal Export — Term, Subject, Grade Letter, Mark, Effort, Comment.",
      "Digital Hardware ID Registry — canvas-rendered Syndicate ID Card in Settings, exportable as PNG + passkit-shaped wallet manifest.",
      "Parent-Teacher Night Briefing — one-click black-and-white executive print sheet on the Report Card Generator.",
      "Local SMTP Mailer — every Inbox card now offers Route Notice to External Outbox; pre-fills a formal academic narrative via the device mail client.",
      "16-Digit Emergency Recovery — 5 invalid PIN attempts freezes the panel and reveals a hidden override box. Recovery Certificate is now printable.",
      "WebRTC Card — prominent always-visible Incoming Offer panel; removed the redundant 'Add Peer via Token' card; Group Chat Hub promoted as the primary multi-peer flow.",
    ],
  },
  {
    version: "v4.0.0",
    title: "Phase 2 — OpenRouter AI Hub, PeerJS, Velocity & Sensitivity Engines",
    date: "2026-06-24",
    category: "feature",
    bullets: [
      "AI features unified under a single /ai nav with sub-tabs: AI Analysis Pro, AI Grader, Homework Helper.",
      "Multi-model OpenRouter wiring now uses verified live router/model fallbacks for grading, analysis and homework help.",
      "AI calls route through a server-side proxy with AI_API_KEY (+ AI_API_KEY_2 fallback); raw keys are never exposed to components.",
      "Top-down sliding dark-red PeerJS error toast banner with 7 mapped error codes (122–126, 121, 6x001002x).",
      "PeerJS package wired against the free public PeerJS cloud server (handshake only — grade data still 100% localStorage).",
      "Variable AI costs tightened to a 1.5–5 credit window; 75-credit top-up pack repriced to $67.5 HKD.",
      "Velocity Breach Warning — background slope scan injects an urgent inbox card when 7-day velocity drops below −1.5pp/day.",
      "Lorenz Dispersion Curve + Academic Gini coefficient added to Strategic Forecasting Hub (advanced mode only).",
      "Study Streak Multiplier engine — sub-48h Kanban progressions unlock 1.2x → 2.0x multipliers and elite commendation phrases.",
      "Category Weight Sensitivity Matrix replaces the static category list with a crimson/ice-blue heat-mapped leverage grid (advanced).",
      "Syndicate Bulletin Board — base64 connection token now carries a 120-char milestone; importing peers triggers a 'Syndicate Notice' inbox card.",
    ],
  },
  {
    version: "v3.3.0",
    title: "Phase 1 — Notebook Vault, KaTeX, Syndicate Canvas",
    date: "2026-06-23",
    category: "feature",
    bullets: [
      "Academic Notebook Vault — hierarchical folders, rich-text editor, KaTeX math rendering, base64 image/video embeds.",
      "Syndicate Canvas Matrix — SVG peer graph with cosine-similarity edge lengths and pulsing alignment indicators.",
      "AI Pro Analyser & Helper conversational tutor with full grade-dataset context injection.",
      "A* override fix: ≥91% now promotes to A* on both report card and grade scale tester.",
      "Flight Simulator anchored to actual p10–p90 score range; top-up packs restructured (10/20/50/75/100/150).",
    ],
  },
  {
    version: "v3.2.0",
    title: "GradePal UI Design Studio & Pro Subscription Engine",
    date: "2026-06-22",
    category: "feature",
    bullets: [
      "GradePal UI Design Studio — full theme/variable/opacity layout panel with 100% localStorage persistence.",
      "Pro subscription AI activation hooked to add-on credits and live broadcast across components.",
      "Workspace UX motors: deferred panels, sandbox toggle improvements, premium broadcast bus.",
      "Sub-nav restructuring across Settings for cleaner discoverability.",
    ],
  },
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