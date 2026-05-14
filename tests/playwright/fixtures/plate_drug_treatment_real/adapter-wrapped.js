// src/scene_runtime/highlight/index.ts
function deriveHighlights(step, completedClicks) {
  const path = step.completionPath;
  switch (path.kind) {
    case "interactionSequence":
      return highlightInteractionSequence(path, completedClicks);
    case "directTool":
      return highlightDirectTool(path, completedClicks);
    case "modal":
      return highlightModal(path, completedClicks);
    case "multipleChoice":
      return highlightMultipleChoice(path, completedClicks);
    default:
      const exhaustive = path;
      return {
        nextTargets: [],
        completedTargets: []
      };
  }
}
function highlightInteractionSequence(path, completedClicks) {
  const sequence = [];
  if (path.interactions && Array.isArray(path.interactions)) {
    for (const interaction of path.interactions) {
      if (interaction.tool) {
        sequence.push(interaction.tool);
      }
      if (interaction.source) {
        sequence.push(interaction.source);
      }
      if (interaction.destination) {
        sequence.push(interaction.destination);
      }
    }
  } else {
    if (path.tool) {
      sequence.push(path.tool);
    }
    if (path.source) {
      sequence.push(path.source);
    }
    if (path.destination) {
      sequence.push(path.destination);
    }
  }
  let nextTargets = [];
  const completedCount = completedClicks.length;
  if (completedCount < sequence.length) {
    const next = sequence[completedCount];
    if (next !== void 0) {
      if (next === "well_plate" && path.plateTargets && Array.isArray(path.plateTargets)) {
        nextTargets = expandPlateTargets(path.plateTargets);
      } else {
        nextTargets = [next];
      }
    }
  }
  const completedTargets = [];
  for (const id of completedClicks) {
    if (sequence.includes(id)) {
      completedTargets.push(id);
    }
  }
  if (path.plateTargets && Array.isArray(path.plateTargets)) {
    const expandedWells = expandPlateTargets(path.plateTargets);
    for (const wellId of expandedWells) {
      if (completedClicks.includes(wellId)) {
        completedTargets.push(wellId);
      }
    }
  }
  return {
    nextTargets,
    completedTargets
  };
}
function expandPlateTargets(plateTargets) {
  const wells = [];
  for (const target of plateTargets) {
    if (target.rows && target.cols) {
      for (const row of target.rows) {
        for (const col of target.cols) {
          wells.push(`${row}${col}`);
        }
      }
    }
  }
  return wells;
}
function highlightDirectTool(path, completedClicks) {
  if (!path.tool) {
    return {
      nextTargets: [],
      completedTargets: []
    };
  }
  const isCompleted = completedClicks.includes(path.tool);
  return {
    nextTargets: isCompleted ? [] : [path.tool],
    completedTargets: isCompleted ? [path.tool] : []
  };
}
function highlightModal(path, completedClicks) {
  if (!path.openClick) {
    return {
      nextTargets: [],
      completedTargets: []
    };
  }
  const openClicked = completedClicks.includes(path.openClick);
  if (!openClicked) {
    return {
      nextTargets: [path.openClick],
      completedTargets: []
    };
  }
  if (path.advanceClick !== void 0 && path.advanceClick !== null) {
    const advanceClicked = completedClicks.includes(path.advanceClick);
    return {
      nextTargets: advanceClicked ? [] : [path.advanceClick],
      completedTargets: [path.openClick]
    };
  }
  return {
    nextTargets: [],
    completedTargets: [path.openClick]
  };
}
function highlightMultipleChoice(path, completedClicks) {
  if (!path.choices || !Array.isArray(path.choices)) {
    return {
      nextTargets: [],
      completedTargets: []
    };
  }
  const choiceIds = path.choices.map((c) => c.id);
  const completedTargets = completedClicks.filter(
    (id) => choiceIds.includes(id)
  );
  const nextTargets = choiceIds;
  return {
    nextTargets,
    completedTargets
  };
}

