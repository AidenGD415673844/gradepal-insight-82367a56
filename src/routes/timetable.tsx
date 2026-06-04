import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { AttendanceTimetable } from "@/components/grade/AttendanceTimetable";
import { CalendarView } from "@/components/grade/CalendarView";

export const Route = createFileRoute("/timetable")({
  head: () => ({
    meta: [
      { title: "Attendance & Timetable — GradeCalc" },
      { name: "description", content: "Weekly class schedule with color-coded attendance counters." },
    ],
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
