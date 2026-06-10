import { createFileRoute, Link } from "@tanstack/react-router";
import { useGrades } from "@/lib/grade-store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIPrefs, setUIPrefs } from "@/lib/ui-prefs";
import { BurnoutRadar } from "@/components/grade/BurnoutRadar";
import { LeitnerCram } from "@/components/grade/LeitnerCram";
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
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GradeCalc — Home" },
      { name: "description", content: "Your local school dashboard: grades, utilities, timetable, and report cards." },
    ],
  }),
  component: Home,
});

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

const CARDS = [
  { to: "/grades", title: "Grade Calculator Engine", desc: "Subjects, weights, charts & predictions", Icon: Calculator, accent: "from-indigo-500/20 to-blue-500/10" },
  { to: "/utilities", title: "School Companion Utilities", desc: "Pomodoro, planners & bottlenecks", Icon: Wrench, accent: "from-emerald-500/20 to-teal-500/10" },
  { to: "/timetable", title: "Attendance & Timetable", desc: "Weekly schedule & attendance counters", Icon: CalendarRange, accent: "from-amber-500/20 to-orange-500/10" },
  { to: "/reports", title: "Official Report Card", desc: "Multi-term filter & 5-bullet feedback", Icon: ClipboardCheck, accent: "from-rose-500/20 to-pink-500/10" },
  { to: "/settings", title: "Settings & Preferences", desc: "Dark mode, quick add, reset & tutorial", Icon: SettingsIcon, accent: "from-slate-500/20 to-zinc-500/10" },
] as const;

function Home() {
  const { tasks, courses } = useGrades();
  const [prefs] = useUIPrefs();
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
        <LeitnerCram />
        <header className="bg-card rounded-2xl shadow-soft p-4 md:p-5 flex items-center gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center shadow-soft">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">GradeCalc</h1>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-2">
            <Link to="/timetable">
              <CalendarRange className="h-4 w-4" /> Calendar
            </Link>
          </Button>
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
          {CARDS.map(({ to, title, desc, Icon, accent }, idx) => (
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
      </div>
    </div>
  );
}
