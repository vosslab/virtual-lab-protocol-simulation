// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// well_plate_workspace/render.ts - Well plate workspace render logic
// Owns: stable five-region layout, SVG generation, highlight logic, well and tube states
// Regions: tool area (left), source area (upper center), microtube rack (lower center),
//          plate area (right), popup overlay (centered)
//============================================

import type { SceneContext } from "../scene_driver";
import type { ProtocolStep } from "../../constants";
import { getCurrentStep, switchScene, triggerStep, gameState, getWellLiquids, getTubeLiquids } from "../../game_state";
import { ROW_LABELS, COL_LABELS } from "../../steps/plate_96";
import { getStaticSvg } from "../../svg_assets";
import { SVG_MICROTUBE_OPEN_TRANSLUCENT } from "../../../generated/svg_assets";
import { renderMultipleChoicePrompt } from "../shared/multiple_choice_prompt";
import { computeTargetClassification } from "./plate_liquid_state";
import { computeTubeStateClassification } from "./tube_state";
import { getTubePosition } from "./tube_layout";
import { REAGENTS } from "../../inventory";

//============================================
// Well state tracking
// Tracks which rows have been completed for each applyReagent step
//============================================
type WellState = {
	status: 'completed' | 'active' | 'future';
	row: string;
	col: number;
};

