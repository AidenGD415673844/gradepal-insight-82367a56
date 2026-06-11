import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { SavedReport } from "@/lib/saved-reports";
import { formatSavedDate } from "@/lib/saved-reports";

/** Re-renders a saved report card snapshot exactly as it looked when saved. */
export function SavedReportFidelity({
  report,
  onDelete,
}: {
  report: SavedReport;
  onDelete?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-muted-foreground">
          {report.termLabel} · saved {formatSavedDate(report.createdAt)}
        </div>
        {onDelete && (
          <Button variant="outline" size="sm" onClick={onDelete} className="gap-2">
            <Trash2 className="h-3.5 w-3.5 text-destructive" /> Delete Report
          </Button>
        )}
      </div>

      {report.rows.map((r) => (
        <Card
          key={r.courseId}
          className="p-4 md:p-5 border-l-4"
          style={{ borderLeftColor: r.color }}
        >
          <div className="border-b pb-3 mb-4">
            <h3 className="text-xl md:text-2xl font-extrabold tracking-tight break-words">
              {r.courseName}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <Mini label="Teacher" value={r.teacher || "—"} />
              <Mini label="Aspirational" value={r.goal || "—"} accent />
              {r.prevLetter && (
                <Mini label="Previous" value={`${r.prevLetter} ${r.prevAvgDisplay}`} />
              )}
              <Mini label="Term Grade" value={`${r.letter} ${r.avgDisplay}`} accent />
            </div>
          </div>
          <ul className="space-y-1.5 text-sm">
            {r.bullets.map((b, i) => (
              <li key={i} className="leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">
                  B{i + 1} ({r.labels[i]}):
                </span>{" "}
                {b}
              </li>
            ))}
          </ul>
          {r.trendCaption && (
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              {r.trendCaption}
              {r.trendDelta != null
                ? ` (Δ = ${r.trendDelta >= 0 ? "+" : ""}${r.trendDelta.toFixed(1)} pts)`
                : ""}
            </p>
          )}
        </Card>
      ))}

      {report.signatureDataUrl && (
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Signature</div>
          <img
            src={report.signatureDataUrl}
            alt="Saved signature"
            className="h-16 bg-white rounded border"
          />
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="space-y-1 min-w-0">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>
      <div
        className={`inline-flex items-center justify-center gap-2 h-8 w-full rounded-md border text-sm font-semibold truncate px-2 ${
          accent ? "bg-primary/10 border-primary/30" : "bg-muted/40"
        }`}
      >
        {value}
      </div>
    </div>
  );
}