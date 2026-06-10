import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload } from "lucide-react";

function snapshotAll(): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    out[k] = localStorage.getItem(k) ?? "";
  }
  return out;
}

export function BackupRestore() {
  const [drag, setDrag] = useState(false);
  const [msg, setMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const blob = new Blob(
      [JSON.stringify({ app: "gradecalc", version: 1, data: snapshotAll() }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gradecalc_master_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function ingest(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (parsed?.app !== "gradecalc" || typeof parsed.data !== "object") {
        setMsg("Invalid backup file.");
        return;
      }
      for (const [k, v] of Object.entries(parsed.data as Record<string, string>)) {
        localStorage.setItem(k, v);
      }
      setMsg("Restore complete — reloading…");
      setTimeout(() => window.location.reload(), 500);
    } catch {
      setMsg("Could not parse backup file.");
    }
  }

  return (
    <Card className="p-4 md:p-5">
      <h3 className="text-sm font-semibold mb-2">State Time-Machine Backup</h3>
      <div className="flex flex-wrap gap-2 mb-3">
        <Button onClick={handleExport} className="gap-2"><Download className="h-4 w-4" /> Export Master System Backup</Button>
        <Button variant="outline" onClick={() => inputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" /> Choose backup file…</Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) ingest(f); }}
        />
      </div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) ingest(f);
        }}
        className={`rounded-md border-2 border-dashed p-6 text-center text-xs transition-colors ${drag ? "border-primary bg-primary/5" : "border-muted-foreground/30"}`}
      >
        Drag &amp; drop <code>gradecalc_master_backup.json</code> here to restore.
      </div>
      {msg && <p className="text-xs mt-2 text-muted-foreground">{msg}</p>}
    </Card>
  );
}