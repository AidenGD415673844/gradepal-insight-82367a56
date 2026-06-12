## Root cause

`useReportTemplate` (in `src/lib/report-template.ts`) is just a local `useState` + `localStorage` writer. Each component that calls it gets its **own independent state**:

- `ReportTemplateDialog` has one copy → user clicks "International" / "中文" / "Mono" → it updates *its* state and writes to localStorage.
- `AcademicFeedback` has a separate copy → it only read localStorage once on mount, so it never sees the new value.

That's why the report card keeps showing the old layout, English labels, and the old font even though the dialog clearly reflects the user's selection.

## Fix

Turn `useReportTemplate` into a tiny shared store so every consumer re-renders when any one of them calls `update(...)`.

### `src/lib/report-template.ts`

- Keep `loadTemplate` / `saveTemplate` as-is.
- Add a module-level `current: ReportTemplate` value and a `Set<Listener>` of subscribers.
- Replace the hook body with `useSyncExternalStore` (or a manual `useEffect` + `useState` pair) that:
  1. Subscribes to the listener set on mount.
  2. Returns the live `current` value.
- The `update(patch)` function: merge into `current`, `saveTemplate(current)`, then notify every listener.
- Also listen to the browser `storage` event so changes in another tab propagate.

No API change — `useReportTemplate()` still returns `[template, update]`, so `ReportTemplateDialog` and `AcademicFeedback` keep working unchanged.

### Result

- Clicking a different layout in the Templates dialog instantly re-renders `AcademicFeedback` with the new `chipCls` / `cardCls` / gradient header.
- Switching Language (`en/es/fr/zh`) immediately swaps the `I18N[tpl.lang]` labels (TEACHER → PROFESOR / ENSEIGNANT / 教师, etc.).
- Switching Font (System/Serif/Mono) updates the inline `fontFamily` on the report `Card`, which cascades to all text children.

No other files need changes — the consumers are already wired correctly; they were just reading a stale local copy.

## Out of scope

I am not changing what each template looks like, the i18n dictionary, or font choices — those are already implemented and will work as designed once state is shared. If after the fix you want the layout differences between presets to be more dramatic, that's a follow-up.
