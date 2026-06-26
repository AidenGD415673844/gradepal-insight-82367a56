import { createFileRoute, Link } from "@tanstack/react-router";
import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIPrefs, setUIPrefs } from "@/lib/ui-prefs";
import { BurnoutRadar } from "@/components/grade/BurnoutRadar";
import { LeitnerCram } from "@/components/grade/LeitnerCram";
import { GPAFireAlarm } from "@/components/grade/GPAFireAlarm";
import { SubjectRadar } from "@/components/grade/SubjectRadar";
import { maybeGenerateWeeklyReview, usePeerNetwork } from "@/lib/peer-network";
import { useEffect } from "react";
import { runVelocityBreachScan } from "@/lib/velocity-breach";
import {
  GraduationCap,
  Calculator,
  Wrench,
  CalendarRange,
  ClipboardCheck,
  CalendarClock,
  Settings as SettingsIcon,
  X,
  Sparkles,
  Archive,
  Lock,
  ListChecks,
  LineChart,
  ChevronDown,
  ChevronRight,
  Sigma,
  History,
  Users,
  Inbox as InboxIcon,
  Crown,
  BookOpen,
  Brain,
} from "lucide-react";
import { WorkspaceNav } from "@/components/grade/WorkspaceNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GradeCalc — Home" },
      { name: "description", content: "GradeCalc is your local school dashboard for tracking grades, utilities, timetable, and generating report cards." },
      { property: "og:title", content: "GradeCalc — Local School Dashboard" },
      { property: "og:description", content: "Track grades, run forecasts, plan study sessions and generate report cards — all stored locally in your browser." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/" }],
  }),
  component: Home,
});

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const ALL_CORE_CARDS = [
  { to: "/grades", title: "Grade Calculator Engine", desc: "Subjects, weights, charts & predictions", Icon: Calculator, accent: "from-indigo-500/20 to-blue-500/10" },
  { to: "/reports", title: "Official Report Card", desc: "Multi-term filter & 10 bullet feedback", Icon: ClipboardCheck, accent: "from-rose-500/20 to-pink-500/10" },
  { to: "/peers", title: "Peer Network Hub", desc: "Decentralised base64 peer tokens, academic sync grid & FIFO chat", Icon: Users, accent: "from-blue-500/20 to-cyan-500/10" },
  { to: "/notebook", title: "Academic Notebook Vault", desc: "Hierarchical folders, rich-text editor, KaTeX equations & base64 media", Icon: BookOpen, accent: "from-violet-500/20 to-fuchsia-500/10" },
  { to: "/ai", title: "AI Hub", desc: "Analysis Pro, AI Grader & Homework Helper — three free OpenRouter models in one place", Icon: Brain, accent: "from-pink-500/20 to-rose-500/10" },
  { to: "/inbox", title: "Local Inbox", desc: "Weekly performance reviews and peer sync notices", Icon: InboxIcon, accent: "from-amber-500/20 to-yellow-500/10" },
  { to: "/shop", title: "GradePal Pro Shop", desc: "Subscription tiers, referral wallet checkout & promo codes", Icon: Crown, accent: "from-amber-500/20 to-orange-500/10" },
  { to: "/forecasting", title: "Strategic Forecasting Hub", desc: "Cone of uncertainty, Monte Carlo, GPA velocity & burnout thermometer", Icon: LineChart, accent: "from-fuchsia-500/20 to-purple-500/10", advanced: true },
  { to: "/advanced", title: "Advanced Features", desc: "Pareto matrix, EMA, Black Swan, skewness & convergence anchor", Icon: Sigma, accent: "from-violet-500/20 to-indigo-500/10", advanced: true },
  { to: "/syndicate", title: "Academic Syndicate Hub", desc: "20 simulated cohorts, Frontier contour map & SVG box-and-whisker overlays", Icon: Users, accent: "from-purple-500/20 to-fuchsia-500/10", advanced: true },
] as const;

const UTILITY_CARDS = [
  { to: "/utilities", title: "School Companion Utilities", desc: "Pomodoro, planners & bottlenecks", Icon: Wrench, accent: "from-emerald-500/20 to-teal-500/10" },
  { to: "/timetable", title: "Attendance & Timetable", desc: "Weekly schedule & attendance counters", Icon: CalendarRange, accent: "from-amber-500/20 to-orange-500/10" },
  { to: "/saved-reports", title: "Saved Reports", desc: "Local 15-slot history hub of archived report cards", Icon: Archive, accent: "from-cyan-500/20 to-sky-500/10" },
  { to: "/teacher", title: "Teacher Gradebook View", desc: "Password-gated A*-G criteria gradebook", Icon: Lock, accent: "from-violet-500/20 to-fuchsia-500/10" },
  { to: "/criteria", title: "Assessment Criteria", desc: "Browse criteria & grades; teachers can edit", Icon: ListChecks, accent: "from-lime-500/20 to-green-500/10" },
  { to: "/changelog", title: "System Update Log", desc: "Chronological timeline of shipped features and fixes", Icon: History, accent: "from-blue-500/20 to-indigo-500/10" },
  { to: "/settings", title: "Settings & Preferences", desc: "Dark mode, quick add, reset & tutorial", Icon: SettingsIcon, accent: "from-slate-500/20 to-zinc-500/10" },
] as const;

