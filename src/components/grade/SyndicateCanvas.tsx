import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";
import type { Peer } from "@/lib/peer-network";

/**
 * Interactive peer graph overlay — center hub is the active student, orbs are
 * up to 4 connected peers. Line length scales with similarity delta computed
 * from the 10-bullet report matrix (cosine distance + GPA delta).
 */
export function SyndicateCanvas({
  meName,
  meBullets,
  meColor,
  peers,
}: {
  meName: string;
  meBullets: number[];
  meColor: string;
  peers: Peer[];
}) {
  const top = peers.slice(0, 4);
  const [hover, setHover] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const W = 600;
    const H = 360;
    const cx = W / 2;
    const cy = H / 2;
    return top.map((p, i) => {
      const sim = similarity(meBullets, p.bullets);
      // sim ∈ [0, 1]; map to distance 80..240 (closer when more similar)
      const dist = 240 - sim * 160;
      const angle = (i / Math.max(top.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return {
        peer: p,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        sim,
        dist,
      };
    });
  }, [top, meBullets]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Network className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Syndicate Canvas Matrix</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">
          {top.length} of 4 peer slots
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">
        Center node = you · Line length contracts with data similarity · Pulse rate scales with alignment.
      </p>
      <div className="rounded-xl border bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.08),_transparent_60%)] overflow-hidden">
        <svg viewBox="0 0 600 360" className="w-full h-auto">
          <defs>
            <radialGradient id="hubGlow">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Edges */}
          {nodes.map((n) => (
            <line
              key={`edge-${n.peer.id}`}
              x1={300}
              y1={180}
              x2={n.x}
              y2={n.y}
              stroke={n.peer.color || "#94a3b8"}
              strokeWidth={hover === n.peer.id ? 2.5 : 1.5}
              strokeOpacity={0.55 + n.sim * 0.35}
              style={{
                animation: `syndicate-pulse ${Math.max(1.5, 4 - n.sim * 3)}s ease-in-out infinite`,
              }}
            />
          ))}
          {/* Hub glow */}
          <circle cx={300} cy={180} r={48} fill="url(#hubGlow)" />
          {/* Hub node */}
          <circle cx={300} cy={180} r={22} fill={meColor || "#3b82f6"} stroke="#fff" strokeWidth={2} />
          <text x={300} y={184} textAnchor="middle" fontSize={11} fontWeight="700" fill="#fff">
            {(meName?.[0] ?? "Y").toUpperCase()}
          </text>
          <text x={300} y={220} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.65}>
            {meName} (you)
          </text>
          {/* Peer orbs */}
          {nodes.map((n) => (
            <g
              key={`orb-${n.peer.id}`}
              onMouseEnter={() => setHover(n.peer.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={n.x} cy={n.y} r={hover === n.peer.id ? 22 : 18} fill={n.peer.color || "#64748b"} stroke="#fff" strokeWidth={1.5} />
              <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="#fff">
                {(n.peer.name?.[0] ?? "?").toUpperCase()}
              </text>
              <text x={n.x} y={n.y + 34} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.7}>
                {n.peer.name}
              </text>
              <text x={n.x} y={n.y - 24} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.55}>
                {Math.round(n.sim * 100)}% aligned
              </text>
            </g>
          ))}
          {top.length === 0 && (
            <text x={300} y={300} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.5}>
              No accepted peers yet — add some to populate the canvas.
            </text>
          )}
        </svg>
      </div>
      <style>{`
        @keyframes syndicate-pulse {
          0%, 100% { stroke-opacity: 0.35; }
          50%      { stroke-opacity: 0.95; }
        }
      `}</style>
    </Card>
  );
}

function similarity(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  const cos = dot / (Math.sqrt(na) * Math.sqrt(nb));
  return Math.max(0, Math.min(1, cos));
}