// src/scene_runtime/dispatch/index.ts
function dispatchClick(scene, step, target) {
  const path = step.completionPath;
  switch (path.kind) {
    case "interactionSequence":
      return dispatchInteractionSequence(scene, step, path, target);
    case "directTool":
      return dispatchDirectTool(scene, step, path, target);
    case "modal":
      return dispatchModal(scene, step, path, target);
    case "multipleChoice":
      return dispatchMultipleChoice(scene, step, path, target);
    default:
      const exhaustive = path;
      return {
        matched: false,
        advances: false,
        reason: `Unknown completionPath kind: ${exhaustive.kind}`
      };
  }
}
function dispatchInteractionSequence(scene, step, path, target) {
  if (target.kind !== "item" && target.kind !== "well") {
    return {
      matched: false,
      advances: false,
      reason: "interactionSequence expects item or well clicks"
    };
  }
  const sequence = [];
  if (path.interactions && Array.isArray(path.interactions)) {
    for (const interaction of path.interactions) {
      if (interaction.tool) {
        sequence.push(interaction.tool);
      }
      if (interaction.source) {
        sequence.push(interaction.source);
      }
      if (interaction.destination) {
        sequence.push(interaction.destination);
      }
    }
  } else {
    if (path.tool) {
      sequence.push(path.tool);
    }
    if (path.source) {
      sequence.push(path.source);
    }
    if (path.destination) {
      sequence.push(path.destination);
    }
  }
  if (sequence.length === 0) {
    return {
      matched: false,
      advances: false,
      reason: "interactionSequence has no tool/source/destination"
    };
  }
  if (sequence.includes(target.id)) {
    return {
      matched: true,
      advances: false,
      // advances=true only when full sequence complete
      expectedNext: sequence[0]
    };
  }
  if (target.kind === "well" && path.plateTargets && Array.isArray(path.plateTargets)) {
    const expandedWells = expandPlateTargets2(path.plateTargets);
    if (expandedWells.includes(target.id)) {
      return {
        matched: true,
        advances: false,
        expectedNext: sequence[0]
      };
    }
  }
  return {
    matched: false,
    advances: false,
    reason: `Target ${target.id} not in interactionSequence or plateTargets`
  };
}
function expandPlateTargets2(plateTargets) {
  const wells = [];
  for (const target of plateTargets) {
    if (target.rows && target.cols) {
      for (const row of target.rows) {
        for (const col of target.cols) {
          wells.push(`${row}${col}`);
        }
      }
    }
  }
  return wells;
}
function dispatchDirectTool(scene, step, path, target) {
  if (target.kind !== "item") {
    return {
      matched: false,
      advances: false,
      reason: "directTool expects item click"
    };
  }
  if (!path.tool) {
    return {
      matched: false,
      advances: false,
      reason: "directTool missing tool field"
    };
  }
  if (target.id !== path.tool) {
    return {
      matched: false,
      advances: false,
      expectedNext: path.tool,
      reason: `Expected tool ${path.tool}, got ${target.id}`
    };
  }
  return {
    matched: true,
    advances: true
  };
}
function dispatchModal(scene, step, path, target) {
  if (target.kind !== "item") {
    return {
      matched: false,
      advances: false,
      reason: "modal expects item click"
    };
  }
  if (!path.openClick) {
    return {
      matched: false,
      advances: false,
      reason: "modal missing openClick"
    };
  }
  if (target.id === path.openClick) {
    return {
      matched: true,
      advances: false,
      expectedNext: path.advanceClick || path.openClick
    };
  }
  if (path.advanceClick && target.id === path.advanceClick) {
    return {
      matched: true,
      advances: true
    };
  }
  return {
    matched: false,
    advances: false,
    expectedNext: path.openClick,
    reason: `Expected modal ${path.openClick}, got ${target.id}`
  };
}
function dispatchMultipleChoice(scene, step, path, target) {
  if (target.kind !== "choice") {
    return {
      matched: false,
      advances: false,
      reason: "multipleChoice expects choice click"
    };
  }
  if (!path.choices || !Array.isArray(path.choices)) {
    return {
      matched: false,
      advances: false,
      reason: "multipleChoice missing or invalid choices"
    };
  }
  const choice = path.choices.find((c) => c.id === target.id);
  if (!choice) {
    return {
      matched: false,
      advances: false,
      reason: `Choice ${target.id} not found in multipleChoice`
    };
  }
  const advances = choice.correct === true;
  return {
    matched: true,
    advances,
    reason: advances ? void 0 : "Choice incorrect"
  };
}

