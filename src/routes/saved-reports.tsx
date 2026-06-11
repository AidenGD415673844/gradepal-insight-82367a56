import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { SavedReportsHub } from "@/components/grade/SavedReportsHub";

export const Route = createFileRoute("/saved-reports")({
  head: () => ({
    meta: [
      { title: "Saved Reports — GradeCalc" },
      { name: "description", content: "Local 15-slot archive of saved report cards." },
    ],
  }),
  component: () => (
    <AppShell title="Saved Reports">
      <SavedReportsHub />
    </AppShell>
  ),
});