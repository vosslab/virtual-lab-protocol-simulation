// Label wrap helper. Splits at the space nearest the middle if the estimated
// width exceeds the budget. Caps at 2 lines. Per design_advice/LAYOUT_PIPELINE.md
// Stage 9 wrap rule.

import { AVG_CHAR_WIDTH_PCT } from "./constants.js";

export function wrapLabel(label: string | undefined, budget: number): string[] {
  if (!label) return [""];
  const estWidth = label.length * AVG_CHAR_WIDTH_PCT;
  if (estWidth <= budget * 1.1) return [label];
  const mid = label.length / 2;
  const spaces: number[] = [];
  const re = /\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(label)) !== null) spaces.push(m.index);
  if (spaces.length === 0) return [label];
  const nearest = spaces.reduce(
    (best, s) => (Math.abs(s - mid) < Math.abs(best - mid) ? s : best),
    spaces[0] as number,
  );
  const head = label.slice(0, nearest).trim();
  const tail = label.slice(nearest).trim();
  return [head, tail];
}
