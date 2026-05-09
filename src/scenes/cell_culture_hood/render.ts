//============================================
// render.ts - Hood scene rendering assembly
//============================================

import { ASSET_SPECS } from "../../asset_specs";
import { FLASK_MAX_VOLUME_ML, type Interaction, type ProtocolStep } from "../../constants";
import { REAGENTS } from "../../content/inventory_data";
import { gameState, getCurrentStep, renderGame, switchScene } from "../../game_state";
import { HOOD_LAYOUT_RULES, HOOD_SCENE_ITEMS, getHoodItemLabel } from "../../hood_config";
import { computeSceneLayout } from "../../layout_engine";
import { showWrongOrderToast } from "../shared/wrong_order_feedback";
import { canonicalTool, deriveHeldLiquid } from "../shared/liquid_transfer";
import { COLOR_MAP, type ColorRole } from "../../style_constants";
import { deriveT75Visual, getHoodBackgroundSvg, getSeroPipetteSvg, getWellPlateSvg, renderEquipmentSvg } from "../../svg_assets";

//============================================
// deriveActiveInteractionTargets(step, interactionIndex, selectedTool, heldLiquid)
//
// Patch 6: Replace deriveActiveTargets with interactionIndex-aware highlight set.
// Returns the de-duplicated list of item ids (tool/source/destination) from the
// active interaction at step.completionPath.interactions[interactionIndex].
// If the tool precondition is met (selectedTool matches or heldLiquid.tool matches),
// keep the tool in the set so the player still sees what is loaded.
//============================================
function deriveActiveInteractionTargets(
	step: ProtocolStep | null,
	interactionIndex: number,
	selectedTool: string | null,
	heldLiquid: { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null } | null
): string[] {
	const interactions = step && step.completionPath && step.completionPath.kind === 'interactionSequence'
		? step.completionPath.interactions
		: null;
	if (!interactions || interactionIndex < 0 || interactionIndex >= interactions.length) {
		return [];
	}

	const interaction = interactions[interactionIndex];
	if (!interaction) return [];

	const targets = new Set<string>();

	if (interaction.tool) {
		targets.add(interaction.tool);
	}

	if (interaction.source) {
		targets.add(interaction.source);
	}

	if (interaction.destination) {
		targets.add(interaction.destination);
	}

	return Array.from(targets);
}

//============================================
// getStartingToolForStep(step): string | null
//============================================
export function getStartingToolForStep(step: ProtocolStep): string | null {
	const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
	const itemIds = deriveActiveInteractionTargets(step, gameState.interactionIndex, gameState.selectedTool, heldLiquid);
	for (const itemId of itemIds) {
		const item = HOOD_SCENE_ITEMS.find(i => i.id === itemId);
		if (item && item.kind === 'pipette') {
			return item.id;
		}
	}
	return null;
}

//============================================
// getReagentSourceForStep(step): string | null
//
// Return the id of the reagent source the student should click next
// when holding an unloaded pipette. The source is the container to
// draw from -- a bottle or rack for most steps, falling back to the
// flask for draw-from-flask steps (aspirate old media, seed plate).
// Used by the toolbar hint. Patch 6: now uses interactionIndex-aware highlights.
//============================================
export function getReagentSourceForStep(step: ProtocolStep): string | null {
	const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
	const itemIds = deriveActiveInteractionTargets(step, gameState.interactionIndex, gameState.selectedTool, heldLiquid);
	// Preferred: a bottle or rack in the derived items (reagent container)
	for (const itemId of itemIds) {
		const item = HOOD_SCENE_ITEMS.find(i => i.id === itemId);
		if (item && (item.kind === 'bottle' || item.kind === 'rack')) {
			return item.id;
		}
	}
	// Fallback: first non-pipette, non-plate item in derived items
	for (const itemId of itemIds) {
		const item = HOOD_SCENE_ITEMS.find(i => i.id === itemId);
		if (item && item.kind !== 'pipette' && item.kind !== 'plate') {
			return item.id;
		}
	}
	return null;
}