// src/scene_runtime/layout/index.ts
var ZONE_PADDING = 1;
var DEFAULT_ITEM_WIDTH = 100;
var DEFAULT_ITEM_HEIGHT = 100;
var MIN_GAP = 10;
function depthScaleFor(depth) {
  if (depth === "back") return 0.8;
  if (depth === "front") return 1.1;
  return 1;
}
function depthBaselineOffsetFor(depth) {
  if (depth === "back") return -4;
  if (depth === "front") return 4;
  return 0;
}
function layoutScene(scene) {
  const items = Object.values(scene.items || {});
  if (items.length === 0) {
    return {
      zones: {},
      itemPositions: {},
      items: []
    };
  }
  const itemsByZone = {};
  for (const item of items) {
    const zoneId = item.scene || "default";
    if (!itemsByZone[zoneId]) {
      itemsByZone[zoneId] = [];
    }
    itemsByZone[zoneId].push(item);
  }
  const zones = {};
  const layoutItems = [];
  const itemPositions = {};
  let currentYOffset = 10;
  for (const [zoneId, zoneItems] of Object.entries(itemsByZone)) {
    const sorted = [...zoneItems].sort((a, b) => {
      const depthA = a.scene || "";
      const depthB = b.scene || "";
      return depthA.localeCompare(depthB);
    });
    const zoneWidth = Math.max(DEFAULT_ITEM_WIDTH + MIN_GAP + 2 * ZONE_PADDING, 150);
    const zoneX = 10;
    const itemsPerRow = Math.max(1, Math.floor((zoneWidth - 2 * ZONE_PADDING) / (DEFAULT_ITEM_WIDTH + MIN_GAP)));
    const numRows = Math.max(1, Math.ceil(sorted.length / itemsPerRow));
    const zoneHeight = numRows * (DEFAULT_ITEM_HEIGHT + MIN_GAP) + 2 * ZONE_PADDING;
    const zoneBaseline = currentYOffset + 20;
    zones[zoneId] = {
      x: zoneX,
      y: currentYOffset,
      width: zoneWidth,
      height: zoneHeight
    };
    let xOffset = zoneX + ZONE_PADDING;
    let rowYOffset = 0;
    const rowHeight = DEFAULT_ITEM_HEIGHT + MIN_GAP;
    const maxRowWidth = itemsPerRow * (DEFAULT_ITEM_WIDTH + MIN_GAP);
    const wrapThreshold = Math.min(zoneX + zoneWidth - ZONE_PADDING, zoneX + maxRowWidth);
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (!item) continue;
      const depth = item.scene || "mid";
      const scale = depthScaleFor(depth);
      const baselineOffset = depthBaselineOffsetFor(depth);
      const width = DEFAULT_ITEM_WIDTH * scale;
      const height = DEFAULT_ITEM_HEIGHT * scale;
      if (xOffset + width > wrapThreshold && xOffset > zoneX + ZONE_PADDING) {
        xOffset = zoneX + ZONE_PADDING;
        rowYOffset += rowHeight;
      }
      const x = xOffset;
      const y = zoneBaseline + rowYOffset + baselineOffset - height / 2;
      const layoutItem = {
        id: item.id,
        x,
        y,
        width,
        height
      };
      layoutItems.push(layoutItem);
      itemPositions[item.id] = { x, y };
      xOffset += width + MIN_GAP;
    }
    currentYOffset += zoneHeight + 5;
  }
  return {
    zones,
    itemPositions,
    items: layoutItems
  };
}

