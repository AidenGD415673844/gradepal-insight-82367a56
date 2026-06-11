import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, X } from "lucide-react";
import { applyCurve, type CurveKind } from "@/lib/curve";
import { applyAStarOverride } from "./a-star-override";
import { getLetter } from "@/lib/grade-utils";
import type { GradeScaleRow } from "@/lib/grade-store";

/**
 * Curve toggle + math engine — only renders when the original score is
 * strictly below 71%. All evaluation is local; nothing is persisted.
 */
export function CurveSimulator({
  score,
  scale,
}: {
  score: number;
  scale: GradeScaleRow[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<CurveKind>("sqrt");
  const [bump, setBump] = useState(5);
  const [m, setM] = useState(1);
  const [c, setC] = useState(5);
  const [expr, setExpr] = useState("x + 5");

  if (score >= 71) return null;

  let curved = score;
  let exprError: string | null = null;
  try {
    curved =
      kind === "sqrt"
        ? applyCurve(score, { kind: "sqrt" })
        : kind === "bump"
          ? applyCurve(score, { kind: "bump", points: bump })
          : kind === "linear"
            ? applyCurve(score, { kind: "linear", m, c })
            : applyCurve(score, { kind: "formula", expr });
  } catch {
    exprError = "Invalid formula";
    curved = score;
  }

  const origLetter = applyAStarOverride(score, getLetter(score, scale)?.letter ?? "—");
  const curvedLetter = applyAStarOverride(curved, getLetter(curved, scale)?.letter ?? "—");

  return (
    <Card className="p-4 shadow-soft border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-semibold">Curve Simulation</span>
          <span className="text-xs text-muted-foreground">
            unlocked (score &lt; 71%)
          </span>
        </div>
        <Button
          size="sm"
          variant={open ? "default" : "outline"}
          onClick={() => setOpen((v) => !v)}
          className="gap-2"
        >
          {open ? <X className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          {open ? "Hide" : "Try a curve"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-3 items-start">
            <Select value={kind} onValueChange={(v) => setKind(v as CurveKind)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sqrt">Square Root (√x · 10)</SelectItem>
                <SelectItem value="bump">Flat Point Bump (+X)</SelectItem>
                <SelectItem value="linear">Linear Scale (mx + c)</SelectItem>
                <SelectItem value="formula">Custom Formula</SelectItem>
              </SelectContent>
            </Select>

            <div className="min-w-0">
              {kind === "bump" && (
                <div className="space-y-2">
                  <Label className="text-xs">Bump: +{bump} points</Label>
                  <Slider
                    value={[bump]}
                    min={1}
                    max={20}
                    step={1}
                    onValueChange={(v) => setBump(v[0])}
                  />
                </div>
              )}
              {kind === "linear" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">m (multiplier)</Label>
                    <Input
                      type="number"
                      step="0.05"
                      value={m}
                      onChange={(e) => setM(Number(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">c (constant)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={c}
                      onChange={(e) => setC(Number(e.target.value) || 0)}
                      className="h-8"
                    />
                  </div>
                </div>
              )}
              {kind === "formula" && (
                <div>
                  <Label className="text-xs">Formula (use x)</Label>
                  <Input
                    value={expr}
                    onChange={(e) => setExpr(e.target.value)}
                    placeholder="e.g. x + 5  or  1.1 * x"
                    className="h-8 font-mono"
                  />
                  {exprError && (
                    <div className="text-[11px] text-destructive mt-1">{exprError}</div>
                  )}
                </div>
              )}
              {kind === "sqrt" && (
                <div className="text-xs text-muted-foreground">
                  Classic professor curve: <code>√score × 10</code>.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm border-t pt-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Original
              </div>
              <div className="font-bold tabular-nums">
                {score.toFixed(1)}% · {origLetter}
              </div>
            </div>
            <div className="text-muted-foreground">→</div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-700">
                Curved
              </div>
              <div className="font-bold tabular-nums text-emerald-700">
                {curved.toFixed(1)}% · {curvedLetter}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}