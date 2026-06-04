import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Archive, Save, RotateCcw, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  SNAPSHOT_EVT,
  SNAPSHOT_MAX,
  createSnapshot,
  deleteSnapshot,
  formatCreatedAt,
  formatSize,
  listSnapshots,
  renameSnapshot,
  restoreSnapshot,
  type Snapshot,
} from "@/lib/snapshots";

export function SnapshotManager() {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const sync = () => setSnaps(listSnapshots());
    sync();
    window.addEventListener(SNAPSHOT_EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SNAPSHOT_EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const full = snaps.length >= SNAPSHOT_MAX;

  const handleCreate = () => {
    const snap = createSnapshot(`Snapshot #${snaps.length + 1}`);
    if (!snap) {
      toast.error("Maximum storage capacity reached (15/15).");
      return;
    }
    toast.success(`Saved "${snap.name}"`);
  };

  const handleRestore = (s: Snapshot) => {
    if (
      window.confirm(
        "Are you sure you want to restore this snapshot? Your current active dashboard data will be overwritten.",
      )
    ) {
      restoreSnapshot(s.id);
    }
  };

  const handleDelete = (s: Snapshot) => {
    if (window.confirm(`Delete snapshot "${s.name}" permanently?`)) {
      deleteSnapshot(s.id);
    }
  };

  return (
    <Card className="p-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Data Backup &amp; Historical Snapshots</h2>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {snaps.length}/{SNAPSHOT_MAX}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Snapshots capture every locally-stored grade, subject, term, attendance row and
        report-card setting. They live only in this browser — nothing is sent anywhere.
      </p>

      <Button onClick={handleCreate} disabled={full} className="gap-2 mb-2">
        <Save className="h-4 w-4" /> Create Local Data Snapshot
      </Button>
      {full && (
        <div className="text-xs text-destructive mb-3">
          Maximum storage capacity reached (15/15). Please delete older snapshots to compile a
          new backup.
        </div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left py-2 px-3 font-medium">Name</th>
              <th className="text-left py-2 px-3 font-medium">Created</th>
              <th className="text-left py-2 px-3 font-medium">Size</th>
              <th className="text-right py-2 px-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {snaps.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-muted-foreground py-6">
                  No snapshots yet.
                </td>
              </tr>
            )}
            {snaps.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <tr key={s.id} className="border-t">
                  <td className="py-2 px-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="h-8"
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            renameSnapshot(s.id, draft || s.name);
                            setEditingId(null);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium truncate">{s.name}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingId(s.id);
                            setDraft(s.name);
                          }}
                          aria-label="Rename snapshot"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatCreatedAt(s.createdAt)}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground tabular-nums">
                    {formatSize(s.sizeBytes)}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7"
                        onClick={() => handleRestore(s)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-7 text-red-500 border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        onClick={() => handleDelete(s)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
