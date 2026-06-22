// Globally bundled subscription/master codes. Operators can EXPORT a snippet
// from the Admin Command Center → Master List tab and paste rows into the
// arrays below to push them to EVERY device worldwide on the next deploy.
// Locally-saved master entries (admin local) and per-device promos still
// merge on top of these.

import type { MasterEntry } from "./premium";
import type { GlobalPromo } from "./premium-codes";

export const BROADCAST_MASTERS: MasterEntry[] = [
  // Examples (uncomment to ship globally):
  // { key: "GOLDEN", kind: "tier", tier: "pro_annual" },
  // { key: "MOON",   kind: "tier", tier: "student_monthly" },
  // { key: "VIP",    kind: "wallet", amount: 25 },
];

export const BROADCAST_PROMOS: GlobalPromo[] = [
  // Examples:
  // { code: "SUMMER25", hkd: 5, note: "Summer promo" },
];