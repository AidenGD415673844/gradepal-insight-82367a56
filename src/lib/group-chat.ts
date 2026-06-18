// Decentralised group chat — BroadcastChannel for same-browser meshing +
// manual WebRTC-style token paste registry for cross-device handshake.
// Host device acts as a routing switchboard: appends to its own 100-msg FIFO
// queue and rebroadcasts payloads to all other connected member nodes.

import { useEffect, useState } from "react";

export type GroupMsg = {
  id: string;
  from: string;        // member display name
  fromId: string;      // member stable id
  text: string;
  ts: number;
};

export type GroupNode = {
  id: string;
  name: string;
  color: string;
  bullets: number[];   // 10-bullet averages snapshot
  joinedAt: number;
};

export type GroupSession = {
  groupId: string;
  hostId: string;
  hostName: string;
  isHost: boolean;
  myId: string;
  myName: string;
  nodes: GroupNode[];
  messages: GroupMsg[];
  createdAt: number;
};

const K_SESSION = "gp_group_session";
const K_NODES = "gp_group_nodes";
const K_MSGS = "gp_group_msgs";
const CAP = 100;
const EVT = "gp-group-change";
const CHANNEL = "gp-group-broadcast";

let bc: BroadcastChannel | null = null;
function channel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!bc && "BroadcastChannel" in window) bc = new BroadcastChannel(CHANNEL);
  return bc;
}

const fire = () => typeof window !== "undefined" && window.dispatchEvent(new CustomEvent(EVT));

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fb; } catch { return fb; }
}
function write(k: string, v: any) { localStorage.setItem(k, JSON.stringify(v)); fire(); }

export function getSession(): GroupSession | null { return read<GroupSession | null>(K_SESSION, null); }
export function getNodes(): GroupNode[] { return read<GroupNode[]>(K_NODES, []); }
export function getMessages(): GroupMsg[] { return read<GroupMsg[]>(K_MSGS, []); }

function encode(o: any): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function decode<T>(s: string): T | null {
  try { return JSON.parse(decodeURIComponent(escape(atob(s.trim())))) as T; } catch { return null; }
}

// Host: initialise a new group. Returns the group invite token to share.
export function initGroupAsHost(me: { id: string; name: string; color: string; bullets: number[] }): string {
  const groupId = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const hostNode: GroupNode = {
    id: me.id,
    name: me.name,
    color: me.color,
    bullets: me.bullets,
    joinedAt: Date.now(),
  };
  const session: GroupSession = {
    groupId,
    hostId: me.id,
    hostName: me.name,
    isHost: true,
    myId: me.id,
    myName: me.name,
    nodes: [hostNode],
    messages: [],
    createdAt: Date.now(),
  };
  write(K_SESSION, session);
  write(K_NODES, [hostNode]);
  write(K_MSGS, []);
  return encode({ kind: "group-invite", groupId, host: hostNode });
}

// Non-host: bind to a host group via its invite token.
export function joinGroupAsMember(
  token: string,
  me: { id: string; name: string; color: string; bullets: number[] },
): { ok: boolean; reason?: string } {
  const decoded = decode<{ kind: string; groupId: string; host: GroupNode }>(token);
  if (!decoded || decoded.kind !== "group-invite") return { ok: false, reason: "Invalid group invite token." };
  if (decoded.host.id === me.id) return { ok: false, reason: "Cannot join your own group as a member." };
  const memberNode: GroupNode = {
    id: me.id,
    name: me.name,
    color: me.color,
    bullets: me.bullets,
    joinedAt: Date.now(),
  };
  const session: GroupSession = {
    groupId: decoded.groupId,
    hostId: decoded.host.id,
    hostName: decoded.host.name,
    isHost: false,
    myId: me.id,
    myName: me.name,
    nodes: [decoded.host, memberNode],
    messages: [],
    createdAt: Date.now(),
  };
  write(K_SESSION, session);
  write(K_NODES, session.nodes);
  write(K_MSGS, []);
  // Announce membership over BroadcastChannel
  channel()?.postMessage({ type: "join", groupId: decoded.groupId, node: memberNode });
  return { ok: true };
}

