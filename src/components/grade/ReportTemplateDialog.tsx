import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Palette, Upload, X } from "lucide-react";
import {
  LANG_OPTIONS,
  TEMPLATE_OPTIONS,
  useReportTemplate,
  type TemplateId,
  type LangId,
} from "@/lib/report-template";

export function ReportTemplateDialog() {
  const [t, update] = useReportTemplate();
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogo = (file: File) => {
    if (file.size > 500_000) return;
    const reader = new FileReader();
    reader.onload = () => update({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Palette className="h-4 w-4" /> Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report Card Templates &amp; Branding</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section>
            <Label className="text-sm font-semibold">Layout</Label>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {TEMPLATE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => update({ template: opt.id as TemplateId })}
                  className={`text-left rounded-lg border p-3 transition ${
                    t.template === opt.id
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="text-sm font-bold">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.hint}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <Label className="text-sm font-semibold">Language</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANG_OPTIONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => update({ lang: l.id as LangId })}
                  className={`px-3 h-9 rounded-md border text-sm font-medium ${
                    t.lang === l.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">School / Institution</Label>
              <Input
                value={t.schoolName}
                onChange={(e) => update({ schoolName: e.target.value })}
                placeholder="e.g. Lincoln High School"
              />
            </div>
            <div>
              <Label className="text-xs">Accent color</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={t.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={t.accent}
                  onChange={(e) => update({ accent: e.target.value })}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Font family</Label>
              <div className="flex gap-2">
                {(["system", "serif", "mono"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => update({ font: f })}
                    className={`flex-1 h-9 rounded-md border text-xs font-medium capitalize ${
                      t.font === f ? "border-primary bg-primary/10" : "border-border"
                    }`}
                    style={{
                      fontFamily:
                        f === "serif" ? "Georgia, serif" : f === "mono" ? "monospace" : "inherit",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">School logo (≤500KB)</Label>
              <div className="flex gap-2 items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-3 w-3" /> Upload
                </Button>
                {t.logoDataUrl && (
                  <>
                    <img
                      src={t.logoDataUrl}
                      alt="logo"
                      className="h-9 w-9 object-contain border rounded"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => update({ logoDataUrl: null })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleLogo(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}