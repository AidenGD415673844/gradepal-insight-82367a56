import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { AcademicFeedback } from "@/components/grade/AcademicFeedback";
import { TermManager } from "@/components/grade/TermManager";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Report Card — GradeCalc" },
      { name: "description", content: "Multi-term filter and automated 5-bullet feedback compiler." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <AppShell title="Report Card Generator" actions={<TermManager />}>
      <AcademicFeedback />
    </AppShell>
  );
}
