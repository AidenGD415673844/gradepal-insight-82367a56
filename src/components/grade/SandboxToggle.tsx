import { FlaskConical } from "lucide-react";
import { enterSandbox, exitSandbox, useSandbox } from "@/lib/sandbox";
import { Button } from "@/components/ui/button";

export function SandboxToggle() {
  const on = useSandbox();
  return (
    <Button
      size="sm"
      variant={on ? "default" : "outline"}
      onClick={() => {
        if (on) exitSandbox();
        else if (
          confirm(
            "Launch Scenario Sandbox?\n\nA temporary copy of your gradebook will be created. Any changes you make until you exit Sandbox Mode will be discarded.",
          )
        )
          enterSandbox();
      }}
      className={`gap-1.5 ${on ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
      title="Launch Scenario Sandbox"
    >
      <FlaskConical className="h-4 w-4" />
      {on ? "Exit Sandbox" : "Launch Scenario Sandbox"}
    </Button>
  );
}

export function SandboxFrame({ children }: { children: React.ReactNode }) {
  const on = useSandbox();
  if (!on) return <>{children}</>;
  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60] ring-4 ring-violet-500 ring-inset shadow-[0_0_40px_rgba(139,92,246,0.45)_inset]"
      />
      <div className="sticky top-0 z-[55] bg-violet-600 text-white text-center text-xs md:text-sm font-semibold py-1.5 px-3 shadow">
        SANDBOX MODE ACTIVE — Gradebook changes are temporary and will not affect official records.
      </div>
      {children}
    </div>
  );
}