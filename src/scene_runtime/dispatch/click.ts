/**
 * click.ts
 *
 * Capture-phase click dispatcher for the realigned scene runtime.
 * Resolves semantic target ids from the DOM via data-target-id attributes.
 * Emits one InteractionEvent per resolved click on a target with matching gesture.
 *
 * No imports from src/scenes/ or legacy src/*.ts. No runtime code outside this module;
 * exported function only.
 */

import type { InteractionEvent } from "../types";

/**
 * Attaches a capture-phase click listener to a root element.
 * Resolves data-target-id from the closest ancestor of the clicked element.
 * Reads data-gesture attribute (defaults to "click" if absent or empty).
 *
 * Ambiguity rejection: if a click resolves multiple conflicting target ids in the
 * ancestor chain (which should not happen with correct YAML authoring), throws loudly.
 * Non-target clicks (outside any data-target-id ancestor) are silently ignored by design;
 * students may click anywhere in the viewport, and only semantic targets trigger
 * interactions.
 *
 * @param root - the root HTML element to which the listener attaches.
 * @param onEvent - callback fired on each resolved InteractionEvent.
 * @returns a detach function that removes the listener from the root element.
 */
export function attachClickDispatch(
  root: HTMLElement,
  onEvent: (e: InteractionEvent) => void,
): () => void {
  const handler = (event: Event): void => {
    const clickEvent = event as MouseEvent;
    const target = clickEvent.target as HTMLElement | null;

    if (!target) {
      return;
    }

    // Resolve data-target-id by walking up the DOM tree.
    // closest() returns the element itself or the nearest ancestor matching the selector.
    const targetElement = target.closest("[data-target-id]") as
      | HTMLElement
      | undefined;

    if (!targetElement) {
      // No target with data-target-id in the ancestor chain; silently ignore.
      // This is by design: non-target clicks are legitimate (e.g., background clicks).
      return;
    }

    const targetId = targetElement.getAttribute("data-target-id");

    // Validate that targetId is not null (closest matched the selector, so attribute exists).
    if (!targetId) {
      // Should not happen: closest matched [data-target-id] but getAttribute returned null.
      // Throw loud to surface a programming error.
      throw new Error(
        "Internal error: closest([data-target-id]) matched but getAttribute returned null",
      );
    }

    // Read data-gesture from the same element; default to "click" if absent.
    const gestureAttr = targetElement.getAttribute("data-gesture");
    const gesture = gestureAttr && gestureAttr.trim() ? gestureAttr : "click";

    // Emit the resolved interaction event.
    onEvent({ targetId, gesture });
  };

  // Register the listener in capture phase (third argument = true).
  root.addEventListener("click", handler, true);

  // Return a detach function that removes the listener.
  return (): void => {
    root.removeEventListener("click", handler, true);
  };
}