//============================================
// renderPlateMapSvg - Generate plate SVG with well states and actual liquid colors
//============================================
function renderPlateMapSvg(
	activeRows: string[],
	activeCols: number[],
	completedRows: string[],
	annotations?: readonly { row?: string; colRange?: readonly [number, number]; text: string }[]
): string {
	const left = 70;
	const top = 48;
	const cellGap = 34;
	const rowGap = 32;
	const radius = 10;

	let svg = '<svg class="plate-workspace-svg" viewBox="0 0 540 350" role="img" aria-label="96-well plate map" width="540" height="350">';
	svg += '<rect x="44" y="24" width="460" height="300" rx="18" fill="#f8fafc" stroke="#c9d4dd" stroke-width="2" />';
	svg += '<rect x="58" y="38" width="432" height="272" rx="12" fill="#ffffff" stroke="#e1e7ec" stroke-width="1" />';

	// Column headers
	for (let col = 0; col < 12; col++) {
		svg += '<text x="' + (left + col * cellGap) + '" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#607d8b">';
		svg += (col + 1) + '</text>';
	}

	// Rows with wells
	const rowIndices = [0, 1, 2, 3, 4, 5, 6, 7]; // A-H
	for (const rowIdx of rowIndices) {
		const rowLetter = ROW_LABELS[rowIdx]!;
		const y = top + rowIdx * rowGap;
		const isRowActive = activeRows.includes(rowLetter);
		const isRowCompleted = completedRows.includes(rowLetter);

		// Row label with state indicator
		let rowLabel = rowLetter;
		if (isRowCompleted) {
			rowLabel += ' [ok]';
		} else if (isRowActive) {
			rowLabel += ' (next)';
		}

		svg += '<text x="34" y="' + (y + 4) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#607d8b">';
		svg += rowLabel + '</text>';

		// Background highlight for active row
		if (isRowActive) {
			svg += '<rect x="54" y="' + (y - 17) + '" width="438" height="28" rx="14" fill="#e8f5e9" stroke="#4caf50" stroke-width="2" stroke-dasharray="4,4" />';
		}

		// Wells
		for (let col = 0; col < 12; col++) {
			const x = left + col * cellGap;
			const colNum = col + 1; // cols are 1-indexed
			const isColActive = activeCols.includes(colNum);
			const isWellActive = isRowActive && isColActive;
			const isWellCompleted = isRowCompleted && isColActive;

			// Determine well state CSS class (controls border/outline/pulse)
			let wellStateClass = '';
			if (isWellCompleted) {
				wellStateClass = 'well-state-completed';
			} else if (isWellActive) {
				wellStateClass = 'well-state-active';
			}

			// Read well liquids and compute fill color from actual liquid colorKey
			const wellLiquids = getWellLiquids(rowLetter, colNum);
			let fillColor = '#ffffff'; // empty well default

			if (wellLiquids.length > 0) {
				// Get the fill color from the first (base) liquid's colorKey
				const baseLiquid = wellLiquids[0]!;
				const reagent = REAGENTS[baseLiquid.liquid];
				if (reagent) {
					fillColor = reagent.displayColor;
					// Opacity proportional to total volume (capped at 0.9)
					const totalVolume = wellLiquids.reduce((sum, liq) => sum + liq.volumeMl, 0);
					const opacity = Math.min(0.9, totalVolume / 0.2); // 200uL base
					fillColor = fillColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
				}
			}

			// Minimal default stroke (state class handles state-specific stroke via CSS)
			let defaultStroke = '#b9c7d0';
			let defaultStrokeWidth = '1.4';

			svg += '<circle cx="' + x + '" cy="' + y + '" r="' + radius + '" fill="' + fillColor + '" stroke="' + defaultStroke + '" stroke-width="' + defaultStrokeWidth + '" class="well-item ' + wellStateClass + '" data-row="' + rowLetter + '" data-col="' + colNum + '" />';

			// Layer 2: Ring for second liquid (60% of cell dimension)
			if (wellLiquids.length >= 2) {
				const layer2Liquid = wellLiquids[1]!;
				const layer2Reagent = REAGENTS[layer2Liquid.liquid];
				if (layer2Reagent) {
					const layer2Color = layer2Reagent.displayColor + 'da'; // opacity 0.85 (218/255)
					const layer2Radius = radius * 0.6;
					svg += '<circle cx="' + x + '" cy="' + y + '" r="' + layer2Radius + '" fill="' + layer2Color + '" stroke="none" />';
				}
			}

			// Layer 3: Center dot for third liquid (30% of cell dimension)
			if (wellLiquids.length >= 3) {
				const layer3Liquid = wellLiquids[2]!;
				const layer3Reagent = REAGENTS[layer3Liquid.liquid];
				if (layer3Reagent) {
					const layer3Color = layer3Reagent.displayColor + 'da'; // opacity 0.85 (218/255)
					const layer3Radius = radius * 0.3;
					svg += '<circle cx="' + x + '" cy="' + y + '" r="' + layer3Radius + '" fill="' + layer3Color + '" stroke="none" />';
				}
			}

			// Check mark overlay for completed wells
			if (isWellCompleted) {
				svg += '<text x="' + x + '" y="' + (y + 5) + '" text-anchor="middle" font-size="14" font-weight="bold" fill="#2e7d32">[ok]</text>';
			}
		}
	}

	// Row A annotations (data-driven from annotation specs if provided)
	if (annotations && annotations.length > 0) {
		const annotationY = top - 32;
		for (const annotation of annotations) {
			const row = annotation.row;
			const colRange = annotation.colRange;
			const text = annotation.text;
			if (row !== 'A' || !colRange || !text) continue;
			if (colRange.length === 2) {
				const [minCol, maxCol] = colRange;
				const minX = left + minCol * cellGap;
				const maxX = left + maxCol * cellGap;
				const centerX = (minX + maxX) / 2;

				svg += '<text x="' + centerX + '" y="' + annotationY + '" text-anchor="middle" font-size="10" font-style="italic" fill="#999" opacity="0.8">';
				svg += text + '</text>';
			}
		}
	}

	svg += '</svg>';
	return svg;
}

