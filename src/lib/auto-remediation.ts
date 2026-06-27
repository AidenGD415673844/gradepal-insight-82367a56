// Client-side daemon: monitors each subject's "grading insulation buffer"
// (distance above the next letter-grade threshold). When the buffer drops
// below 3.0 percentage points OR the rolling trend is downward, scan that
// subject's Syllabus Mastery Grid for the highest-density red/amber topic
// and inject a formal remediation card into the To-Do column.

import { useEffect, useState } from "react";

const KEY = "gradecalc-auto-remediation-v1";
const EVT = "gradecalc-auto-remediation-change";
const RUN_MARK = "gradecalc-auto-remediation-last";
const BUFFER_FLOOR = 3.0; // percentage points

export type RemediationCard = {
  id: string;
  createdAt: number;
  subjectId: string;
  subjectName: string;
  topicLabel: string;
  buffer: number;
  done: boolean;
  title: string;
  body: string;
};

function read(): RemediationCard[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(list: RemediationCard[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(EVT));
}

export function useRemediationQueue(): RemediationCard[] {
  const [list, setList] = useState<RemediationCard[]>(() => read());
  useEffect(() => {
    const refresh = () => setList(read());
    refresh();
    window.addEventListener(EVT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return list;
}

export function markRemediationDone(id: string) {
  const list = read().map((c) => (c.id === id ? { ...c, done: true } : c));
  write(list);
}

export function clearRemediation(id: string) {
  write(read().filter((c) => c.id !== id));
}

export type SubjectScanInput = {
  subjectId: string;
  subjectName: string;
  recentAverages: number[]; // chronological percentages used to detect trend
  buffer: number;            // distance above the next letter threshold (pp)
  redTopic?: string | null;  // densest red/amber syllabus topic name
};

/** Run one scan pass. Idempotent within a 12h window. */
export function runRemediationScan(subjects: SubjectScanInput[]): RemediationCard[] {
  if (typeof window === "undefined") return [];
  const now = Date.now();
  const lastRaw = localStorage.getItem(RUN_MARK);
  const last = lastRaw ? Number(lastRaw) : 0;
  if (now - last < 12 * 3600_000) return read();
  localStorage.setItem(RUN_MARK, String(now));

  const existing = read();
  const existingActive = new Set(existing.filter((c) => !c.done).map((c) => c.subjectId));
  const additions: RemediationCard[] = [];

  for (const s of subjects) {
    if (existingActive.has(s.subjectId)) continue;
    const slope = trendSlope(s.recentAverages);
    const exposed = s.buffer < BUFFER_FLOOR;
    const declining = slope < -0.15; // pp per task
    if (!exposed && !declining) continue;
    const topic = s.redTopic ?? "your weakest current unit";
    const card: RemediationCard = {
      id: `rem_${s.subjectId}_${now}`,
      createdAt: now,
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      topicLabel: topic,
      buffer: s.buffer,
      done: false,
      title: `Automated System Remediation: ${s.subjectName} Safety Cushion Restoration Task`,
      body: `Your grading cushion is currently exposed (buffer ${s.buffer.toFixed(1)}pp${declining ? `, trend ${slope.toFixed(2)}pp/task` : ""}). Action Plan: Initialize a 25-minute Pomodoro study block focusing exclusively on ${topic} to restore your safety runway.`,
    };
    additions.push(card);
  }
  if (!additions.length) return existing;
  const merged = [...additions, ...existing].slice(0, 24);
  write(merged);
  return merged;
}

function trendSlope(arr: number[]): number {
  if (arr.length < 3) return 0;
  const n = arr.length;
  const xs = arr.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = arr.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (arr[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
