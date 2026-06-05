import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, CalendarRange } from "lucide-react";
import { type ReactNode } from "react";

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
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-base md:text-lg font-bold tracking-tight truncate">{title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
            <Button variant="outline" size="sm" asChild className="gap-2">
              <Link to="/timetable">
                <CalendarRange className="h-4 w-4" /> Calendar
              </Link>
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