//============================================
// showWrongOrderHint(itemId, step, interaction)
//
// Patch 6: Wrong-order hint UI. Applies a CSS shake animation to the clicked
// item and shows a small toast naming the expected next click. The shake is
// a visual nudge (a few pixels of horizontal wiggle for ~400ms).
// Toast auto-dismisses after ~2 seconds; multiple wrong clicks reset the timer.
//============================================
export function showWrongOrderHint(clickedItemId: string, step: ProtocolStep | null, interaction: Interaction | undefined): void {
	const clickedElem = document.querySelector(`[data-item-id="${clickedItemId}"]`) as HTMLElement | null;
	if (clickedElem) {
		clickedElem.classList.add('wrong-order-shake');
		setTimeout(() => {
			clickedElem.classList.remove('wrong-order-shake');
		}, 400);
	}

	let hintMessage = 'Try the highlighted item.';

	if (!interaction) {
		hintMessage = 'Try the highlighted item.';
	} else {
		const toolPreconditionMet = (): boolean => {
			const cleanTool = canonicalTool(gameState.selectedTool);
			if (cleanTool === interaction.tool) return true;
			const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
			if (heldLiquid && heldLiquid.tool === interaction.tool) return true;
			return false;
		};

		if (interaction.tool && !toolPreconditionMet()) {
			const toolItem = HOOD_SCENE_ITEMS.find(i => i.id === interaction.tool);
			const toolLabel = toolItem ? getHoodItemLabel(interaction.tool) : interaction.tool;
			hintMessage = `Click the ${toolLabel} first.`;
		} else if (interaction.source) {
			const sourceItem = HOOD_SCENE_ITEMS.find(i => i.id === interaction.source);
			const sourceLabel = sourceItem ? getHoodItemLabel(interaction.source) : interaction.source;
			hintMessage = `Click the ${sourceLabel}.`;
		} else if (interaction.destination) {
			const destItem = HOOD_SCENE_ITEMS.find(i => i.id === interaction.destination);
			const destLabel = destItem ? getHoodItemLabel(interaction.destination) : interaction.destination;
			hintMessage = `Click the ${destLabel}.`;
		}
	}

	showWrongOrderToast(hintMessage);
}

