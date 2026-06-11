/**
 * Advanced Grade Curve Engine — client-side, pure math, no eval/Function.
 * Only unlocks when subject score < 71%. Letter mapping callers re-run on
 * the curved score so the dashboard reflects the new band live.
 */
export type CurveKind = "sqrt" | "bump" | "linear" | "formula";

export type CurveConfig =
  | { kind: "sqrt" }
  | { kind: "bump"; points: number }
  | { kind: "linear"; m: number; c: number }
  | { kind: "formula"; expr: string };

export function applyCurve(score: number, cfg: CurveConfig): number {
  let out = score;
  switch (cfg.kind) {
    case "sqrt":
      out = Math.sqrt(Math.max(0, score)) * 10;
      break;
    case "bump":
      out = score + cfg.points;
      break;
    case "linear":
      out = cfg.m * score + cfg.c;
      break;
    case "formula":
      out = safeEval(cfg.expr, score);
      break;
  }
  if (!Number.isFinite(out)) return score;
  return Math.max(0, Math.min(100, out));
}

/**
 * Tiny shunting-yard evaluator that supports + - * / ^ ( ) and the variable
 * x. NO `eval`/`Function`. Anything unrecognised throws and the caller falls
 * back to the original score.
 */
export function safeEval(expr: string, x: number): number {
  const tokens = tokenize(expr.toLowerCase().replace(/\s+/g, ""));
  const out: (number | string)[] = [];
  const ops: string[] = [];
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
  const right: Record<string, boolean> = { "^": true };
  for (const t of tokens) {
    if (typeof t === "number") out.push(t);
    else if (t === "x") out.push(x);
    else if (t === "(") ops.push(t);
    else if (t === ")") {
      while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()!);
      if (ops.pop() !== "(") throw new Error("paren");
    } else if (t in prec) {
      while (
        ops.length &&
        ops[ops.length - 1] !== "(" &&
        (prec[ops[ops.length - 1]] > prec[t] ||
          (prec[ops[ops.length - 1]] === prec[t] && !right[t]))
      ) {
        out.push(ops.pop()!);
      }
      ops.push(t);
    } else throw new Error("token");
  }
  while (ops.length) {
    const op = ops.pop()!;
    if (op === "(") throw new Error("paren");
    out.push(op);
  }
  const st: number[] = [];
  for (const tok of out) {
    if (typeof tok === "number") st.push(tok);
    else {
      const b = st.pop()!;
      const a = st.pop()!;
      if (a === undefined || b === undefined) throw new Error("expr");
      st.push(
        tok === "+" ? a + b :
        tok === "-" ? a - b :
        tok === "*" ? a * b :
        tok === "/" ? a / b :
        Math.pow(a, b),
      );
    }
  }
  if (st.length !== 1) throw new Error("expr");
  return st[0];
}

function tokenize(s: string): (number | string)[] {
  const out: (number | string)[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i;
      while (j < s.length && ((s[j] >= "0" && s[j] <= "9") || s[j] === ".")) j++;
      out.push(Number(s.slice(i, j)));
      i = j;
    } else if (ch === "x") {
      out.push("x");
      i++;
    } else if ("+-*/^()".includes(ch)) {
      // unary minus / plus
      if (
        (ch === "-" || ch === "+") &&
        (out.length === 0 ||
          (typeof out[out.length - 1] === "string" &&
            "+-*/^(".includes(out[out.length - 1] as string)))
      ) {
        out.push(0);
      }
      out.push(ch);
      i++;
    } else throw new Error("char");
  }
  return out;
}