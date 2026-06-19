import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";
import {
  usePeerNetwork,
  encodeToken,
  acceptToken,
  updatePeerStatus,
  removePeer,
  setMyProfile,
  getChat,
  sendMessage,
  type Peer,
  type ChatMsg,
} from "@/lib/peer-network";
import {
  Users,
  Copy,
  Plus,
  Eye,
  EyeOff,
  Check,
  CheckCheck,
  Send,
  Ban,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  CalendarClock,
  Radio,
  Activity,
  Trophy,
  LogOut,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { RTCPeerLink, type RTCHealth, type RTCEnvelope } from "@/lib/webrtc-peer";
import {
  useGroupChat,
  initGroupAsHost,
  joinGroupAsMember,
  hostAddMemberByToken,
  buildMemberToken,
  sendGroupMessage,
  leaveGroup,
} from "@/lib/group-chat";

export const Route = createFileRoute("/peers")({
  head: () => ({
    meta: [
      { title: "Peer Network Hub — GradeCalc" },
      { name: "description", content: "Decentralised peer connections via base64 tokens, FIFO chat queues and academic sync grids — fully client-side." },
      { property: "og:title", content: "Peer Network Hub — GradeCalc" },
      { property: "og:description", content: "Decentralised peer connections via base64 tokens, FIFO chat queues and academic sync grids — fully client-side." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/peers" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/peers" }],
  }),
  component: PeersPage,
});

function PeersPage() {
  const { courses, tasks, settings } = useGrades();
  const { me, friends } = usePeerNetwork();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meName, setMeName] = useState(me.name);

  // Sync my profile with grade data each render
  useEffect(() => {
    const subjects = courses.map((c) => ({
      name: c.name,
      avg: calcAverage(tasks.filter((t) => t.courseId === c.id), settings.weighted),
    }));
    const bullets = subjects.slice(0, 10).map((s) => s.avg);
    setMyProfile({ name: meName || "You", subjects, bullets });
  }, [courses, tasks, settings.weighted, meName]);

  const token = useMemo(() => encodeToken({ ...me, name: meName, subjects: me.subjects, bullets: me.bullets }), [me, meName]);

  const selected = friends.find((f) => f.id === selectedId && f.status === "accepted") || null;

  return (
    <AppShell title="Peer Network Hub">
      {selected ? (
        <AcademicSync
          peer={selected}
          onBack={() => setSelectedId(null)}
          mySubjects={me.subjects}
          myName={meName || "You"}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MyTokenCard token={token} meName={meName} setMeName={setMeName} />
          <AddPeerCard />
          <div className="lg:col-span-2">
            <PeerList
              friends={friends}
              onOpen={(id) => setSelectedId(id)}
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <WebRTCHandshakeCard />
            <GroupChatHub
              me={{ id: me.id, name: meName || "You", color: me.color, bullets: me.bullets }}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

// =============== My Token Card ===============
function MyTokenCard({ token, meName, setMeName }: { token: string; meName: string; setMeName: (s: string) => void }) {
  return (
    <Card className="p-5 backdrop-blur-md bg-card/80 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-emerald-500" />
        <h2 className="text-base font-bold">My Connection Token</h2>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">Display name</label>
        <Input value={meName} onChange={(e) => setMeName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="mt-3 space-y-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Base64-encoded profile (name, theme, 10-bullet averages)
        </label>
        <Textarea readOnly value={token} className="font-mono text-[10px] h-28 resize-none" />
        <Button
          onClick={() => {
            navigator.clipboard.writeText(token);
            toast.success("Token copied to clipboard");
          }}
          className="w-full gap-2"
        >
          <Copy className="h-4 w-4" /> Copy Token
        </Button>
      </div>
    </Card>
  );
}

// =============== Add Peer Card ===============
function AddPeerCard() {
  const [input, setInput] = useState("");
  return (
    <Card className="p-5 backdrop-blur-md bg-card/80 shadow-[0_4px_30px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 mb-3">
        <Plus className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold">Add Peer via Token</h2>
      </div>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste your friend's base64 connection token here..."
        className="font-mono text-[10px] h-28 resize-none"
      />
      <Button
        className="w-full mt-3 gap-2"
        onClick={() => {
          const result = acceptToken(input);
          if (!result.ok) {
            toast.error(result.reason || "Failed to add peer");
            return;
          }
          toast.success(`Peer ${result.peer?.name} added — status: ${result.peer?.status}`);
          setInput("");
        }}
      >
        <ShieldCheck className="h-4 w-4" /> Establish Peer Connection
      </Button>
    </Card>
  );
}

// =============== Peer List ===============
function PeerList({ friends, onOpen }: { friends: Peer[]; onOpen: (id: string) => void }) {
  const pending = friends.filter((f) => f.status === "pending");
  const accepted = friends.filter((f) => f.status === "accepted");
  const blocked = friends.filter((f) => f.status === "blocked");

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return `Last online: Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold">Peer Network</h2>
        <span className="text-xs text-muted-foreground ml-auto">{accepted.length} accepted</span>
      </div>

      {pending.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pending Requests</div>
          <div className="space-y-2">
            {pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar peer={p} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">Incoming connection request</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => updatePeerStatus(p.id, "accepted")} className="gap-1">
                    <Check className="h-3.5 w-3.5" /> Accept Connection Request
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => removePeer(p.id)}>
                    Decline/Discard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Accepted Peers</div>
      {accepted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No accepted peers yet. Paste a token above to connect.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {accepted.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card/60 p-3 hover:shadow-md transition">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar peer={p} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">{fmt(p.lastOnline)}</div>
                  <ConnectionHealthMeter peerId={p.id} />
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" onClick={() => onOpen(p.id)}>Open</Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Block/Remove Peer"
                  aria-label="Block or remove peer"
                  onClick={() => updatePeerStatus(p.id, "blocked")}
                >
                  <Ban className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {blocked.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Blocked</div>
          <div className="flex flex-wrap gap-2">
            {blocked.map((p) => (
              <Badge key={p.id} variant="outline" className="text-rose-500 border-rose-500/40">
                {p.name}
                <button className="ml-2 underline" onClick={() => removePeer(p.id)}>remove</button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function Avatar({ peer }: { peer: { name: string; color: string } }) {
  const initial = peer.name?.[0]?.toUpperCase() || "?";
  return (
    <div
      className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
      style={{ background: peer.color || "#3b82f6" }}
    >
      {initial}
    </div>
  );
}

// =============== Academic Sync (per peer) ===============
function AcademicSync({
  peer,
  onBack,
  mySubjects,
  myName,
}: {
  peer: Peer;
  onBack: () => void;
  mySubjects: { name: string; avg: number }[];
  myName: string;
}) {
  const [stealth, setStealth] = useState(false);
  const displayName = stealth ? "[Peer Alpha]" : peer.name;
  const myDisplayName = stealth ? "[Peer Beta]" : myName;

  // Sync grid — merge by subject name
  const rows = useMemo(() => {
    const map = new Map<string, { mine?: number; theirs?: number }>();
    for (const s of mySubjects) map.set(s.name, { mine: s.avg });
    for (const s of peer.subjects) {
      const e = map.get(s.name) || {};
      e.theirs = s.avg;
      map.set(s.name, e);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, mine: v.mine, theirs: v.theirs }));
  }, [mySubjects, peer.subjects]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h2 className="text-base font-bold">Academic Sync Analytics</h2>
        <div className={`ml-auto flex items-center gap-2 ${stealth ? "blur-sm select-none" : ""}`}>
          <Avatar peer={peer} />
          <div>
            <div className="font-semibold text-sm">{displayName}</div>
            <div className="text-[11px] text-muted-foreground">vs {myDisplayName}</div>
          </div>
        </div>
        <Button
          variant={stealth ? "default" : "outline"}
          size="sm"
          className="gap-1"
          onClick={() => setStealth((s) => !s)}
          title="Stealth Blur Toggler"
        >
          {stealth ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {stealth ? "Stealth On" : "Stealth Off"}
        </Button>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-4">
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-bold text-sm mb-3">Sync Data Grid</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left py-2">Subject</th>
                    <th className="text-right py-2">{myDisplayName}</th>
                    <th className="text-right py-2">{displayName}</th>
                    <th className="text-right py-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.name} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-right tabular-nums">{r.mine != null ? r.mine.toFixed(1) + "%" : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{r.theirs != null ? r.theirs.toFixed(1) + "%" : "—"}</td>
                      <td className="py-2 text-right">
                        <DeltaPill mine={r.mine} theirs={r.theirs} />
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No comparable subjects.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <StudyBlockPlanner peerId={peer.id} peerName={displayName} />
        </div>

        <ChatCanvas peerId={peer.id} peerName={displayName} />
      </div>
    </div>
  );
}

function DeltaPill({ mine, theirs }: { mine?: number; theirs?: number }) {
  if (mine == null || theirs == null) return <span className="text-muted-foreground">—</span>;
  const delta = mine - theirs;
  const abs = Math.abs(delta).toFixed(1);
  if (delta > 0)
    return <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold">+{abs}% above peer average</span>;
  if (delta >= -3)
    return <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold">-{abs}% under peer target</span>;
  return <span className="inline-flex items-center rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[11px] font-semibold">-{abs}% under peer target</span>;
}

// =============== Study Block Planner ===============
function StudyBlockPlanner({ peerId, peerName }: { peerId: string; peerName: string }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const slots = ["09:00", "11:00", "13:00", "15:00", "17:00"];

  const propose = (day: string, slot: string) => {
    const invitation = `[Joint Study Session Invitation]\nProposed: ${day} at ${slot}\nFocus: Aligned revision block — please confirm or counter-propose.`;
    sendMessage(peerId, invitation, "me");
    toast.success(`Proposal sent to ${peerName} for ${day} ${slot}`);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Joint Study Timetable</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1.5"></th>
              {days.map((d) => (
                <th key={d} className="py-1.5 font-semibold">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot}>
                <td className="py-1 font-mono text-[10px] text-muted-foreground pr-2">{slot}</td>
                {days.map((day) => (
                  <td key={day} className="py-1 px-0.5">
                    <button
                      onClick={() => propose(day, slot)}
                      className="w-full h-7 rounded-md border border-dashed border-primary/40 text-[10px] text-primary hover:bg-primary/10 transition"
                      title="Propose Joint Study Session"
                    >
                      + propose
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// =============== Chat Canvas (FIFO 100) ===============
function ChatCanvas({ peerId, peerName }: { peerId: string; peerName: string }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>(() => getChat(peerId));
  const [input, setInput] = useState("");

  useEffect(() => {
    const tick = () => setMsgs(getChat(peerId));
    tick();
    const handler = () => tick();
    window.addEventListener("gp-peer-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("gp-peer-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, [peerId]);

  const submit = () => {
    if (!input.trim()) return;
    sendMessage(peerId, input, "me");
    setInput("");
    // simulate peer reply 10% of the time
    if (Math.random() < 0.4) {
      setTimeout(() => sendMessage(peerId, "Got it — thanks!", "peer"), 2400);
    }
  };

  return (
    <Card className="p-0 flex flex-col h-[640px] overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold">Chat — {peerName}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{msgs.length}/100 (FIFO)</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20">
        {msgs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No messages yet — say hi.</p>
        )}
        {msgs.map((m) => {
          const mine = m.from === "me";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"}`}>
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-500"}`}>
                  <span>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {mine && <Ticks msg={m} />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t p-2 flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Type a message..."
          className="flex-1"
        />
        <Button onClick={submit} size="icon" disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function Ticks({ msg }: { msg: ChatMsg }) {
  if (msg.read) return <CheckCheck className="h-3 w-3 text-emerald-300" />;
  if (msg.delivered) return <CheckCheck className="h-3 w-3" />;
  return <Check className="h-3 w-3" />;
}

// =============== Connection Health Meter ===============
// Synthesises a local micro-sync ledger per peer so each accepted card
// shows a small line chart of local sync activity over time. Real WebRTC
// links report their live latency through the WebRTCHandshakeCard below.
function ConnectionHealthMeter({ peerId }: { peerId: string }) {
  const KEY = "gp_peer_sync_" + peerId;
  const [series, setSeries] = useState<number[]>([]);
  const [latency, setLatency] = useState<number>(() => 40 + Math.round(Math.random() * 60));

  useEffect(() => {
    let raw: number[] = [];
    try {
      raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {}
    if (raw.length === 0) {
      raw = Array.from({ length: 12 }).map(() => 40 + Math.round(Math.random() * 60));
      localStorage.setItem(KEY, JSON.stringify(raw));
    }
    setSeries(raw);
    const t = window.setInterval(() => {
      const next = Math.max(20, Math.min(180, raw[raw.length - 1] + (Math.random() - 0.5) * 25));
      raw = [...raw.slice(-23), Math.round(next)];
      localStorage.setItem(KEY, JSON.stringify(raw));
      setSeries(raw);
      setLatency(Math.round(next));
    }, 4500);
    return () => window.clearInterval(t);
  }, [KEY]);

  const max = Math.max(...series, 120);
  const points = series
    .map((v, i) => `${(i / Math.max(series.length - 1, 1)) * 100},${100 - (v / max) * 100}`)
    .join(" ");
  const tier = latency < 60 ? "emerald" : latency < 110 ? "amber" : "rose";
  const tierColor = tier === "emerald" ? "#10b981" : tier === "amber" ? "#f59e0b" : "#f43f5e";

  return (
    <div className="mt-1.5 flex items-center gap-2">
      <Activity className="h-3 w-3" style={{ color: tierColor }} />
      <span className="text-[10px] font-bold tabular-nums" style={{ color: tierColor }}>
        {latency}ms
      </span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-3.5 w-16 opacity-90">
        <polyline fill="none" stroke={tierColor} strokeWidth="3" points={points} />
      </svg>
      <span className="text-[9px] text-muted-foreground">{series.length} syncs</span>
    </div>
  );
}

// =============== WebRTC Handshake Card ===============
// Manual SDP offer/answer paste — no signaling server. Uses STUN to gather
// ICE candidates so two devices can establish a real DataChannel by
// pasting the encoded SDP strings to each other.
function WebRTCHandshakeCard() {
  const linkRef = useRef<RTCPeerLink | null>(null);
  const [mode, setMode] = useState<"idle" | "offerer" | "answerer">("idle");
  const [offerOut, setOfferOut] = useState("");
  const [answerOut, setAnswerOut] = useState("");
  const [offerIn, setOfferIn] = useState("");
  const [answerIn, setAnswerIn] = useState("");
  const [health, setHealth] = useState<RTCHealth | null>(null);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => () => linkRef.current?.close(), []);

  const link = () => {
    if (!linkRef.current) {
      linkRef.current = new RTCPeerLink();
      linkRef.current.onHealth(() => setHealth({ ...linkRef.current!.health }));
      linkRef.current.onMessage((env: RTCEnvelope) => {
        if (env.kind === "chat") {
          setLog((l) => [...l.slice(-19), `${env.from}: ${env.text}`]);
        }
      });
    }
    return linkRef.current;
  };

  const startOffer = async () => {
    setMode("offerer");
    try {
      const t = await link().createOffer();
      setOfferOut(t);
      toast.success("Offer SDP generated — copy and send to peer");
    } catch (e: any) {
      toast.error("Failed to create offer: " + (e?.message || "unknown"));
    }
  };

  const acceptOffer = async () => {
    if (!offerIn.trim()) return toast.error("Paste the peer offer first.");
    setMode("answerer");
    try {
      const t = await link().acceptOfferCreateAnswer(offerIn);
      setAnswerOut(t);
      toast.success("Answer SDP generated — copy and send back");
    } catch (e: any) {
      toast.error("Failed to create answer: " + (e?.message || "unknown"));
    }
  };

  const finaliseAnswer = async () => {
    if (!answerIn.trim()) return toast.error("Paste the peer answer first.");
    try {
      await link().acceptAnswer(answerIn);
      toast.success("WebRTC DataChannel handshake complete");
    } catch (e: any) {
      toast.error("Failed to apply answer: " + (e?.message || "unknown"));
    }
  };

  const [chatIn, setChatIn] = useState("");
  const sendOverRTC = () => {
    if (!chatIn.trim()) return;
    const ok = link().send({ kind: "chat", text: chatIn, from: "Me", ts: Date.now() });
    if (!ok) return toast.error("DataChannel is not open yet.");
    setLog((l) => [...l.slice(-19), `Me: ${chatIn}`]);
    setChatIn("");
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="h-4 w-4 text-emerald-500" />
        <h3 className="font-bold text-sm">Direct WebRTC DataChannel</h3>
        {health && (
          <Badge variant="outline" className="ml-auto text-[10px]">
            {health.state}
            {health.latencyMs != null ? ` · ${health.latencyMs}ms` : ""}
          </Badge>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Manual signaling: copy each SDP string to the other device. STUN-only — no signaling server.
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === "offerer" ? "default" : "outline"} onClick={startOffer} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Create Offer
          </Button>
          <Button variant={mode === "answerer" ? "default" : "outline"} onClick={acceptOffer} className="gap-1">
            <Check className="h-3.5 w-3.5" /> Accept Offer
          </Button>
        </div>

        {mode === "offerer" && (
          <>
            <Textarea readOnly value={offerOut} placeholder="Offer SDP (share this)" className="font-mono text-[10px] h-20" />
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(offerOut); toast.success("Offer copied"); }} className="gap-1 w-full">
              <Copy className="h-3.5 w-3.5" /> Copy Offer
            </Button>
            <Textarea value={answerIn} onChange={(e) => setAnswerIn(e.target.value)} placeholder="Paste peer answer SDP here" className="font-mono text-[10px] h-20" />
            <Button size="sm" onClick={finaliseAnswer} className="w-full">Finalise Handshake</Button>
          </>
        )}

        {mode === "answerer" && (
          <>
            <Textarea value={offerIn} onChange={(e) => setOfferIn(e.target.value)} placeholder="Paste peer offer SDP here" className="font-mono text-[10px] h-20" />
            <Textarea readOnly value={answerOut} placeholder="Answer SDP (share back)" className="font-mono text-[10px] h-20" />
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(answerOut); toast.success("Answer copied"); }} className="gap-1 w-full">
              <Copy className="h-3.5 w-3.5" /> Copy Answer
            </Button>
          </>
        )}

        {mode === "idle" && (
          <>
            <Textarea value={offerIn} onChange={(e) => setOfferIn(e.target.value)} placeholder="Paste an incoming offer SDP here…" className="font-mono text-[10px] h-20" />
            <p className="text-[10px] text-muted-foreground">Or click Create Offer above to initiate.</p>
          </>
        )}

        {health?.state === "connected" && (
          <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-2 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Live DataChannel</div>
            <div className="text-[11px] tabular-nums grid grid-cols-3 gap-2">
              <span>sent {health.sentCount}</span>
              <span>recv {health.recvCount}</span>
              <span>last {health.lastSyncTs ? new Date(health.lastSyncTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
            </div>
            <div className="flex gap-1">
              <Input value={chatIn} onChange={(e) => setChatIn(e.target.value)} placeholder="Send over WebRTC…" className="text-xs h-8" onKeyDown={(e) => e.key === "Enter" && sendOverRTC()} />
              <Button size="sm" onClick={sendOverRTC}><Send className="h-3.5 w-3.5" /></Button>
            </div>
            <div className="max-h-24 overflow-y-auto text-[11px] space-y-0.5 font-mono">
              {log.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// =============== Group Chat Hub ===============
function GroupChatHub({ me }: { me: { id: string; name: string; color: string; bullets: number[] } }) {
  const { session, nodes, messages } = useGroupChat();
  const [token, setToken] = useState("");
  const [memberTok, setMemberTok] = useState("");
  const [text, setText] = useState("");
  const [stealth, setStealth] = useState(false);
  const [tab, setTab] = useState<"chat" | "leaderboard">("chat");

  if (!session) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Mesh-Grid Group Chat</h3>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Initialise a Group Chat Hub to become the routing switchboard, or paste a host invite token to bind to one.
        </p>
        <Button
          className="w-full mb-3 gap-2"
          onClick={() => {
            const tok = initGroupAsHost(me);
            navigator.clipboard.writeText(tok).catch(() => {});
            toast.success("Group Chat Hub initialised — invite token copied");
          }}
        >
          <Hash className="h-4 w-4" /> Initialize Group Chat Hub (Host)
        </Button>
        <Textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste a host invite token to join…"
          className="font-mono text-[10px] h-20"
        />
        <Button
          variant="outline"
          className="w-full mt-2"
          onClick={() => {
            const r = joinGroupAsMember(token, me);
            if (!r.ok) return toast.error(r.reason || "Failed to join group");
            toast.success("Bound to host group");
            setToken("");
          }}
        >
          Join Group
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-0 flex flex-col h-[640px] overflow-hidden">
      <div className="p-3 border-b flex items-center gap-2 flex-wrap">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold">Group · {session.groupId.slice(-6)}</span>
        <Badge variant="outline" className="text-[10px]">{session.isHost ? "Host" : "Member"}</Badge>
        <Badge variant="outline" className="text-[10px]">{nodes.length} nodes</Badge>
        <Button size="icon" variant="ghost" onClick={() => setStealth((s) => !s)} title="Stealth Blur">
          {stealth ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => { leaveGroup(); toast.success("Left group"); }} title="Leave">
          <LogOut className="h-4 w-4 text-rose-500" />
        </Button>
        <div className="basis-full flex gap-1 mt-1">
          <Button size="sm" variant={tab === "chat" ? "default" : "outline"} onClick={() => setTab("chat")} className="gap-1 h-7">
            <Send className="h-3 w-3" /> Chat
          </Button>
          <Button size="sm" variant={tab === "leaderboard" ? "default" : "outline"} onClick={() => setTab("leaderboard")} className="gap-1 h-7">
            <Trophy className="h-3 w-3" /> Leaderboard
          </Button>
        </div>
      </div>

      {tab === "chat" ? (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20">
            {messages.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No group messages yet.</p>}
            {messages.map((m) => {
              const mine = m.fromId === session.myId;
              const name = stealth ? `[Peer ${m.fromId.slice(-3).toUpperCase()}]` : m.from;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"} flex-col`}>
                  {!mine && <div className="text-[10px] font-bold text-muted-foreground mb-0.5 px-2">{name}</div>}
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-blue-600 text-white self-end" : "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 self-start"}`}>
                    <div className="whitespace-pre-wrap break-words">{m.text}</div>
                    <div className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-slate-500"}`}>
                      {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t p-2 flex items-center gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { sendGroupMessage(text); setText(""); } }}
              placeholder="Message the group…"
              className="flex-1"
            />
            <Button onClick={() => { if (text.trim()) { sendGroupMessage(text); setText(""); } }} size="icon" disabled={!text.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="border-t p-2 text-[10px] text-muted-foreground">
            {messages.length}/100 (FIFO)
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">10-Bullet Group Leaderboard</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-muted-foreground">
                  <th className="text-left py-1.5">Member</th>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <th key={i} className="text-right py-1.5 px-1">B{i + 1}</th>
                  ))}
                  <th className="text-right py-1.5 px-1">Avg</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((n) => {
                  const valid = n.bullets.filter((v) => Number.isFinite(v) && v > 0);
                  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
                  const display = stealth ? `[Peer ${n.id.slice(-3).toUpperCase()}]` : n.name;
                  return (
                    <tr key={n.id} className="border-t">
                      <td className="py-1.5 font-semibold">{display}</td>
                      {Array.from({ length: 10 }).map((_, i) => {
                        const v = n.bullets[i];
                        return (
                          <td key={i} className="text-right tabular-nums px-1">
                            {Number.isFinite(v) && v > 0 ? v.toFixed(1) : "—"}
                          </td>
                        );
                      })}
                      <td className="text-right tabular-nums font-bold text-primary px-1">{avg.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {session.isHost && (
            <div className="mt-4 rounded-lg border p-3 bg-muted/30">
              <div className="text-[10px] font-bold uppercase mb-2">Host: add member by token</div>
              <Textarea value={memberTok} onChange={(e) => setMemberTok(e.target.value)} placeholder="Paste member join token…" className="font-mono text-[10px] h-16" />
              <Button size="sm" className="w-full mt-2" onClick={() => {
                const r = hostAddMemberByToken(memberTok);
                if (!r.ok) return toast.error(r.reason || "Failed to add member");
                toast.success("Member added");
                setMemberTok("");
              }}>Add Member</Button>
            </div>
          )}
          {!session.isHost && (
            <div className="mt-4 rounded-lg border p-3 bg-muted/30">
              <div className="text-[10px] font-bold uppercase mb-2">Your member token (send to host)</div>
              <Textarea readOnly value={buildMemberToken(me)} className="font-mono text-[10px] h-16" />
              <Button size="sm" variant="outline" className="w-full mt-2 gap-1" onClick={() => { navigator.clipboard.writeText(buildMemberToken(me)); toast.success("Member token copied"); }}>
                <Copy className="h-3.5 w-3.5" /> Copy Member Token
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
