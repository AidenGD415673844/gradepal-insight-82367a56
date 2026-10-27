import { describe, it, expect } from "vitest";
import { applyCurve, imaginarySqrtPart } from "./curve";
describe("sqrt curve", () => {
  it("negative score gives NaN, not 0", () => { expect(Number.isNaN(applyCurve(-10, { kind: "sqrt" }))).toBe(true); });
  it("imaginary part of -10 is 31.6", () => { expect(imaginarySqrtPart(-10)!).toBeCloseTo(31.62, 1); });
  it("49 curves to 70", () => { expect(applyCurve(49, { kind: "sqrt" })).toBe(70); });
});
