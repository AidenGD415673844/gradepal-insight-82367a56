import { useEffect, useState } from "react";

export type PeerStatus = "pending" | "accepted" | "blocked";
export type PeerSubject = { name: string; avg: number };
export type PeerProfile = {
  id: string;
  name: string;
  color: string;
  subjects: PeerSubject[];
  bullets: number[];
  updatedAt: number;
};
export type Peer = PeerProfile & { status: PeerStatus; lastOnline: number };
export type ChatMsg = {
  id: string;
  from: "me" | "peer";
  text: string;
  ts: number;
  read: boolean;
  delivered: boolean;
};
export type InboxItem = {
  id: string;
  ts: number;
  kind: "sync" | "weekly";
  title: string;
  body: string;
  payload?: any;
  read: boolean;
};

const K_PROFILE = "gp_me_profile";
const K_FRIENDS = "gp_friends";
const K_CHAT = "gp_chat_";
const K_INBOX = "gp_inbox";
const K_BLOCK = "gp_blocklist";
const K_LASTWEEKLY = "gp_last_weekly_ts";
const EVT = "gp-peer-change";

const fire = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVT));
};
const read = <T,>(k: string, fb: T): T => {
  if (typeof window === "undefined") return fb;
  try {
    const raw = localStorage.getItem(k);
    return raw ? (JSON.parse(raw) as T) : fb;
  } catch {
    return fb;
  }
};
const write = (k: string, v: any) => {
  localStorage.setItem(k, JSON.stringify(v));
  fire();
};

export function getMyProfile(): PeerProfile {
  const base: PeerProfile = {
    id: "me-local",
    name: "You",
    color: "#3b82f6",
    subjects: [],
    bullets: [],
    updatedAt: Date.now(),
  };
  return { ...base, ...read<Partial<PeerProfile>>(K_PROFILE, {}) };
}
export function setMyProfile(patch: Partial<PeerProfile>) {
  const next = { ...getMyProfile(), ...patch, updatedAt: Date.now() };
  write(K_PROFILE, next);
}

export function encodeToken(p: PeerProfile): string {
  try {
    const json = JSON.stringify(p);
    if (typeof window !== "undefined" && window.btoa) {
      return window.btoa(unescape(encodeURIComponent(json)));
    }
    return Buffer.from(json, "utf-8").toString("base64");
  } catch {
    return "";
  }
}
export function decodeToken(token: string): PeerProfile | null {
  try {
    const t = token.trim();
    if (!t) return null;
    const json =
      typeof window !== "undefined" && window.atob
        ? decodeURIComponent(escape(window.atob(t)))
        : Buffer.from(t, "base64").toString("utf-8");
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.name !== "string") return null;
    return parsed as PeerProfile;
  } catch {
    return null;
  }
}

export function getFriends(): Peer[] {
  return read<Peer[]>(K_FRIENDS, []);
}
export function setFriends(list: Peer[]) {
  write(K_FRIENDS, list);
}
export function getBlocklist(): string[] {
  return read<string[]>(K_BLOCK, []);
}

function seedChat(peerId: string, _peerName: string) {
  const key = K_CHAT + peerId;
  if (localStorage.getItem(key)) return;
  const now = Date.now();
  const msgs: ChatMsg[] = [
    {
      id: "s1",
      from: "peer",
      text: "Hey! Did you get the weighting for the upcoming Mathematics terminal exam? I heard it is 35%.",
      ts: now - 1000 * 60 * 60 * 26,
      delivered: true,
      read: true,
    },
    {
      id: "s2",
      from: "me",
      text: "Yes — terminal weight is 35%, internal coursework is the remaining 25%. Want to align revision blocks?",
      ts: now - 1000 * 60 * 60 * 25,
      delivered: true,
      read: true,
    },
    {
      id: "s3",
      from: "peer",
      text: "Sounds good. Let's lock in a joint study window this week — I will send a proposal from my timetable.",
      ts: now - 1000 * 60 * 60 * 24,
      delivered: true,
      read: true,
    },
  ];
  localStorage.setItem(key, JSON.stringify(msgs));
}

export function acceptToken(token: string): { ok: boolean; reason?: string; peer?: Peer } {
  const profile = decodeToken(token);
  if (!profile) return { ok: false, reason: "Invalid token." };
  if (getBlocklist().includes(profile.id))
    return { ok: false, reason: "This peer is on your blocklist — connection dropped." };
  const list = getFriends();
  const existingIdx = list.findIndex((p) => p.id === profile.id);
  if (existingIdx >= 0) {
    const prev = list[existingIdx];
    list[existingIdx] = { ...prev, ...profile, status: prev.status, lastOnline: Date.now() };
    setFriends(list);
    pushInbox({
      kind: "sync",
      title: "Network Update Sync",
      body: `Peer ${profile.name} has pushed an updated data package.`,
    });
    return { ok: true, peer: list[existingIdx] };
  }
  const peer: Peer = { ...profile, status: "pending", lastOnline: Date.now() };
  list.push(peer);
  setFriends(list);
  seedChat(peer.id, peer.name);
  return { ok: true, peer };
}

