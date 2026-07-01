// =============================================================================
// GradePal Operations Update Log — expandable chronological changelog rendered
// inside the Settings viewport. Fully static / client-side.
// =============================================================================
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ScrollText } from "lucide-react";

type Entry = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

const LOG: Entry[] = [
  {
    version: "v3.5.0",
    date: "July 1, 2026",
    title: "Motivational Companion & 135-Token Framework",
    highlights: [
      "Unified AI credit engine — every tier now shares a clean 135-token daily pool that resets at midnight.",
      "Motivational rotating quotes embedded under the AI Logic Track loader.",
      "Analyser system prompt rewritten to prioritise student wellbeing alongside the numbers.",
      "Time Machine slots and Saved Reports slots both raised to 30 for Pro and Student tiers.",
      "Academic Archives Vault renamed to `gradecalc_vault_archive_[YEAR]` with backward-compatible listing.",
      "Pro Shop checklists rewritten to show the exact tier benefits.",
    ],
  },
  {
    version: "v3.4.0",
    date: "June 27, 2026",
    title: "AI Reasoning Core Sidebar & End-of-Year Time Capsule",
    highlights: [
      "AI Logic Track — live chain-of-thought sidebar with click-to-open reasoning core.",
      "Automated Summer Break archive engine with immutable museum view.",
      "Gradual wallet drain — credits accrue visibly during in-flight AI turns.",
      "AI_API_KEY_3 added to the multi-key server round-robin.",
    ],
  },
  {
    version: "v3.3.0",
    date: "June 24, 2026",
    title: "OpenRouter Multi-Key & Phase-2 Analytics",
    highlights: [
      "Server-side OpenRouter proxy with multi-key fallback (no client-bundled keys).",
      "Velocity Breach warnings, Lorenz/Gini curves, Study Streak, Sensitivity Matrix.",
      "PeerJS integration replaces raw SDP token exchange for smoother WebRTC handshakes.",
    ],
  },
  {
    version: "v3.2.0",
    date: "June 22, 2026",
    title: "Notebook Vault, Syndicate Canvas & KaTeX",
    highlights: [
      "Hierarchical Notebook Folders with base64 media and native KaTeX equations.",
      "Syndicate Canvas — SVG peer alignment matrix.",
      "AI Analyser migrated to /ai-analyser with Chain-of-Thought output.",
    ],
  },
  {
    version: "v3.1.0",
    date: "June 19, 2026",
    title: "Pro Shop, Wallet & Admin Center",
    highlights: [
      "Pro Shop tier ladder with cipher-token gateway ($7–$320 HKD).",
      "Dynamic Local Referral Wallet — +$1 HKD per accepted peer.",
      "Secure Administrator Command Center with 3-factor device lock.",
    ],
  },
  {
    version: "v3.0.0",
    date: "June 17, 2026",
    title: "Big Decentralisation Update",
    highlights: [
      "Peer Network Hub with Base64 token connection engine.",
      "100-message FIFO chat queue with delivery ticks.",
      "Automated client-side Weekly Performance Review engine.",
    ],
  },
];

export function OperationsUpdateLog() {
  const [open, setOpen] = useState(false);
  return (
    <Card className="p-5 max-w-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-left"
      >
        <ScrollText className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <h2 className="text-lg font-bold">GradePal Operations Update Log</h2>
          <p className="text-xs text-muted-foreground">
            Chronological changelog of every shipped engine revision.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">{LOG.length} releases</Badge>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-4 relative pl-6 animate-fade-in">
          <div className="absolute left-2 top-1 bottom-1 w-px bg-gradient-to-b from-primary via-primary/40 to-transparent" />
          {LOG.map((e) => (
            <div key={e.version} className="relative mb-4">
              <div className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-card" />
              <div className="rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary text-primary-foreground text-[10px]">{e.version}</Badge>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{e.date}</span>
                </div>
                <div className="text-sm font-bold mt-1">{e.title}</div>
                <ul className="mt-1.5 space-y-1 text-[12px] leading-snug text-muted-foreground list-disc pl-4">
                  {e.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}