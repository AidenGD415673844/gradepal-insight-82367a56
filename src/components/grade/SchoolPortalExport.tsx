import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, School } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, filterByTerm, getLetter } from "@/lib/grade-utils";
import { applyAStarOverride } from "./a-star-override";
import { toast } from "sonner";

type Format = "websams" | "classroom" | "excel";

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: "websams", label: "WebSAMS Standard (HK)", hint: "HK Education Bureau column schema, comments ≤ 200 chars" },
  { id: "classroom", label: "Google Classroom CSV", hint: "Classroom import schema: Email, Last Name, First Name, Grade" },
  { id: "excel", label: "Generic Excel Spreadsheet", hint: "Wide format with attendance & comments columns" },
];

function csvEscape(v: string | number | undefined | null): string {
  if (v == null) return "";
  const s = String(v).replace(/\r?\n/g, " ").trim();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function clamp(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function download(name: string, body: string) {
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function SchoolPortalExport() {
  const { courses, tasks, scale, terms, activeTermId, settings, students } =
    useGrades() as any;
  const [fmt, setFmt] = useState<Format>("websams");
  const term = terms.find((t: any) => t.id === activeTermId) ?? null;
  const termLabel = term?.name ?? "All Terms";

  const rows = useMemo(() => {
    return courses.map((c: any) => {
      const ct = filterByTerm(
        tasks.filter((t: any) => t.courseId === c.id && !t.pending),
        term,
      );
      const avg = ct.length ? calcAverage(ct, settings.weighted) : 0;
      const baseLetter = ct.length ? getLetter(avg, scale)?.letter ?? "" : "";
      const letter = ct.length ? applyAStarOverride(avg, baseLetter) : "";
      const total = ct.length;
      const completed = ct.filter(
        (t: any) => typeof t.score === "number" && Number.isFinite(t.score),
      ).length;
      const attendance =
        total === 0 ? 100 : Math.round((completed / total) * 100);
      return {
        code: clamp(c.code || c.name, 12),
        subject: clamp(c.name, 40),
        avg: ct.length ? Number(avg.toFixed(1)) : "",
        letter,
        tasks: total,
        completed,
        attendance,
        credits: c.credits ?? 0,
      };
    });
  }, [courses, tasks, scale, term, settings.weighted]);

  function exportNow() {
    const student =
      (Array.isArray(students) && students[0]?.name) || "Student";
    const today = new Date().toISOString().slice(0, 10);
    let body = "";
    let name = "";

    if (fmt === "websams") {
      // WebSAMS standard subject result file — fixed column schema.
      const headers = [
        "STRN",
        "SubjectCode",
        "SubjectName",
        "Mark",
        "Grade",
        "Term",
        "ClassRemarks",
      ];
      const lines = [headers.join(",")];
      for (const r of rows) {
        lines.push(
          [
            csvEscape("0000000"),
            csvEscape(r.code),
            csvEscape(r.subject),
            csvEscape(r.avg),
            csvEscape(r.letter),
            csvEscape(termLabel),
            csvEscape(
              clamp(
                `${r.tasks} tasks, attendance ${r.attendance}%`,
                200,
              ),
            ),
          ].join(","),
        );
      }
      body = lines.join("\n");
      name = `websams_${today}.csv`;
    } else if (fmt === "classroom") {
      // Google Classroom expects: Email, Last Name, First Name, then a column per assignment.
      const headers = [
        "Email Address",
        "Last Name",
        "First Name",
        ...rows.map((r) => clamp(r.subject, 100)),
        "Overall Grade",
      ];
      const lastName = student.split(" ").slice(-1)[0] || "Student";
      const firstName = student.split(" ").slice(0, -1).join(" ") || student;
      const cells = [
        csvEscape("student@example.com"),
        csvEscape(lastName),
        csvEscape(firstName),
        ...rows.map((r) => csvEscape(r.avg)),
        csvEscape(
          rows.length
            ? Number(
                (rows.reduce(
                  (s, r) => s + (typeof r.avg === "number" ? r.avg : 0),
                  0,
                ) / Math.max(rows.length, 1)).toFixed(1),
              )
            : "",
        ),
      ];
      body = headers.join(",") + "\n" + cells.join(",");
      name = `classroom_${today}.csv`;
    } else {
      // Generic Excel-friendly wide CSV
      const headers = [
        "Subject Code",
        "Subject Name",
        "Term",
        "Average %",
        "Letter",
        "Tasks",
        "Completed",
        "Attendance %",
        "Credits",
      ];
      const lines = [headers.join(",")];
      for (const r of rows) {
        lines.push(
          [
            csvEscape(r.code),
            csvEscape(r.subject),
            csvEscape(termLabel),
            csvEscape(r.avg),
            csvEscape(r.letter),
            csvEscape(r.tasks),
            csvEscape(r.completed),
            csvEscape(r.attendance),
            csvEscape(r.credits),
          ].join(","),
        );
      }
      body = lines.join("\n");
      name = `gradecalc_export_${today}.csv`;
    }

    download(name, body);
    toast.success(`Exported ${rows.length} subjects as ${name}`);
  }

  const active = FORMATS.find((f) => f.id === fmt)!;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <School className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">School Portal Export</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Parse the current term's grades, attendance and comments into a CSV
        configured for your school's portal — fully client-side.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
        <div>
          <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
            Format
          </label>
          <select
            value={fmt}
            onChange={(e) => setFmt(e.target.value as Format)}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{active.hint}</p>
        </div>
        <Button onClick={exportNow} className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">
        {rows.length} subjects · term: <span className="font-semibold">{termLabel}</span>
      </div>
    </Card>
  );
}