//============================================
// getItemSvgHtml(itemId): string
//
// Map item IDs to their SVG generator functions
//============================================
export function getItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'flask': {
			// Derive T75LiquidVisual from current game state, then route through
			// renderEquipmentSvg. isDirty stays false here -- the dirty residue
			// state is owned by other code paths and was not exposed by the
			// previous getFlaskSvg(mediaLevel, mediaAge) call signature.
			const mediaLevel = gameState.flaskMediaMl / FLASK_MAX_VOLUME_ML;
			const visual = deriveT75Visual(mediaLevel > 0 ? 1 : 0, gameState.flaskMediaAge, false);
			return renderEquipmentSvg({ assetId: 'flask', liquidState: visual });
		}
		case 'well_plate': return getWellPlateSvg(gameState.wellPlate);
		case 'media_bottle': return renderEquipmentSvg({ assetId: 'media_bottle' });
		case 'trypsin_bottle': return renderEquipmentSvg({ assetId: 'trypsin_bottle' });
		case 'aspirating_pipette': return renderEquipmentSvg({ assetId: 'aspirating_pipette' });
		case 'serological_pipette':
			// Held-liquid pipette uses the keeper helper that accepts a
			// custom hex color + volume; empty pipette routes through the
			// renderEquipmentSvg facade.
			if (gameState.heldLiquid && gameState.heldLiquid.tool === 'serological_pipette') {
				const reagent = REAGENTS[gameState.heldLiquid.liquid];
				const color = reagent ? reagent.displayColor : COLOR_MAP[gameState.heldLiquid.colorKey as ColorRole] || '#cccccc';
				return getSeroPipetteSvg(gameState.heldLiquid.volumeMl, color);
			}
			return renderEquipmentSvg({ assetId: 'serological_pipette' });
		case 'waste_container': return renderEquipmentSvg({ assetId: 'waste_container' });
		case 'drug_vials': return renderEquipmentSvg({ assetId: 'drug_vials' });
		case 'multichannel_pipette': return renderEquipmentSvg({ assetId: 'multichannel_pipette' });
		case 'ethanol_bottle': return renderEquipmentSvg({ assetId: 'ethanol_bottle' });
		case 'sterile_water': return renderEquipmentSvg({ assetId: 'sterile_water' });
		case 'pbs_bottle': return renderEquipmentSvg({ assetId: 'pbs_bottle' });
		case 'conical_15ml_rack': return renderEquipmentSvg({ assetId: 'conical_15ml_rack' });
		case 'dilution_tube_rack': return renderEquipmentSvg({ assetId: 'dilution_tube_rack' });
		case 'mtt_vial': return renderEquipmentSvg({ assetId: 'mtt_vial' });
		case 'dmso_bottle': return renderEquipmentSvg({ assetId: 'dmso_bottle' });
		case 'carboplatin_stock': return renderEquipmentSvg({ assetId: 'carboplatin_stock' });
		// metformin_stock_bottle is a legacy alias used in some authored content;
		// route both ids to the canonical metformin_stock asset.
		case 'metformin_stock':
		case 'metformin_stock_bottle': return renderEquipmentSvg({ assetId: 'metformin_stock' });
		case 'micropipette_rack': return renderEquipmentSvg({ assetId: 'micropipette_rack' });
		case 'biohazard_decant': return renderEquipmentSvg({ assetId: 'biohazard_decant' });
		default: return '';
	}
}

//============================================
// getHoodItemAccentStyle(itemId): string
//============================================
export function getHoodItemAccentStyle(itemId: string): string {
	return '';
}

//============================================
// getAvailableActions(): string[]
//============================================
export function getAvailableActions(): string[] {
	const actions: string[] = [];
	const step = getCurrentStep();
	if (!step) return actions;

	switch (step.id) {
		case 'spray_hood':
			actions.push('Click the ethanol bottle to spray the hood');
			break;
		case 'aspirate_old_media':
			actions.push('Pick up the aspirating pipette, then click the flask');
			break;
		case 'carb_intermediate':
			actions.push('Pick up the multichannel pipette, click the drug vials, click the 24-well plate, then click Prepare intermediate stock');
			break;
		case 'carb_low_range':
			actions.push('Pick up the micropipette, load from the intermediate, discharge to rows B-F with media');
			break;
		case 'carb_high_range':
			actions.push('Click Prepare high-range stocks in the carboplatin modal');
			break;
		case 'metformin_stock':
			actions.push('Click Prepare metformin stock in the metformin modal');
			break;
		case 'add_carboplatin':
			actions.push('Pick up the multichannel pipette, click the drug vials, click the 24-well plate, then click Add carboplatin');
			break;
		case 'count_cells':
			actions.push('Click the flask to count cells on the hemocytometer');
			break;
		case 'plate_read':
			actions.push('Read the plate on the plate reader');
			break;
	}
	return actions;
}

