import { useEffect, useState } from "react";

// =============================================================================
// Academic Notebook Vault — 100% client-side hierarchical folder tree.
// Persisted as a flat node list with parentId pointers; nesting is rebuilt at
// read time. Notes carry HTML (rich-text) including inline base64 media.
// =============================================================================

export type NotebookFolder = {
  id: string;
  name: string;
  color?: string; // accent hex (matches subject theme if user picks one)
  parentId: string | null;
  createdAt: number;
};

export type NotebookNote = {
  id: string;
  folderId: string;
  title: string;
  html: string; // rich-text body; inline <img src="data:..."> ok
  updatedAt: number;
};

export type NotebookState = {
  folders: NotebookFolder[];
  notes: NotebookNote[];
};

const K = "gradecalc_notebook_v1";
const EVT = "gradecalc-notebook-change";

const DEFAULT: NotebookState = {
  folders: [
    { id: "f-root", name: "My Notebook", parentId: null, createdAt: Date.now(), color: "#6e3ad6" },
  ],
  notes: [],
};

function read(): NotebookState {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(K);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as NotebookState;
    if (!parsed.folders?.length) return DEFAULT;
    return parsed;
  } catch {
    return DEFAULT;
  }
}
function write(s: NotebookState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(EVT));
}

const uid = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function getNotebook(): NotebookState {
  return read();
}

export function addFolder(name: string, parentId: string | null, color?: string): NotebookFolder {
  const s = read();
  const f: NotebookFolder = { id: uid("f"), name: name.trim() || "Untitled", parentId, color, createdAt: Date.now() };
  write({ ...s, folders: [...s.folders, f] });
  return f;
}
export function renameFolder(id: string, name: string) {
  const s = read();
  write({ ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)) });
}
export function setFolderColor(id: string, color: string | undefined) {
  const s = read();
  write({ ...s, folders: s.folders.map((f) => (f.id === id ? { ...f, color } : f)) });
}
export function deleteFolder(id: string) {
  const s = read();
  // Recursive: collect all descendants
  const toDelete = new Set<string>([id]);
  let added = true;
  while (added) {
    added = false;
    for (const f of s.folders) {
      if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
        toDelete.add(f.id);
        added = true;
      }
    }
  }
  write({
    folders: s.folders.filter((f) => !toDelete.has(f.id)),
    notes: s.notes.filter((n) => !toDelete.has(n.folderId)),
  });
}

export function addNote(folderId: string, title = "Untitled note"): NotebookNote {
  const s = read();
  const n: NotebookNote = { id: uid("n"), folderId, title, html: "", updatedAt: Date.now() };
  write({ ...s, notes: [...s.notes, n] });
  return n;
}
export function updateNote(id: string, patch: Partial<Pick<NotebookNote, "title" | "html" | "folderId">>) {
  const s = read();
  write({
    ...s,
    notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
  });
}
export function deleteNote(id: string) {
  const s = read();
  write({ ...s, notes: s.notes.filter((n) => n.id !== id) });
}

/** Build folder tree from flat list. */
export type FolderNode = NotebookFolder & { children: FolderNode[]; noteCount: number };
export function buildTree(state: NotebookState): FolderNode[] {
  const map = new Map<string, FolderNode>();
  for (const f of state.folders) map.set(f.id, { ...f, children: [], noteCount: 0 });
  for (const n of state.notes) {
    const node = map.get(n.folderId);
    if (node) node.noteCount += 1;
  }
  const roots: FolderNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (xs: FolderNode[]) => {
    xs.sort((a, b) => a.name.localeCompare(b.name));
    xs.forEach((x) => sort(x.children));
  };
  sort(roots);
  return roots;
}

/** Serialize a folder + its descendants and notes for WebRTC payload. */
export function serializeFolder(folderId: string): string {
  const s = read();
  const ids = new Set<string>([folderId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of s.folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const slice = {
    folders: s.folders.filter((f) => ids.has(f.id)),
    notes: s.notes.filter((n) => ids.has(n.folderId)),
  };
  return JSON.stringify(slice);
}

export function useNotebook(): NotebookState {
  const [s, set] = useState<NotebookState>(DEFAULT);
  useEffect(() => {
    const sync = () => set(read());
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return s;
}