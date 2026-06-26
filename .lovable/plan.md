# Phase 4 — Plan

Grouped into 4 shippable phases. Tell me which to ship first; default order is 4A → 4B → 4C → 4D.

---

## Phase 4A — Critical Bug Fixes (HIGH PRIORITY)

**0. AI subsystem audit**
- Verify `/ai/analyser` route resolves (current file is `ai.analyser.tsx` — TanStack dot-routing). The user asked for `ai-analyser.tsx`, but that would break the `/ai` tab layout. Will keep the working dot-route AND add a redirect alias `ai-analyser.tsx → /ai/analyser` so old links don't 404.
- `AIGraderDialog.tsx`: move `imageDataUrl` out of the user text prompt into a separate vision `image_url` content block (OpenAI-compatible multimodal message). Prevents the JSON regex from sucking in base64.
- `src/lib/openrouter.ts`: keep working endpoint `https://openrouter.ai/api/v1/chat/completions` (the bare `openrouter.ai` URL the user wrote would 404 — will explain). Swap models to vision-capable free slugs:
  - Grader: `google/gemini-flash-1.5-8b:free` (vision)
  - Analyser + Helper fallback: `google/gemini-flash-1.5-8b:free`
- `getKeys()`: already reads `VITE_AI_API_KEY` / `_2` via `import.meta.env`. Will verify `vite.config.ts` alias from bare `AI_API_KEY` → `VITE_AI_API_KEY` is correct so the "key missing" warning disappears.
- Add **Chain-of-Thought** stream to AI Analyser Pro: prepend a "Reasoning trace" system instruction; show italic gray "thinking" block above the final answer.

**0.5. Transcript / Parent-teacher export clipping**
- `TranscriptSheet.tsx` + `ConsultationBrief.tsx`: fix the first-row cutoff (CSS `page-break-inside: avoid` + add `pt-4` to first `<tr>`; remove the negative-margin header overlap).

---

## Phase 4B — UI Upgrades

**0.75. Peers Hub polish**
- Group chat: redesign header (avatar stack, member count, edit-name pencil).
- Add Members button moved to a prominent floating action chip inside the chat header.
- Editable group name with a profanity filter (small local blocklist).
- Host-only rejoin: if host leaves they can re-enter freely; non-host must request → host approves via inbox card.
- Leaderboard: responsive 1-col stack on `<sm`, sticky rank column on tablet+.

**Fonts + Checkboxes**
- New Settings section "Typography": choose font family (System, Helvetica, Inter, Georgia Serif, JetBrains Mono) + weight/style (Bold/Italic/Light). Persists in `localStorage`, applied via `<html data-font>` + CSS vars.
- Kanban tasks: add proper checkbox to mark a task done (in addition to drag).

---

## Phase 4C — Five Productivity Modules

1. **Syllabus Resource Binder** — folder icon per sub-topic in Syllabus Mastery; slide-out drawer stores URL list per topic in `localStorage` under `gp_resource_binder:<topic_id>`.
2. **Assessment Countdown Runway** — top-of-dashboard horizontal band rendering 4 nearest Kanban tasks with live `hh:mm` countdown (1s tick), color graded by urgency.
3. **Exam Day Checklist** — click an exam block in the timetable → modal with calculator / drafting / pass / pens checkboxes + completion progress bar, persisted per exam id.
4. **Profile Vault Exporter** — export icon next to each profile in the Multi-Profile switcher; serializes that profile's courses/grades/timetable to a downloadable `.json` text file.
5. **Accent Palette Studio** — six capsules (Oxford Blue, Crimson, Cambridge Emerald, Slate, Obsidian, Monochrome) in Settings; sets `--primary` / `--accent` / `--border` tokens; persists in `localStorage`.

---

## Phase 4D — Navigation Consolidation

- Merge **Peer Network Hub + Inbox** → "Peer Network & Inbox" with floating Inbox icon in bottom-right corner of `/peers` opening a Sheet.
- Merge **Forecasting Hub + Advanced** → "Advanced Statistics" parent route with two sub-tabs (Forecasting / Advanced Tools).
- Update `AppShell` sidebar + route tree.

---

## Out-of-scope this turn
- "Test WebRTC on two devices end-to-end" — I can't drive two physical devices; will instead Playwright-test the join/leave handshake locally with two browser contexts.

---

**Which phase should I ship now? (4A recommended — it unblocks AI features.)**