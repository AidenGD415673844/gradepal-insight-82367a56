## Scope split

Two phases. Phase 1 = Notebook Vault + LaTeX + Syndicate Canvas + 6 quick fixes. Phase 2 = Velocity Breach + Lorenz/Gini + Streak Multiplier + Sensitivity Heatmap + Bulletin Board. All client-side, localStorage only, no servers.

---

## PHASE 1 — Notebook Vault, LaTeX, Syndicate Canvas + Quick Fixes

### 0. Quick fixes (small, high-leverage)
- **AICreditChip**: remove the "15 of 15" pill copy in AI column header; chip only shows balance.
- **Variable cost → work-scaled cost**: replace fixed `AI_COST` map with a `estimateCost(feature, payload)` function that returns 0.5–7.5 based on input size (chars, criteria count, rubric depth). Wire all call sites.
- **Cross-tier purchase bug**: in `premium.ts checkPurchase`, block ALL tier swaps while any tier active (not just same family). Only `switchTierFree` may move sideways with prorated time.
- **A* bug**: `applyAStarOverride` already uses `>= 91` — fix is in the *Grade Calculator* surface (`GradeScaleTester` / inline letter resolver) that bypassed the helper. Route every letter resolution through `applyAStarOverride`.
- **Flight Simulator realistic range**: derive `[min,max]` from actual grade history (p10..p90 of recent scores) instead of 0–100.
- **Top-ups redesigned**: separate section under subscription card. Prices: 10→$10, 20→$20, 50→$45, 75→$70, 100→$90, 150→$130. Adds to active subscription only; standalone if free.
- **New nav route `/ai-analyser`**: dedicated "AI Pro Analyser & Helper" chat surface (textarea + history in localStorage, calls existing AI gateway server fn). Move homework-helper out of inline panels.

### 1. Notebook Vault — Hierarchical Folders
- New route `/notebook` + components `NotebookSidebar`, `NotebookEditor`.
- `notebook-store.ts`: tree of `{id, name, color?, parentId, children[], notes[]}`, persisted to `gradecalc_notebook_v1`.
- Sidebar: collapsible folders, rename inline, color picker pulling from subject theme hexes.

### 2. Rich-text editor + base64 media
- ContentEditable block with toolbar: Bold/Italic/Underline/Code/Checklist (`document.execCommand` fallback + manual range ops).
- HTML5 drag-drop zone → `FileReader.readAsDataURL` → embed `<img src="data:...">` inline; stored in the note's HTML string in localStorage. Size guard (~2MB per asset, warn user).

### 3. KaTeX inline compiler
- `bun add katex`. Import CSS once in `__root.tsx`.
- Editor scans for `$...$` and `$$...$$` runs on debounce; replaces with rendered KaTeX HTML in a preview pane next to the editor (split view) to avoid caret-jump in contenteditable.

### 4. Syndicate Canvas Matrix
- Inside `/peers`, new component `SyndicateCanvas.tsx`. SVG canvas, center node = self, up to 4 peer orbs.
- Similarity delta = abs diff of average GPA + criterion vector cosine distance → line length 80–260px.
- Pulsing stroke via CSS `@keyframes`.
- **Broadcast Notes button** on each folder: dropdown of connected RTC peers (from existing `webrtc-peer.ts`), serializes folder JSON → `RTCEnvelope` kind `notes_payload` → recipient pushes "Notes Received" card into inbox.

---

## PHASE 2 — Analytics & alerts

1. **Velocity Breach** — background interval in grade-store; computes 7-day slope per course; on slope < −1.5 injects inbox card with decay rate + days-until-tier-break.
2. **Lorenz/Gini chart** — Advanced-only card in `/forecasting`; sort scores, plot cumulative share vs equity diagonal, compute Gini = 1 − 2∫L.
3. **Study Streak Multiplier** — listens to Kanban task updates; if 5 consecutive completions <48h apart, sets streak; badge in AppShell header; unlocks elite phrases in Optimization Hub commentary.
4. **Sensitivity Heatmap** — replace category list in advanced subject panel with grid; `score = weight * (100 - avg)`; crimson bg high, ice-blue low.
5. **Syndicate Bulletin** — extend peer token base64 to include 120-char `milestone` string; new bulletin row in `/peers`; importing peer pushes inbox notice.

---

## Technical notes (skip if non-technical)

- All new state in `localStorage` under `gradecalc_*` namespace.
- KaTeX is ~280KB gz; loaded once. No server calls.
- Notes payload over RTC reuses existing `RTCEnvelope` discriminated union (add `notes_payload` and `bulletin` variants).
- Velocity / Gini / sensitivity are pure functions — unit-testable.
- No changes to password locks, 10-bullet report, or existing card animations.

---

**Which phase should I ship now — Phase 1 or Phase 2?** (Other ships next turn.)
