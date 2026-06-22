import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Palette, Check, Sparkles } from "lucide-react";
import {
  THEME_META,
  useThemeProfile,
  setThemeProfile,
  getCardOpacity,
  setCardOpacity,
  type ThemeProfile,
} from "@/lib/theme-profiles";
import { useEffect, useState } from "react";

const ORDER: ThemeProfile[] = ["default", "managebac", "aero", "cyber", "eink"];

export function UIDesignStudio() {
  const [active] = useThemeProfile();
  const [opacity, setOpacity] = useState<number>(100);
  useEffect(() => setOpacity(getCardOpacity()), [active]);

  const meta = THEME_META[active];

  return (
    <Card className="p-5 max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center text-white shadow-soft">
          <Palette className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">GradePal UI Design Studio</h2>
          <p className="text-xs text-muted-foreground">
            Pick a premium design profile. Saves locally — affects every screen instantly.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ORDER.map((id) => {
          const m = THEME_META[id];
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setThemeProfile(id)}
              className={`group text-left rounded-2xl border p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                isActive ? "border-primary ring-2 ring-primary/40 shadow-md" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-bold text-sm">{m.label}</div>
                {isActive && (
                  <Badge className="bg-primary text-primary-foreground gap-1 text-[10px]">
                    <Check className="h-3 w-3" /> Active
                  </Badge>
                )}
              </div>
              <div className="flex gap-1.5 mb-2">
                {m.swatch.map((c, i) => (
                  <span
                    key={i}
                    className="h-7 flex-1 rounded-md border border-border/40 shadow-inner"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{m.blurb}</p>
            </button>
          );
        })}
      </div>

      {meta.supportsOpacity && (
        <div className="rounded-xl border p-3 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Card translucency
            </span>
            <span className="tabular-nums text-muted-foreground">{opacity}%</span>
          </div>
          <Slider
            value={[opacity]}
            min={30}
            max={100}
            step={5}
            onValueChange={(v) => {
              setOpacity(v[0]);
              setCardOpacity(v[0]);
            }}
          />
        </div>
      )}

      {/* Live preview */}
      <div className="rounded-xl border p-4 bg-background space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Live preview</div>
        <div className="rounded-xl border bg-card p-4 shadow-soft">
          <div className="font-bold text-sm mb-1">Sample card</div>
          <p className="text-xs text-muted-foreground mb-3">
            Body copy renders against the active theme tokens.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Primary</Button>
            <Button size="sm" variant="outline">Outline</Button>
            <Badge>Badge</Badge>
            <Badge variant="secondary">Secondary</Badge>
          </div>
          <svg viewBox="0 0 200 40" className="w-full h-10 mt-3">
            <polyline
              points="0,30 25,22 50,28 75,15 100,18 125,8 150,12 175,4 200,10"
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2"
            />
          </svg>
        </div>
      </div>
    </Card>
  );
}