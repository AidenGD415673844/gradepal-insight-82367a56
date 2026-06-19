import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { AttendanceTimetable } from "@/components/grade/AttendanceTimetable";
import { CalendarView } from "@/components/grade/CalendarView";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Attendance & Timetable — GradeCalc" },
      { name: "description", content: "Plan your weekly class schedule with color-coded attendance counters and a synced local calendar view." },
      { property: "og:title", content: "Attendance & Timetable — GradeCalc" },
      { property: "og:description", content: "Plan your weekly class schedule with color-coded attendance counters and a synced local calendar view." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/timetable" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/timetable" }],
  }),
  component: TimetablePage,
});

function TimetablePage() {
  return (
    <AppShell title="Attendance & Timetable">
      <div className="space-y-5">
        <AttendanceTimetable />
        <CalendarView />
      </div>
    </AppShell>
  );
}
