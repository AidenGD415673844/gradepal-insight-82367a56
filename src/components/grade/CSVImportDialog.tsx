import { useGrades, type Task } from "@/lib/grade-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileDown } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { createAutoSnapshot } from "@/lib/snapshots";

export function CSVImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { courses, addTask, addCourse } = useGrades();
  const [preview, setPreview] = useState<Task[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parse = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have a header and at least one row");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (n: string) => headers.indexOf(n);
    const ti = idx("task name");
    const si = idx("score");
    const mi = idx("max score");
    const ci = idx("category");
    const co = idx("course");
    if ([ti, si, mi, ci, co].some((i) => i === -1)) {
      toast.error("Required columns: task name, score, max score, category, course");
      return;
    }
    const rows: Task[] = [];
    // Track courses we create during this import so multiple matching rows
    // collapse into the same parent subject (e.g. "Chinese (proj)" + "Chinese"
    // both group under "Chinese").
    const normalize = (n: string) =>
      n
        .replace(/\s*\([^)]*\)\s*/g, " ") // strip "(proj)", "(hw)", etc.
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    const newlyCreated = new Map<string, typeof courses[number]>();
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const rawName = cols[co]?.trim();
      if (!rawName) continue;
      const key = normalize(rawName);
      let course =
        courses.find((c) => normalize(c.name) === key) ?? newlyCreated.get(key);
      if (!course) {
        // Use the cleaned name (without parenthetical suffix) as the parent.
        const parentName = rawName.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
        course = {
          id: crypto.randomUUID(),
          name: parentName,
          credits: 3,
          color: "oklch(0.6 0.15 220)",
        };
        newlyCreated.set(key, course);
        addCourse(course);
      }
      rows.push({
        id: crypto.randomUUID(),
        name: cols[ti]?.trim() ?? "Untitled",
        score: Number(cols[si]) || 0,
        maxScore: Number(cols[mi]) || 100,
        weight: 1,
        category: cols[ci]?.trim() || "Homework",
        courseId: course.id,
        date: new Date().toISOString().slice(0, 10),
      });
    }

    setPreview(rows);
  };

  const commit = () => {
    if (!preview) return;
    // Silent safety net before CSV overlays existing data.
    try { createAutoSnapshot("Pre-Import Automated Safeguard"); } catch {}
    preview.forEach((t) => addTask(t));
    toast.success(`Imported ${preview.length} grades`);
    setPreview(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const csv = "task name,score,max score,category,course\nMidterm,88,100,Tests,Mathematics\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "grades-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Grades from CSV</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Columns required: <code>task name, score, max score, category, course</code>.
          New courses are created automatically.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
            <Upload className="h-4 w-4" /> Choose CSV
          </Button>
          <Button variant="ghost" onClick={downloadTemplate} className="gap-2">
            <FileDown className="h-4 w-4" /> Download Template
          </Button>
        </div>
        <Input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && parse(e.target.files[0])}
        />
        {preview && (
          <div className="border rounded-lg max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Task</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-left p-2">Course</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((t) => (
                  <tr key={t.id} className="border-t">
                    <td className="p-2">{t.name}</td>
                    <td className="p-2">{t.score}/{t.maxScore}</td>
                    <td className="p-2">{t.category}</td>
                    <td className="p-2">
                      {courses.find((c) => c.id === t.courseId)?.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <DialogFooter>
          <Button disabled={!preview} onClick={commit}>
            Import {preview ? `${preview.length} grades` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

export function exportCSV(tasks: Task[], courseName: (id: string) => string) {
  const header = "task name,score,max score,weight,category,course,date,pending,hypothetical";
  const rows = tasks.map((t) =>
    [
      escape(t.name),
      t.score,
      t.maxScore,
      t.weight,
      escape(t.category),
      escape(courseName(t.courseId)),
      t.date,
      t.pending ? "true" : "false",
      t.hypothetical ? "true" : "false",
    ].join(","),
  );
  // Prefix BOM so Excel / Google Sheets correctly detect UTF-8 (Chinese, etc.)
  return "\uFEFF" + [header, ...rows].join("\n");
}

function escape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
