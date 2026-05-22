/**
 * render.ts
 *
 * Well-plate adapter: renders a 96-well plate as a static grid of 96 SVG cells.
 * Each cell has data-target-id="<placement.object_name>.<A1..H12>".
 *
 * Additionally, emits group-container SVG <g> elements wrapping subgroups of cells
 * (rows, columns, all_wells, blocks) per the object's declared subpart_groups.
 * Each group carries data-target-id="<placement.object_name>.<group_name>".
 *
 * Input: placement (PlacementConfig), objectConfig (ObjectConfig), container (SVG group),
 *        x, y, width, height (placement bounds).
 *
 * Output:
 * - Group containers (non-visual wrappers) for each subpart_group.
 * - 96 child rect elements arranged in 8 rows × 12 cols, sized to fit bounds.
 */

import type {
  PlacementConfig,
  ObjectConfig,
  SubpartGroupConfig,
  RuntimeWorld,
} from "../../types";

/**
 * Render a 96-well plate as 96 child SVG elements in a grid layout, wrapped in group containers.
 *
 * Per-cell visual state is resolved from world.objectStates (per-subpart material_name)
 * and world.materials (material display_color). If world is not provided, cells render
 * in a default static style.
 *
 * @param placement The placement configuration (contains object_name and other metadata).
 * @param objectConfig The object configuration (contains structure with subpart_groups).
 * @param container The SVG container (usually a <g>) to render children into.
 * @param x The left edge of the placement bounds.
 * @param y The top edge of the placement bounds.
 * @param width The width of the placement bounds.
 * @param height The height of the placement bounds.
 * @param world Optional RuntimeWorld for per-cell state and material color lookup.
 */
