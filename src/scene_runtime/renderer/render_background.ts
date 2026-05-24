// Background rendering. Supports gradient-only (M2b/M2c invariant).
// Switches on background type. Unknown types throw loudly.

import type { Background } from "../layout/types.js";

//============================================

/**
 * Render a background onto a host element.
 * Switches on background.type. M2b/M2c supports gradient only.
 *
 * @param host - HTMLElement to apply background to
 * @param bg - Background object with type and style parameters
 * @throws Error if background type is unknown
 */
export function renderBackground(host: HTMLElement, bg: Background): void {
  if (bg.type === "gradient") {
    const angle = bg.angle ?? 180;
    const gradient = `linear-gradient(${angle}deg, ${bg.from}, ${bg.to})`;
    host.style.background = gradient;
    return;
  }

  // Unknown type: loud failure
  const unknownType = (bg as { type: unknown }).type;
  throw new Error(`Unknown background type: "${String(unknownType)}"`);
}
