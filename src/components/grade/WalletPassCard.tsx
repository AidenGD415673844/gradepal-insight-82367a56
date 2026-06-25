import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, IdCard } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";
import { getMyProfile } from "@/lib/peer-network";

/**
 * Digital Hardware ID Registry — renders a minimalist Syndicate ID Card
 * onto a <canvas>, exports as PNG (universal wallet-pass image) and
 * optionally as a .pkpass-style JSON manifest. 100% client-side.
 */
export function WalletPassCard() {
  const { courses, tasks, settings } = useGrades();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [name, setName] = useState("Student");
  const [tint, setTint] = useState("#3b82f6");

  // pull profile + grade stats
  const avg =
    courses.length === 0
      ? 0
      : courses.reduce((s, c) => s + calcAverage(tasks.filter((t) => t.courseId === c.id), settings.weighted), 0) / courses.length;
  const masteryPct = Math.max(0, Math.min(100, Math.round(avg)));

  useEffect(() => {
    try {
      const p = getMyProfile();
      if (p.name) setName(p.name);
      if (p.color) setTint(p.color);
    } catch { /* noop */ }
  }, []);

  // Render the card whenever inputs change
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 640, H = 360;
    c.width = W * dpr;
    c.height = H * dpr;
    c.style.width = W + "px";
    c.style.height = H + "px";
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    // bg gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, tint);
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // header bar
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, W, 56);
    // brand
    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px system-ui, -apple-system, sans-serif";
    ctx.fillText("GradePal · Syndicate ID", 24, 36);
    // avatar circle
    ctx.beginPath();
    ctx.arc(76, 168, 44, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = tint;
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText((name[0] || "?").toUpperCase(), 76, 170);
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    // student name
    ctx.fillStyle = "#fff";
    ctx.font = "bold 26px system-ui, sans-serif";
    ctx.fillText(name, 140, 156);
    ctx.font = "13px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Local-only academic identity · " + new Date().getFullYear(), 140, 178);
    // stats row
    const cellW = (W - 48) / 2;
    const drawCell = (x: number, y: number, label: string, value: string) => {
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(x, y, cellW, 84);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(label.toUpperCase(), x + 12, y + 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillText(value, x + 12, y + 58);
    };
    drawCell(24, 232, "Term Average", avg.toFixed(1) + "%");
    drawCell(24 + cellW + 8, 232, "Syllabus Mastery", masteryPct + "%");
    // footer
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText("Issued offline · No server identity transmission", 24, 344);
  }, [name, tint, avg, masteryPct]);

  const downloadPNG = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `syndicate-id-${name.replace(/\s+/g, "_").toLowerCase()}.png`;
    a.click();
  };

  const downloadPass = () => {
    // Minimal wallet-pass-style JSON manifest, compatible with generic
    // device wallet importers that consume passkit-shaped JSON.
    const manifest = {
      formatVersion: 1,
      passTypeIdentifier: "io.gradepal.syndicate-id",
      organizationName: "GradePal",
      serialNumber: "local-" + Math.random().toString(36).slice(2, 10),
      description: "Syndicate ID Card",
      logoText: "GradePal Syndicate ID",
      foregroundColor: "rgb(255,255,255)",
      backgroundColor: tint,
      generic: {
        primaryFields: [{ key: "name", label: "STUDENT", value: name }],
        secondaryFields: [
          { key: "avg", label: "TERM AVG", value: avg.toFixed(1) + "%" },
          { key: "mastery", label: "MASTERY", value: masteryPct + "%" },
        ],
        auxiliaryFields: [{ key: "issued", label: "ISSUED", value: new Date().toISOString().slice(0, 10) }],
      },
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/vnd.apple.pkpass+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `syndicate-id-${name.replace(/\s+/g, "_").toLowerCase()}.pkpass.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <IdCard className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Digital Hardware ID Registry</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Minimalist canvas-rendered Syndicate ID Card built from your profile name, theme tint and live term metrics.
        Export as a PNG for any device wallet, or download a passkit-shaped manifest for instant on-device identity review.
      </p>
      <div className="rounded-xl overflow-hidden border bg-muted/30 p-3 flex justify-center">
        <canvas ref={canvasRef} className="max-w-full rounded-lg shadow" />
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <Button onClick={downloadPNG} className="gap-2">
          <Download className="h-4 w-4" /> Download Card PNG
        </Button>
        <Button onClick={downloadPass} variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export Wallet Pass
        </Button>
      </div>
    </Card>
  );
}