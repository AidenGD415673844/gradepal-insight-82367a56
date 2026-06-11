import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { useUIPrefs } from "@/lib/ui-prefs";
import { AppShell } from "@/components/grade/AppShell";
import { CoursesSidebar } from "@/components/grade/CoursesSidebar";
import { StatsRow } from "@/components/grade/StatsRow";
import { GradesTable, TaskDialog } from "@/components/grade/GradesTable";
import { PredictiveAnalysis, GoalTracker } from "@/components/grade/Predictive";
import { GradesBarChart, GradeDistributionPie, PerformanceOverTime } from "@/components/grade/Charts";
import { TermManager } from "@/components/grade/TermManager";
import { GradeScaleDialog } from "@/components/grade/GradeScaleDialog";
import { CSVImportDialog, exportCSV } from "@/components/grade/CSVImportDialog";
import { AIGraderDialog } from "@/components/grade/AIGraderDialog";
import { KanbanBoard } from "@/components/grade/KanbanBoard";
import { GradeHorizonMap } from "@/components/grade/GradeHorizonMap";
import { StressTestSimulator } from "@/components/grade/StressTestSimulator";
import { Button } from "@/components/ui/button";
import { Plus, Download, Upload, Sparkles, SlidersHorizontal, FlaskConical, Eye, Table2, Kanban } from "lucide-react";

export const Route = createFileRoute("/grades")({
  head: () => ({
    meta: [
      { title: "Grade Calculator — GradeCalc" },
      { name: "description", content: "Track subjects, weights, charts and predicted grades." },
    ],
  }),
  component: GradesPage,
});

function GradesPage() {
  const { settings, setSettings, tasks, courses } = useGrades();
  const [prefs] = useUIPrefs();
  const readOnly = settings.parentView;
  const [scaleOpen, setScaleOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<"table" | "kanban">("table");

  const handleExport = () => {
    const csv = exportCSV(tasks, (id) => courses.find((c) => c.id === id)?.name ?? "");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `grades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="Grade Calculator"
      actions={
        <>
          <TermManager />
          {!readOnly && (
            <>
              <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
              <Button size="sm" variant="outline" onClick={() => setAiOpen(true)} className="gap-2"><Sparkles className="h-4 w-4" /> AI</Button>
              <Button size="sm" variant="outline" onClick={() => setScaleOpen(true)} className="gap-2"><SlidersHorizontal className="h-4 w-4" /> Scale</Button>
              <Button size="sm" variant="outline" onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Export</Button>
              <Button size="sm" variant="outline" onClick={() => setCsvOpen(true)} className="gap-2"><Upload className="h-4 w-4" /> Import</Button>
              <Button size="sm" variant={settings.hypotheticalMode ? "default" : "outline"} onClick={() => setSettings({ hypotheticalMode: !settings.hypotheticalMode })} className="gap-2">
                <FlaskConical className="h-4 w-4" /> Hypothetical
              </Button>
            </>
          )}
          <Button size="sm" variant={readOnly ? "default" : "outline"} onClick={() => setSettings({ parentView: !readOnly })} className="gap-2">
            <Eye className="h-4 w-4" /> {readOnly ? "Exit" : "Parent"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <CoursesSidebar />
        <div className="space-y-5 min-w-0">
          <StatsRow />
          <PredictiveAnalysis />
          <GoalTracker />
          <GradeHorizonMap />
          <StressTestSimulator />
          {!prefs.hideCharts && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <GradesBarChart />
                <GradeDistributionPie />
              </div>
              <PerformanceOverTime />
            </>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")} className="gap-2"><Table2 className="h-4 w-4" /> Table</Button>
            <Button size="sm" variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")} className="gap-2"><Kanban className="h-4 w-4" /> Kanban</Button>
          </div>
          {view === "table" ? <GradesTable /> : <KanbanBoard />}
        </div>
      </div>

      <GradeScaleDialog open={scaleOpen} onOpenChange={setScaleOpen} />
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <AIGraderDialog open={aiOpen} onOpenChange={setAiOpen} />
      <TaskDialog open={addOpen} onOpenChange={setAddOpen} editing={null} />
    </AppShell>
  );
}
