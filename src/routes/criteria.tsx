import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTeacherMode } from "@/lib/teacher-auth";
import {
  ALLOWED_GRADES,
  type AllowedGrade,
  addCriterion,
  removeCriterion,
  toggleGrade,
  updateCriterion,
  useCriteriaList,
} from "@/lib/criteria-store";
import { Plus, Trash2, Save, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

export const Route = createFileRoute("/criteria")({
  head: () => ({
    meta: [
      { title: "Criteria — GradeCalc" },
      {
        name: "description",
        content:
          "Browse assessment criteria. Teachers can create criteria, add descriptions, and attach grades from A* through NA.",
      },
    ],
  }),
  component: CriteriaPage,
});

function CriteriaPage() {
  const { unlocked } = useTeacherMode();
  const list = useCriteriaList();

  return (
    <AppShell title="Assessment Criteria">
      <div className="space-y-4">
        <Card className="p-4 flex items-start gap-3">
          <div className="flex-1 text-sm text-muted-foreground">
            {unlocked ? (
              <>You are in <strong>teacher mode</strong> — add, edit, or delete criteria and their grade chips.</>
            ) : (
              <>
                Read-only view. Teachers can edit criteria after unlocking the{" "}
                <Link to="/teacher" className="text-primary underline">Teacher Gradebook</Link>.
              </>
            )}
          </div>
          {!unlocked && (
            <Link
              to="/teacher"
              className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input px-3 py-1.5 hover:bg-accent"
            >
              <Lock className="h-3.5 w-3.5" /> Teacher login
            </Link>
          )}
        </Card>

        {unlocked && <CriterionCreator />}

        {list.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No criteria yet.{" "}
            {unlocked ? "Add the first one above." : "Ask your teacher to add criteria."}
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
  criterion: ReturnType<typeof useCriteriaList>[number];
  editable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(criterion.title);
  const [desc, setDesc] = useState(criterion.description);

  const handleSave = () => {
    updateCriterion(criterion.id, { title: title.trim(), description: desc.trim() });
    setEditing(false);
    toast.success("Saved.");
  };

  const handleDelete = () => {
    if (!confirm(`Delete "${criterion.title}"?`)) return;
    removeCriterion(criterion.id);
  };

  return (
    <Card className="p-4 md:p-5 space-y-3">
      {editing ? (
        <>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={1000} />
        </>
      ) : (
        <>
          <h3 className="text-base md:text-lg font-bold">{criterion.title}</h3>
          {criterion.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {criterion.description}
            </p>
          ) : (
            <p className="text-xs italic text-muted-foreground">No description provided.</p>
          )}
        </>
      )}

      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-muted-foreground">
          Grades {editable && <span className="font-normal">(tap to add/remove)</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ALLOWED_GRADES.map((g) => {
            const active = criterion.grades.includes(g);
            if (!editable) {
              return active ? (
                <span
                  key={g}
                  className="min-w-[40px] px-2 h-8 inline-flex items-center justify-center rounded-md text-xs font-bold tabular-nums bg-success text-success-foreground border border-success"
                >
                  {g}
                </span>
              ) : null;
            }
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
          {!editable && criterion.grades.length === 0 && (
            <span className="text-xs italic text-muted-foreground">No grades attached.</span>
          )}
        </div>
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
            <Button onClick={() => setEditing(true)} size="sm" variant="outline">
              Edit
            </Button>
          )}
          <Button
            onClick={handleDelete}
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}

      <p className="text-[11px] italic text-muted-foreground">
        Last updated {new Date(criterion.updatedAt).toLocaleString()}
      </p>
    </Card>
  );
}