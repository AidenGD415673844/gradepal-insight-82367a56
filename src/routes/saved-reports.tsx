import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { SavedReportsHub } from "@/components/grade/SavedReportsHub";

export const Route = createFileRoute("/saved-reports")({
  head: () => ({
    meta: [
      { title: "Saved Reports — GradeCalc" },
      { name: "description", content: "Browse your local 15-slot archive of saved report cards with full multi-term snapshots and feedback history." },
      { property: "og:title", content: "Saved Reports — GradeCalc" },
      { property: "og:description", content: "Browse your local 15-slot archive of saved report cards with full multi-term snapshots and feedback history." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/saved-reports" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/saved-reports" }],
  }),
  component: () => (
    <AppShell title="Saved Reports">
      <SavedReportsHub />
    </AppShell>
  ),
});