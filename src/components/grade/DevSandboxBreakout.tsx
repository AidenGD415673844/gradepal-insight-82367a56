// =============================================================================
// Dev Sandbox Breakout — hidden mini retro Breakout game embedded in the AI
// Analyser subtitle (double-click the brain icon to trigger). Zero deps,
// canvas + requestAnimationFrame, high-score persisted to localStorage.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gamepad2, RotateCcw } from "lucide-react";

const HS_KEY = "gradepal_breakout_hs";

export function DevSandboxBreakout({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<any>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"play" | "win" | "lose">("play");
  const [hs, setHs] = useState<number>(() => Number(localStorage.getItem(HS_KEY) || "0"));
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!open) return;
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const paddleW = 70, paddleH = 8;
    const s = {
      x: W/2, y: H - 30, dx: 3, dy: -3, r: 6,
      paddleX: (W - paddleW) / 2,
      bricks: [] as { x:number; y:number; w:number; h:number; alive: boolean }[],
      keys: { l: false, r: false },
      alive: true,
    };
    const cols = 8, rows = 4, bw = 42, bh = 14, gap = 4, offX = 8, offY = 20;
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      s.bricks.push({ x: offX + c*(bw+gap), y: offY + r*(bh+gap), w: bw, h: bh, alive: true });
    }
    stateRef.current = s;
    setScore(0); setStatus("play");

    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") s.keys.l = down;
      if (e.key === "ArrowRight") s.keys.r = down;
    };
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    const onMove = (e: MouseEvent) => {
      const rect = cv.getBoundingClientRect();
      s.paddleX = Math.max(0, Math.min(W - paddleW, e.clientX - rect.left - paddleW/2));
    };
    cv.addEventListener("mousemove", onMove);

    let raf = 0;
    const loop = () => {
      if (s.keys.l) s.paddleX = Math.max(0, s.paddleX - 6);
      if (s.keys.r) s.paddleX = Math.min(W - paddleW, s.paddleX + 6);
      s.x += s.dx; s.y += s.dy;
      if (s.x < s.r || s.x > W - s.r) s.dx *= -1;
      if (s.y < s.r) s.dy *= -1;
      // paddle
      if (s.y + s.r >= H - paddleH - 2 && s.x >= s.paddleX && s.x <= s.paddleX + paddleW && s.dy > 0) {
        s.dy *= -1;
        s.dx += ((s.x - (s.paddleX + paddleW/2)) / (paddleW/2)) * 1.4;
      }
      // floor
      if (s.y - s.r > H) { s.alive = false; setStatus("lose"); }
      // bricks
      let liveCount = 0;
      for (const b of s.bricks) {
        if (!b.alive) continue;
        liveCount++;
        if (s.x + s.r > b.x && s.x - s.r < b.x + b.w && s.y + s.r > b.y && s.y - s.r < b.y + b.h) {
          b.alive = false; s.dy *= -1;
          setScore((v) => v + 10);
        }
      }
      if (liveCount === 0) { s.alive = false; setStatus("win"); }

      ctx.clearRect(0, 0, W, H);
      // bricks
      for (const b of s.bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = `hsl(${(b.y*4)%360} 70% 55%)`;
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
      // paddle
      ctx.fillStyle = "hsl(260 80% 60%)";
      ctx.fillRect(s.paddleX, H - paddleH - 2, paddleW, paddleH);
      // ball
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = "hsl(320 90% 60%)"; ctx.fill();
      if (s.alive) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      cv.removeEventListener("mousemove", onMove);
    };
  }, [open, nonce]);

  useEffect(() => {
    if (status !== "play" && score > hs) {
      localStorage.setItem(HS_KEY, String(score));
      setHs(score);
    }
  }, [status, score, hs]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-primary" /> Dev Sandbox Breakout
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Secret stress-relief mode. Move with ← → or mouse. High score is stored locally.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg overflow-hidden border bg-black/90">
          <canvas ref={canvasRef} width={360} height={260} className="block w-full" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="tabular-nums">Score: <span className="font-bold text-primary">{score}</span></div>
          <div className="tabular-nums">High: <span className="font-bold">{hs}</span></div>
          <div className={status === "win" ? "text-success font-bold" : status === "lose" ? "text-destructive font-bold" : "text-muted-foreground"}>
            {status === "win" ? "You cleared it!" : status === "lose" ? "Game over" : "Playing"}
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setNonce((n) => n + 1)}>
            <RotateCcw className="h-3.5 w-3.5" /> Restart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}