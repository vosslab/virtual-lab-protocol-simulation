// Scene rendering. Top-level renderer entry point.
// Clears root, classifies layout via collectStructuralViolations, renders
// background, items, and labels. No scene-name branching anywhere.
//
// Report-mode design: a structural violation NEVER blanks the scene. The
// renderer collects violations, marks the root degraded, warns, and still
// renders every item so the problem (overlap, off-scene label, distortion) is
// visible for diagnosis. The throwing guard mode lives in tests/CI only.

import { collectStructuralViolations } from "./structural_guards.js";
import type { PipelineResult } from "../layout/types.js";
import { renderBackground } from "./render_background.js";
import { renderItem } from "./render_item.js";
import { renderLabel } from "./render_label.js";

//============================================

/**
 * Render a complete scene from a PipelineResult.
 * 1. Clears the root element.
 * 2. Collects structural violations (report mode; never throws).
 * 3. When violations exist: marks root degraded, warns, and STILL renders.
 * 4. Renders background.
 * 5. Renders each item and its label, appended in depth_tier order.
 * No scene-name branching. Never blanks the scene on a structural violation;
 * the strict/throwing guard mode is reserved for tests and CI.
 *
 * @param root - HTMLElement (typically #scene-root) to render into
 * @param result - PipelineResult from runPipeline
 * @param viewport - Optional actual pixel dimensions of the scene root panel.
 *                   When provided, Guard 5 (aspect ratio) uses these dimensions
 *                   instead of DEFAULT_VIEWPORT. Must match the viewport passed
 *                   to runPipeline so the aspect check is consistent.
 */
export function renderScene(
  root: HTMLElement,
  result: PipelineResult,
  viewport?: { w: number; h: number },
): void {
  // Clear root. Preferred: removeChild loop avoids innerHTML entirely.
  // Using innerHTML is the one other innerHTML site allowed (only for clearing).
  while (root.firstChild) {
    root.removeChild(root.firstChild);
  }

  // Classify layout in report mode. Pass viewport so Guard 5 aspect check uses
  // the correct panel dimensions. A violation degrades, never blanks, the scene.
  const violations = collectStructuralViolations(result.final, result.scene, viewport);
  if (violations.length > 0) {
    // Surface the degraded state in the DOM so diagnostic tools can detect it.
    root.setAttribute("data-scene-degraded", "true");
    root.setAttribute("data-degraded-violation-count", String(violations.length));
    // Warn loudly (one grouped message) but keep rendering every item.
    const summary = violations.map((v) => `[${v.guard}] ${v.message}`).join("\n");
    // eslint-disable-next-line no-console
    console.warn(
      `Scene "${result.scene.scene_name}" rendered DEGRADED with ${violations.length} structural violation(s):\n${summary}`,
    );
  } else {
    // Clean render: ensure no stale degraded marker remains on a reused root.
    root.removeAttribute("data-scene-degraded");
    root.removeAttribute("data-degraded-violation-count");
  }

  // Render background.
  if (result.scene.background) {
    renderBackground(root, result.scene.background);
  }

  // Render items and labels in depth_tier order (already sorted in result.final).
  for (const item of result.final) {
    const itemEl = renderItem(item);
    root.appendChild(itemEl);

    const labelEl = renderLabel(item);
    root.appendChild(labelEl);
  }
}