export function updatePeerStatus(id: string, status: PeerStatus) {
  const list = getFriends();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], status };
  if (status === "blocked") {
    const bl = getBlocklist();
    if (!bl.includes(id)) write(K_BLOCK, [...bl, id]);
  }
  setFriends(list);
}
export function removePeer(id: string) {
  setFriends(getFriends().filter((p) => p.id !== id));
}

const CHAT_CAP = 100;
export function getChat(peerId: string): ChatMsg[] {
  return read<ChatMsg[]>(K_CHAT + peerId, []);
}
export function sendMessage(peerId: string, text: string, from: "me" | "peer" = "me") {
  const trimmed = text.trim();
  if (!trimmed) return;
  const list = getChat(peerId);
  list.push({
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from,
    text: trimmed,
    ts: Date.now(),
    delivered: from === "me",
    read: false,
  });
  while (list.length > CHAT_CAP) list.shift();
  localStorage.setItem(K_CHAT + peerId, JSON.stringify(list));
  fire();
  if (from === "me") {
    setTimeout(() => markDelivered(peerId), 600);
    setTimeout(() => markRead(peerId), 1800);
  }
}
function markDelivered(peerId: string) {
  const list = getChat(peerId).map((m) => (m.from === "me" ? { ...m, delivered: true } : m));
  localStorage.setItem(K_CHAT + peerId, JSON.stringify(list));
  fire();
}
function markRead(peerId: string) {
  const list = getChat(peerId).map((m) => (m.from === "me" ? { ...m, delivered: true, read: true } : m));
  localStorage.setItem(K_CHAT + peerId, JSON.stringify(list));
  fire();
}

export function getInbox(): InboxItem[] {
  return read<InboxItem[]>(K_INBOX, []).sort((a, b) => b.ts - a.ts);
}
export function pushInbox(i: Omit<InboxItem, "id" | "ts" | "read"> & { read?: boolean }) {
  const list = read<InboxItem[]>(K_INBOX, []);
  list.push({
    id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    read: false,
    ...i,
  });
  write(K_INBOX, list);
}
export function markInboxRead(id: string) {
  const list = read<InboxItem[]>(K_INBOX, []).map((x) => (x.id === id ? { ...x, read: true } : x));
  write(K_INBOX, list);
}
export function deleteInbox(id: string) {
  write(K_INBOX, read<InboxItem[]>(K_INBOX, []).filter((x) => x.id !== id));
}

export type WeeklyReview = {
  ts: number;
  count: number;
  std: number;
  max: number;
  min: number;
  passRate: number;
  avg: number;
  median: number;
  range: { spread: number; lo: number; hi: number };
  consistency: "High" | "Stable" | "Fluctuating";
  momentum: number;
  firstHalfAvg: number;
  secondHalfAvg: number;
  scores: number[];
  byCategory: { name: string; avg: number }[];
  tier: string;
  strengths: string;
  trends: string;
  commendations: string;
  improvements: string;
  outlook: string;
};

function tierLabel(avg: number) {
  if (avg >= 97) return "Apex Mastery Tier: 97–100%";
  if (avg >= 92) return "Near-Perfect Performance Tier: 92–96%";
  if (avg >= 85) return "Strong Performance Tier: 85–91%";
  if (avg >= 75) return "Proficient Tier: 75–84%";
  if (avg >= 65) return "Developing Tier: 65–74%";
  if (avg >= 50) return "Borderline Tier: 50–64%";
  return "Critical Recovery Tier: below 50%";
}

