import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useUIPrefs, setUIPrefs, resetAllLocalData } from "@/lib/ui-prefs";
import { Moon, BarChart3, Zap, RotateCcw, Trash2, BookOpen, Target, Sigma } from "lucide-react";
import { toast } from "sonner";
import { SnapshotManager } from "@/components/grade/SnapshotManager";
import { BackupRestore } from "@/components/grade/BackupRestore";
import { createAutoSnapshot } from "@/lib/snapshots";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GradeCalc" },
      { name: "description", content: "Local interface preferences and data controls." },
    ],
  }),
  component: SettingsPage,
});

function Row({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3 min-w-0">
        <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="font-medium text-sm">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const [prefs] = useUIPrefs();
  const navigate = useNavigate();

  const restartTutorial = () => {
    setUIPrefs({ welcomeDismissed: false });
    toast.success("Tutorial reset — visit Home to view it");
    navigate({ to: "/" });
  };

  const reset = () => {
    if (
      window.confirm(
        "WARNING! This will delete all your data, along with your grades, report cards. Are you sure you want to proceed?",
      )
    ) {
      // Silent safety net before destructive wipe.
      try {
        createAutoSnapshot("Pre-Reset Automated Safeguard");
      } catch {}
      resetAllLocalData();
    }
  };

  return (
    <AppShell title="Settings">
      <div className="space-y-5">
      <Card className="p-5 max-w-2xl">
        <h2 className="text-lg font-bold mb-2">Interface preferences</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Local-only toggles. Nothing here syncs to the cloud.
        </p>

        <Row icon={Moon} title="Enable Dark Mode" desc="Switch the entire UI to dark theme.">
          <Switch
            checked={prefs.darkMode}
            onCheckedChange={(v) => setUIPrefs({ darkMode: v })}
          />
        </Row>

        <Row icon={BarChart3} title="Hide All Charts" desc="Skip chart rendering for faster loads.">
          <Switch
            checked={prefs.hideCharts}
            onCheckedChange={(v) => setUIPrefs({ hideCharts: v })}
          />
        </Row>

        <Row
          icon={Sigma}
          title="Display Advanced Statistical Analytics"
          desc="Pro Analytics Mode: switches the Advanced Features portal to formal statistical terminology (Pareto Yield Matrix, EMA, Black Swan Factor, Third-Moment Skewness, Convergence Alignment). Off uses simplified academic labels."
        >
          <Switch
            checked={prefs.advancedStatsMode}
            onCheckedChange={(v) => setUIPrefs({ advancedStatsMode: v })}
          />
        </Row>

        <Row
          icon={Target}
          title="Set aspirational grade using data"
          desc="Automatically derive each subject's aspirational goal from live velocity trends. Bounded between E (41%) and Mid A* (95%)."
        >
          <Switch
            checked={prefs.aspirationalAuto}
            onCheckedChange={(v) => setUIPrefs({ aspirationalAuto: v })}
          />
        </Row>

        <Row
          icon={Zap}
          title="Quick add"
          desc="Compact Add Grade form — only name, category, score, max."
        >
          <Switch
            checked={prefs.quickAdd}
            onCheckedChange={(v) => setUIPrefs({ quickAdd: v })}
          />
        </Row>

        <Row icon={BookOpen} title="Restart Tutorial" desc="Re-show the home onboarding banner.">
          <Button size="sm" variant="outline" onClick={restartTutorial} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Restart
          </Button>
        </Row>

        <Row
          icon={Trash2}
          title="Reset data"
          desc="Permanently delete all locally-stored grades, reports and settings."
        >
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
            className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> Reset data
          </Button>
        </Row>
      </Card>
      <SnapshotManager />
      <BackupRestore />
      </div>
    </AppShell>
  );
}