// src/scene_runtime/adapters/well_plate/render.ts
var WELL_PLATE_ROWS = 8;
var WELL_PLATE_COLS = 12;
var WELL_SIZE_PX = 35;
var WELL_GAP_PX = 4;
var ITEM_SIZE_PX = 100;
function renderWorkspace(scene, highlights) {
  const html = [];
  const layout = layoutScene(scene);
  const layoutMap = {};
  for (const item of layout.items) {
    layoutMap[item.id] = item;
  }
  html.push('<div class="well-plate-workspace" id="workspace">');
  html.push('<div class="equipment-area">');
  const itemEntries = Object.entries(scene.items || {}).filter(([id]) => id !== "well_plate");
  const itemsWithPositions = itemEntries.map(([itemId, item]) => ({
    itemId,
    item,
    layoutItem: layoutMap[itemId]
  }));
  itemsWithPositions.sort((a, b) => {
    const yA = a.layoutItem?.y ?? Infinity;
    const yB = b.layoutItem?.y ?? Infinity;
    if (yA !== yB) return yA - yB;
    const xA = a.layoutItem?.x ?? Infinity;
    const xB = b.layoutItem?.x ?? Infinity;
    return xA - xB;
  });
  for (let i = 0; i < itemsWithPositions.length; i++) {
    const entry = itemsWithPositions[i];
    if (!entry) continue;
    const { itemId, item, layoutItem } = entry;
    const isHighlighted = highlights.nextTargets.includes(itemId);
    const highlightClass = isHighlighted ? " is-next-target" : "";
    const zIndex = itemsWithPositions.length - 1 - i;
    const positionStyle = layoutItem ? `position: absolute; left: ${layoutItem.x}px; top: ${layoutItem.y}px; width: ${layoutItem.width}px; height: ${layoutItem.height}px; z-index: ${zIndex};` : "";
    html.push(`
			<div class="equipment-item${highlightClass}" data-item-id="${itemId}" data-label="${item.label}" style="${positionStyle}">
				<span class="label">${item.label}</span>
			</div>
		`);
  }
  html.push("</div>");
  const plateName = scene.items?.["well_plate"]?.label || "96-Well Plate";
  const isPlateHighlighted = highlights.nextTargets.includes("well_plate");
  const plateHighlightClass = isPlateHighlighted ? " is-next-target" : "";
  html.push(`<div class="plate-container${plateHighlightClass}" data-item-id="well_plate">`);
  html.push(`<div class="plate-label">${plateName}</div>`);
  html.push(renderWellGrid(highlights));
  html.push("</div>");
  html.push("</div>");
  return html.join("\n");
}
function renderWellGrid(highlights) {
  const html = [];
  html.push('<div class="well-grid">');
  html.push('<div class="row-labels">');
  for (let r = 0; r < WELL_PLATE_ROWS; r++) {
    const rowLabel = String.fromCharCode(65 + r);
    html.push(`<div class="row-label">${rowLabel}</div>`);
  }
  html.push("</div>");
  html.push('<div class="col-labels">');
  for (let c = 0; c < WELL_PLATE_COLS; c++) {
    const colLabel = (c + 1).toString();
    html.push(`<div class="col-label">${colLabel}</div>`);
  }
  html.push("</div>");
  html.push('<div class="wells">');
  for (let r = 0; r < WELL_PLATE_ROWS; r++) {
    for (let c = 0; c < WELL_PLATE_COLS; c++) {
      const rowLabel = String.fromCharCode(65 + r);
      const colLabel = (c + 1).toString();
      const wellId = `${rowLabel}${colLabel}`;
      const isNextTarget = highlights?.nextTargets.includes(wellId) ?? false;
      const isCompleted = highlights?.completedTargets.includes(wellId) ?? false;
      const highlightClass = isNextTarget ? " is-next-target" : isCompleted ? " is-filled" : "";
      html.push(`
				<div class="well${highlightClass}" data-well-id="${wellId}"></div>
			`);
    }
  }
  html.push("</div>");
  html.push("</div>");
  return html.join("\n");
}
function getWorkspaceStyles() {
  return `
		.well-plate-workspace {
			display: flex;
			flex-direction: column;
			gap: 20px;
			padding: 20px;
			width: 100%;
			height: 100%;
			font-family: -apple-system, BlinkMacSystemFont, sans-serif;
		}

		.equipment-area {
			position: relative;
			background: #f5f5f5;
			padding: 15px;
			border-radius: 4px;
			min-height: 150px;
		}

		.equipment-item {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			width: ${ITEM_SIZE_PX}px;
			height: ${ITEM_SIZE_PX}px;
			border: 2px solid #999;
			border-radius: 4px;
			background: white;
			cursor: pointer;
			transition: all 200ms;
		}

		.equipment-item:hover {
			border-color: #333;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}

		.equipment-item.is-next-target {
			border-color: #0066cc;
			background: #e6f0ff;
			box-shadow: 0 0 12px rgba(0, 102, 204, 0.4);
		}

		.equipment-item .label {
			font-size: 11px;
			text-align: center;
			color: #333;
			font-weight: 500;
		}

		.plate-container {
			display: inline-block;
			padding: 20px;
			background: white;
			border: 2px solid #999;
			border-radius: 4px;
			cursor: pointer;
			transition: all 200ms;
		}

		.plate-container:hover {
			border-color: #333;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}

		.plate-container.is-next-target {
			border-color: #0066cc;
			background: #e6f0ff;
			box-shadow: 0 0 12px rgba(0, 102, 204, 0.4);
		}

		.plate-label {
			font-size: 14px;
			font-weight: bold;
			margin-bottom: 10px;
			text-align: center;
		}

		.well-grid {
			display: grid;
			grid-template-columns: auto repeat(${WELL_PLATE_COLS}, ${WELL_SIZE_PX}px);
			grid-template-rows: auto repeat(${WELL_PLATE_ROWS}, ${WELL_SIZE_PX}px);
			gap: ${WELL_GAP_PX}px;
			width: fit-content;
		}

		.row-labels {
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
			margin-top: 20px;
			gap: ${WELL_GAP_PX}px;
		}

		.row-label {
			width: 20px;
			height: ${WELL_SIZE_PX}px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: bold;
			font-size: 12px;
		}

		.col-labels {
			display: grid;
			grid-template-columns: repeat(${WELL_PLATE_COLS}, ${WELL_SIZE_PX}px);
			gap: ${WELL_GAP_PX}px;
			margin-left: 20px;
			margin-bottom: 10px;
		}

		.col-label {
			width: ${WELL_SIZE_PX}px;
			height: 20px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: bold;
			font-size: 12px;
		}

		.wells {
			display: grid;
			grid-template-columns: repeat(${WELL_PLATE_COLS}, ${WELL_SIZE_PX}px);
			gap: ${WELL_GAP_PX}px;
			margin-left: 20px;
		}

		.well {
			width: ${WELL_SIZE_PX}px;
			height: ${WELL_SIZE_PX}px;
			border: 1px solid #ccc;
			border-radius: 3px;
			background: white;
			cursor: pointer;
			transition: all 150ms;
		}

		.well:hover {
			border-color: #666;
			box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
		}

		.well.is-next-target {
			border-color: #0066cc;
			background: #b3d9ff;
			box-shadow: 0 0 6px rgba(0, 102, 204, 0.5);
		}

		.well.is-filled {
			background: #c8e6c9;
			border-color: #4caf50;
		}
	`;
}

