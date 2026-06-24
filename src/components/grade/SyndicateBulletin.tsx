import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone } from "lucide-react";
import { usePeerNetwork, getMyMilestone, setMyMilestone, type Peer } from "@/lib/peer-network";
import { toast } from "sonner";

export function SyndicateBulletin() {
  const { friends } = usePeerNetwork();
  const [text, setText] = useState("");

  useEffect(() => { setText(getMyMilestone()); }, []);

  const accepted = friends.filter((f: Peer) => f.status === "accepted" && (f as Peer & { milestone?: string }).milestone);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="h-5 w-5 text-fuchsia-500" />
        <h2 className="text-base font-bold">Syndicate Bulletin Board</h2>
        <Badge variant="outline" className="ml-auto text-[10px]">{accepted.length} bulletin{accepted.length === 1 ? "" : "s"}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Broadcast a 120-character academic milestone target. It rides inside your base64 connection token — peers see it the moment they import you.
      </p>
      <div className="flex gap-2 mb-1">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 120))}
          placeholder="e.g. Aiming for 90% in Math by mid-term"
          maxLength={120}
        />
        <Button
          size="sm"
          onClick={() => {
            setMyMilestone(text.trim());
            toast.success("Bulletin updated — copy your token to re-share.");
          }}
        >
          Save
        </Button>
      </div>
      <div className="text-[10px] text-muted-foreground mb-3 text-right">{text.length}/120</div>

      <div className="space-y-2">
        {accepted.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No peer milestones yet — once a friend imports your token (with a bulletin set), their target appears here.</p>
        ) : (
          accepted.map((p) => (
            <div key={p.id} className="rounded-lg border bg-muted/30 p-3 flex items-start gap-3">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: p.color || "#3b82f6" }}
              >
                {p.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{p.name}</div>
                <div className="text-xs text-muted-foreground italic">
                  "{(p as Peer & { milestone?: string }).milestone}"
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}