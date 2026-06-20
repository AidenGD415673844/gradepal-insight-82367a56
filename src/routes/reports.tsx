import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { AcademicFeedback } from "@/components/grade/AcademicFeedback";
import { TermManager } from "@/components/grade/TermManager";
import { SchoolPortalExport } from "@/components/grade/SchoolPortalExport";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Report Card — GradeCalc" },
      { name: "description", content: "Generate official school report cards with multi-term filters and detailed 10-bullet feedback summaries." },
      { property: "og:title", content: "Report Card Generator — GradeCalc" },
      { property: "og:description", content: "Generate official school report cards with multi-term filters and detailed 10-bullet feedback summaries." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/reports" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/reports" }],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  return (
    <AppShell title="Report Card Generator" actions={<TermManager />}>
      <div className="space-y-5">
        <SchoolPortalExport />
        <AcademicFeedback />
      </div>
    </AppShell>
  );
}