// Host: add a member node (paste their member-token; same encoding as a peer
// profile token). For now we accept the raw decoded GroupNode payload.
export function hostAddMemberByToken(token: string): { ok: boolean; reason?: string } {
  const session = getSession();
  if (!session?.isHost) return { ok: false, reason: "Only the host can add members." };
  const node = decode<GroupNode>(token);
  if (!node || !node.id || !node.name) return { ok: false, reason: "Invalid member token." };
  if (node.id === session.hostId) return { ok: false, reason: "Cannot add the host as a member." };
  if (session.nodes.some((n) => n.id === node.id))
    return { ok: false, reason: `${node.name} is already in this group.` };
  const nodes = [...session.nodes, { ...node, joinedAt: Date.now() }];
  write(K_SESSION, { ...session, nodes });
  write(K_NODES, nodes);
  channel()?.postMessage({ type: "roster", nodes });
  return { ok: true };
}

// Member: produce a join-token to hand to the host.
export function buildMemberToken(me: { id: string; name: string; color: string; bullets: number[] }): string {
  const node: GroupNode = { ...me, joinedAt: Date.now() };
  return encode(node);
}

export function sendGroupMessage(text: string) {
  const session = getSession();
  if (!session) return;
  const trimmed = text.trim();
  if (!trimmed) return;
  const msg: GroupMsg = {
    id: `gm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    from: session.myName,
    fromId: session.myId,
    text: trimmed,
    ts: Date.now(),
  };
  appendLocal(msg);
  // Broadcast to other tabs (acts as the WebRTC DataChannel substitute in-browser).
  channel()?.postMessage({ type: "msg", groupId: session.groupId, msg });
}

function appendLocal(msg: GroupMsg) {
  const all = getMessages();
  all.push(msg);
  while (all.length > CAP) all.shift();
  write(K_MSGS, all);
}

export function leaveGroup() {
  const s = getSession();
  if (s) channel()?.postMessage({ type: "leave", groupId: s.groupId, nodeId: s.myId });
  localStorage.removeItem(K_SESSION);
  localStorage.removeItem(K_NODES);
  localStorage.removeItem(K_MSGS);
  fire();
}

// Wire BroadcastChannel router (host appends + rebroadcasts; members append).
let wired = false;
export function wireGroupRouter() {
  if (wired || typeof window === "undefined") return;
  const ch = channel();
  if (!ch) return;
  wired = true;
  ch.onmessage = (e) => {
    const session = getSession();
    if (!session) return;
    const data = e.data;
    if (!data || data.groupId !== session.groupId) return;
    if (data.type === "msg") {
      appendLocal(data.msg);
      if (session.isHost) {
        // Host re-broadcasts to all members (BroadcastChannel does this implicitly
        // for tabs; for explicit fanout we tag it as a host-relay).
        ch.postMessage({ type: "relay", groupId: session.groupId, msg: data.msg });
      }
    } else if (data.type === "relay") {
      // members append the relayed payload (already-seen dedup by id)
      const exists = getMessages().some((m) => m.id === data.msg.id);
      if (!exists) appendLocal(data.msg);
    } else if (data.type === "join" && session.isHost) {
      // Auto-accept join when broadcasting in same-browser meshing
      const exists = session.nodes.some((n) => n.id === data.node.id);
      if (!exists) {
        const nodes = [...session.nodes, data.node];
        write(K_SESSION, { ...session, nodes });
        write(K_NODES, nodes);
        ch.postMessage({ type: "roster", nodes });
      }
    } else if (data.type === "roster") {
      write(K_SESSION, { ...session, nodes: data.nodes });
      write(K_NODES, data.nodes);
    } else if (data.type === "leave") {
      const nodes = session.nodes.filter((n) => n.id !== data.nodeId);
      write(K_SESSION, { ...session, nodes });
      write(K_NODES, nodes);
    }
  };
}

export function useGroupChat() {
  const [, set] = useState(0);
  useEffect(() => {
    wireGroupRouter();
    const tick = () => set((n) => n + 1);
    window.addEventListener(EVT, tick);
    window.addEventListener("storage", tick);
    return () => {
      window.removeEventListener(EVT, tick);
      window.removeEventListener("storage", tick);
    };
  }, []);
  return {
    session: getSession(),
    nodes: getNodes(),
    messages: getMessages(),
  };
}