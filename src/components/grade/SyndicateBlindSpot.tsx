// =============================================================================
// Syndicate Blind-Spot cross-referencer (Student Tier unlock).
//
// Broadcasts the local syllabus mastery grid to every connected WebRTC peer
// every 20s. Buffers the last-known grid from up to 4 friends in memory.
// When 3+ peer profiles share a red/amber indicator on the SAME
// [courseName · unitName] coordinate, injects a "Syndicate Blind-Spot Warning"
// card into the local inbox (deduplicated per 6 hours).
//
// Zero servers — everything runs off the existing RTCPeerLink data channels.
// =============================================================================
import { useEffect, useRef } from "react";
import { useGrades } from "@/lib/grade-store";
import { pushInbox } from "@/lib/peer-network";
import { isStudent } from "@/lib/premium";
import type { RTCPeerLink } from "@/lib/webrtc-peer";

type Grid = { courseName: string; unitName: string; level: "red" | "amber" | "green" }[];

const K_SYL = "syllabus-mastery-v1";
const K_DEDUPE = "gp_blindspot_dedupe_v1";
const DEDUPE_MS = 6 * 60 * 60 * 1000; // 6 h

function loadLocalGrid(courseMap: Record<string, string>): Grid {
  try {
    const raw = JSON.parse(localStorage.getItem(K_SYL) || "{}");
    const out: Grid = [];
    for (const [courseId, units] of Object.entries<any>(raw)) {
      const courseName = courseMap[courseId] ?? "Course";
      if (!Array.isArray(units)) continue;
      for (const u of units) {
        if (!u?.name || !u?.level) continue;
        out.push({ courseName, unitName: String(u.name), level: u.level });
      }
    }
    return out;
  } catch { return []; }
}

function dedupeFire(key: string) {
  try {
    const now = Date.now();
    const map: Record<string, number> = JSON.parse(localStorage.getItem(K_DEDUPE) || "{}");
    if (map[key] && now - map[key] < DEDUPE_MS) return false;
    map[key] = now;
    localStorage.setItem(K_DEDUPE, JSON.stringify(map));
    return true;
  } catch { return true; }
}

/**
 * Attach the blind-spot engine to a live RTCPeerLink. Call once from any
 * long-lived component that already owns a peer link (e.g. the Peers or
 * Syndicate page).
 */
export function SyndicateBlindSpot({ link, myName }: { link: RTCPeerLink | null; myName: string }) {
  const { courses } = useGrades();
  const peerGridsRef = useRef<Map<string, Grid>>(new Map());

  useEffect(() => {
    if (!link || !isStudent()) return;
    const courseMap: Record<string, string> = Object.fromEntries(courses.map((c) => [c.id, c.name]));

    const broadcast = () => {
      const units = loadLocalGrid(courseMap);
      if (!units.length) return;
      link.send({ kind: "syllabus_share", from: myName, ts: Date.now(), units });
    };
    const off = link.onMessage((env) => {
      if (env.kind !== "syllabus_share") return;
      // Keep the newest 4 peers only — bounded memory.
      const map = peerGridsRef.current;
      map.set(env.from, env.units);
      if (map.size > 4) {
        const oldest = map.keys().next().value;
        if (oldest) map.delete(oldest);
      }
      crossReference(map, env.from);
    });

    const id = window.setInterval(broadcast, 20_000);
    const initial = window.setTimeout(broadcast, 1500);
    return () => { off(); window.clearInterval(id); window.clearTimeout(initial); };

    function crossReference(map: Map<string, Grid>, latestFrom: string) {
      if (map.size < 2) return; // need at least me + 2 peers to hit 3
      const localGrid = loadLocalGrid(courseMap);
      const buckets = new Map<string, { course: string; unit: string; count: number; peers: Set<string> }>();
      const tally = (from: string, grid: Grid) => {
        for (const u of grid) {
          if (u.level === "green") continue;
          const key = `${u.courseName}::${u.unitName}`;
          const b = buckets.get(key) ?? { course: u.courseName, unit: u.unitName, count: 0, peers: new Set() };
          if (!b.peers.has(from)) { b.peers.add(from); b.count = b.peers.size; }
          buckets.set(key, b);
        }
      };
      tally(myName, localGrid);
      for (const [from, grid] of map.entries()) tally(from, grid);

      for (const b of buckets.values()) {
        if (b.count >= 3) {
          const pct = Math.round((b.count / (map.size + 1)) * 100);
          const key = `${b.course}::${b.unit}::${new Date().toISOString().slice(0,10)}`;
          if (!dedupeFire(key)) continue;
          pushInbox({
            kind: "sync",
            title: `Syndicate Blind-Spot flagged: ${b.course} · ${b.unit}`,
            body:
              `A collective conceptual vulnerability has been captured across ${pct}% of your connected peer network for ${b.course} — ${b.unit}. ` +
              `To maximize group study efficiency, your next joint WebRTC Pomodoro sprint should focus exclusively on a shared LaTeX formula breakdown of this sector.`,
            payload: { course: b.course, unit: b.unit, peers: Array.from(b.peers), pct },
          });
        }
      }
    }
  }, [link, myName, courses]);

  return null;
}