export function buildWeeklyReview(
  tasks: Array<{ score: number; maxScore: number; category: string; date: string }>,
): WeeklyReview | null {
  const cutoff = Date.now() - 7 * 86400000;
  const recent = tasks
    .filter((t) => t.maxScore > 0 && new Date(t.date).getTime() >= cutoff)
    .map((t) => ({ pct: (t.score / t.maxScore) * 100, category: t.category }))
    .filter((t) => Number.isFinite(t.pct));
  if (recent.length === 0) return null;

  const scores = recent.map((r) => r.pct).sort((a, b) => a - b);
  const count = scores.length;
  const avg = scores.reduce((s, v) => s + v, 0) / count;
  const variance = scores.reduce((s, v) => s + (v - avg) ** 2, 0) / count;
  const std = Math.sqrt(variance);
  const max = scores[scores.length - 1];
  const min = scores[0];
  const median =
    count % 2 === 0 ? (scores[count / 2 - 1] + scores[count / 2]) / 2 : scores[Math.floor(count / 2)];
  const passRate = (scores.filter((s) => s >= 50).length / count) * 100;
  const half = Math.floor(count / 2);
  const firstHalf = scores.slice(0, half || 1);
  const secondHalf = scores.slice(half || 1);
  const firstHalfAvg = firstHalf.reduce((s, v) => s + v, 0) / Math.max(firstHalf.length, 1);
  const secondHalfAvg = secondHalf.reduce((s, v) => s + v, 0) / Math.max(secondHalf.length, 1);
  const last5 = scores.slice(-5);
  const prior = scores.slice(0, Math.max(scores.length - 5, 1));
  const last5Avg = last5.reduce((s, v) => s + v, 0) / last5.length;
  const priorAvg = prior.reduce((s, v) => s + v, 0) / prior.length;
  const momentum = last5Avg - priorAvg;
  const consistency: WeeklyReview["consistency"] = std < 4 ? "High" : std < 9 ? "Stable" : "Fluctuating";

  const catMap = new Map<string, number[]>();
  for (const r of recent) {
    if (!catMap.has(r.category)) catMap.set(r.category, []);
    catMap.get(r.category)!.push(r.pct);
  }
  const byCategory = Array.from(catMap.entries()).map(([name, vals]) => ({
    name,
    avg: vals.reduce((s, v) => s + v, 0) / vals.length,
  }));

  const tier = tierLabel(avg);
  const strengths =
    avg >= 85
      ? "Sustained conceptual mastery across the weekly ledger — outputs reflect rigorous preparation and disciplined task execution."
      : avg >= 70
        ? "Reliable structural understanding visible across the majority of completed tasks; mid-tier rubric descriptors are consistently satisfied."
        : "Foundational competence emerging in select tasks — anchor on those wins to scaffold the next tier of mastery.";
  const trends =
    consistency === "High"
      ? "Score variance is exceptionally tight — performance is operating in a high-stability regime."
      : consistency === "Stable"
        ? "Score variance remains within a healthy band; minor fluctuations have not destabilised the trajectory."
        : "Score variance is elevated this week — pacing inconsistencies are introducing measurable performance volatility.";
  const commendations =
    "Commendation issued for sustained study consistency and disciplined time-management across the rolling 7-day tracking window.";
  const improvements =
    min < 60
      ? `Targeted intervention recommended on the ${min.toFixed(1)}% low-water mark — re-attempt the corresponding rubric tier before the next assessment cycle.`
      : momentum < -2
        ? "Recent task velocity is trending downward — recalibrate revision intensity to recover the prior baseline."
        : "No critical deficits detected; refine the marginal-gain tasks scoring inside the 80–89% bracket to convert toward the upper tier.";
  const outlook =
    momentum >= 1.5
      ? `Positive momentum (+${momentum.toFixed(1)}pp) projects an upward trajectory toward the next tier benchmark.`
      : momentum <= -1.5
        ? `Negative momentum (${momentum.toFixed(1)}pp) — terminal tier benchmark at risk without corrective action.`
        : "Steady trajectory — terminal tier benchmark is on track at current pacing.";

  return {
    ts: Date.now(),
    count,
    std,
    max,
    min,
    passRate,
    avg,
    median,
    range: { spread: max - min, lo: min, hi: max },
    consistency,
    momentum,
    firstHalfAvg,
    secondHalfAvg,
    scores,
    byCategory,
    tier,
    strengths,
    trends,
    commendations,
    improvements,
    outlook,
  };
}

export function maybeGenerateWeeklyReview(tasks: any[]) {
  if (typeof window === "undefined") return;
  const last = Number(localStorage.getItem(K_LASTWEEKLY) || 0);
  const oneWeek = 7 * 86400000;
  if (Date.now() - last < oneWeek) return;
  const review = buildWeeklyReview(tasks);
  if (!review) return;
  localStorage.setItem(K_LASTWEEKLY, String(Date.now()));
  pushInbox({
    kind: "weekly",
    title: "Weekly Academic Performance Review",
    body: `${review.count} tasks · Avg ${review.avg.toFixed(1)}% · ${review.tier}`,
    payload: review,
  });
}

export function forceWeeklyReview(tasks: any[]): WeeklyReview | null {
  const review = buildWeeklyReview(tasks);
  if (!review) return null;
  localStorage.setItem(K_LASTWEEKLY, String(Date.now()));
  pushInbox({
    kind: "weekly",
    title: "Weekly Academic Performance Review",
    body: `${review.count} tasks · Avg ${review.avg.toFixed(1)}% · ${review.tier}`,
    payload: review,
  });
  return review;
}

export function usePeerNetwork() {
  const [, set] = useState(0);
  useEffect(() => {
    const tick = () => set((n) => n + 1);
    window.addEventListener(EVT, tick);
    window.addEventListener("storage", tick);
    return () => {
      window.removeEventListener(EVT, tick);
      window.removeEventListener("storage", tick);
    };
  }, []);
  return {
    me: getMyProfile(),
    friends: getFriends(),
    inbox: getInbox(),
  };
}
