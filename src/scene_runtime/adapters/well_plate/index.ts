/**
 * Adapter for well-plate objects (kind: "plate").
 *
 * Exports tryRenderWellPlate() which the scene renderer calls when it encounters
 * a plate-kind placement.
 */

import type { PlacementConfig, ObjectConfig, RuntimeWorld } from "../../types";
import { renderWellPlate } from "./render";

/**
 * Try to render a well-plate object. Returns true if this adapter handled the placement.
 *
 * @param placement The placement to render.
 * @param objectConfig The object configuration.
 * @param container The SVG container to render into.
 * @param x The left edge of the placement bounds.
 * @param y The top edge of the placement bounds.
 * @param width The width of the placement bounds.
 * @param height The height of the placement bounds.
 * @param world The RuntimeWorld containing object state and materials.
 * @returns true if the placement was handled by this adapter; false otherwise.
 */
export function tryRenderWellPlate(
  placement: PlacementConfig,
  objectConfig: ObjectConfig,
  container: SVGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  world?: RuntimeWorld,
): boolean {
  // Check if this is a plate-kind object.
  if (objectConfig.kind !== "plate") {
    return false;
  }

  // Render the well plate.
  renderWellPlate(
    placement,
    objectConfig,
    container,
    x,
    y,
    width,
    height,
    world,
  );

  return true;
}

/**
 * Well-plate adapter: handles plate-kind objects and renders their cells as a grid.
 */
export const wellPlateAdapter = {
  tryRender: tryRenderWellPlate,
};
