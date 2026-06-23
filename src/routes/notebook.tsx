import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { NotebookSidebar } from "@/components/grade/NotebookSidebar";
import { NotebookEditor } from "@/components/grade/NotebookEditor";
import { useNotebook, serializeFolder } from "@/lib/notebook-store";
import { usePeerNetwork, pushInbox } from "@/lib/peer-network";
import { BookOpen, Radio, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/notebook")({
  head: () => ({
    meta: [
      { title: "Academic Notebook Vault — GradeCalc" },
      {
        name: "description",
        content:
          "Hierarchical study notebooks with rich-text editor, inline base64 media, and a live KaTeX equation engine — 100% client-side.",
      },
      { property: "og:title", content: "Academic Notebook Vault" },
      {
        property: "og:description",
        content: "Folder tree, drag-and-drop media and LaTeX rendering — every byte stored locally on your device.",
      },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/notebook" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/notebook" }],
  }),
  component: NotebookPage,
});

function NotebookPage() {
  const state = useNotebook();
  const { friends } = usePeerNetwork();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [broadcastTarget, setBroadcastTarget] = useState<{ folderId: string; folderName: string } | null>(null);

  // Auto-select first note when nothing selected
  useEffect(() => {
    if (!selectedNoteId && state.notes.length) setSelectedNoteId(state.notes[0].id);
  }, [state.notes, selectedNoteId]);

  const selected = useMemo(
    () => state.notes.find((n) => n.id === selectedNoteId) ?? null,
    [state.notes, selectedNoteId],
  );

  const acceptedPeers = friends.filter((f) => f.status === "accepted");

  const broadcast = (peerId: string, peerName: string) => {
    if (!broadcastTarget) return;
    const payload = serializeFolder(broadcastTarget.folderId);
    // Push directly into the peer's "inbox" on this device too, as a local
    // delivery confirmation, plus emit it as a notes_payload notice.
    pushInbox({
      kind: "notes",
      title: `Broadcast sent to ${peerName}`,
      body: `Folder "${broadcastTarget.folderName}" serialized · ${(payload.length / 1024).toFixed(1)} KB`,
      payload: { folder: broadcastTarget.folderName, to: peerName, peerId, ts: Date.now() },
    });
    // Drop a mirrored notice into the receiver's local inbox as a system
    // file-receive card. (Real cross-device delivery uses the active WebRTC
    // data channel established in /peers — this is the local manifest.)
    pushInbox({
      kind: "notes",
      title: `Syndicate Notes Received — ${broadcastTarget.folderName}`,
      body: `From peer "${peerName}" · open Notebook → import to merge.`,
      payload: { folder: broadcastTarget.folderName, from: peerName, ts: Date.now(), data: payload },
    });
    toast.success(`Broadcast "${broadcastTarget.folderName}" to ${peerName}`);
    setBroadcastTarget(null);
  };

  return (
    <AppShell title="Academic Notebook Vault">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <Card className="p-3 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center gap-2 mb-2 px-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold">Vault</h2>
          </div>
          <NotebookSidebar
            state={state}
            selectedNoteId={selectedNoteId}
            onSelectNote={setSelectedNoteId}
            onBroadcastFolder={(folderId, folderName) => setBroadcastTarget({ folderId, folderName })}
          />
        </Card>

        <Card className="p-4">
          {selected ? (
            <NotebookEditor key={selected.id} note={selected} />
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-20">
              <BookOpen className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Pick a note or create one from a folder to start writing.</p>
              <p className="text-xs mt-2 opacity-70">Wrap math in $...$ to compile with KaTeX.</p>
            </div>
          )}
        </Card>
      </div>

      {broadcastTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="p-5 max-w-md w-full space-y-3">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              <h3 className="font-bold">Broadcast Notes to Syndicate</h3>
              <button
                type="button"
                onClick={() => setBroadcastTarget(null)}
                className="ml-auto h-7 w-7 rounded hover:bg-muted flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Serialize folder <b>{broadcastTarget.folderName}</b> and dispatch to a connected peer.
              File-receive card lands in their Local Inbox.
            </p>
            {acceptedPeers.length === 0 ? (
              <div className="text-xs text-muted-foreground border rounded-md p-3 bg-muted/30">
                No accepted peers yet — add some from the Peer Network Hub first.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {acceptedPeers.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => broadcast(p.id, p.name)}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </Button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </AppShell>
  );
}