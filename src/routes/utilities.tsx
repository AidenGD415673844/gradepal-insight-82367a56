import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { AdvancedTools } from "@/components/grade/AdvancedTools";
import { OptimizationHub } from "@/components/grade/OptimizationHub";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Wand2, Rocket } from "lucide-react";

export const Route = createFileRoute("/utilities")({
  head: () => ({
    meta: [
      { title: "School Companion Utilities — GradeCalc" },
      { name: "description", content: "Pomodoro, study planners, and exam bottleneck trackers." },
    ],
  }),
  component: UtilitiesPage,
});

function UtilitiesPage() {
  return (
    <AppShell title="School Companion">
      <Tabs defaultValue="hub" className="space-y-5">
        <div
          className="overflow-x-auto overflow-y-hidden -mx-1 px-1 snap-x snap-mandatory"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
        >
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="hub" className="gap-2 snap-start whitespace-nowrap">
              <Rocket className="h-4 w-4" /> Optimization Hub
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-2 snap-start whitespace-nowrap">
              <Wand2 className="h-4 w-4" /> Advanced Tools
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="hub" className="mt-0"><OptimizationHub /></TabsContent>
        <TabsContent value="advanced" className="mt-0"><AdvancedTools /></TabsContent>
      </Tabs>
    </AppShell>
  );
}
