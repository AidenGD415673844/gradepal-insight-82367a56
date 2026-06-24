import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, CalendarRange } from "lucide-react";
import { type ReactNode } from "react";
import { SandboxFrame, SandboxToggle } from "@/components/grade/SandboxToggle";
import { AICreditChip } from "@/components/grade/AICreditChip";
import { StreakBadge } from "@/components/grade/StreakBadge";

export function AppShell({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <SandboxFrame>
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
        <header className="bg-card rounded-2xl shadow-soft p-3 md:p-4 flex items-center gap-3 justify-between flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/" })}
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="hidden sm:inline text-sm md:text-base font-extrabold tracking-tight">GradeCalc</span>
            </div>
            <h1 className="text-base md:text-lg font-bold tracking-tight truncate border-l pl-3 ml-1">{title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
            <StreakBadge />
            <AICreditChip />
            <SandboxToggle />
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/timetable">
                <CalendarRange className="h-4 w-4" /> Calendar
              </Link>
            </Button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
    </SandboxFrame>
  );
}