function Home() {
  const { tasks, courses, scale } = useGrades();
  const [prefs] = useUIPrefs();
  usePeerNetwork();
  useEffect(() => {
    maybeGenerateWeeklyReview(tasks);
  }, [tasks]);
  useEffect(() => {
    try { runVelocityBreachScan(courses, tasks, scale); }
    catch (e) { console.warn("velocity scan failed", e); }
  }, [tasks, courses, scale]);
  const utilCollapsed = prefs.utilHubCollapsed;
  const CORE_CARDS = ALL_CORE_CARDS.filter((c) => !("advanced" in c && c.advanced) || prefs.advancedStatsMode);
  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const agenda = tasks
    .filter((t) => t.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5)
    .map((t) => ({ ...t, courseName: courses.find((c) => c.id === t.courseId)?.name ?? "—" }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        <BurnoutRadar />
        <GPAFireAlarm />
        <LeitnerCram />
        <header className="bg-card rounded-2xl shadow-soft p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight truncate">GradeCalc — Local School Dashboard</h1>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/timetable">
              <CalendarRange className="h-4 w-4" /> Calendar
            </Link>
          </Button>
          </div>
          <WorkspaceNav />
        </header>

        {!prefs.welcomeDismissed && (
          <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 relative">
            <button
              aria-label="Dismiss welcome banner"
              onClick={() => setUIPrefs({ welcomeDismissed: true })}
              className="absolute top-3 right-3 h-7 w-7 rounded-md hover:bg-background/60 flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-base">Welcome to GradeCalc</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              A 3-step quick tour of the four module cards below:
            </p>
            <ol className="text-sm space-y-1.5 list-decimal pl-5">
              <li>
                <strong>Grade Calculator</strong> — track subjects, weights and see live predictions.
              </li>
              <li>
                <strong>School Companion + Timetable</strong> — Pomodoro, planners and a weekly attendance grid.
              </li>
              <li>
                <strong>Official Report Card</strong> — auto-compile 5-bullet term feedback and export PDF/CSV.
              </li>
            </ol>
          </Card>
        )}

        <Card className="p-0 overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr]">
            <div className="flex flex-col items-center justify-center text-center py-6 sm:py-8 border-b sm:border-b-0 sm:border-r">
              <div className="text-xs font-bold tracking-[0.2em] text-muted-foreground">{MONTHS[now.getMonth()]}</div>
              <div className="text-lg font-semibold text-primary mt-1">{DAYS[now.getDay()]}</div>
              <div className="text-5xl font-extrabold tabular-nums leading-none mt-1">{now.getDate()}</div>
            </div>
            <div className="p-5 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CalendarClock className="h-4 w-4 text-primary" /> Upcoming Agenda
              </div>
              {agenda.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  There are no upcoming tasks, deadlines or events today.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {agenda.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 border-b last:border-b-0 pb-1.5">
                      <span className="truncate">
                        <span className="font-medium">{t.name}</span>
                        <span className="text-muted-foreground"> · {t.courseName}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">{t.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
          {CORE_CARDS.map(({ to, title, desc, Icon, accent }, idx) => (
            <Link key={to} to={to} className="group" style={{ animationDelay: `${idx * 60}ms` }}>
              <Card className={`p-5 md:p-6 h-full bg-gradient-to-br ${accent} hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 animate-fade-in`}>
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-card flex items-center justify-center shadow-soft shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base md:text-lg font-bold leading-tight">{title}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">{desc}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {!prefs.hideCharts && courses.length >= 3 && <SubjectRadar />}

        <Card className="overflow-hidden">
          <button
            type="button"
            onClick={() => setUIPrefs({ utilHubCollapsed: !utilCollapsed })}
            className="w-full flex items-center justify-between gap-2 p-4 hover:bg-muted/40 transition"
          >
            <div className="flex items-center gap-2">
              {utilCollapsed ? (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
              <Wrench className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">Utility Hub</span>
              <span className="text-xs text-muted-foreground">
                {UTILITY_CARDS.length} planners & secondary modules
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {utilCollapsed ? "Expand" : "Collapse"}
            </span>
          </button>
          {!utilCollapsed && (
            <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t">
              {UTILITY_CARDS.map(({ to, title, desc, Icon }) => (
                <Link key={to} to={to} className="group">
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-card/40 hover:bg-muted/30 hover:shadow-sm transition">
                    <div className="h-9 w-9 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{title}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{desc}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
