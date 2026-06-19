import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { TeacherAuthGate } from "@/components/grade/TeacherAuthGate";
import { TeacherGradebook } from "@/components/grade/TeacherGradebook";
import { Button } from "@/components/ui/button";
import { setUnlocked, useTeacherMode } from "@/lib/teacher-auth";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Gradebook — GradeCalc" },
      { name: "description", content: "Password-gated A*-G criteria gradebook for educators — fully local with per-criterion grade descriptors." },
      { property: "og:title", content: "Teacher Gradebook View — GradeCalc" },
      { property: "og:description", content: "Password-gated A*-G criteria gradebook for educators — fully local with per-criterion grade descriptors." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/teacher" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/teacher" }],
  }),
  component: TeacherRoute,
});

function TeacherRoute() {
  const { unlocked } = useTeacherMode();
  return (
    <AppShell
      title="Teacher Gradebook View"
      actions={
        unlocked ? (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setUnlocked(false);
              toast.success("Exited teacher mode.");
            }}
          >
            <LogOut className="h-3.5 w-3.5" /> Exit teacher mode
          </Button>
        ) : undefined
      }
    >
      <TeacherAuthGate>
        <TeacherGradebook />
      </TeacherAuthGate>
    </AppShell>
  );
}