export function renderWellPlate(
  placement: PlacementConfig,
  objectConfig: ObjectConfig,
  container: SVGElement,
  x: number,
  y: number,
  width: number,
  height: number,
  world?: RuntimeWorld,
): void {
  const ROWS = 8;
  const COLS = 12;

  // Derive cell dimensions from bounds.
  const cellWidth = width / COLS;
  const cellHeight = height / ROWS;

  /**
   * Resolve the fill color for a cell based on its material_name state.
   * Looks up material_name in world.objectStates[`<placement.object_name>.<cellName>`],
   * then resolves the material's display_color from world.materials.
   * Returns default empty color (#f0f0f0) if world is absent or material not found.
   * Throws loudly if material is named but not found in world.materials.
   */
  function getCellFillColor(cellName: string): string {
    // Default color for empty wells
    const DEFAULT_EMPTY_COLOR = "#f0f0f0";

    // If no world provided, use default
    if (!world) {
      return DEFAULT_EMPTY_COLOR;
    }

    // Look up per-subpart state: well_plate_96.A1, well_plate_96.A2, etc.
    const cellStateKey = `${placement.object_name}.${cellName}`;
    const cellState = world.objectStates[cellStateKey];

    // If no state recorded for this cell, return default (empty)
    if (!cellState) {
      return DEFAULT_EMPTY_COLOR;
    }

    // Extract material_name from the cell's state
    const materialNameValue = cellState.material_name;

    // material_name should be a string; if not, treat as empty
    if (typeof materialNameValue !== "string") {
      return DEFAULT_EMPTY_COLOR;
    }

    const materialName = materialNameValue;

    // If material_name is empty string or 'empty', cell is empty
    if (!materialName || materialName === "empty") {
      return DEFAULT_EMPTY_COLOR;
    }

    // Look up the material in world.materials
    const material = world.materials[materialName];

    // If material is named but not in registry, throw loud error (per plan)
    if (!material) {
      throw new Error(
        `Well plate adapter: material '${materialName}' referenced in ${cellStateKey} but not found in world.materials`,
      );
    }

    // Get the display color from the material
    // Use light theme by default
    if (!material.display_color || !material.display_color.light) {
      throw new Error(
        `Well plate adapter: material '${materialName}' missing display_color.light`,
      );
    }

    return material.display_color.light;
  }

  // Row and column labels (A-H for rows, 1-12 for columns).
  const rowLabels = ["A", "B", "C", "D", "E", "F", "G", "H"];

  // Map cell names to their (row, col) indices for later group wrapping.
  const cellPositions = new Map<string, { row: number; col: number }>();

  // Create a map to hold group containers, keyed by group name.
  const groupContainers = new Map<string, SVGElement>();

  // Extract subpart_groups from objectConfig.structure (if present).
  const subpartGroups =
    (objectConfig.structure?.subpart_groups as Record<
      string,
      SubpartGroupConfig
    >) || {};

  // Pre-create group containers for each declared subpart group.

  for (const [_groupCategoryKey, groupCategory] of Object.entries(
    subpartGroups,
  )) {
    const members = groupCategory.members || [];
    for (const member of members) {
      const groupName = member.name;
      const groupId = `${placement.object_name}.${groupName}`;

      // Create a non-visual group container <g>.
      const groupG = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g",
      );
      groupG.setAttribute("data-target-id", groupId);
      groupG.setAttribute("data-group-name", groupName);
      // Ensure the group is clickable
      groupG.setAttribute("pointer-events", "auto");

      // Add an invisible <rect> to establish group bbox for ancestor walk.
      // This rect will be resized after cells are added.
      const bboxRect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      bboxRect.setAttribute("fill", "none");
      bboxRect.setAttribute("stroke", "none");
      bboxRect.setAttribute("pointer-events", "none");
      groupG.appendChild(bboxRect);

      groupContainers.set(groupName, groupG);
      container.appendChild(groupG);
    }
  }

  // Render each cell once to the main container.
  for (let rowIdx = 0; rowIdx < ROWS; rowIdx++) {
    for (let colIdx = 0; colIdx < COLS; colIdx++) {
      const cellX = x + colIdx * cellWidth;
      const cellY = y + rowIdx * cellHeight;

      const rowLabel = rowLabels[rowIdx];
      const colLabel = (colIdx + 1).toString();
      const cellName = `${rowLabel}${colLabel}`;

      cellPositions.set(cellName, { row: rowIdx, col: colIdx });

      const fillColor = getCellFillColor(cellName);

      const cell = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      );
      cell.setAttribute("x", String(cellX));
      cell.setAttribute("y", String(cellY));
      cell.setAttribute("width", String(cellWidth));
      cell.setAttribute("height", String(cellHeight));
      cell.setAttribute("fill", fillColor);
      cell.setAttribute("stroke", "#999");
      cell.setAttribute("stroke-width", "1");
      // Ensure cell is clickable
      cell.setAttribute("pointer-events", "auto");

      const targetId = `${placement.object_name}.${cellName}`;
      cell.setAttribute("data-target-id", targetId);

      cell.setAttribute("data-well", cellName);

      container.appendChild(cell);
    }
  }

  // Update group bbox rects based on cell membership.
  // Groups are sibling containers (not parents); compute bbox by querying main container.
  for (const [groupName, groupContainer] of groupContainers) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Find the member cell names for this group.
    const memberNames = new Set<string>();

    for (const [_groupCategoryKey, groupCategory] of Object.entries(
      subpartGroups,
    )) {
      const members = groupCategory.members || [];
      for (const member of members) {
        if (member.name === groupName) {
          for (const cellName of member.contains) {
            memberNames.add(cellName);
          }
        }
      }
    }

    // Query each member cell from the main container and measure its bbox.
    for (const cellName of memberNames) {
      const selector = `[data-target-id="${placement.object_name}.${cellName}"]`;
      const cellElem = container.querySelector(selector);
      if (cellElem instanceof SVGGraphicsElement) {
        const bbox = cellElem.getBBox();
        minX = Math.min(minX, bbox.x);
        minY = Math.min(minY, bbox.y);
        maxX = Math.max(maxX, bbox.x + bbox.width);
        maxY = Math.max(maxY, bbox.y + bbox.height);
      }
    }

    // Update the invisible bbox rect with computed bounds.
    if (isFinite(minX) && isFinite(minY) && isFinite(maxX) && isFinite(maxY)) {
      const bboxRect = groupContainer.querySelector(
        'rect[pointer-events="none"]',
      ) as SVGElement;
      if (bboxRect) {
        bboxRect.setAttribute("x", String(minX));
        bboxRect.setAttribute("y", String(minY));
        bboxRect.setAttribute("width", String(maxX - minX));
        bboxRect.setAttribute("height", String(maxY - minY));
      }
    }
  }
}
