import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/grade/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useGroupChat,
  initGroupAsHost,
  joinGroupAsMember,
  hostAddMemberByToken,
  buildMemberToken,
  sendGroupMessage,
  leaveGroup,
  updateGroupDisplayName,
} from "@/lib/group-chat";
import { useGrades } from "@/lib/grade-store";
import { calcAverage } from "@/lib/grade-utils";
import { usePeerNetwork } from "@/lib/peer-network";
import { Radio, Send, Copy, LogOut, Users, ShieldCheck, UserPlus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { SyndicateSkillTree } from "@/components/grade/SyndicateSkillTree";

export const Route = createFileRoute("/study-room")({
  head: () => ({
    meta: [
      { title: "Co-op Study Room — GradeCalc" },
      { name: "description", content: "Multi-peer WebRTC-style study room with live group chat and roster mesh — fully client-side." },
      { property: "og:title", content: "Co-op Study Room — GradeCalc" },
      { property: "og:description", content: "Multi-peer WebRTC-style study room with live group chat and roster mesh — fully client-side." },
      { property: "og:url", content: "https://gradepal-insight.lovable.app/study-room" },
    ],
    links: [{ rel: "canonical", href: "https://gradepal-insight.lovable.app/study-room" }],
  }),
  component: StudyRoomPage,
});

function StudyRoomPage() {
  const { courses, tasks, settings } = useGrades();
  const { me } = usePeerNetwork();
  const { session, nodes, messages } = useGroupChat();

  const meProfile = useMemo(() => {
    const bullets = courses
      .slice(0, 10)
      .map((c) => calcAverage(tasks.filter((t) => t.courseId === c.id), settings.weighted));
    return { id: me.id, name: me.name || "You", color: me.color, bullets };
  }, [courses, tasks, settings.weighted, me]);

  return (
    <AppShell title="Co-op Study Room">
      {!session ? (
        <LobbyPanel meProfile={meProfile} />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4">
          <div className="space-y-4">
            <RosterPanel />
            <SyndicateSkillTree />
          </div>
          <ChatPanel messages={messages} myId={session.myId} />
        </div>
      )}
    </AppShell>
  );
}

function LobbyPanel({ meProfile }: { meProfile: { id: string; name: string; color: string; bullets: number[] } }) {
  const [joinTok, setJoinTok] = useState("");
  const memberTok = useMemo(() => buildMemberToken(meProfile), [meProfile]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl mx-auto">
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <h2 className="font-bold">Host a Study Room</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Spin up a mesh room on this device. You become the routing switchboard — every
          message flows through you and is fanned out to all members. Nothing touches a server.
        </p>
        <Button
          className="w-full gap-2"
          onClick={() => {
            const token = initGroupAsHost(meProfile);
            navigator.clipboard.writeText(token).catch(() => {});
            toast.success("Room initialised — host invite copied to clipboard.");
          }}
        >
          <Radio className="h-4 w-4" /> Start Room & Copy Invite
        </Button>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="font-bold">Join an Existing Room</h2>
        </div>
        <label className="text-xs font-semibold text-muted-foreground">Paste host invite token</label>
        <Textarea
          value={joinTok}
          onChange={(e) => setJoinTok(e.target.value)}
          placeholder="Paste the base64 host invite here…"
          className="font-mono text-[10px] h-24 resize-none"
        />
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={!joinTok.trim()}
          onClick={() => {
            const r = joinGroupAsMember(joinTok, meProfile);
            if (!r.ok) return toast.error(r.reason || "Could not join room.");
            toast.success("Joined room — waiting for host to relay roster.");
            setJoinTok("");
          }}
        >
          <UserPlus className="h-4 w-4" /> Join Room as Member
        </Button>

        <div className="pt-3 border-t space-y-2">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Your member token (hand to the host so they can register you)
          </label>
          <Textarea readOnly value={memberTok} className="font-mono text-[9px] h-20 resize-none" />
          <Button
            size="sm"
            variant="ghost"
            className="w-full gap-1"
            onClick={() => {
              navigator.clipboard.writeText(memberTok);
              toast.success("Member token copied");
            }}
          >
            <Copy className="h-3.5 w-3.5" /> Copy My Member Token
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RosterPanel() {
  const { session, nodes } = useGroupChat();
  const [addTok, setAddTok] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(session?.myName ?? "");
  if (!session) return null;

  const hostInvite = useMemo(() => {
    const host = nodes.find((n) => n.id === session.hostId);
    if (!host || !session.isHost) return "";
    // Rebuild an invite token from the host node so members can join later
    try {
      return btoa(
        unescape(
          encodeURIComponent(
            JSON.stringify({ kind: "group-invite", groupId: session.groupId, host }),
          ),
        ),
      );
    } catch {
      return "";
    }
  }, [session, nodes]);

  return (
    <div className="space-y-3">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-sm">Room {session.groupId.slice(-6)}</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            {session.isHost ? "Host" : "Member"}
          </Badge>
        </div>

        <div className="rounded-lg border bg-muted/30 p-2 mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
            My display name
          </div>
          {editingName ? (
            <div className="flex gap-1">
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="h-8 text-sm" />
              <Button
                size="sm"
                onClick={() => {
                  updateGroupDisplayName(nameDraft);
                  setEditingName(false);
                  toast.success("Name updated across roster");
                }}
              >
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{session.myName}</span>
              <Button size="icon" variant="ghost" onClick={() => { setNameDraft(session.myName); setEditingName(true); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Roster ({nodes.length})
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {nodes.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-2 py-1.5">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: n.color }}
              >
                {n.name[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">
                  {n.name}
                  {n.id === session.hostId && <span className="ml-1 text-[9px] text-emerald-600">HOST</span>}
                  {n.id === session.myId && <span className="ml-1 text-[9px] text-primary">YOU</span>}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {n.bullets.length} subjects synced
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 gap-1 text-rose-500 hover:text-rose-600"
          onClick={() => { leaveGroup(); toast.success("Left room"); }}
        >
          <LogOut className="h-3.5 w-3.5" /> Leave Room
        </Button>
      </Card>

      {session.isHost && (
        <Card className="p-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Add member by their token
          </div>
          <Textarea
            value={addTok}
            onChange={(e) => setAddTok(e.target.value)}
            placeholder="Paste member token…"
            className="font-mono text-[10px] h-16 resize-none"
          />
          <Button
            size="sm"
            className="w-full gap-1"
            disabled={!addTok.trim()}
            onClick={() => {
              const r = hostAddMemberByToken(addTok);
              if (!r.ok) return toast.error(r.reason || "Failed to add member");
              toast.success("Member added to roster");
              setAddTok("");
            }}
          >
            <UserPlus className="h-3.5 w-3.5" /> Register Member
          </Button>

          {hostInvite && (
            <Button
              size="sm"
              variant="ghost"
              className="w-full gap-1"
              onClick={() => {
                navigator.clipboard.writeText(hostInvite);
                toast.success("Host invite copied — share with new peers");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy Room Invite
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}

function ChatPanel({
  messages,
  myId,
}: {
  messages: { id: string; from: string; fromId: string; text: string; ts: number }[];
  myId: string;
}) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    sendGroupMessage(t);
    setText("");
  };

  return (
    <Card className="flex flex-col h-[70vh] min-h-[420px]">
      <div className="p-3 border-b flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Live Group Chat</h3>
        <Badge variant="outline" className="ml-auto text-[10px]">FIFO · 100 msg cap</Badge>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            No messages yet — say hi to the room.
          </div>
        )}
        {messages.map((m) => {
          const mine = m.fromId === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border rounded-bl-sm"
                }`}
              >
                {!mine && (
                  <div className="text-[10px] font-bold opacity-70 mb-0.5">{m.from}</div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={`text-[9px] mt-0.5 ${mine ? "opacity-70" : "text-muted-foreground"}`}>
                  {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder="Message the room…"
          className="flex-1"
        />
        <Button onClick={submit} disabled={!text.trim()} className="gap-1">
          <Send className="h-4 w-4" /> Send
        </Button>
      </div>
    </Card>
  );
}