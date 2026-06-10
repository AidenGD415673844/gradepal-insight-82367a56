/**
 * Shared A* override used by both the report card (AcademicFeedback)
 * and the GradeScaleTester so the ≥91% promotion behaves identically
 * on both surfaces. Kept in its own module to avoid a circular import
 * between the two components.
 */
export const A_STAR_MIN = 91;

export function applyAStarOverride(avg: number, letter: string): string {
  return avg >= A_STAR_MIN ? "A*" : letter;
}