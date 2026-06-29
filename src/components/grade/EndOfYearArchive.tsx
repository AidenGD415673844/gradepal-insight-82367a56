// =============================================================================
// End-of-Year Academic Transition modal + Academic Time Capsule timeline.
// Mounted globally via AppShell; auto-prompts during the Jun20–Aug31 window.
// =============================================================================
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  shouldPromptRollover,
  dismissRolloverPrompt,
  executeYearRollover,
  useArchives,
  summariseArchive,
  deleteArchive,
  PRESERVED_KEYS,
} from "@/lib/year-archive";
import { Archive, CalendarClock, Eye, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export function EndOfYearArchive() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);
  const archives = useArchives();

  useEffect(() => {
    if (shouldPromptRollover()) {
      const id = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(id);
    }
  }, []);

  const confirmRollover = () => {
    const entry = executeYearRollover();
    toast.success(`Archived ${entry.year} — fresh slate ready for next term.`);
    setOpen(false);
  };

  const dismiss = () => {
    dismissRolloverPrompt();
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => (!v ? dismiss() : setOpen(v))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              End-of-Year Academic Transition Detected
            </DialogTitle>
            <DialogDescription>
              The calendar has crossed the summer break threshold. Archive the
              current academic year into an immutable time capsule, then start
              the next term with a clean slate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="font-bold mb-1">Will be cleared after archiving:</div>
              Courses · grades · syllabus mastery dots · Kanban cards · weekly review digests.
            </div>
            <div className="rounded-lg border bg-success/5 border-success/30 p-3">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-success" /> Preserved through reset:
              </div>
              Saved Reports · Peer Network Hub · WebRTC tokens · chat backlogs ·
              PIN/teacher locks · wallet balance · active tier.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={dismiss}>Remind me later</Button>
            <Button onClick={confirmRollover} className="gap-2">
              <Archive className="h-4 w-4" /> Archive &amp; Start Fresh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview != null && (
        <ArchivePreview
          year={preview}
          onClose={() => setPreview(null)}
          archives={archives}
        />
      )}

      {/* Settings-mounted Time Capsule timeline lives in TimeCapsulePanel below */}
    </>
  );
}

export function TimeCapsulePanel() {
  const archives = useArchives();
  const [preview, setPreview] = useState<number | null>(null);

  return (
    <Card className="p-5 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Archive className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Academic Time Capsule</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Read-only museum view of every archived academic year. Reports and peer
        history below are <span className="font-semibold text-foreground">never</span> wiped on rollover.
      </p>
      {archives.length === 0 ? (
        <div className="text-xs text-muted-foreground italic rounded-lg border border-dashed p-4 text-center">
          No archives yet — the End-of-Year engine arms during the late-June rollover window.
        </div>
      ) : (
        <div className="relative pl-6">
          <div className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
          {archives.map((a) => {
            const s = summariseArchive(a);
            return (
              <div key={a.year} className="relative mb-3">
                <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
                <div className="rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <div className="text-sm font-bold tabular-nums">{a.year}–{a.year + 1}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Archived {new Date(a.archivedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">{s.courses} subjects</Badge>
                      <Badge variant="outline" className="text-[10px]">{s.tasks} tasks</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => setPreview(a.year)}>
                      <Eye className="h-3.5 w-3.5" /> Open museum view
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px] gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete archive ${a.year}–${a.year + 1}? Cannot be undone.`)) {
                          deleteArchive(a.year);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <details className="mt-3 text-[10px] text-muted-foreground">
        <summary className="cursor-pointer">Preserved keys ({PRESERVED_KEYS.length})</summary>
        <div className="mt-1 font-mono leading-relaxed break-words">{PRESERVED_KEYS.join(" · ")}</div>
      </details>
      {preview != null && (
        <ArchivePreview year={preview} archives={archives} onClose={() => setPreview(null)} />
      )}
    </Card>
  );
}

function ArchivePreview({
  year,
  archives,
  onClose,
}: {
  year: number;
  archives: ReturnType<typeof useArchives>;
  onClose: () => void;
}) {
  const entry = archives.find((a) => a.year === year);
  if (!entry) return null;
  const courses = (entry.payload["gradecalc_courses"] as { id: string; name: string }[] | undefined) ?? [];
  const tasks = (entry.payload["gradecalc_tasks"] as { id: string; courseId: string; name: string; score: number; maxScore: number; date: string }[] | undefined) ?? [];
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Museum view — {year}–{year + 1}
          </DialogTitle>
          <DialogDescription>Read-only. Edits here are not possible.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-3">
          {courses.length === 0 && (
            <div className="text-xs text-muted-foreground italic">No subjects captured in this archive.</div>
          )}
          {courses.map((c) => {
            const ct = tasks.filter((t) => t.courseId === c.id);
            return (
              <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="font-bold text-sm flex items-center justify-between">
                  {c.name}
                  <Badge variant="outline" className="text-[10px]">{ct.length} tasks</Badge>
                </div>
                {ct.slice(0, 8).map((t) => (
                  <div key={t.id} className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {t.date} · {t.name} → {((t.score / Math.max(1, t.maxScore)) * 100).toFixed(1)}%
                  </div>
                ))}
                {ct.length > 8 && (
                  <div className="text-[10px] text-muted-foreground italic mt-1">+ {ct.length - 8} more</div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}