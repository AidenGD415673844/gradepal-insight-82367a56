import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { setUnlocked, useTeacherMode } from "@/lib/teacher-auth";
import {
  ALLOWED_GRADES,
  type AllowedGrade,
  type Criterion,
  addCriterion,
  removeCriterion,
  seedPresetCriteriaOnce,
  setAssignedGrade,
  setGradeDescription,
  toggleGrade,
  updateCriterion,
  useCriteriaList,
} from "@/lib/criteria-store";
import { Plus, Trash2, Save, Lock, LogOut, BadgeCheck, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/criteria")({
  head: () => ({
    meta: [
      { title: "Criteria — GradeCalc" },
      {
        name: "description",
        content:
          "Browse assessment criteria and per-grade descriptors. Teachers can create, edit, and delete criteria (presets included).",
      },
    ],
  }),
  component: CriteriaPage,
});

function CriteriaPage() {
  const { unlocked } = useTeacherMode();
  const list = useCriteriaList();
  const [mounted, setMounted] = useState(false);

  // Seed the four preset criteria on first visit so students always
  // have something to read even if no teacher has signed in yet.
  useEffect(() => {
    seedPresetCriteriaOnce();
    setMounted(true);
  }, []);

  const handleExitTeacherMode = () => {
    setUnlocked(false);
    toast.success("Exited teacher mode.");
  };

  return (
    <AppShell title="Assessment Criteria">
      <div className="space-y-4">
        <Card className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            {unlocked ? (
              <>
                You are in <strong>teacher mode</strong> — add, edit, or delete
                criteria, attach grades, and write per-grade descriptors.
              </>
            ) : (
              <>
                Read-only view. Teachers can edit criteria after unlocking the{" "}
                <Link to="/teacher" className="text-primary underline">
                  Teacher Gradebook
                </Link>
                .
              </>
            )}
          </div>
          {unlocked ? (
            <Button
              onClick={handleExitTeacherMode}
              size="sm"
              variant="outline"
              className="gap-1.5 self-start sm:self-auto"
            >
              <LogOut className="h-3.5 w-3.5" /> Exit teacher mode
            </Button>
          ) : (
            <Link
              to="/teacher"
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input px-3 py-1.5 hover:bg-accent self-start sm:self-auto"
            >
              <Lock className="h-3.5 w-3.5" /> Teacher login
            </Link>
          )}
        </Card>

        {unlocked && <CriterionCreator />}

        {!mounted ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Loading criteria…
          </Card>
        ) : list.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No criteria yet.{" "}
            {unlocked
              ? "Add the first one above."
              : "Ask your teacher to add criteria."}
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((c) => (
              <CriterionCard key={c.id} criterion={c} editable={unlocked} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function CriterionCreator() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const handleAdd = () => {
    if (!title.trim()) {
      toast.error("Give the criterion a title.");
      return;
    }
    addCriterion({ title, description: desc, grades: [] });
    setTitle("");
    setDesc("");
    toast.success("Criterion added.");
  };
  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-sm font-semibold">Create new criterion</h2>
      <Input
        placeholder="Criterion title (e.g. Criterion A — Knowing & Understanding)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
      />
      <Textarea
        placeholder="Description — what does this criterion assess?"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={3}
        maxLength={1000}
      />
      <Button onClick={handleAdd} className="gap-1.5 w-full sm:w-auto">
        <Plus className="h-4 w-4" /> Add criterion
      </Button>
    </Card>
  );
}

function CriterionCard({
  criterion,
  editable,
}: {
  criterion: Criterion;
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(criterion.title);
  const [desc, setDesc] = useState(criterion.description);

  const handleSave = () => {
    updateCriterion(criterion.id, {
      title: title.trim(),
      description: desc.trim(),
    });
    setEditing(false);
    toast.success("Saved.");
  };

  const handleDelete = () => {
    if (
      !confirm(
        criterion.preset
          ? `Delete preset "${criterion.title}"? This won't restore automatically.`
          : `Delete "${criterion.title}"?`,
      )
    )
      return;
    removeCriterion(criterion.id);
  };

  return (
    <Card className="p-4 md:p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        ) : (
          <h3 className="text-base md:text-lg font-bold flex items-center gap-2">
            {criterion.title}
            {criterion.preset && (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <BadgeCheck className="h-3 w-3" /> Preset
              </span>
            )}
          </h3>
        )}
      </div>

      {/* Teacher-assigned grade — prominent for students, editable for teachers. */}
      {criterion.assignedGrade && !editable && (
        <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2">
          <Award className="h-4 w-4 text-success" />
          <span className="text-xs font-medium text-muted-foreground">
            Your grade:
          </span>
          <span className="min-w-[40px] px-2 h-7 inline-flex items-center justify-center rounded-md text-sm font-bold tabular-nums bg-success text-success-foreground">
            {criterion.assignedGrade}
          </span>
          {(() => {
            const entry = criterion.grades.find(
              (g) => g.letter === criterion.assignedGrade,
            );
            return entry?.description ? (
              <span className="text-xs text-foreground/80 line-clamp-2">
                {entry.description}
              </span>
            ) : null;
          })()}
        </div>
      )}

      {editable && criterion.grades.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 p-2">
          <Award className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Assign student grade:
          </span>
          {criterion.grades.map((g) => {
            const active = criterion.assignedGrade === g.letter;
            return (
              <button
                key={g.letter}
                type="button"
                onClick={() =>
                  setAssignedGrade(criterion.id, active ? null : g.letter)
                }
                className={`min-w-[36px] px-2 h-7 rounded-md text-xs font-bold tabular-nums border transition-all ${
                  active
                    ? "bg-success text-success-foreground border-success shadow-sm"
                    : "bg-card hover:bg-muted border-border"
                }`}
              >
                {g.letter}
              </button>
            );
          })}
          {criterion.assignedGrade && (
            <button
              type="button"
              onClick={() => setAssignedGrade(criterion.id, null)}
              className="text-[11px] text-muted-foreground underline hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {editing ? (
        <Textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          maxLength={1000}
        />
      ) : criterion.description ? (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {criterion.description}
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground">
          No description provided.
        </p>
      )}

      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">
          Grades{" "}
          {editable && (
            <span className="font-normal">(tap to add/remove)</span>
          )}
        </div>

        {/* Pickable grade chips — teachers only. */}
        {editable && (
          <div className="flex flex-wrap gap-1.5">
            {ALLOWED_GRADES.map((g) => {
              const active = criterion.grades.some((e) => e.letter === g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGrade(criterion.id, g as AllowedGrade)}
                  className={`min-w-[40px] px-2 h-8 rounded-md text-xs font-bold tabular-nums border transition-all ${
                    active
                      ? "bg-success text-success-foreground border-success shadow-sm"
                      : "bg-card hover:bg-muted border-border"
                  }`}
                >
                  {g}
                </button>
              );
            })}
          </div>
        )}

        {/* Per-grade descriptors — editable for teachers, read-only for students. */}
        {criterion.grades.length > 0 ? (
          <div className="space-y-2 pt-1">
            {criterion.grades.map((entry) => (
              <GradeRow
                key={entry.letter}
                criterionId={criterion.id}
                entry={entry}
                editable={editable}
              />
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            {editable
              ? "No grades attached yet — tap a chip above to add one."
              : "No grades attached."}
          </p>
        )}
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2 pt-1">
          {editing ? (
            <>
              <Button onClick={handleSave} size="sm" className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button
                onClick={() => {
                  setTitle(criterion.title);
                  setDesc(criterion.description);
                  setEditing(false);
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setEditing(true)}
              size="sm"
              variant="outline"
            >
              Edit
            </Button>
          )}
          <Button
            onClick={handleDelete}
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />{" "}
            {criterion.preset ? "Delete preset" : "Delete"}
          </Button>
        </div>
      )}

      <p className="text-[11px] italic text-muted-foreground">
        Last updated {new Date(criterion.updatedAt).toLocaleString()}
      </p>
    </Card>
  );
}

function GradeRow({
  criterionId,
  entry,
  editable,
}: {
  criterionId: string;
  entry: { letter: AllowedGrade; description: string };
  editable: boolean;
}) {
  const [value, setValue] = useState(entry.description);
  useEffect(() => setValue(entry.description), [entry.description]);

  const commit = () => {
    if (value !== entry.description) {
      setGradeDescription(criterionId, entry.letter, value);
    }
  };

  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-card/50 p-2">
      <span className="min-w-[40px] px-2 h-8 inline-flex items-center justify-center rounded-md text-xs font-bold tabular-nums bg-success text-success-foreground border border-success shrink-0">
        {entry.letter}
      </span>
      {editable ? (
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          placeholder={`What does ${entry.letter} look like?`}
          rows={2}
          maxLength={500}
          className="text-sm"
        />
      ) : (
        <div className="flex-1 text-sm">
          {entry.description ? (
            <span className="text-foreground whitespace-pre-wrap">
              {entry.description}
            </span>
          ) : (
            <span className="italic text-muted-foreground">
              No description provided.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