//============================================
// renderHoodScene(): void
//
// Moved from src/scenes/hood.ts in Patch A3
// Renders the hood scene DOM: background, items, labels, toolbar
//============================================
export function renderHoodScene(): void {
	const hoodScene = document.getElementById('hood-scene');
	if (!hoodScene) return;

	const viewportW = hoodScene.clientWidth || 800;
	const viewportH = hoodScene.clientHeight || 600;
	const layout = computeSceneLayout(
		HOOD_SCENE_ITEMS, ASSET_SPECS, HOOD_LAYOUT_RULES,
		viewportW, viewportH
	);

	const currentStepData = getCurrentStep();
	let activeTargets: string[] = [];
	if (currentStepData && currentStepData.scene === 'hood') {
		if (currentStepData.completionPath && currentStepData.completionPath.kind === 'interactionSequence') {
			const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
			activeTargets = deriveActiveInteractionTargets(
				currentStepData,
				gameState.interactionIndex,
				gameState.selectedTool,
				heldLiquid
			);
		} else if (currentStepData.completionPath && currentStepData.completionPath.kind === 'directTool') {
			const cp = currentStepData.completionPath;
			activeTargets = [cp.tool];
		} else if (currentStepData.completionPath && currentStepData.completionPath.kind === 'modal') {
			const cp = currentStepData.completionPath;
			const openClick = cp.openClick;
			if (openClick) {
				activeTargets = [openClick];
			}
		}
	}
	const nextPulseTarget = activeTargets.length > 0 ? activeTargets[0] : null;

	let itemsHtml = '';
	let labelsHtml = '';

	for (let i = 0; i < layout.length; i++) {
		const item = layout[i]!;
		const isSelected = gameState.selectedTool === item.id;
		const isTarget = activeTargets.indexOf(item.id) >= 0;
		const activeClass = isTarget && !isSelected ? ' is-active' : '';
		const pulseClass = item.id === nextPulseTarget && isTarget && !isSelected ? ' is-next-target' : '';
		const selectedClass = isSelected ? ' is-selected' : '';
		const svgHtml = getItemSvgHtml(item.id);
		const accentStyle = getHoodItemAccentStyle(item.id);

		itemsHtml += '<div class="hood-item' + activeClass + pulseClass + selectedClass + '"';
		itemsHtml += ' data-item-id="' + item.id + '"';
		itemsHtml += ' tabindex="0" role="button"';
		itemsHtml += ' aria-label="' + item.tooltip + '"';
		itemsHtml += ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"';
		itemsHtml += ' data-x="' + item.x.toFixed(1) + '"';
		itemsHtml += ' data-y="' + item.y.toFixed(1) + '"';
		itemsHtml += ' draggable="true"';
		itemsHtml += ' title="' + item.tooltip + '"';
		itemsHtml += ' style="left:' + item.x.toFixed(1) + '%;';
		itemsHtml += 'top:' + item.y.toFixed(1) + '%;';
		itemsHtml += 'width:' + item.width.toFixed(1) + '%;';
		itemsHtml += 'height:' + item.height.toFixed(1) + '%;' + accentStyle + '">';
		itemsHtml += svgHtml;
		itemsHtml += '</div>';

		if (item.id !== 'flask') {
			const multiClass = item.labelMultiline ? ' multiline' : '';
			labelsHtml += '<div class="hood-item-label' + multiClass + '"';
			labelsHtml += ' style="left:' + item.labelX.toFixed(1) + '%;';
			labelsHtml += 'top:' + item.labelY.toFixed(1) + '%;';
			labelsHtml += 'width:' + item.labelWidth.toFixed(1) + '%;">';
			for (let li = 0; li < item.labelLines.length; li++) {
				if (li > 0) labelsHtml += '<br>';
				labelsHtml += item.labelLines[li];
			}
			labelsHtml += '</div>';
		}
	}

	let html = '';
	html += '<div id="hood-bg" style="position:absolute;top:0;left:0;';
	html += 'width:100%;height:100%;">';
	html += getHoodBackgroundSvg();
	html += '</div>';
	html += '<div id="hood-items-layer">';
	html += itemsHtml;
	html += '</div>';
	html += '<div id="hood-labels-layer">';
	html += labelsHtml;
	html += '</div>';

	const currentStep = getCurrentStep();
	let hintText: string = 'Protocol complete!';
	if (currentStep) {
		const actions = getAvailableActions();
		if (actions.length > 0) {
			hintText = actions[0]!;
		} else {
			hintText = currentStep.action;
			if (!gameState.selectedTool) {
				const startTool = getStartingToolForStep(currentStep);
				if (startTool) {
					const startLabel = getHoodItemLabel(startTool);
					hintText = 'Pick up the ' + startLabel + ' -- ' + currentStep.action;
				}
			}
		}
	}
	if (gameState.selectedTool) {
		const toolLabel = getHoodItemLabel(gameState.selectedTool);
		if (gameState.selectedTool === 'serological_pipette') {
			if (currentStep) {
				const source = getReagentSourceForStep(currentStep);
				if (source) {
					const sourceLabel = getHoodItemLabel(source);
					hintText = 'Holding: ' + toolLabel + ' -- Click the ' + sourceLabel;
				} else {
					hintText = 'Holding: ' + toolLabel + ' -- ' + currentStep.action;
				}
			} else {
				hintText = 'Holding: ' + toolLabel;
			}
		} else if (gameState.selectedTool === 'serological_pipette_with_trypsin') {
			hintText = 'Trypsin loaded -- Click the flask to add';
		} else if (gameState.selectedTool === 'serological_pipette_with_pbs') {
			hintText = 'PBS loaded -- Click the flask to rinse';
		} else if (gameState.selectedTool === 'serological_pipette_with_sample') {
			hintText = 'Cell sample loaded -- Click the microscope to load hemocytometer';
		} else if (gameState.selectedTool === 'serological_pipette_with_media') {
			hintText = 'Media loaded -- Click the flask to add';
		} else if (gameState.selectedTool === 'serological_pipette_with_cells') {
			hintText = 'Cells loaded -- Click the 24-well plate';
		} else if (gameState.selectedTool === 'multichannel_pipette') {
			if (currentStep) {
				const source = getReagentSourceForStep(currentStep);
				if (source) {
					const sourceLabel = getHoodItemLabel(source);
					hintText = 'Holding: ' + toolLabel + ' -- Click the ' + sourceLabel;
				} else {
					hintText = 'Holding: ' + toolLabel + ' -- ' + currentStep.action;
				}
			} else {
				hintText = 'Holding: ' + toolLabel;
			}
		} else if (gameState.selectedTool === 'multichannel_pipette_with_drug') {
			hintText = 'Drugs loaded -- Click the 24-well plate';
		} else if (gameState.selectedTool === 'aspirating_pipette') {
			hintText = 'Holding: ' + toolLabel + ' -- Click the flask to aspirate';
		} else if (gameState.selectedTool === 'well_plate') {
			hintText = 'Holding plate -- Click the incubator to place it inside';
		} else if (gameState.selectedTool === 'flask' && gameState.trypsinAdded && !gameState.trypsinIncubated) {
			hintText = 'Holding flask -- Click the incubator for trypsin incubation';
		} else {
			hintText = 'Holding: ' + toolLabel + ' -- Click an item to use it';
		}
	}

	html += '<div id="hood-toolbar" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);';
	html += 'background:#ffffff;padding:12px 28px 12px 22px;border-radius:10px;';
	html += 'border:2px solid #2e7d32;border-left-width:6px;';
	html += 'font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:0.2px;';
	html += 'white-space:nowrap;z-index:100;display:flex;align-items:center;gap:14px;">';
	html += '<span style="font-size:12px;font-weight:700;text-transform:uppercase;';
	html += 'letter-spacing:1.2px;color:#2e7d32;">Next</span>';
	html += '<span>' + hintText + '</span>';
	if (gameState.selectedTool) {
		html += '<button id="put-down-btn" style="padding:4px 12px;background:#ef5350;color:#fff;';
		html += 'border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;">';
		html += 'Put down (Esc)</button>';
	}
	html += '</div>';

	html += '<button class="scene-nav-btn" id="hood-to-bench-btn" ';
	html += 'style="right:16px;left:auto;">To Bench &rarr;</button>';

	hoodScene.style.position = 'relative';
	hoodScene.innerHTML = html;

	const toBenchBtn = document.getElementById('hood-to-bench-btn');
	if (toBenchBtn) {
		toBenchBtn.addEventListener('click', () => {
			switchScene('bench');
			renderGame();
		});
	}
}
