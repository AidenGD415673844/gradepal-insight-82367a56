import { useEffect, useMemo, useRef, useState } from "react";
import katex from "katex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bold,
  Italic,
  Underline,
  Code as CodeIcon,
  ListChecks,
  Image as ImageIcon,
  Sigma,
} from "lucide-react";
import { updateNote, type NotebookNote } from "@/lib/notebook-store";
import { toast } from "sonner";

/** Compile every $...$ and $$...$$ in `src` into KaTeX HTML. */
function compileLatex(src: string): string {
  if (!src) return "";
  // Escape <, >, & so plain text renders safely; KaTeX output is already HTML.
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Block math
  let out = src.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => {
    try {
      return `<div class="katex-block my-2">${katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch {
      return `<code>${escape(expr)}</code>`;
    }
  });
  // Inline math
  out = out.replace(/\$([^\$\n]+?)\$/g, (_m, expr) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${escape(expr)}</code>`;
    }
  });
  return out;
}

export function NotebookEditor({ note }: { note: NotebookNote }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = useState(note.title);
  const [html, setHtml] = useState(note.html);
  const [showMathPreview, setShowMathPreview] = useState(true);

  // Hydrate editor when switching notes
  useEffect(() => {
    setTitle(note.title);
    setHtml(note.html);
    if (editorRef.current && editorRef.current.innerHTML !== note.html) {
      editorRef.current.innerHTML = note.html || "";
    }
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced autosave
  useEffect(() => {
    const id = setTimeout(() => {
      if (title !== note.title || html !== note.html) {
        updateNote(note.id, { title, html });
      }
    }, 400);
    return () => clearTimeout(id);
  }, [title, html, note.id, note.title, note.html]);

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    setHtml(editorRef.current?.innerHTML ?? "");
  };

  const insertChecklist = () => {
    exec("insertHTML", `<ul class="checklist"><li>☐&nbsp;Task</li></ul>`);
  };

  const insertMath = () => {
    exec("insertText", " $E = mc^2$ ");
  };

  const onPasteOrDrop = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      if (file.size > 2_500_000) {
        toast.error(`"${file.name}" exceeds 2.5 MB — keep media small for localStorage.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        const tag = isImage
          ? `<img src="${url}" alt="${file.name}" class="max-w-full rounded-md my-2" />`
          : isVideo
            ? `<video src="${url}" controls class="max-w-full rounded-md my-2"></video>`
            : `<a href="${url}" download="${file.name}">${file.name}</a>`;
        exec("insertHTML", tag);
      };
      reader.readAsDataURL(file);
    });
  };

  const preview = useMemo(() => compileLatex(html), [html]);

  return (
    <div className="space-y-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title…"
        className="text-base font-bold h-10"
      />
      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/30 p-1.5">
        <ToolbarBtn onClick={() => exec("bold")} title="Bold (⌘B)"><Bold className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="Italic (⌘I)"><Italic className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Underline (⌘U)"><Underline className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("formatBlock", "pre")} title="Code block"><CodeIcon className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={insertChecklist} title="Checklist"><ListChecks className="h-3.5 w-3.5" /></ToolbarBtn>
        <ToolbarBtn onClick={insertMath} title="Insert math"><Sigma className="h-3.5 w-3.5" /></ToolbarBtn>
        <label className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-background cursor-pointer" title="Insert image/video">
          <ImageIcon className="h-3.5 w-3.5" />
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => onPasteOrDrop(e.target.files)}
          />
        </label>
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          <button
            type="button"
            onClick={() => setShowMathPreview((v) => !v)}
            className="px-2 h-6 rounded-md border bg-background hover:bg-muted"
          >
            {showMathPreview ? "Hide preview" : "Show preview"}
          </button>
        </div>
      </div>

      <div className={`grid gap-3 ${showMathPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
        <div
          ref={editorRef}
          className="min-h-[400px] rounded-xl border bg-card p-4 text-sm leading-relaxed prose prose-sm max-w-none focus:outline-none focus:ring-2 focus:ring-primary/40"
          contentEditable
          suppressContentEditableWarning
          onInput={() => setHtml(editorRef.current?.innerHTML ?? "")}
          onDrop={(e) => {
            e.preventDefault();
            onPasteOrDrop(e.dataTransfer.files);
          }}
          onDragOver={(e) => e.preventDefault()}
          onPaste={(e) => {
            if (e.clipboardData?.files?.length) {
              e.preventDefault();
              onPasteOrDrop(e.clipboardData.files);
            }
          }}
          data-placeholder="Start writing… wrap math in $...$ for inline or $$...$$ for block."
        />
        {showMathPreview && (
          <div className="min-h-[400px] rounded-xl border bg-background p-4 overflow-auto">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Sigma className="h-3 w-3" /> Compiled preview
            </div>
            <div
              className="text-sm leading-relaxed prose prose-sm max-w-none"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: preview || "<span class='text-muted-foreground'>Live KaTeX preview appears here.</span>" }}
            />
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Saved locally to your device · Images embedded as base64 inside this note · KaTeX compiles `$x^2$` or `$$\\int$$` in the preview pane.
      </p>
    </div>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClick} title={title}>
      {children}
    </Button>
  );
}