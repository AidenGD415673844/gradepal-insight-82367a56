import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, X, BookHeart } from "lucide-react";
import { commitJourney, markRefocusSeen, useJourney, useRefocusTrigger } from "@/lib/academic-journey";
import { toast } from "sonner";

export function RefocusShard({ tasks }: { tasks: any[] }) {
  const trigger = useRefocusTrigger(tasks);
  const journey = useJourney();
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  if (!trigger) {
    if (journey.length === 0) return null;
    return <JourneyTimeline entries={journey} />;
  }

  const commit = () => {
    if (!a.trim() || !b.trim()) {
      toast.error("Add both proud-of moments before committing.");
      return;
    }
    commitJourney({ weekKey: new Date().toISOString().slice(0, 10), proudA: a.trim(), proudB: b.trim(), triggerTitle: trigger.title });
    markRefocusSeen(trigger.title);
    setA(""); setB("");
    toast.success("Shard committed to your Academic Journey.");
  };

  return (
    <div className="space-y-3">
      <Card
        className="relative p-5 border-white/40 gpu-crisp overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.10) 60%, rgba(59,130,246,0.15))",
          backdropFilter: "blur(14px) saturate(140%)",
        }}
      >
        <button
          type="button"
          className="absolute top-3 right-3 rounded-full h-7 w-7 grid place-items-center hover:bg-white/40"
          onClick={() => markRefocusSeen(trigger.title)}
          aria-label="Dismiss shard"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <h3 className="text-base font-extrabold">The Refocus Shard</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          "{trigger.title}" just wrapped. Before you look at the score, capture two things you're
          genuinely proud of learning this week — separate from any letter grade.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
              1 · Something I learned or improved at
            </label>
            <Textarea value={a} onChange={(e) => setA(e.target.value)} rows={3} placeholder="e.g. Finally understood integration by parts."
              className="mt-1 bg-white/60 dark:bg-black/20 border-white/40" />
          </div>
          <div>
            <label className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">
              2 · A habit or effort I'm proud of
            </label>
            <Textarea value={b} onChange={(e) => setB(e.target.value)} rows={3} placeholder="e.g. Kept a study block every night despite fatigue."
              className="mt-1 bg-white/60 dark:bg-black/20 border-white/40" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Button onClick={commit} className="gap-1 bg-violet-600 hover:bg-violet-700 text-white">
            <Heart className="h-4 w-4" /> Commit Shard to Journey
          </Button>
          <span className="text-[11px] text-muted-foreground">Saved locally — never sent to a server.</span>
        </div>
      </Card>
      {journey.length > 0 && <JourneyTimeline entries={journey} />}
    </div>
  );
}

function JourneyTimeline({ entries }: { entries: ReturnType<typeof useJourney> }) {
  const last = entries[0];
  return (
    <Card className="p-5 gpu-crisp">
      <div className="flex items-center gap-2 mb-3">
        <BookHeart className="h-5 w-5 text-rose-500" />
        <h3 className="font-bold">My Academic Journey</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{entries.length} shard{entries.length === 1 ? "" : "s"}</span>
      </div>
      {last && (
        <div className="rounded-xl border bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 p-3 text-sm mb-3">
          <div className="font-bold text-emerald-700 dark:text-emerald-300 text-xs uppercase tracking-wider mb-1">
            Latest banner
          </div>
          This week's effort is already a victory. Your value is defined by your courage to learn,
          not the letter grade the school prints.
        </div>
      )}
      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border p-3 text-xs bg-card/60">
            <div className="text-[10px] text-muted-foreground mb-1">
              {new Date(e.ts).toLocaleDateString()} · {e.triggerTitle || "self-reflection"}
            </div>
            <div className="font-semibold">Learned:</div>
            <div className="text-muted-foreground mb-1">{e.proudA}</div>
            <div className="font-semibold">Effort:</div>
            <div className="text-muted-foreground">{e.proudB}</div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
