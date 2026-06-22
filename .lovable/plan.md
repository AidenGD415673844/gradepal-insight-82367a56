
# Implementation Plan — Phase A vs Phase B

Two large feature batches. Pick one to execute this turn; the other gets deferred.

---

## PHASE A — UI Design Studio + Monetization fixes + AI Credit engine + cross-page extensions

### A0. Bug fixes & monetization hardening (`src/lib/premium.ts`, `src/routes/shop.tsx`, `src/components/grade/AdminCommandCenter.tsx`)
- **No-charge downgrades / sidegrades**: in checkout, compare target tier family + price vs active tier. If user already has a higher-or-equal tier active, allow free switch (no wallet debit), just rewrite `K_TIER` with new tier + carry remaining time (prorated by ratio of HKD prices).
- **Double-purchase guard**: if same tier already active, block re-purchase unless within 24h of expiry; show "Already active until <date>". Extension only kicks in near expiry.
- **Wallet cap → $50** (was $250): update `WALLET_CAP = 50`, clamp existing balances on load.
- **Developer "Enter Code Given By Developer"** input on `/shop`: secondary input clearly labelled, routes through `redeemCode` but only accepts cipher tokens + master keys (filters out promo words for clarity).
- **Delete previous codes**: Admin → new tab "Redemption Log" listing `getRedeemed()`, each row has a Delete button (removes from `K_REDEEMED` so a token can be reused/tested). Also lets admin purge all.
- **No-code global subscription codes**: Admin → extend Master List tab to also publish entries into a "Live Master Broadcast" string stored in `localStorage` AND printable as a single base64 blob the dev can paste into a new file `src/lib/premium-broadcast.ts` (auto-loaded by `allPromos()` + `getMasters()`). Until pasted, the codes still work for every device that hits the public broadcast endpoint we mock via a hardcoded `BROADCAST_SEED` array — admin adds rows live, then exports the array snippet for next deploy. Same mechanism as promos, just for tier codes.

### A1. AI Credit engine (`src/lib/ai-credits.ts` — new)
- Rolling balance: 10 credits/day baseline, weekly cap 20, resets every Monday 00:00 local.
- Variable cost table: `ai_grader = 6.5`, `homework_helper = 0.8`, `analyser = 1.2`, `deep_generate = 3.0`, `feedback_bullets = 2.0`, etc. Single `spendCredits(feature)` API.
- Pro/Student top-ups: Pro grants +50 on activation, Student +25; weekly auto-refill while active.
- Hook into every AI call site (`AIGraderDialog`, `AIDeepGenerate`, future homework helper) — block + toast if insufficient, surface "Top up" CTA linking to `/shop`.
- Credit meter chip in `AppShell` header.

### A2. Workspace UX "small motors" (deferred from earlier)
- `/criteria`: drag-reorder rubric rows + duplicate button.
- `/inbox`: filter chips (Unread/Alerts/Tips/Archived) + saved filter persistence.
- `/grades`: sticky term filter bar, keyboard `n` to add row.
- `/forecasting`: snapshot pinning.

### A3. GradePal UI Design Studio (`src/components/grade/UIDesignStudio.tsx` — new, mounted in `/settings`)
- 4 theme profiles wired to CSS variables in `src/styles.css`:
  1. **ManageBac Dark** — midnight gray + white + emerald borders.
  2. **Aero Glass** — gradient bg + `backdrop-blur` cards via existing tailwind utilities.
  3. **Cyberpunk Neon** — obsidian + violet glow + magenta accents.
  4. **Monochrome E-Ink** — paper white, print-optimized.
- Storage: `gradecalc_theme_profile` in localStorage; applied via `data-theme` attr on `<html>`.
- Each profile overrides ~25 semantic tokens (`--background`, `--card`, `--primary`, `--border`, `--ring`, chart colors, shadow, radius). All shadcn components + Recharts pick it up automatically since they already read tokens.
- Opacity slider for card translucency (Aero/Cyberpunk only).
- Live preview panel inside the studio showing a card + button + chart sample.

### A4. Cross-page serverless ecosystem extensions
- `/criteria` ↔ `/peers`: "Share Rubric" button encodes criteria into existing peer token format; peers can import.
- `/peers` ↔ `/grades`: "Mock Transcript" — render peer's bullets into a TranscriptSheet preview.
- `/grades` ↔ `/reports`: cohort overlay line on subject projection chart using peer means.
- `/reports` ↔ `/inbox`: auto-drop a "New report ready" inbox card on generation.
- Page-mode extensions: each page reads a `?ext=` query and conditionally mounts an extension drawer (peer trends on /grades, criteria share on /peers, etc.).

**Phase A file impact**: ~6 new files, ~12 edited. Heavier on logic than visuals (except A3).

---

## PHASE B — Syndicate gauges + Pomodoro + Ripple alerts + Tournament + page extensions

### B1. Cohort Alignment Vector dial (`src/components/grade/CohortAlignmentDial.tsx`)
- Dual-needle SVG speedometer in `/syndicate`. Needle 1 = active user's course mean, Needle 2 = peer pacing (from `peer-network` ledger). Computes |Δ| variance and renders a diagnostic paragraph (safety margin, divergence band).

### B2. P2P Pomodoro Synchronizer (`src/components/grade/StudySprintDrawer.tsx`)
- Drawer mounted from `/timetable` + `/peers`. Uses existing `webrtc-peer.ts` data channel to broadcast `{type:'pomodoro', state:'run|pause|reset', remainingMs, ts}`. Both peers see synchronized ring + toast on state change.

### B3. Syndicate Ripple-Effect inbox warnings (`src/lib/ripple-monitor.ts`)
- Background interval (when peers connected) compares each peer's weekly velocity from their shared ledger snapshots. On sharp negative delta in a shared course, push the exact-worded warning card into local inbox (dedupe by peer+course+week).

### B4. Mock Exam Tournament Arena
- Extend `FlightSimulator.tsx` with a `tournament` mode: "Initiate Academic Simulation Challenge" button in `/peers`. WebRTC challenge handshake → identical seeded disruption prompts on both clients → both submit baseline scores per round → real-time sparkline overlay of both deltas → winner declaration screen.

### B5. Page-specific extensions
- `/inbox`: bulk-archive toolbar + auto rule-checker that pulse-borders unread Volatility Alerts (amber).
- `/peers`: Connection Health Metre per friend card — sampling DataChannel `bufferedAmount` + ping RTT, micro-sparkline of last 30 samples.
- `/reports`: Historical Trend Compare widget overlaying last 3 term snapshots on the current term preview.
- `/criteria`: Rubric Weight Sandbox — per-card slider that re-projects target averages live without persisting until "Save".

**Phase B file impact**: ~5 new files, ~6 edited. Heavier on WebRTC + canvas/SVG.

---

## Which one this turn?

Both are large; doing both at once risks shallow execution on each. Recommend one phase fully polished now, the other next turn.

**Reply with `A` or `B`** (or "A then B next turn") and I'll execute.
