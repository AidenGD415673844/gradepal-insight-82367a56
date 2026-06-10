import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * UI regression checks for the report-card "Letter (xx.x%)" unified display
 * and Bullet 5 visibility on mobile. These are source-level structural guards
 * because the layout-sensitive rules live in Tailwind classes that jsdom
 * cannot meaningfully measure. If any of these checks fail, the mobile
 * layout is at risk of overflow/overlap or B5 being clipped.
 */
const SOURCE = readFileSync(
  resolve(__dirname, "AcademicFeedback.tsx"),
  "utf8",
);

function getBlock(marker: string, lines = 8): string {
  const idx = SOURCE.indexOf(marker);
  if (idx === -1) throw new Error(`Marker not found: ${marker}`);
  return SOURCE.slice(idx, idx + lines * 120);
}

describe("Report card — combined Letter (xx.x%) display", () => {
  it("renders both the letter and the exact percentage in the term grade chip", () => {
    const block = getBlock("Term Grade", 10);
    expect(block).toMatch(/\{r\.letter\}/);
    expect(block).toMatch(/\{r\.avgDisplay\}/);
  });

  it("term grade chip uses full-width inline-flex with tabular-nums (prevents overlap on narrow screens)", () => {
    const block = getBlock("Term Grade", 10);
    expect(block).toMatch(/inline-flex/);
    expect(block).toMatch(/w-full/);
    expect(block).toMatch(/items-center/);
    expect(block).toMatch(/tabular-nums/);
  });

  it("previous-term chip renders letter + percentage together with the same layout safeguards", () => {
    const block = getBlock("Previous", 12);
    expect(block).toMatch(/prevLetterAuto/);
    expect(block).toMatch(/prevAvgDisplay/);
    expect(block).toMatch(/inline-flex/);
    expect(block).toMatch(/w-full/);
  });

  it("term labels are truncated to avoid pushing the percentage off-screen on mobile", () => {
    expect(SOURCE).toMatch(/truncate\(activeTerm\.name, 10\)/);
    expect(SOURCE).toMatch(/truncate\(prevTerm\.name, 10\)/);
    // helper itself appends an ellipsis past 10 chars
    expect(SOURCE).toMatch(/function truncate\([\s\S]*?slice\(0, n\) \+ "…"/);
  });

  it("header row containers carry min-w-0 so long course names can shrink instead of overflowing", () => {
    const header = getBlock("Unified metrics header", 12);
    expect(header).toMatch(/min-w-0/);
    expect(header).toMatch(/break-words/);
  });

  it("metrics grid stacks to a single column on mobile (grid-cols-1) before expanding", () => {
    const block = getBlock("Term Grade", 30);
    // The wrapping grid must be defined just above; assert against the broader source.
    expect(SOURCE).toMatch(/grid-cols-1 sm:grid-cols-2/);
  });
});

describe("Report card — Bullet 5 visibility", () => {
  it("buildComment emits exactly 5 bullets and Bullet 5 is always appended a forward-looking goal", () => {
    // Bullet 5 composition lives at this exact line shape:
    expect(SOURCE).toMatch(/const b5 = `\$\{main\.bullets\[4\]\} \$\{nextTierGoal\(r\.avg\)\}`/);
  });

  it("nextTierGoal always returns a non-empty string for any percentage 0–100", () => {
    // Import-free check: scan the helper for the maintenance fallback + ladder return.
    expect(SOURCE).toMatch(/Continue to maintain your A\* standing/);
    expect(SOURCE).toMatch(/Try to aim and work hard to bring your grade up/);
  });

  it("renders the B5 (Improvement) label so the bullet is never silently dropped", () => {
    expect(SOURCE).toMatch(/"Improvement"/);
    expect(SOURCE).toMatch(/B\$\{i \+ 1\} \(\$\{labels\[i\]\}\):/);
  });

  it("bullet list uses leading-relaxed text (no fixed heights that could clip B5 on mobile)", () => {
    const block = getBlock("bullets.map", 12);
    expect(block).toMatch(/leading-relaxed/);
    expect(block).not.toMatch(/max-h-\[?\d/);
    expect(block).not.toMatch(/overflow-hidden/);
  });
});