//============================================
// renderMicrotubeOverlay - Render microtube liquids and states on the dilution rack
// Uses Bioicons microtube-open-translucent SVG base with reagent-colored liquid overlay.
// Liquid color is driven by reagents.yaml displayColor; state classes control outline/dim/pulse.
//============================================
function renderMicrotubeOverlay(
	activeTubeId: string | undefined,
	completedTubeIds: string[],
	futureTubeIds: string[],
): string {
	let overlay = '';

	// Render each tube with its liquid state
	const allTubeIds = [...completedTubeIds, ...(activeTubeId ? [activeTubeId] : []), ...futureTubeIds];

	for (const tubeId of allTubeIds) {
		const position = getTubePosition(tubeId);
		if (!position) {
			continue; // Unknown tube, skip
		}

		// Determine state CSS class
		let stateClass = 'microtube-state-future';
		if (completedTubeIds.includes(tubeId)) {
			stateClass = 'microtube-state-completed';
		} else if (tubeId === activeTubeId) {
			stateClass = 'microtube-state-active';
		}

		// Get tube liquids and compute fill color from first (base) liquid
		const tubeLiquids = getTubeLiquids(tubeId);
		let fillColor = '#ffffff'; // default empty

		if (tubeLiquids.length > 0) {
			const baseLiquid = tubeLiquids[0]!;
			const reagent = REAGENTS[baseLiquid.liquid];
			if (reagent) {
				fillColor = reagent.displayColor;
				// Opacity proportional to total volume
				const totalVolume = tubeLiquids.reduce((sum, liq) => sum + liq.volumeMl, 0);
				const opacity = Math.min(0.9, totalVolume / 1.0); // 1 mL capacity
				fillColor = fillColor + Math.floor(opacity * 255).toString(16).padStart(2, '0');
			}
		}

		// Render Bioicons microtube SVG base with state class
		// Use a <g> wrapper to position the SVG at the tube layout coordinates
		// and apply the state class for outline/dim/pulse behavior
		overlay += '<g class="microtube-item ' + stateClass + '" data-item-id="' + tubeId + '" '
			+ 'transform="translate(' + position.x + ',' + position.y + ')" style="cursor: pointer;">';

		// Inject the Bioicons SVG directly (strip outer <svg> tag and inject contents)
		// The SVG is centered at origin, so we don't need additional x/y positioning
		const microtubeMatch = SVG_MICROTUBE_OPEN_TRANSLUCENT.match(/<svg[^>]*>(.*)<\/svg>/s);
		if (microtubeMatch && microtubeMatch[1]) {
			overlay += microtubeMatch[1];
		} else {
			// Fallback: inject entire SVG if pattern match fails
			overlay += SVG_MICROTUBE_OPEN_TRANSLUCENT;
		}

		// Layer on top: liquid fill circle with reagent color
		overlay += '<circle cx="0" cy="0" r="' + position.radius
			+ '" fill="' + fillColor + '" stroke="none" opacity="0.7" />';

		// Layer 2: second liquid (60% of tube radius)
		if (tubeLiquids.length >= 2) {
			const layer2Liquid = tubeLiquids[1]!;
			const layer2Reagent = REAGENTS[layer2Liquid.liquid];
			if (layer2Reagent) {
				const layer2Color = layer2Reagent.displayColor + 'da'; // opacity 0.85
				const layer2Radius = position.radius * 0.6;
				overlay += '<circle cx="0" cy="0" r="' + layer2Radius
					+ '" fill="' + layer2Color + '" stroke="none" />';
			}
		}

		// Layer 3: third liquid (30% of tube radius)
		if (tubeLiquids.length >= 3) {
			const layer3Liquid = tubeLiquids[2]!;
			const layer3Reagent = REAGENTS[layer3Liquid.liquid];
			if (layer3Reagent) {
				const layer3Color = layer3Reagent.displayColor + 'da'; // opacity 0.85
				const layer3Radius = position.radius * 0.3;
				overlay += '<circle cx="0" cy="0" r="' + layer3Radius
					+ '" fill="' + layer3Color + '" stroke="none" />';
			}
		}

		overlay += '</g>';
	}

	return overlay;
}

