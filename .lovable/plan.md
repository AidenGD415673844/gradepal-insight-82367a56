## Root cause of the "phantom" trend

In `AcademicFeedback.tsx` the previous-term tasks are computed with:

```ts
const previous = filterByTerm(allCourseTasks, prevTerm);
```

But in `src/lib/grade-utils.ts`, `filterByTerm` returns **all tasks** when the term argument is `null`:

```ts
export function filterByTerm(tasks, term) {
  if (!term) return tasks;   // ← null = no filter
  ...
}
```

So when there is no real previous term (the active term is the very first one, e.g. "Progress 1", or the user is on "All terms" where `activeTerm` is also null), `prevTerm` is `null` and `previous` silently becomes **every task for that course**. That makes `hasPrevData` true, `prevAvg ≈ avg`, and the trend bullet reports "held exactly steady relative to the previous term" — even with 1 task. That is exactly what both screenshots show (Mathematics 1 task → "5–10 point decline"; Mathematics All terms → "held exactly steady").

## Fix plan (scope: `src/components/grade/AcademicFeedback.tsx` only)

1. **Stop faking a previous term.** Compute `previous` only when `prevTerm` is a real term:
   ```ts
   const previous = prevTerm ? filterByTerm(allCourseTasks, prevTerm) : [];
   ```
   This kills the bogus "steady vs previous term" line on first term / All terms.

2. **Trend source selection** inside `buildComment`:
   - **Case A — real previous term with graded tasks** (`r.hasPrevData`): keep today's behavior, `delta = r.avg - r.prevAvg`.
   - **Case B — "All terms" view** (`activeTerm === null`): compute delta from the **full task history for that subject**, split chronologically into earlier vs later halves (using all of `r.done`, which is already the full task list in this case). No 2-task minimum gate — use whatever exists; only fall back to the preset message if `r.done.length < 2`.
   - **Case C — first real term** (`activeTerm !== null` and `prevTerm === null`): same earlier/later split, but over the current term's `r.done`. Same ≥2 threshold; otherwise preset "not enough data" message.
   - **Case D — single task, no prev term**: emit the preset
     `"There isn't enough data to establish a trend and trend feedback. Once you have more graded tasks, comparative progress insights will appear here."`

3. **Pass `activeTerm` awareness into the helper** by reading `activeTerm` from the closure (already in scope) — no signature change needed.

4. **Header label** — the existing "Previous (term name)" column already hides itself when `hasPrevTerm` is false, so no UI change required once #1 lands.

## Verification

- Update `AcademicFeedback.regression.test.ts` with three cases:
  1. First-term, 1 task → preset "not enough data" message (no "steady" wording).
  2. First-term, 4 tasks ascending → positive trend bullet (delta > 0).
  3. All-terms view, tasks spanning two terms with later half higher → positive trend bullet derived from full history, not from a phantom previous term.
- Run `bunx vitest run src/components/grade/AcademicFeedback.regression.test.ts`.

No changes to `grade-utils.ts`, `GradeScaleTester.tsx`, or `a-star-override.ts` are needed.
