import { useState } from "react";
import {
  buildTree,
  addFolder,
  renameFolder,
  setFolderColor,
  deleteFolder,
  addNote,
  deleteNote,
  type FolderNode,
  type NotebookNote,
  type NotebookState,
} from "@/lib/notebook-store";
import { ChevronRight, ChevronDown, FolderPlus, FilePlus, Trash2, Palette, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGrades } from "@/lib/grade-store";

export function NotebookSidebar({
  state,
  selectedNoteId,
  onSelectNote,
  onBroadcastFolder,
}: {
  state: NotebookState;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onBroadcastFolder: (folderId: string, folderName: string) => void;
}) {
  const tree = buildTree(state);
  const rootFolderId =
    tree[0]?.id ?? state.folders[0]?.id ?? null;
  return (
    <div className="space-y-1">
      {/* Apple-Notes-style top toolbar — always visible, big tap targets */}
      <div className="flex items-center gap-1 mb-2 p-1.5 rounded-lg border bg-muted/30">
        <Button
          size="sm"
          variant="default"
          className="flex-1 gap-1.5 h-8"
          title="New note in first folder"
          onClick={() => {
            const target = rootFolderId ?? addFolder("Notes", null).id;
            const n = addNote(target);
            onSelectNote(n.id);
          }}
        >
          <FilePlus className="h-3.5 w-3.5" /> New Note
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          title="New root folder"
          onClick={() => addFolder("New Folder", null)}
        >
          <FolderPlus className="h-3.5 w-3.5" /> Folder
        </Button>
      </div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-1 mb-1">
        Folders
      </div>
      {tree.map((node) => (
        <FolderRow
          key={node.id}
          node={node}
          depth={0}
          state={state}
          selectedNoteId={selectedNoteId}
          onSelectNote={onSelectNote}
          onBroadcastFolder={onBroadcastFolder}
        />
      ))}
      {tree.length === 0 && (
        <p className="text-xs text-muted-foreground px-2 py-4 text-center">
          No folders yet — tap <b>+ Folder</b> above.
        </p>
      )}
    </div>
  );
}

function FolderRow({
  node,
  depth,
  state,
  selectedNoteId,
  onSelectNote,
  onBroadcastFolder,
}: {
  node: FolderNode;
  depth: number;
  state: NotebookState;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onBroadcastFolder: (folderId: string, folderName: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(node.name);
  const [colorOpen, setColorOpen] = useState(false);
  const { courses } = useGrades();
  const subjectColors = Array.from(new Set(courses.map((c) => c.color).filter(Boolean)));
  const notes = state.notes.filter((n) => n.folderId === node.id);

  const commitName = () => {
    if (name.trim() && name !== node.name) renameFolder(node.id, name.trim());
    setRenaming(false);
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md px-1 py-1 hover:bg-muted/40"
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="h-5 w-5 flex items-center justify-center text-muted-foreground"
          aria-label={open ? "Collapse folder" : "Expand folder"}
        >
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-md text-white shrink-0"
          style={{ background: node.color || "#6e3ad6" }}
        >
          <Folder className="h-3 w-3" />
        </span>
        {renaming ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setName(node.name);
                setRenaming(false);
              }
            }}
            className="h-6 text-xs"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={() => setRenaming(true)}
            className="flex-1 text-left truncate text-xs font-semibold"
            title="Double-click to rename"
          >
            {node.name}
            <span className="ml-1 text-[10px] text-muted-foreground font-normal">
              {node.noteCount > 0 ? `(${node.noteCount})` : ""}
            </span>
          </button>
        )}
        <div className="flex items-center gap-0.5 transition opacity-60 hover:opacity-100">
          <button
            type="button"
            title="New subfolder"
            onClick={() => addFolder("New Folder", node.id, node.color)}
            className="h-6 w-6 rounded hover:bg-muted/60 flex items-center justify-center"
          >
            <FolderPlus className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="New note"
            onClick={() => {
              const n = addNote(node.id);
              setOpen(true);
              onSelectNote(n.id);
            }}
            className="h-6 w-6 rounded hover:bg-muted/60 flex items-center justify-center"
          >
            <FilePlus className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Folder color"
            onClick={() => setColorOpen((v) => !v)}
            className="h-6 w-6 rounded hover:bg-muted/60 flex items-center justify-center"
          >
            <Palette className="h-3 w-3" />
          </button>
          <button
            type="button"
            title="Broadcast notes to syndicate"
            onClick={() => onBroadcastFolder(node.id, node.name)}
            className="h-6 px-1.5 rounded hover:bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider"
          >
            Cast
          </button>
          <button
              type="button"
              title="Delete folder and its notes"
              onClick={() => {
                if (confirm(`Delete "${node.name}" and all its contents?`)) deleteFolder(node.id);
              }}
              className="h-6 w-6 rounded hover:bg-rose-500/15 text-rose-500 flex items-center justify-center"
            >
              <Trash2 className="h-3 w-3" />
            </button>
        </div>
      </div>
      {colorOpen && (
        <div className="ml-8 mb-1 flex flex-wrap gap-1.5 p-2 rounded-md border bg-muted/30">
          {[
            "#6e3ad6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
            "#ec4899", "#8b5cf6", "#06b6d4", "#64748b", ...subjectColors,
          ].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setFolderColor(node.id, c);
                setColorOpen(false);
              }}
              className="h-5 w-5 rounded-md border border-border/40"
              style={{ background: c }}
              title={c}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              setFolderColor(node.id, undefined);
              setColorOpen(false);
            }}
            className="h-5 px-1.5 text-[10px] rounded-md border bg-background hover:bg-muted"
          >
            Clear
          </button>
        </div>
      )}
      {open && (
        <>
          {notes.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              depth={depth + 1}
              active={n.id === selectedNoteId}
              onSelect={() => onSelectNote(n.id)}
            />
          ))}
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              depth={depth + 1}
              state={state}
              selectedNoteId={selectedNoteId}
              onSelectNote={onSelectNote}
              onBroadcastFolder={onBroadcastFolder}
            />
          ))}
        </>
      )}
    </div>
  );
}

function NoteRow({
  note,
  depth,
  active,
  onSelect,
}: {
  note: NotebookNote;
  depth: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`group flex items-center gap-1 rounded-md py-1 pr-1 cursor-pointer transition ${
        active ? "bg-primary/15 text-primary" : "hover:bg-muted/40"
      }`}
      style={{ paddingLeft: 8 + depth * 12 }}
      onClick={onSelect}
    >
      <span className="text-xs flex-1 truncate">{note.title || "Untitled note"}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Delete this note?")) deleteNote(note.id);
        }}
        className="h-5 w-5 rounded hover:bg-rose-500/15 text-rose-500 flex items-center justify-center opacity-60 hover:opacity-100"
        title="Delete note"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}