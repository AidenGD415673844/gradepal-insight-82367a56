import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, filterByTerm, getLetter } from "@/lib/grade-utils";
import { applyAStarOverride } from "./a-star-override";

/**
 * Parent-Teacher Night One-Click Briefing PDF Sheet.
 * Renders a hidden high-contrast print sheet and triggers window.print().
 * Uses CSS @media print + a brief-only print stylesheet so the rest of
 * the app is hidden. 100% client-side — no PDF library required.
 */
export function ConsultationBrief() {
  const { courses, tasks, terms, activeTermId, settings, scale, students } = useGrades() as any;
  const [open, setOpen] = useState(false);
  const term = terms.find((t: any) => t.id === activeTermId) ?? null;
  const termLabel = term?.name ?? "All Terms";
  const student = (Array.isArray(students) && students[0]?.name) || "Student";

  const rows = useMemo(() => {
    return courses.map((c: any) => {
      const ct = filterByTerm(tasks.filter((t: any) => t.courseId === c.id && !t.pending), term);
      const avg = ct.length ? calcAverage(ct, settings.weighted) : 0;
      const baseLetter = ct.length ? getLetter(avg, scale)?.letter ?? "" : "";
      const letter = ct.length ? applyAStarOverride(avg, baseLetter) : "";
      // Find weakest categories — proxy for "syllabus blind spots".
      const catAgg = new Map<string, { sum: number; n: number }>();
      for (const t of ct) {
        if (typeof t.score !== "number") continue;
        const k = t.category || "General";
        const cur = catAgg.get(k) || { sum: 0, n: 0 };
        cur.sum += (t.score / (t.max || 100)) * 100;
        cur.n += 1;
        catAgg.set(k, cur);
      }
      const weakest = Array.from(catAgg.entries())
        .map(([name, v]) => ({ name, avg: v.sum / v.n }))
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 3);
      return { name: c.name, avg, letter, weakest };
    });
  }, [courses, tasks, term, settings.weighted, scale]);

  const overall = rows.length ? rows.reduce((s: number, r: any) => s + (r.avg || 0), 0) / rows.length : 0;

  // Top-3 blind spots across the transcript
  const blindSpots = rows
    .flatMap((r: any) => r.weakest.map((w: any) => ({ subj: r.name, cat: w.name, avg: w.avg })))
    .sort((a: any, b: any) => a.avg - b.avg)
    .slice(0, 3);

  const doPrint = () => {
    setOpen(true);
    // Give React a tick to mount the print sheet before invoking print.
    setTimeout(() => {
      window.print();
      setTimeout(() => setOpen(false), 400);
    }, 80);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Generate Consultation Brief</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Parent-Teacher Night one-page sheet — black-and-white high-contrast executive summary
        with the 10-bullet matrix, feedback checklist and top blind spots. Click to format and
        send straight to your printer or PDF export dialog.
      </p>
      <Button onClick={doPrint} className="gap-2">
        <Printer className="h-4 w-4" /> Generate &amp; Print Brief
      </Button>

      {open && (
        <div id="consultation-brief-print" className="fixed inset-0 z-[9998] bg-white text-black overflow-auto p-10">
          <style>{`
            @media print {
              body * { visibility: hidden !important; }
              #consultation-brief-print, #consultation-brief-print * { visibility: visible !important; }
              #consultation-brief-print { position: absolute; inset: 0; padding: 24px !important; }
            }
            #consultation-brief-print { font-family: Georgia, 'Times New Roman', serif; }
            #consultation-brief-print h1 { font-size: 22pt; margin: 0 0 4pt; border-bottom: 2px solid #000; padding-bottom: 4pt; }
            #consultation-brief-print h2 { font-size: 13pt; margin: 16pt 0 6pt; text-transform: uppercase; letter-spacing: 0.05em; }
            #consultation-brief-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
            #consultation-brief-print th, #consultation-brief-print td { border: 1px solid #000; padding: 4pt 6pt; text-align: left; }
            #consultation-brief-print th { background: #000; color: #fff; }
            #consultation-brief-print .meta { display: flex; justify-content: space-between; font-size: 10pt; margin-bottom: 8pt; }
            #consultation-brief-print ol { padding-left: 18pt; font-size: 10pt; }
            #consultation-brief-print .checklist li { margin-bottom: 2pt; }
          `}</style>
          <h1>Parent–Teacher Consultation Brief</h1>
          <div className="meta">
            <span><b>Student:</b> {student}</span>
            <span><b>Term:</b> {termLabel}</span>
            <span><b>Date:</b> {new Date().toLocaleDateString()}</span>
          </div>

          <h2>Subject Performance Matrix</h2>
          <table>
            <thead>
              <tr><th>Subject</th><th style={{width:"80pt"}}>Average</th><th style={{width:"60pt"}}>Letter</th></tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.name}><td>{r.name}</td><td>{r.avg ? r.avg.toFixed(1) + "%" : "—"}</td><td>{r.letter || "—"}</td></tr>
              ))}
              <tr><td><b>Overall Average</b></td><td><b>{overall.toFixed(1)}%</b></td><td>—</td></tr>
            </tbody>
          </table>

          <h2>10-Bullet Executive Summary</h2>
          <ol>
            <li>Overall weighted academic average: <b>{overall.toFixed(1)}%</b>.</li>
            <li>Subject count tracked this term: <b>{rows.length}</b>.</li>
            <li>Strongest subject: <b>{rows.slice().sort((a:any,b:any)=>b.avg-a.avg)[0]?.name || "—"}</b>.</li>
            <li>Weakest subject: <b>{rows.slice().sort((a:any,b:any)=>a.avg-b.avg)[0]?.name || "—"}</b>.</li>
            <li>Assignments graded: <b>{tasks.filter((t:any)=>typeof t.score === "number").length}</b>.</li>
            <li>Subjects above 80%: <b>{rows.filter((r:any)=>r.avg>=80).length}</b>.</li>
            <li>Subjects below 60%: <b>{rows.filter((r:any)=>r.avg<60 && r.avg>0).length}</b>.</li>
            <li>Top blind spot: <b>{blindSpots[0] ? `${blindSpots[0].subj} – ${blindSpots[0].cat}` : "None identified"}</b>.</li>
            <li>Weighted calculation: <b>{settings.weighted ? "ON" : "OFF"}</b>.</li>
            <li>Brief generated locally on device — no server transmission.</li>
          </ol>

          <h2>Teacher Feedback Checklist</h2>
          <ul className="checklist">
            <li>☐ Discuss strengths in {rows.slice().sort((a:any,b:any)=>b.avg-a.avg)[0]?.name || "core subject"}.</li>
            <li>☐ Review study habits for {rows.slice().sort((a:any,b:any)=>a.avg-b.avg)[0]?.name || "weakest area"}.</li>
            <li>☐ Address blind-spot category: {blindSpots[0]?.cat || "n/a"}.</li>
            <li>☐ Set written target average for next term.</li>
            <li>☐ Agree on weekly home review schedule.</li>
            <li>☐ Sign off attendance and effort assessment.</li>
          </ul>

          <h2>Top 3 Syllabus Blind Spots</h2>
          <ol>
            {blindSpots.length === 0 && <li>No category-level weaknesses detected this term.</li>}
            {blindSpots.map((b: any, i: number) => (
              <li key={i}><b>{b.subj}</b> · {b.cat} — current average {b.avg.toFixed(1)}%.</li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}