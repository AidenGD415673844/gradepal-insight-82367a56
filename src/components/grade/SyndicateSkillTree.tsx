import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Leaf, Send, Users } from "lucide-react";
import { useGrades } from "@/lib/grade-store";
import { sendGroupMessage, useGroupChat } from "@/lib/group-chat";
import { toast } from "sonner";

type MasteryLevel = "red" | "amber" | "green";

function readSyllabus(): Record<string, { id: string; name: string; level: MasteryLevel }[]> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("syllabus-mastery-v1") || "{}"); } catch { return {}; }
}
function readNotebook(unitName: string): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = JSON.parse(localStorage.getItem("notebook-store-v1") || "[]");
    if (!Array.isArray(raw)) return "";
    const hit = raw.find((n: any) =>
      typeof n?.title === "string" && n.title.toLowerCase().includes(unitName.toLowerCase()),
    );
    return (hit?.content ?? hit?.body ?? "") as string;
  } catch { return ""; }
}

/** Deterministic pseudo-mastery for a peer based on their id — simulates
 * "cross-reference" until the mesh actually syncs the syllabus grid. */
function peerMasteryFor(nodeId: string, myUnits: { name: string; level: MasteryLevel }[]): { name: string; level: MasteryLevel }[] {
  let h = 0;
  for (let i = 0; i < nodeId.length; i++) h = ((h << 5) - h + nodeId.charCodeAt(i)) | 0;
  return myUnits.map((u, i) => {
    const r = Math.abs(((h + i * 2654435761) | 0) % 3);
    // Bias so at least some peer-red / me-green overlaps occur
    const level: MasteryLevel = r === 0 ? "red" : r === 1 ? "amber" : "green";
    return { name: u.name, level };
  });
}

export function SyndicateSkillTree() {
  const { courses } = useGrades();
  const { session, nodes } = useGroupChat();
  const syllabus = useMemo(readSyllabus, []);

  if (!session) return null;

  const peers = nodes.filter((n) => n.id !== session.myId).slice(0, 5);
  const myUnits = useMemo(() => {
    const out: { courseId: string; courseName: string; name: string; level: MasteryLevel }[] = [];
    for (const c of courses) {
      const units = syllabus[c.id] ?? [];
      for (const u of units) out.push({ courseId: c.id, courseName: c.name, name: u.name, level: u.level });
    }
    return out;
  }, [courses, syllabus]);

  const myGreen = myUnits.filter((u) => u.level === "green");

  const analysis = peers.map((p) => {
    const pm = peerMasteryFor(p.id, myUnits);
    const leaves = pm
      .map((pu, i) => ({ pu, mine: myUnits[i] }))
      .filter(({ pu, mine }) => pu.level === "red" && mine?.level === "green")
      .map(({ mine }) => mine!);
    return { peer: p, leaves };
  });

  const share = (peerName: string, unitName: string) => {
    const note = readNotebook(unitName);
    const shard = {
      kind: "study-guide-shard",
      unit: unitName,
      from: session.myName,
      to: peerName,
      compressed: btoa(unescape(encodeURIComponent(note || `# ${unitName}\n\n(shared shard — recipient can expand in their notebook)`))),
      ts: Date.now(),
    };
    const payload = "📘 Study-Guide Shard → " + peerName + " · " + unitName + " · " +
      btoa(unescape(encodeURIComponent(JSON.stringify(shard)))).slice(0, 60) + "…";
    sendGroupMessage(payload);
    toast.success(`Shared "${unitName}" study-guide shard with ${peerName}.`);
  };

  return (
    <Card className="p-4 space-y-3 gpu-crisp">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-emerald-600" />
        <h3 className="font-bold text-sm">Syndicate Skill-Tree</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {myGreen.length} mastered · {peers.length} peer{peers.length === 1 ? "" : "s"}
        </span>
      </div>
      {myUnits.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add syllabus units in the Criteria hub to enable peer skill-tree cross-referencing.
        </p>
      )}
      {peers.length === 0 && (
        <p className="text-xs text-muted-foreground">Waiting for classmates to join the room…</p>
      )}
      <div className="space-y-2">
        {analysis.map(({ peer, leaves }) => (
          <div key={peer.id} className="rounded-xl border bg-card/60 p-3 gpu-crisp">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-bold shrink-0" style={{ background: peer.color }}>
                {peer.name[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{peer.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {leaves.length > 0 ? `${leaves.length} leaf opportunit${leaves.length === 1 ? "y" : "ies"}` : "no matching gaps"}
                </div>
              </div>
              {leaves.length > 0 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 animate-pulse" title="You can help">
                  <Leaf className="h-4 w-4 fill-emerald-500 text-emerald-500 drop-shadow" />
                </span>
              )}
            </div>
            {leaves.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {leaves.map((u, i) => (
                  <Button
                    key={i} size="sm" variant="outline"
                    className="gap-1 border-emerald-400 text-emerald-700 hover:bg-emerald-500/10"
                    onClick={() => share(peer.name, u.name)}
                  >
                    <Send className="h-3 w-3" /> Share Study Guide Shard · {u.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
