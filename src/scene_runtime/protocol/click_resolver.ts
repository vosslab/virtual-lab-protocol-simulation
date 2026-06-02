// src/scene_runtime/protocol/click_resolver.ts
//
// Single delegated click listener that resolves scene clicks to semantic
// targets via [data-item-id] attributes. Routes validated clicks to the
// step machine through an on_click callback.
//
// Contract:
// - Rendered scene objects carry [data-item-id] attribute (set by renderer).
// - Root element is the scene-host (typically <div id="scene-root">).
// - On click, walk up via closest('[data-item-id]'). If found, invoke
//   on_click(target_name, "click").
// - No DOM mutation, no event emission, no global state.
// - Returns DetachFn to remove the listener.
//
// Per PRIMARY_SPEC.md "walker rule" and PRIMARY_DESIGN.md "visible interaction",
// the click resolver respects the visible UI: it reads only DOM attributes set
// by the renderer and calls user-provided callbacks without side effects.
//
// Related:
// - src/scene_runtime/renderer/render_item.ts (sets [data-item-id])
// - docs/specs/SCENE_VOCABULARY.md (placement / data-item-id contract)
// - runtime_seam_plan.md WP-2-4 (this module's spec)

import type { Gesture } from "../../shell/adapter/types.js";

//============================================

/**
 * Callback invoked when a valid click resolves to a scene target.
 * target_name is the value of [data-item-id] on the clicked element or
 * its closest ancestor. gesture is always "click" in this WP; other gestures
 * (drag, adjust, select, type) are handled by separate resolvers in future WPs.
 */
export type ClickCallback = (target_name: string, gesture: Gesture) => void;

/**
 * Function returned by attach_click_resolver. Call to detach the listener.
 */
export type DetachFn = () => void;

//============================================

/**
 * Attach a single delegated click listener to a root element.
 *
 * On every click on the root or its descendants, walks up via
 * closest('[data-item-id]'). If a match is found, invokes
 * on_click(target_name, "click"). If no match, the click is ignored.
 *
 * No DOM mutation, no event emission, no global state. Returns a
 * DetachFn that removes the listener.
 *
 * @param root - The root element to attach the listener to (typically
 *   the scene-host <div id="scene-root">).
 * @param on_click - Callback fired when a click resolves to a target with
 *   [data-item-id].
 * @returns DetachFn that removes the listener when called.
 *
 * @throws TypeError if root is not an HTMLElement or on_click is not a function.
 */
export function attach_click_resolver(root: HTMLElement, on_click: ClickCallback): DetachFn {
  // Validate inputs.
  if (!(root instanceof HTMLElement)) {
    throw new TypeError("root must be an HTMLElement");
  }
  if (typeof on_click !== "function") {
    throw new TypeError("on_click must be a function");
  }

  // Single delegated listener.
  const listener = (event: Event): void => {
    // Ensure we have a MouseEvent (guards against synthetic or non-click events).
    if (!(event instanceof MouseEvent)) {
      return;
    }

    // event.target is the element that received the click. Walk up to find
    // the closest ancestor (or target itself) carrying [data-item-id].
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const element = target.closest("[data-item-id]");
    if (element instanceof Element) {
      const targetName = element.getAttribute("data-item-id");
      if (targetName !== null) {
        // Gesture is always "click" in this WP.
        on_click(targetName, "click");
      }
    }
  };

  // Attach the listener in the capture phase for early interception.
  root.addEventListener("click", listener, true);

  // Return a detach function.
  const detach: DetachFn = () => {
    root.removeEventListener("click", listener, true);
  };

  return detach;
}
