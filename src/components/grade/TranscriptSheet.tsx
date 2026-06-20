import { useEffect, useState } from "react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage, calcGPA, getLetter, filterByTerm } from "@/lib/grade-utils";
import { applyAStarOverride } from "./a-star-override";

const SIG_KEY = "gradecalc-signature";

/** Hidden in normal view; revealed by `@media print` when body has
 *  the `transcript-print-mode` class. Pure B/W minimalist layout. */
export function TranscriptSheet() {
  const { courses, tasks, scale, terms, activeTermId, settings } = useGrades();
  const activeTerm = terms.find((t) => t.id === activeTermId) ?? null;
  const [signature, setSignature] = useState<string | null>(null);
  const [today, setToday] = useState<string>("");
  useEffect(() => {
    setSignature(localStorage.getItem(SIG_KEY));
    setToday(new Date().toLocaleDateString());
  }, []);

  const overallGPA = calcGPA(courses, tasks, scale);

  return (
    <div className="transcript-sheet" data-print="show">
      <header className="transcript-header">
        <h1>Official Academic Transcript</h1>
        <p className="transcript-sub">
          Generated {today} ·{" "}
          {activeTerm ? activeTerm.name : "All terms"}
        </p>
      </header>

      <table className="transcript-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Tasks</th>
            <th>Average %</th>
            <th>Letter</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => {
            const ct = filterByTerm(
              tasks.filter((t) => t.courseId === c.id && !t.pending),
              activeTerm,
            );
            const avg = ct.length ? calcAverage(ct, settings.weighted) : 0;
            const baseLetter = ct.length ? (getLetter(avg, scale)?.letter ?? "—") : "N/A";
            const letter = ct.length ? applyAStarOverride(avg, baseLetter) : "N/A";
            return (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{ct.length}</td>
                <td>{ct.length ? avg.toFixed(1) : "—"}</td>
                <td className="bold">{letter}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="bold right">Overall GPA</td>
            <td className="bold">{overallGPA.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="transcript-footer">
        <div className="transcript-sig-block">
          <div className="transcript-sig-label">Authorized Signature</div>
          {signature ? (
            <img src={signature} alt="Signature" className="transcript-sig-img" />
          ) : (
            <div className="transcript-sig-line" />
          )}
        </div>
      </footer>
    </div>
  );
}