//============================================
// renderPlateScene - Main dedicated plate render
//============================================
export function renderPlateScene(ctx: SceneContext): void {
	const currentStep = getCurrentStep();
	if (!currentStep) {
		console.error('[plate/render.ts] no active step');
		return;
	}

	const container = document.getElementById('well-plate-workspace-scene');
	if (!container) {
		console.error('[well_plate_workspace/render.ts] well-plate-workspace-scene container not found in DOM');
		return;
	}

	// Deactivate the plate-overlay modal (cleanup from legacy modal render if it was active)
	const overlay = document.getElementById('plate-overlay');
	if (overlay) {
		overlay.classList.remove('active');
	}

	// Handle interactionSequence with plateTargets (new F2 path) or tubeTargets (F5 path)
	let activeRows: string[] = [];
	let activeCols: number[] = [];
	let completedRows: string[] = [];
	let sourceItemId = '';
	let toolItemId = '';
	// activeClickTarget: the single item id the dispatcher will accept a click on
	// at this moment. For load interactions that's currentInteraction.source;
	// for discharge interactions that's currentInteraction.destination. The tool
	// field is logical (which pipette is being used) and is NOT a click target.
	let activeClickTarget = '';
	let volumeText = '';
	let sidePanelLabel = '';
	let sidePanelLiquid = '';
	let targetCount = '';
	let activeTubeId: string | undefined;
	let completedTubeIds: string[] = [];
	let futureTubeIds: string[] = [];

	if (currentStep.completionPath?.kind === 'interactionSequence' && currentStep.completionPath.plateTargets) {
		// New plateTargets-driven path for F2
		const classification = computeTargetClassification(currentStep, gameState.interactionIndex);

		if (classification.activeTarget) {
			activeRows = [...classification.activeTarget.rows];
			activeCols = [...classification.activeTarget.cols];
			sidePanelLabel = classification.activeTarget.label;
			sidePanelLiquid = classification.activeTarget.liquid;
			volumeText = `${classification.activeTarget.volumeMl * 1000} µL per well`;
		}

		// Extract tool and source from current interaction for equipment rendering
		const interactions = currentStep.completionPath.interactions;
		const currentInteraction = interactions[gameState.interactionIndex];
		if (currentInteraction) {
			toolItemId = currentInteraction.tool || '';
			sourceItemId = currentInteraction.source || '';
			// Active click target: discharge clicks (destination) win over load clicks (source).
			// well_plate is the destination for plateTargets; the dispatcher reads itemId on click.
			activeClickTarget = currentInteraction.destination || currentInteraction.source || '';
		}

		// Convert completed wells back to rows for the SVG renderer
		// This is a simplification: we track by well, but render highlights by row
		// For now, if any well in a row is completed, mark the whole row complete
		const allCompletedWells = classification.completedWells;
		const completedRowSet = new Set<string>();
		for (const wellKey of allCompletedWells) {
			const row = wellKey[0];
			if (row) completedRowSet.add(row);
		}
		completedRows = Array.from(completedRowSet);
		targetCount = `${classification.currentTargetIndex} of ${classification.totalTargets}`;
	} else if (currentStep.completionPath?.kind === 'interactionSequence' && currentStep.completionPath.tubeTargets) {
		// tubeTargets-driven path for dilution prep (F5)
		const tubeClassification = computeTubeStateClassification(currentStep, gameState.interactionIndex);

		if (tubeClassification.activeTube) {
			activeTubeId = tubeClassification.activeTube.tubeId;
			sidePanelLabel = tubeClassification.activeTube.resultLabel;
		}

		completedTubeIds = tubeClassification.completedTubes;
		futureTubeIds = tubeClassification.futureTubes;

		// Extract tool and source from current interaction for equipment rendering
		const interactions = currentStep.completionPath.interactions;
		const currentInteraction = interactions[gameState.interactionIndex];
		if (currentInteraction) {
			toolItemId = currentInteraction.tool || '';
			sourceItemId = currentInteraction.source || '';
			// Active click target: discharge (destination) wins over load (source).
			// For tubeTargets, destination is the microtube; for load, source is the bottle.
			activeClickTarget = currentInteraction.destination || currentInteraction.source || '';
		}

		targetCount = `${completedTubeIds.length + (activeTubeId ? 1 : 0)} of ${currentStep.completionPath.tubeTargets.length}`;
	} else if (currentStep.completionPath?.kind === 'modal') {
		// Legacy modal flow (plate_intro) - render simple intro
		const modal = overlay;
		if (modal) {
			modal.classList.add('active');
			const modalContent = modal.querySelector('.modal-content') as HTMLElement;
			if (modalContent) {
				let html = '<button class="modal-close" aria-label="Close plate view">&times;</button>';
				html += '<h2>96-Well Plate Workspace</h2>';
				html += '<div class="plate-workspace-panel">';
				html += '<div class="plate-workspace-copy">';
				html += '<p class="plate-workspace-kicker">Plate tutorial</p>';
				html += '<p class="plate-workspace-lede">Drug additions are easier to verify when the full 8 by 12 plate map is visible.</p>';
				html += '<p class="plate-workspace-note">Rows A-H and columns 1-12 match the working assay plate used later in the full protocol.</p>';
				html += '</div>';
				html += '<div class="plate-workspace-visual">';
				html += renderPlateMapSvg([], [], [], currentStep.plateMap?.annotations);
				html += '</div>';
				html += '</div>';
				html += '<button id="confirm-plate-intro" class="btn-primary" style="padding:10px 24px;">Continue</button>';

				modalContent.innerHTML = html;

				const confirmBtn = modalContent.querySelector('#confirm-plate-intro') as HTMLButtonElement;
				if (confirmBtn) {
					confirmBtn.addEventListener('click', () => {
						if (currentStep && currentStep.id) {
							triggerStep(currentStep.id);
						}
					});
				}

				const closeBtn = modalContent.querySelector('.modal-close') as HTMLElement;
				if (closeBtn) {
					closeBtn.addEventListener('click', () => {
						modal.classList.remove('active');
					});
				}
			}
		}
		return;
	}


	// Compute per-object emphasis state based on current step metadata
	// Classes: equipment-active (active/focused), equipment-dim (visible but de-emphasized), equipment-future (grayed out)
	let toolClass = 'equipment-future';
	let sourceClass = 'equipment-future';
	let rackClass = 'equipment-future';

	if (currentStep.completionPath?.kind === 'interactionSequence') {
		if (currentStep.completionPath.tubeTargets) {
			// tubeTargets step: single-channel pipette + source bottle + microtube rack are active
			toolClass = 'equipment-active';
			sourceClass = 'equipment-active';
			rackClass = 'equipment-active';
		} else if (currentStep.completionPath.plateTargets) {
			// plateTargets step: multichannel pipette + source bottle + plate are active
			toolClass = 'equipment-active';
			sourceClass = 'equipment-active';
			// rack is not primary during plate transfer, but keep visible (dim)
			rackClass = 'equipment-dim';
		}
	} else if (currentStep.completionPath?.kind === 'multipleChoice') {
		// multipleChoice step: scene is visible but dimmed; popup sits on top
		toolClass = 'equipment-dim';
		sourceClass = 'equipment-dim';
		rackClass = 'equipment-dim';
	} else {
		// Transition/review steps: everything dimmed or future
		toolClass = 'equipment-dim';
		sourceClass = 'equipment-dim';
		rackClass = 'equipment-dim';
	}

	// Build main workspace HTML with five-region layout
	let html = '<div class="plate-workspace-container">';

	// Static workspace inventory: these items are ALWAYS visible at every step.
	// Per-step emphasis (active/dim/future) is applied to whichever item is the
	// active source or tool of the current step; others inherit the region's
	// base class (toolClass / sourceClass / rackClass).
	const STATIC_TOOLS = ['multichannel_pipette', 'aspirating_pipette', 'micropipette_rack', 'tip_box'];
	const STATIC_SOURCES = ['carboplatin_stock_solution', 'metformin_stock_solution', 'media_bottle'];

	function emphasisClass(itemId: string, regionDefault: string): string {
		// Only the dispatcher's expected click target gets the active emphasis.
		// The tool field (pipette) is logical-only - clicking it is a no-op
		// during interactionSequence steps. Marking it active would mislead
		// the player into clicking it expecting something to happen.
		if (itemId && itemId === activeClickTarget) return 'equipment-active';
		return regionDefault;
	}

	function appendSceneObject(itemId: string, regionLabel: string, regionDefault: string): string {
		try {
			const svg = getStaticSvg(itemId);
			const cls = emphasisClass(itemId, regionDefault);
			let block = '<div class="scene-object scene-' + regionLabel + ' ' + cls + '" title="' + itemId + '" data-item-id="' + itemId + '">';
			block += svg;
			block += '</div>';
			return block;
		} catch (e) {
			console.warn('[well_plate_workspace/render.ts] missing static SVG for', itemId, e);
			return '';
		}
	}

	// Region 1: Tool area (left side) - pipettes and tip boxes, always visible
	html += '<div class="workspace-region-tool">';
	html += '<div class="plate-scene-objects">';
	for (const id of STATIC_TOOLS) {
		html += appendSceneObject(id, 'tool', toolClass);
	}
	html += '</div>';
	html += '</div>';

	// Region 2: Source area (upper center) - stock/water/media bottles, always visible
	html += '<div class="workspace-region-source">';
	html += '<div class="plate-scene-objects">';
	for (const id of STATIC_SOURCES) {
		html += appendSceneObject(id, 'source', sourceClass);
	}
	html += '</div>';
	html += '</div>';

	// Region 3: Microtube rack area (lower center) - dilution tubes, always visible.
	// Microtube content overlay only renders during tubeTargets steps; the rack
	// itself stays visible at every step so the workspace layout is stable.
	html += '<div class="workspace-region-rack">';
	html += '<div class="plate-scene-objects">';
	try {
		const rackSvg = getStaticSvg('dilution_tube_rack');
		let composedSvg = rackSvg;
		if (currentStep.completionPath?.kind === 'interactionSequence' && currentStep.completionPath.tubeTargets) {
			const tubeOverlay = renderMicrotubeOverlay(activeTubeId, completedTubeIds, futureTubeIds);
			if (tubeOverlay) {
				composedSvg = rackSvg.replace('</svg>', tubeOverlay + '</svg>');
			}
		}
		html += '<div class="scene-object scene-rack ' + rackClass + '" title="dilution_tube_rack" data-item-id="dilution_tube_rack">';
		html += composedSvg;
		html += '</div>';
	} catch (e) {
		console.warn('[well_plate_workspace/render.ts] missing dilution_tube_rack SVG', e);
	}
	html += '</div>';
	html += '</div>';

	// Region 4: Plate area (right side, largest) - 96-well plate
	html += '<div class="workspace-region-plate">';
	html += '<div class="plate-workspace-visual" data-item-id="well_plate">';
	html += renderPlateMapSvg(activeRows, activeCols, completedRows, currentStep.plateMap?.annotations);
	html += '</div>';
	html += '</div>';

	// Region 5: Popup overlay (centered above scene) - multiple-choice cards
	html += '<div class="workspace-popup-overlay">';
	if (currentStep.completionPath?.kind === 'multipleChoice') {
		const quizHtml = renderMultipleChoicePrompt(currentStep);
		html += quizHtml;
	}
	html += '</div>';

	// Right side: side panel with instructions and progress
	html += '<div class="plate-side-panel">';

	// Step title
	html += '<div class="plate-panel-instruction">';
	html += '<h3>' + (sidePanelLabel || currentStep.label || 'Plate Workspace') + '</h3>';
	if (currentStep.action) {
		html += '<p class="plate-action-text">' + currentStep.action + '</p>';
	}
	html += '</div>';

	// Reagent and volume info (for plateTargets or legacy applyReagent)
	if (sidePanelLiquid || sourceItemId) {
		html += '<div class="plate-panel-reagent-info">';
		if (sidePanelLiquid) {
			html += '<p><strong>Liquid:</strong> ' + sidePanelLiquid + '</p>';
		} else if (sourceItemId) {
			html += '<p><strong>Active source:</strong> ' + sourceItemId + '</p>';
		}
		if (volumeText) {
			html += '<p><strong>Volume:</strong> ' + volumeText + '</p>';
		}
		html += '</div>';
	}

	// Progress indication (for plateTargets)
	if (targetCount) {
		html += '<div class="plate-panel-progress">';
		html += '<p><strong>Targets completed:</strong> ' + targetCount + '</p>';
		html += '</div>';
	} else if (activeRows.length > 0) {
		// Legacy progress for applyReagent
		html += '<div class="plate-panel-progress">';
		if (completedRows.length > 0) {
			html += '<p><strong>Completed:</strong> ' + completedRows.join(', ') + '</p>';
		}
		html += '<p><strong>Next:</strong> row ' + activeRows[0] + '</p>';
		html += '</div>';
	}

	html += '</div>';

	html += '</div>';

	container.innerHTML = html;

	// Wire clicks on scene objects (tool and source) and well_plate
	const wellPlateVisual = container.querySelector('.plate-workspace-visual');
	if (wellPlateVisual) {
		wellPlateVisual.addEventListener('click', (evt) => {
			const itemId = (evt.currentTarget as HTMLElement).getAttribute('data-item-id');
			if (itemId) {
				ctx.dispatchInteraction(itemId);
			}
		});
	}

	// Wire clicks on every tool and every source SVG (static workspace inventory).
	// querySelectorAll, not querySelector - multiple tools and sources are rendered
	// at every step and any of them can be the active click target depending on
	// the current step's interaction.
	const toolObjs = container.querySelectorAll('.scene-tool');
	toolObjs.forEach((tool) => {
		tool.addEventListener('click', (evt) => {
			const itemId = (evt.currentTarget as HTMLElement).getAttribute('data-item-id');
			if (itemId) {
				ctx.dispatchInteraction(itemId);
			}
		});
	});

	const sourceObjs = container.querySelectorAll('.scene-source');
	sourceObjs.forEach((src) => {
		src.addEventListener('click', (evt) => {
			const itemId = (evt.currentTarget as HTMLElement).getAttribute('data-item-id');
			if (itemId) {
				ctx.dispatchInteraction(itemId);
			}
		});
	});

	// Wire clicks on individual microtubes inside the rack. Microtubes use the
	// data-item-id (matching items.yaml dilution_tube_carb_* ids) so the
	// dispatcher can route discharge clicks to addTubeLiquid by tube id.
	const microtubes = container.querySelectorAll('.microtube-item');
	microtubes.forEach((tube) => {
		tube.addEventListener('click', (evt) => {
			// SVG click events target the <g class="microtube-item" data-item-id="..."> directly.
			const tubeEl = evt.currentTarget as Element;
			const itemId = tubeEl.getAttribute('data-item-id');
			if (itemId) {
				ctx.dispatchInteraction(itemId);
			}
		});
	});

	// Wire clicks on multiple-choice option buttons. The renderer emits
	// <button class="mc-choice-button" data-item-id="..."> for each choice;
	// dispatch.ts onPlateItemClick reads the matching choice from completionPath.choices.
	const mcButtons = container.querySelectorAll('.mc-choice-button');
	mcButtons.forEach((btn) => {
		btn.addEventListener('click', (evt) => {
			const itemId = (evt.currentTarget as HTMLElement).getAttribute('data-item-id');
			if (itemId) {
				ctx.dispatchInteraction(itemId);
			}
		});
	});
}
