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
} from "lucide-react";
import { useUIPrefs } from "@/lib/ui-prefs";

const NAV_GROUPS = [
  {
    label: "Core",
    items: [
      { to: "/grades", label: "Grades", Icon: Calculator },
      { to: "/reports", label: "Reports", Icon: ClipboardCheck },
      { to: "/ai", label: "AI", Icon: Brain },
      { to: "/peers", label: "Peers", Icon: Users },
    ],
  },
  {
    label: "Workspace",
    items: [
      { to: "/notebook", label: "Notebook", Icon: BookOpen },
      { to: "/timetable", label: "Calendar", Icon: CalendarRange },
      { to: "/utilities", label: "Utilities", Icon: Wrench },
      { to: "/inbox", label: "Inbox", Icon: Inbox },
    ],
  },
  {
    label: "More",
    items: [
      { to: "/shop", label: "Shop", Icon: Crown },
      { to: "/criteria", label: "Criteria", Icon: ListChecks },
      { to: "/forecasting", label: "Forecast", Icon: BarChart3, advanced: true },
      { to: "/teacher", label: "Teacher", Icon: Lock },
      { to: "/settings", label: "Settings", Icon: Settings },
      { to: "/changelog", label: "Updates", Icon: History },
    ],
  },
] as const;

export function WorkspaceNav({ compact = false }: { compact?: boolean }) {
  const location = useLocation();
  const [prefs] = useUIPrefs();
  return (
    <nav aria-label="Workspace navigation" className={compact ? "overflow-x-auto" : "space-y-2"}>
      <div className={compact ? "flex min-w-max items-center gap-1" : "grid grid-cols-1 gap-2 md:grid-cols-3"}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={compact ? "contents" : "rounded-lg border bg-card/50 p-2"}>
            {!compact && <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{group.label}</div>}
            <div className={compact ? "flex items-center gap-1" : "grid grid-cols-2 gap-1"}>
              {group.items.filter((item) => !("advanced" in item && item.advanced) || prefs.advancedStatsMode).map(({ to, label, Icon }) => {
                const active = location.pathname === to || location.pathname.startsWith(`${to}/`);
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-2 text-xs font-semibold transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-transparent bg-muted/30 text-foreground hover:border-border hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}