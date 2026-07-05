import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  Brain,
  Calculator,
  CalendarRange,
  ClipboardCheck,
  Crown,
  History,
  Inbox,
  ListChecks,
  Lock,
  Settings,
  Users,
  Wrench,
  ChevronDown,
  Rocket,
  GraduationCap,
  NotebookPen,
  Cog,
  Radio,
} from "lucide-react";
import { useUIPrefs } from "@/lib/ui-prefs";

const NAV_HUBS = [
  {
    id: "productivity",
    label: "Productivity",
    Hub: Rocket,
    accent: "from-blue-500 to-indigo-500",
    items: [
      { to: "/grades", label: "Grades", Icon: Calculator },
      { to: "/reports", label: "Reports", Icon: ClipboardCheck },
      { to: "/ai", label: "AI", Icon: Brain },
      { to: "/utilities", label: "Utilities", Icon: Wrench },
    ],
  },
  {
    id: "planning",
    label: "Academic Planning",
    Hub: GraduationCap,
    accent: "from-emerald-500 to-teal-500",
    items: [
      { to: "/criteria", label: "Criteria", Icon: ListChecks },
      { to: "/forecasting", label: "Forecast", Icon: BarChart3, advanced: true },
      { to: "/peers", label: "Peers", Icon: Users },
      { to: "/study-room", label: "Study Room", Icon: Radio },
      { to: "/timetable", label: "Calendar", Icon: CalendarRange },
    ],
  },
  {
    id: "vault",
    label: "Notebook & Vault",
    Hub: NotebookPen,
    accent: "from-amber-500 to-orange-500",
    items: [
      { to: "/notebook", label: "Notebook", Icon: BookOpen },
      { to: "/inbox", label: "Inbox", Icon: Inbox },
      { to: "/shop", label: "Shop", Icon: Crown },
      { to: "/teacher", label: "Teacher", Icon: Lock },
    ],
  },
  {
    id: "system",
    label: "System Core",
    Hub: Cog,
    accent: "from-slate-500 to-zinc-500",
    items: [
      { to: "/settings", label: "Settings", Icon: Settings },
      { to: "/changelog", label: "Updates", Icon: History },
    ],
  },
] as const;

export function WorkspaceNav({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const [prefs] = useUIPrefs();

  // Auto-open the hub that contains the active route
  const initialOpen = NAV_HUBS.find((h) =>
    h.items.some((it) => location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)),
  )?.id ?? "productivity";
  const [openHub, setOpenHub] = useState<string>(initialOpen);

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <nav aria-label="Workspace navigation" className="space-y-2">
      <div className={compact ? "flex flex-wrap items-center gap-1.5" : "grid grid-cols-2 md:grid-cols-4 gap-2"}>
        {NAV_HUBS.map((hub) => {
          const hubActive = hub.items.some((it) => isActive(it.to));
          const open = openHub === hub.id;
          return (
            <button
              key={hub.id}
              type="button"
              onClick={() => setOpenHub(open ? "" : hub.id)}
              aria-expanded={open}
              aria-controls={`hub-${hub.id}`}
              className={`group inline-flex items-center gap-1.5 rounded-lg border px-2.5 h-9 text-xs font-bold transition ${
                open
                  ? `border-transparent text-white shadow-sm bg-gradient-to-r ${hub.accent}`
                  : hubActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-transparent bg-muted/40 text-foreground hover:border-border hover:bg-muted/70"
              }`}
            >
              <hub.Hub className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{hub.label}</span>
              <ChevronDown
                className={`h-3 w-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>

      {NAV_HUBS.map((hub) => {
        if (openHub !== hub.id) return null;
        const items = hub.items.filter(
          (item) => !("advanced" in item && item.advanced) || prefs.advancedStatsMode,
        );
        return (
          <div
            key={hub.id}
            id={`hub-${hub.id}`}
            className="animate-fade-in rounded-xl border bg-card/60 p-2 backdrop-blur-sm"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {items.map(({ to, label, Icon }) => {
                const active = isActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent bg-muted/30 hover:border-border hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}