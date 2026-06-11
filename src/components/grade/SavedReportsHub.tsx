import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Archive, Trash2 } from "lucide-react";
import {
  listSavedReports,
  deleteSavedReport,
  formatSavedDate,
  SAVED_REPORTS_EVT,
  SAVED_REPORTS_MAX,
  type SavedReport,
} from "@/lib/saved-reports";
import { SavedReportFidelity } from "./SavedReportView";

export function SavedReportsHub() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [active, setActive] = useState<SavedReport | null>(null);

  useEffect(() => {
    const refresh = () => setReports(listSavedReports());
    refresh();
    window.addEventListener(SAVED_REPORTS_EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SAVED_REPORTS_EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-lg">Saved Reports Hub</h2>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {reports.length} / {SAVED_REPORTS_MAX} local slots used
        </div>
      </Card>

      {reports.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No saved reports yet. Generate a report card and tap{" "}
          <span className="font-medium text-foreground">Save Report to History Hub</span>{" "}
          to archive it here.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {reports.map((r) => {
            const top = r.rows[0];
            return (
              <Card
                key={r.id}
                className="p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 animate-fade-in"
                onClick={() => setActive(r)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {formatSavedDate(r.createdAt).slice(0, 10)}
                  </div>
                  <button
                    aria-label="Delete saved report"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedReport(r.id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="font-bold text-base leading-tight truncate">
                  {top?.courseName ?? "Report"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.rows.length} subject{r.rows.length === 1 ? "" : "s"} · {r.termLabel}
                </p>
                {top && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {top.bullets[0]}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Archived Report Card</DialogTitle>
          </DialogHeader>
          {active && (
            <SavedReportFidelity
              report={active}
              onDelete={() => {
                deleteSavedReport(active.id);
                setActive(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}