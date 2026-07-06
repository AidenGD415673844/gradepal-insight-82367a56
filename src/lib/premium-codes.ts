// Globally bundled promo codes. Operators can EXPORT a new code from the
// Admin Command Center → Tab C and paste the printed snippet into this
// array to make the code automatically active for EVERY user worldwide
// on next deploy. Locally-saved promos live in localStorage and merge on top.

export type GlobalPromo = {
  code: string; // uppercase keyword
  hkd: number; // wallet credit amount in HKD
  note?: string;
};

export const GLOBAL_PROMOS: GlobalPromo[] = [
  { code: "WELCOME3", hkd: 3, note: "Sign-up bonus" },
  { code: "UPDATE6JUL", hkd: 10, note: "Cool bonus" },
  { code: "SUMMER2026", hkd: 5, note: "Summer promo" },
  { code: "ENDOFYEAR2026", hkd: 20, note: "Summer promo 2" },
];
