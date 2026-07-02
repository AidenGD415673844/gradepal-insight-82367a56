// =============================================================================
// Pro "Grade Velocity" Autopilot Slip-Correction Assistant.
//
// Watches the live task ledger. When a new score entry causes a negative
// velocity swing OR breaks an insulation buffer for a Pro user, slides open
// an interactive drawer with a step-by-step recovery directive computing the
// minimum baseline score the next two upcoming tasks in that category need
// to hold to reabsorb the shock.
//
// Zero servers — all math is derived from local tasks + scale in memory.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { useGrades, type Task } from "@/lib/grade-store";
import { computeVelocity } from "@/lib/grade-velocity";
import { calcAverage } from "@/lib/grade-utils";
import { isPro } from "@/lib/premium";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Compass, ShieldCheck, Rocket } from "lucide-react";

type Advisory = {
  courseName: string;
  category: string;
  droppedFrom: number;
  droppedTo: number;
  anchorPct: number;
  upcoming: Task[];
};

export function SlipCorrectionAssistant() {
  const { courses, tasks, settings, scale } = useGrades();
  const [open, setOpen] = useState(false);
  const [advisory, setAdvisory] = useState<Advisory | null>(null);
  const lastTaskIdRef = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isPro()) return;
    // Track the newest completed task by id. On first mount we snapshot the
    // current head so we only react to future entries.
    const completed = tasks.filter((t) => !t.pending).sort((a, b) => (a.date < b.date ? -1 : 1));
    const head = completed[completed.length - 1];
    if (!initialized.current) {
      lastTaskIdRef.current = head?.id ?? null;
      initialized.current = true;
      return;
    }
    if (!head || head.id === lastTaskIdRef.current) return;
    lastTaskIdRef.current = head.id;

    const course = courses.find((c) => c.id === head.courseId);
    if (!course) return;
    const courseTasks = tasks.filter((t) => t.courseId === course.id && !t.pending);
    if (courseTasks.length < 2) return;

    // Velocity direction check
    const priorTasks = courseTasks.filter((t) => t.id !== head.id);
    const priorVel = computeVelocity(priorTasks);
    const nextVel = computeVelocity(courseTasks);
    const priorAvg = calcAverage(priorTasks, settings.weighted);
    const nextAvg = calcAverage(courseTasks, settings.weighted);
    const brokenBuffer = priorAvg >= 80 && nextAvg < 80;
    const wentNegative = priorVel.direction !== "down" && nextVel.direction === "down";
    if (!brokenBuffer && !wentNegative) return;

    // Compute anchor score for the next 2 upcoming tasks in the same category.
    const upcoming = tasks
      .filter((t) => t.courseId === course.id && t.pending && t.category === head.category)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 2);
    const target = Math.max(nextAvg, 80); // aim to restore or hold buffer
    // Solve for x s.t. weighted new avg reaches target.
    const totW = courseTasks.reduce((s, t) => s + (t.weight || 1), 0);
    const sumW = courseTasks.reduce((s, t) => s + (t.score / t.maxScore) * 100 * (t.weight || 1), 0);
    const upW  = upcoming.reduce((s, t) => s + (t.weight || 1), 0) || Math.max(1, upcoming.length);
    const anchor = upcoming.length
      ? Math.max(0, Math.min(100, (target * (totW + upW) - sumW) / upW))
      : Math.max(0, Math.min(100, target));

    setAdvisory({
      courseName: course.name,
      category: head.category,
      droppedFrom: priorAvg,
      droppedTo: nextAvg,
      anchorPct: anchor,
      upcoming,
    });
    setOpen(true);
  }, [tasks, courses, settings.weighted, scale]);

  if (!advisory) return null;
  const delta = advisory.droppedTo - advisory.droppedFrom;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-hidden">
        <SheetHeader className="px-5 pt-5 pb-3 border-b bg-gradient-to-br from-amber-500/15 to-fuchsia-500/10">
          <SheetTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-amber-600" />
            Pro Autopilot Advisory
          </SheetTitle>
          <SheetDescription className="text-[11px]">
            Live slip-correction — computed instantly from your local grade ledger.
          </SheetDescription>
        </SheetHeader>
        <div className="p-5 space-y-4 overflow-y-auto h-[calc(100vh-9rem)]">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Trajectory variance drift</span>
            </div>
            <div className="text-sm">
              Your recent score entry in <span className="font-bold">{advisory.courseName}</span> caused a negative trajectory swing.
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
              <TrendingDown className="h-3 w-3" />
              {advisory.droppedFrom.toFixed(1)}% → {advisory.droppedTo.toFixed(1)}%
              <Badge variant="outline" className={delta < 0 ? "text-destructive border-destructive/40" : ""}>
                {delta >= 0 ? "+" : ""}{delta.toFixed(1)} pp
              </Badge>
            </div>
          </div>

          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary">Recovery directive</div>
            </div>
            <p className="text-sm leading-relaxed">
              To completely absorb this grade shock and fully protect your active insulation corridor,
              your next <span className="font-bold">{Math.max(1, advisory.upcoming.length)}</span> upcoming task{advisory.upcoming.length === 1 ? "" : "s"} inside
              the <span className="font-bold">{advisory.category}</span> block must hold a target anchor
              baseline score of at least <span className="font-bold text-primary">{advisory.anchorPct.toFixed(1)}%</span> over the next 14 operational days.
            </p>
            {advisory.upcoming.length > 0 && (
              <ul className="pt-1 space-y-1">
                {advisory.upcoming.map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-xs p-2 rounded bg-muted/40">
                    <span className="truncate">{t.name} <span className="text-muted-foreground">· {t.date}</span></span>
                    <span className="font-bold tabular-nums text-primary">≥{advisory.anchorPct.toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            )}
            {advisory.upcoming.length === 0 && (
              <p className="text-xs text-muted-foreground italic">
                No pending {advisory.category} tasks scheduled. Add one so autopilot can lock in a specific anchor mark.
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground italic leading-relaxed">
            Remember: one score doesn't define your capability. This is just the maths of the term — you've already
            adjusted before, and you can again. <Rocket className="inline h-3 w-3 text-fuchsia-500" />
          </p>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>Got it</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}