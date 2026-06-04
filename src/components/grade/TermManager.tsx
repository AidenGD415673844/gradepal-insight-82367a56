import { useState } from "react";
import { useGrades, type Term } from "@/lib/grade-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarRange, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_TERMS = 6;

export function TermManager() {
  const { terms, activeTermId, setTerms, setActiveTerm } = useGrades();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Term[]>(terms);

  const sync = () => setDraft(terms);

  const addTerm = () => {
    if (draft.length >= MAX_TERMS) {
      toast.error(`Maximum ${MAX_TERMS} terms`);
      return;
    }
    setDraft([
      ...draft,
      {
        id: crypto.randomUUID(),
        name: `Term ${draft.length + 1}`,
        start: new Date().toISOString().slice(0, 10),
        end: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      },
    ]);
  };

  const save = () => {
    setTerms(draft);
    toast.success("Terms saved");
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeTermId ?? "all"}
        onValueChange={(v) => setActiveTerm(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <CalendarRange className="h-4 w-4 mr-1" />
          <SelectValue placeholder="All terms" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All terms</SelectItem>
          {terms.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          sync();
          setOpen(true);
        }}
      >
        Manage
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Academic Terms (max {MAX_TERMS})</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {draft.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No terms yet. Add one to segment your school year.
              </p>
            )}
            {draft.map((t, i) => (
              <div key={t.id} className="grid grid-cols-12 gap-2 items-end border rounded-lg p-3">
                <div className="col-span-12">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={t.name}
                    maxLength={30}
                    onChange={(e) =>
                      setDraft(
                        draft.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="col-span-5">
                  <Label className="text-xs">Start</Label>
                  <Input
                    type="date"
                    value={t.start}
                    onChange={(e) =>
                      setDraft(
                        draft.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="col-span-5">
                  <Label className="text-xs">End</Label>
                  <Input
                    type="date"
                    value={t.end}
                    onChange={(e) =>
                      setDraft(
                        draft.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)),
                      )
                    }
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={addTerm} className="gap-2">
              <Plus className="h-4 w-4" /> Add term
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
