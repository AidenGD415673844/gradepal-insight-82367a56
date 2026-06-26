// =============================================================================
// Client-side OpenRouter façade. The actual API key lives ONLY on the server
// inside `openrouter.functions.ts`; this module just forwards requests to the
// `openrouterProxy` server function so the key is never bundled into the
// client JavaScript.
// =============================================================================
import {
  OR_MODELS,
  openrouterProxy,
  hasOpenRouterKeyFn,
  type ORMessage as _ORMessage,
  type ORFeature,
} from "./openrouter.functions";

export { OR_MODELS };
export type ORMessage = _ORMessage;
export type ORModel = ORFeature;

export class OpenRouterError extends Error {
  status: number;
  busy: boolean;
  constructor(message: string, status: number, busy = false) {
    super(message);
    this.status = status;
    this.busy = busy;
  }
}

// Cached server-side key presence check. Defaults to `true` so the AI hub UI
// renders normally on first paint; the real value resolves shortly after mount.
let _keyPresent = true;
let _keyChecked = false;
export function hasOpenRouterKey(): boolean {
  if (!_keyChecked && typeof window !== "undefined") {
    _keyChecked = true;
    hasOpenRouterKeyFn()
      .then((v) => {
        _keyPresent = !!v;
      })
      .catch(() => {});
  }
  return _keyPresent;
}

export async function callOpenRouter(opts: {
  feature: ORModel;
  messages: ORMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await openrouterProxy({ data: opts });
  if (!res.ok) {
    throw new OpenRouterError(res.message, res.status, res.busy);
  }
  return res.content;
}