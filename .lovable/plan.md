## Scope

Six client-only feature areas plus report-card text fixes. All math/state in JS + localStorage. No servers, no AI calls.

---

## 1. Saved Reports History Hub (15-slot)

- New route `src/routes/saved-reports.tsx` + nav entry on Home Screen / AppShell.
- New module `src/lib/saved-reports.ts`:
  - `listReports() / saveReport(snap) / deleteReport(id)` backed by `localStorage["gradecalc-saved-reports"]`.
  - Hard cap = 15. 16th save returns `{ok:false, reason:"cap"}`.
  - Custom event `gradecalc-saved-reports-change` for live UI sync.
- In `AcademicFeedback.tsx`:
  - "Save Report to History Hub" button. Captures deep-cloned JSON: `{subject, teacher, termGrades, goals, bullets:[b1..b5], signatureDataUrl, generatedAt}`.
  - On cap, render shadcn `Dialog` overlay: "History Capacity Reached…".
- `SavedReportsView` component: responsive grid of archive cards (subject, date badge, snippet). Click → full-fidelity modal reusing the same render component, with a "Delete Report" trash button.

## 2. Grade Corridor Volatility

- New helper `src/lib/grade-stats.ts`: `stddev(percents:number[])`, `corridorBand(avg, sd)`.
- In `Charts.tsx` `PerformanceOverTime`:
  - Compute σ across plotted percentages.
  - Add a `<ReferenceArea y1={avg-sd} y2={avg+sd}>` band (semi-transparent).
  - Badge above chart: σ<5 → Emerald "High Stability"; σ>15 → Amber "High Volatility Warning"; else neutral "Moderate".

## 3. Grade Horizon goal map

- New component `GradeHorizonMap.tsx` mounted in `Predictive`/Dashboard area.
- One card per course: dual-bar (solid current % + dotted goal marker via CSS `border-dashed` overlay).
- Live gap string: `gap = goal - current` → `"-3.2% to target"` or green badge "Target met" when `current >= goal`.
- Reuses existing per-course goal field on the course model.

## 4. WYSIWYG Print Transcript

- "Generate Official Transcript Document" button in report card → triggers `window.print()` after toggling a `transcript-print-mode` body class.
- New CSS in `src/styles.css` under `@media print`:
  - Hide `[data-print="hide"]` (sidebar, header, action bars).
  - Force white bg, black text, remove shadows/gradients.
  - `.transcript-sheet { … }` minimalist B/W layout.
- Inline `<TranscriptSheet />` rendered behind a `hidden print:block` wrapper, pulling course/task/term data from store + signature data URL from localStorage.

## 5. Weighted Category Stress Test

- New collapsible in `GradesTable` (or Predictive) — `StressTestSimulator.tsx`.
- Sliders per detected category. Sum-to-100 indicator turns red otherwise.
- Recomputes simulated overall average using existing `calcAverage` with overridden category weights, stored only in component state (does NOT mutate task weights in store).
- Live "Simulated Grade: X.X%" output.

## 6. Teacher Gradebook + Auth Gate

- New route `src/routes/teacher.tsx` + nav entry "Teacher Gradebook View".
- `src/lib/teacher-auth.ts`:
  - First visit → modal: create password + auto-generate `XXXX-XXXX-XXXX-XXXX` recovery key (crypto.getRandomValues, hex). Display once with copy button.
  - Store `{passwordHash, recoveryHash}` (SHA-256 via SubtleCrypto) in `localStorage["gradecalc-teacher-auth"]`.
  - Login modal otherwise; "Forgot password" → recovery-key flow resets password.
- Global `useTeacherMode()` hook → `teacherUnlocked: boolean`.
- Student read-only lock: when `!teacherUnlocked`, force `settings.parentView = true` semantics across editable inputs (reuse existing `readOnly` plumbing).
- Teacher gradebook UI:
  - For each subject: Criteria A/B/C/D rows + collapsible Interdisciplinary (A Evaluating, B Synthesizing, C Reflecting).
  - Each row = pill buttons: `N/A A* A B C D E F G`. Single-select, selected = green bg / white text.
  - Save to `localStorage["gradecalc-teacher-criteria"]` keyed by `courseId`.
  - Footer line: "ID Assessment above was last updated by Teacher on {locale date}".
- **Math isolation**: criteria values live in a separate store and are never read by `calcAverage`, GPA, predictive, or report-card math.

## 7. Report card feedback fixes (`AcademicFeedback.tsx`)

- Bullet 5: change `"roughly X% away"` → `"roughly X%–Y% away"` (Y = X + small adaptive cushion based on σ).
- Bullets 2–5: expand templates with extra clause using stats (σ, delta, trend slope).
- Trajectory adjustment: when `predicted - current >= +10` → bullets 1 & 4 quote a higher target band; when `<= -10` → quote a lower band.
- Band labeling: if `current` is within ±2% of a tier boundary, phrase as `"between the higher {lower}-band and the lower {upper}-band"` instead of `"in the high D band"`.

---

## Technical notes

- Storage keys: `gradecalc-saved-reports`, `gradecalc-teacher-auth`, `gradecalc-teacher-criteria`, `gradecalc-signature`.
- All hashing: `crypto.subtle.digest("SHA-256", …)` — no libs.
- Print mode: pure CSS toggle, no new deps.
- Charts: extend existing recharts usage with `ReferenceArea`; no new deps.
- Tests to add: `saved-reports.test.ts` (15-cap), `grade-stats.test.ts` (σ + band), `teacher-auth.test.ts` (hash + recovery), `AcademicFeedback.bullets.test.ts` (range phrasing + boundary phrasing + trajectory shift).

---

## Out of scope / will NOT change

- Numerical calculation pipeline (criteria scores stay isolated).
- Backend / Lovable Cloud (everything stays localStorage).
- Existing trend / A* override logic (kept).

---

## Open questions before I build

1. Where exactly should the "Teacher Gradebook View" and "Saved Reports" nav entries appear — in the existing AppShell top nav, or as cards on the Home/Index landing page (or both)?
2. For the Grade Horizon goal map: courses currently don't store an "aspirational goal %". OK if I add an optional `goalPct` field per course (editable inline on the card), default 90?
3. Print transcript: include all terms + GPA, or only the currently selected term in the report card view?
4. Teacher read-only lock — should it fully replace the existing "Parent View" toggle, or coexist (teacher unlock overrides parent view)?
