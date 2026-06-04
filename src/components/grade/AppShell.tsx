import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, GraduationCap, LogIn, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { type ReactNode } from "react";
import { toast } from "sonner";

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
  const { user, signOut } = useAuth();

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
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => { await signOut(); toast.success("Signed out"); }}
                className="gap-2"
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline truncate max-w-[120px]">{user.email}</span>
                <LogOut className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild className="gap-2">
                <Link to="/login"><LogIn className="h-4 w-4" /> Log in</Link>
              </Button>
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
