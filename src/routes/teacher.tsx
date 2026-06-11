import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { TeacherAuthGate } from "@/components/grade/TeacherAuthGate";
import { TeacherGradebook } from "@/components/grade/TeacherGradebook";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Gradebook — GradeCalc" },
      { name: "description", content: "Password-gated A*-G criteria gradebook (local-only)." },
    ],
  }),
  component: () => (
    <AppShell title="Teacher Gradebook View">
      <TeacherAuthGate>
        <TeacherGradebook />
      </TeacherAuthGate>
    </AppShell>
  ),
});