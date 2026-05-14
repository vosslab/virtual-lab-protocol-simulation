/**
 * well_plate/render.ts
 *
 * Render functions for well_plate_workspace scene elements.
 * Renders the 96-well plate grid and surrounding lab equipment via SVG and DOM.
 *
 * Equipment positioning via layoutScene; 96-well plate uses custom grid geometry.
 * No imports from src/scenes/ or src/legacy_*.
 */

import type { SceneConfig } from '../../contract';
import type { HighlightState, LayoutItem } from '../../types';
import { layoutScene } from '../../layout';

//============================================
// Constants
//============================================

const WELL_PLATE_ROWS = 8;
const WELL_PLATE_COLS = 12;
const WELL_SIZE_PX = 35;
const WELL_GAP_PX = 4;
const PLATE_MARGIN_PX = 20;
const ITEM_SIZE_PX = 100;

//============================================

/**
 * Render the workspace: well plate grid + surrounding equipment.
 * scene: SceneConfig with items (equipment, bottles, pipettes, etc.)
 * highlights: HighlightState for next-target items
 *
 * Layout is computed via layoutScene; equipment positions are absolute-positioned
 * within the workspace. The 96-well plate keeps custom grid geometry (contract item 3).
 */
export function renderWorkspace(
	scene: SceneConfig,
	highlights: HighlightState,
): string {
	const html: string[] = [];

	// Compute layout via layoutScene (pure, returns positions for all items)
	const layout = layoutScene(scene);

	// Position tracking for absolute positioning of equipment
	const layoutMap: Record<string, LayoutItem> = {};
	for (const item of layout.items) {
		layoutMap[item.id] = item;
	}

	html.push('<div class="well-plate-workspace" id="workspace">');

	// Equipment area container: positioned items via layout engine
	html.push('<div class="equipment-area">');

	// Collect all items and sort by Y position (ascending) so higher items render first (lower z-index)
	const itemEntries = Object.entries(scene.items || {}).filter(([id]) => id !== 'well_plate');
	const itemsWithPositions = itemEntries.map(([itemId, item]) => ({
		itemId,
		item,
		layoutItem: layoutMap[itemId],
	}));
	// Sort by Y position, then by X position (top-left first)
	itemsWithPositions.sort((a, b) => {
		const yA = a.layoutItem?.y ?? Infinity;
		const yB = b.layoutItem?.y ?? Infinity;
		if (yA !== yB) return yA - yB;
		const xA = a.layoutItem?.x ?? Infinity;
		const xB = b.layoutItem?.x ?? Infinity;
		return xA - xB;
	});

	// Render in sorted order (so Z-index via document order is correct)
	// Higher-Y items render first (lower z-index), lower-Y items render last (higher z-index)
	// so that items appearing higher on page are clickable
	for (let i = 0; i < itemsWithPositions.length; i++) {
		const entry = itemsWithPositions[i];
		if (!entry) continue;

		const { itemId, item, layoutItem } = entry;

		const isHighlighted = highlights.nextTargets.includes(itemId);
		const highlightClass = isHighlighted ? ' is-next-target' : '';

		// Reverse z-index so lower-Y items (higher on page) have higher z-index
		const zIndex = itemsWithPositions.length - 1 - i;

		// Get position from layout
		const positionStyle = layoutItem
			? `position: absolute; left: ${layoutItem.x}px; top: ${layoutItem.y}px; width: ${layoutItem.width}px; height: ${layoutItem.height}px; z-index: ${zIndex};`
			: '';

		html.push(`
			<div class="equipment-item${highlightClass}" data-item-id="${itemId}" data-label="${item.label}" style="${positionStyle}">
				<span class="label">${item.label}</span>
			</div>
		`);
	}
	html.push('</div>');

	// 96-well plate grid
	const plateName = scene.items?.['well_plate']?.label || '96-Well Plate';
	const isPlateHighlighted = highlights.nextTargets.includes('well_plate');
	const plateHighlightClass = isPlateHighlighted ? ' is-next-target' : '';
	html.push(`<div class="plate-container${plateHighlightClass}" data-item-id="well_plate">`);
	html.push(`<div class="plate-label">${plateName}</div>`);
	html.push(renderWellGrid(highlights));
	html.push('</div>');

	html.push('</div>');
	return html.join('\n');
}

//============================================

/**
 * Render the 96-well grid.
 * Returns HTML for an 8x12 grid of clickable wells.
 */
function renderWellGrid(highlights?: HighlightState): string {
	const html: string[] = [];
	html.push('<div class="well-grid">');

	// Row labels (A-H)
	html.push('<div class="row-labels">');
	for (let r = 0; r < WELL_PLATE_ROWS; r++) {
		const rowLabel = String.fromCharCode(65 + r);
		html.push(`<div class="row-label">${rowLabel}</div>`);
	}
	html.push('</div>');

	// Column labels (1-12)
	html.push('<div class="col-labels">');
	for (let c = 0; c < WELL_PLATE_COLS; c++) {
		const colLabel = (c + 1).toString();
		html.push(`<div class="col-label">${colLabel}</div>`);
	}
	html.push('</div>');

	// Wells grid
	html.push('<div class="wells">');
	for (let r = 0; r < WELL_PLATE_ROWS; r++) {
		for (let c = 0; c < WELL_PLATE_COLS; c++) {
			const rowLabel = String.fromCharCode(65 + r);
			const colLabel = (c + 1).toString();
			const wellId = `${rowLabel}${colLabel}`;

			// Check if this well is a next target or completed target
			const isNextTarget = highlights?.nextTargets.includes(wellId) ?? false;
			const isCompleted = highlights?.completedTargets.includes(wellId) ?? false;
			const highlightClass = isNextTarget ? ' is-next-target' : isCompleted ? ' is-filled' : '';

			html.push(`
				<div class="well${highlightClass}" data-well-id="${wellId}"></div>
			`);
		}
	}
	html.push('</div>');

	html.push('</div>');
	return html.join('\n');
}

//============================================

/**
 * Render a single well in the 96-well grid.
 * rowIndex: 0-7 (A-H)
 * colIndex: 0-11 (1-12)
 */
export function renderWell(
	rowIndex: number,
	colIndex: number,
	_liquid?: string,
	_volume?: number,
): string {
	const row = String.fromCharCode(65 + rowIndex);
	const col = (colIndex + 1).toString();
	const wellId = `${row}${col}`;
	return `<div class="well" data-well-id="${wellId}"></div>`;
}

//============================================

/**
 * CSS for well_plate workspace.
 * Embedded inline in the page.
 */
export function getWorkspaceStyles(): string {
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
