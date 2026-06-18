import { useEffect, useMemo, useState } from "react";
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
import { RTCPeerLink, type RTCHealth } from "@/lib/webrtc-peer";
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
      { name: "description", content: "Decentralised peer connections via base64 tokens — fully client-side." },
    ],
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
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" onClick={() => onOpen(p.id)}>Open</Button>
                <Button
                  size="icon"
                  variant="ghost"
                  title="Block/Remove Peer"
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