// src/scene_runtime/adapters/well_plate/index.ts
function getInteractionSequenceLength(step) {
  const path = step.completionPath;
  if (path.kind !== "interactionSequence") {
    return 0;
  }
  let count = 0;
  const seq = path;
  if (seq.interactions && Array.isArray(seq.interactions)) {
    for (const interaction of seq.interactions) {
      if (interaction.tool) count++;
      if (interaction.source) count++;
      if (interaction.destination) count++;
    }
  } else {
    if (seq.tool) count++;
    if (seq.source) count++;
    if (seq.destination) count++;
  }
  return count;
}
function initWellPlateAdapter(scene, step, config) {
  const containerSelector = config?.containerSelector || "#app";
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.error(`Container not found: ${containerSelector}`);
    return;
  }
  const styleEl = document.createElement("style");
  styleEl.textContent = getWorkspaceStyles();
  document.head.appendChild(styleEl);
  const completedClicks = [];
  const highlights = deriveHighlights(step, completedClicks);
  const html = renderWorkspace(scene, highlights);
  container.innerHTML = html;
  const clickableItems = container.querySelectorAll("[data-item-id]");
  clickableItems.forEach((element) => {
    element.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const itemId = target.getAttribute("data-item-id");
      if (!itemId) return;
      const result = dispatchClick(scene, step, {
        id: itemId,
        kind: "item"
      });
      if (result.matched) {
        completedClicks.push(itemId);
        config?.onClickMatched?.(itemId);
        let advances = result.advances;
        if (!advances && step.completionPath.kind === "interactionSequence") {
          const expectedLength = getInteractionSequenceLength(step);
          if (expectedLength > 0 && completedClicks.length >= expectedLength) {
            advances = true;
          }
        }
        if (advances) {
          config?.onStepComplete?.(step.id);
        } else {
          const newHighlights = deriveHighlights(step, completedClicks);
          const newHtml = renderWorkspace(scene, newHighlights);
          container.innerHTML = newHtml;
          wireClickHandlers(scene, step, container, completedClicks, config);
        }
      }
    });
  });
  const clickableWells = container.querySelectorAll("[data-well-id]");
  clickableWells.forEach((element) => {
    element.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const wellId = target.getAttribute("data-well-id");
      if (!wellId) return;
      const result = dispatchClick(scene, step, {
        id: wellId,
        kind: "well"
      });
      if (result.matched) {
        completedClicks.push(wellId);
        config?.onClickMatched?.(wellId);
        let advances = result.advances;
        if (!advances && step.completionPath.kind === "interactionSequence") {
          const expectedLength = getInteractionSequenceLength(step);
          if (expectedLength > 0 && completedClicks.length >= expectedLength) {
            advances = true;
          }
        }
        if (advances) {
          config?.onStepComplete?.(step.id);
        } else {
          const newHighlights = deriveHighlights(step, completedClicks);
          const newHtml = renderWorkspace(scene, newHighlights);
          container.innerHTML = newHtml;
          wireClickHandlers(scene, step, container, completedClicks, config);
        }
      }
    });
  });
}
function wireClickHandlers(scene, step, container, completedClicks, config) {
  const clickableItems = container.querySelectorAll("[data-item-id]");
  clickableItems.forEach((element) => {
    element.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const itemId = target.getAttribute("data-item-id");
      if (!itemId) return;
      const result = dispatchClick(scene, step, {
        id: itemId,
        kind: "item"
      });
      if (result.matched) {
        completedClicks.push(itemId);
        config?.onClickMatched?.(itemId);
        let advances = result.advances;
        if (!advances && step.completionPath.kind === "interactionSequence") {
          const expectedLength = getInteractionSequenceLength(step);
          if (expectedLength > 0 && completedClicks.length >= expectedLength) {
            advances = true;
          }
        }
        if (advances) {
          config?.onStepComplete?.(step.id);
        } else {
          const newHighlights = deriveHighlights(step, completedClicks);
          const newHtml = renderWorkspace(scene, newHighlights);
          container.innerHTML = newHtml;
          wireClickHandlers(scene, step, container, completedClicks, config);
        }
      }
    });
  });
  const clickableWells = container.querySelectorAll("[data-well-id]");
  clickableWells.forEach((element) => {
    element.addEventListener("click", (e) => {
      const target = e.currentTarget;
      const wellId = target.getAttribute("data-well-id");
      if (!wellId) return;
      const result = dispatchClick(scene, step, {
        id: wellId,
        kind: "well"
      });
      if (result.matched) {
        completedClicks.push(wellId);
        config?.onClickMatched?.(wellId);
        let advances = result.advances;
        if (!advances && step.completionPath.kind === "interactionSequence") {
          const expectedLength = getInteractionSequenceLength(step);
          if (expectedLength > 0 && completedClicks.length >= expectedLength) {
            advances = true;
          }
        }
        if (advances) {
          config?.onStepComplete?.(step.id);
        } else {
          const newHighlights = deriveHighlights(step, completedClicks);
          const newHtml = renderWorkspace(scene, newHighlights);
          container.innerHTML = newHtml;
          wireClickHandlers(scene, step, container, completedClicks, config);
        }
      }
    });
  });
}
function renderWellPlateStep(scene, step, highlights) {
  return renderWorkspace(scene, highlights);
}
function getWellPlateAffordances(step) {
  const path = step.completionPath;
  const affordances = [];
  if (path.kind === "modal") {
    const modal = path;
    if (modal.openClick) {
      affordances.push(modal.openClick);
    }
    if (modal.advanceClick) {
      affordances.push(modal.advanceClick);
    }
  } else if (path.kind === "interactionSequence") {
    const seq = path;
    if (seq.tool) affordances.push(seq.tool);
    if (seq.source) affordances.push(seq.source);
    if (seq.destination) affordances.push(seq.destination);
  }
  return affordances.filter(Boolean);
}
window.adapterExports = {
  getWellPlateAffordances,
  initWellPlateAdapter,
  renderWellPlateStep
};
