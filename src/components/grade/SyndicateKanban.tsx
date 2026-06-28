import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Trash2 } from "lucide-react";
import type { RTCPeerLink, RTCEnvelope } from "@/lib/webrtc-peer";

// =============================================================================
// Syndicate Shared Kanban — dual-profile P2P task board running entirely over
// an open WebRTC DataChannel. Every column move serializes the new array index
// coordinate and transmits a `kanban_move` envelope; the receiver applies the
// same transition with a smooth CSS transition so both viewports animate the
// card landing into its destination column at the same millisecond.
// =============================================================================

type Col = "todo" | "submitted" | "graded";
type Card = { id: string; label: string; column: Col; owner: string; order: number };

const COLS: { id: Col; title: string; tint: string }[] = [
  { id: "todo", title: "To-Do", tint: "from-sky-500/10 to-sky-500/0" },
  { id: "submitted", title: "Submitted", tint: "from-amber-500/10 to-amber-500/0" },
  { id: "graded", title: "Graded", tint: "from-emerald-500/10 to-emerald-500/0" },
];

const STORE = "gradecalc_syndicate_kanban_v1";
const uid = () => `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function loadCards(): Card[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; }
}
function saveCards(c: Card[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORE, JSON.stringify(c));
}

export function SyndicateKanban({
  link,
  meName,
  peerName,
  connected,
}: {
  link: RTCPeerLink | null;
  meName: string;
  peerName: string;
  connected: boolean;
}) {
  const [cards, setCards] = useState<Card[]>(() => loadCards());
  const [draftLabel, setDraftLabel] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [animatingId, setAnimatingId] = useState<string | null>(null);
  const linkRef = useRef(link);
  linkRef.current = link;

  // Persist locally on every change.
  useEffect(() => { saveCards(cards); }, [cards]);

  // Subscribe to incoming kanban envelopes.
  useEffect(() => {
    if (!link) return;
    const off = link.onMessage((env: RTCEnvelope) => {
      if (env.kind === "kanban_state") {
        setCards(env.cards);
      } else if (env.kind === "kanban_move") {
        setCards((cur) => applyMove(cur, env.cardId, env.column, env.order));
        setAnimatingId(env.cardId);
        window.setTimeout(() => setAnimatingId(null), 450);
      }
    });
    return off;
  }, [link]);

  // On connect, push our current snapshot so both ends start aligned.
  useEffect(() => {
    if (connected && link) {
      link.send({ kind: "kanban_state", from: meName, ts: Date.now(), cards });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const grouped = useMemo(() => {
    const m: Record<Col, Card[]> = { todo: [], submitted: [], graded: [] };
    for (const c of cards) m[c.column].push(c);
    for (const k of Object.keys(m) as Col[]) m[k].sort((a, b) => a.order - b.order);
    return m;
  }, [cards]);

  function broadcast(env: RTCEnvelope) {
    try { linkRef.current?.send(env); } catch { /* no-op */ }
  }

  function addCard() {
    const label = draftLabel.trim();
    if (!label) return;
    const order = (grouped.todo.at(-1)?.order ?? -1) + 1;
    const card: Card = { id: uid(), label, column: "todo", owner: meName, order };
    const next = [...cards, card];
    setCards(next);
    setDraftLabel("");
    broadcast({ kind: "kanban_state", from: meName, ts: Date.now(), cards: next });
  }

  function removeCard(id: string) {
    const next = cards.filter((c) => c.id !== id);
    setCards(next);
    broadcast({ kind: "kanban_state", from: meName, ts: Date.now(), cards: next });
  }

  function move(cardId: string, column: Col) {
    const target = (grouped[column].at(-1)?.order ?? -1) + 1;
    setCards((cur) => applyMove(cur, cardId, column, target));
    setAnimatingId(cardId);
    window.setTimeout(() => setAnimatingId(null), 450);
    broadcast({ kind: "kanban_move", from: meName, ts: Date.now(), cardId, column, order: target });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Syndicate Shared Kanban</h3>
        <Badge variant="outline" className="text-[10px] ml-1">{meName} ↔ {peerName}</Badge>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {connected ? "Live · synced over WebRTC" : "Offline · changes save locally and sync when channel opens"}
        </span>
      </div>
      <div className="flex gap-2 mb-3">
        <Input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCard()}
          placeholder="New task card label…"
          className="text-xs h-8"
        />
        <Button size="sm" onClick={addCard} disabled={!draftLabel.trim()} className="gap-1">
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {COLS.map((c) => (
          <div
            key={c.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dragId && move(dragId, c.id)}
            className={`rounded-lg border bg-gradient-to-b ${c.tint} p-2 min-h-[160px]`}
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {c.title} · {grouped[c.id].length}
            </div>
            <div className="space-y-1.5">
              {grouped[c.id].map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => setDragId(card.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`group rounded-md border bg-card p-2 text-[12px] cursor-grab active:cursor-grabbing shadow-sm transition-transform duration-300 ${
                    animatingId === card.id ? "scale-[1.04] ring-2 ring-primary/60" : ""
                  }`}
                  title={`Owner: ${card.owner}`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className="flex-1 truncate">{card.label}</span>
                    <button
                      type="button"
                      onClick={() => removeCard(card.id)}
                      className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-rose-500"
                      aria-label="Remove card"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{card.owner}</div>
                </div>
              ))}
              {grouped[c.id].length === 0 && (
                <p className="text-[10px] text-muted-foreground italic">Drop cards here</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function applyMove(cards: Card[], cardId: string, column: Col, order: number): Card[] {
  return cards.map((c) => (c.id === cardId ? { ...c, column, order } : c));
}