import { useGrades, type GradeScaleRow } from "@/lib/grade-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export function GradeScaleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { scale, setScale } = useGrades();

  const update = (id: string, patch: Partial<GradeScaleRow>) => {
    setScale(scale.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) => setScale(scale.filter((r) => r.id !== id));
  const add = () =>
    setScale([
      ...scale,
      {
        id: crypto.randomUUID(),
        min: 0,
        letter: "?",
        description: "New Grade",
        gpa: 0,
      },
    ]);

  const sorted = [...scale].sort((a, b) => b.min - a.min);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grade Scale</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Adjust thresholds, letter, description, and GPA points. Changes apply
          everywhere instantly.
        </p>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-[60px_70px_1fr_70px_36px] gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium px-2 py-1.5">
            <span>Min %</span>
            <span>Letter</span>
            <span>Description</span>
            <span>GPA</span>
            <span></span>
          </div>
          {sorted.map((r) => (
            <div key={r.id} className="grid grid-cols-[60px_70px_1fr_70px_36px] gap-2 items-center py-1">
              <Input
                type="number"
                value={r.min}
                onChange={(e) => update(r.id, { min: Number(e.target.value) })}
                className="h-9"
              />
              <Input
                value={r.letter}
                onChange={(e) => update(r.id, { letter: e.target.value })}
                className="h-9 font-semibold"
              />
              <Input
                value={r.description}
                onChange={(e) => update(r.id, { description: e.target.value })}
                className="h-9"
              />
              <Input
                type="number"
                step="0.1"
                value={r.gpa}
                onChange={(e) => update(r.id, { gpa: Number(e.target.value) })}
                className="h-9"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => remove(r.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <Button variant="outline" onClick={add} className="gap-2">
          <Plus className="h-4 w-4" /> Add Row
        </Button>
      </DialogContent>
    </Dialog>
  );
}
