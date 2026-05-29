// Scene rendering. Top-level renderer entry point.
// Clears root, validates layout via runStructuralGuards, renders background,
// items, and labels. No scene-name branching anywhere.

import { runStructuralGuards } from "./structural_guards.js";
import type { PipelineResult } from "../layout/types.js";
import { renderBackground } from "./render_background.js";
import { renderItem } from "./render_item.js";
import { renderLabel } from "./render_label.js";

//============================================

/**
 * Render a complete scene from a PipelineResult.
 * 1. Clears the root element.
 * 2. Calls runStructuralGuards for layout validation (throws on failure).
 * 3. Renders background.
 * 4. Renders each item and its label, appended in depth_tier order.
 * No scene-name branching. Throws on validation failure.
 *
 * @param root - HTMLElement (typically #scene-root) to render into
 * @param result - PipelineResult from runPipeline
 * @param viewport - Optional actual pixel dimensions of the scene root panel.
 *                   When provided, Guard 5 (aspect ratio) uses these dimensions
 *                   instead of DEFAULT_VIEWPORT. Must match the viewport passed
 *                   to runPipeline so the aspect check is consistent.
 * @throws Error if layout validation fails or SVG asset is missing
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

  // Validate layout. Throws if invalid. Renderer never paints invalid layout.
  // Pass viewport so Guard 5 aspect check uses the correct panel dimensions.
  runStructuralGuards(result.final, result.scene, viewport);

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
