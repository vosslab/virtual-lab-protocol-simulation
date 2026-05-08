// ============================================
// hood_scene.ts - Main hood view rendering and interaction
// ============================================

//============================================
// Bridge functions for M1.5.C: map legacy selectedTool tokens to synthetic heldLiquid
//============================================
import { ASSET_SPECS } from "../asset_specs";
import { FLASK_MAX_VOLUME_ML, type ProtocolStep } from "../constants";
import { REAGENTS } from "../content/inventory_data";
import { gameState, getCurrentStep, recordCleanlinessError, registerWarning, registeredEmitters, renderGame, showNotification, switchScene, triggerStep } from "../game_state";
import { HOOD_LAYOUT_RULES, HOOD_SCENE_ITEMS, getHoodItemLabel } from "../hood_config";
import { resolveInteraction, resolveInteractionByIndex } from "../interaction_resolver";
import { computeSceneLayout } from "../layout_engine";
import { startDrugAddition } from "../steps/drug_treatment";
import { startAddingMedia, startAspiration } from "../steps/feed_cells";
import { COLOR_MAP, type ColorRole } from "../style_constants";
import { getAspiratingPipetteSvg, getBiohazardDecanSvg, getCarboplatinStockSvg, getConical15mlRackSvg, getDilutionTubeRackSvg, getDmsoBottleSvg, getDrugVialsSvg, getEthanolBottleSvg, getFlaskSvg, getHoodBackgroundSvg, getMediaBottleSvg, getMetforminStockSvg, getMicropipetteRackSvg, getMttVialSvg, getMultichannelPipetteSvg, getPbsBottleSvg, getSeroPipetteSvg, getSterileWaterSvg, getTrypsinBottleSvg, getWasteContainerSvg, getWellPlateSvg } from "../svg_assets";
import { renderProtocolPanel, renderScoreDisplay } from "../ui_rendering";
import { renderTrypsinIncubation } from "./incubator";


export function deriveHeldLiquid(selectedTool: string | null): { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null } {
	if (!selectedTool) return { tool: null, liquid: null, volumeMl: 0, colorKey: null };
	const map: Record<string, { liquid: string; volumeMl: number; colorKey: string }> = {
		'serological_pipette_with_pbs':     { liquid: 'pbs',     volumeMl: 4,  colorKey: 'pbs' },
		'serological_pipette_with_trypsin': { liquid: 'trypsin', volumeMl: 3,  colorKey: 'trypsin' },
		'serological_pipette_with_media':   { liquid: 'media',   volumeMl: 9,  colorKey: 'media' },
		'serological_pipette_with_sample':  { liquid: 'cells',   volumeMl: 1,  colorKey: 'cells' },
		'serological_pipette_with_cells':   { liquid: 'cells',   volumeMl: 12, colorKey: 'cells' },
	};
	const hit = map[selectedTool];
	if (hit) return { tool: 'serological_pipette', liquid: hit.liquid, volumeMl: hit.volumeMl, colorKey: hit.colorKey };
	return { tool: selectedTool, liquid: null, volumeMl: 0, colorKey: null };
}

export function canonicalTool(selectedTool: string | null): string | null {
	if (!selectedTool) return null;
	const i = selectedTool.indexOf('_with_');
	return i >= 0 ? selectedTool.substring(0, i) : selectedTool;
}

//============================================
// deriveActiveInteractionTargets(step, interactionIndex)
//
// Patch 6: Replace deriveActiveTargets with interactionIndex-aware highlight set.
// Returns the de-duplicated list of item ids (tool/source/destination) from the
// active interaction at step.interactionSequence[interactionIndex].
// If the tool precondition is met (selectedTool matches or heldLiquid.tool matches),
// keep the tool in the set so the player still sees what is loaded.
// ============================================
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

	// Add tool if present (keep visible to show what is loaded)
	if (interaction.tool) {
		targets.add(interaction.tool);
	}

	// Add source if present and not yet satisfied
	if (interaction.source) {
		targets.add(interaction.source);
	}

	// Add destination if present and not yet satisfied
	if (interaction.destination) {
		targets.add(interaction.destination);
	}

	return Array.from(targets);
}

//============================================
// Return the id of the first pipette-kind item from the step's active interaction.
// Used by the toolbar hint to tell the student which tool to pick up first
// when they are not yet holding anything.
// Patch 6: now uses deriveActiveInteractionTargets instead of deriveActiveTargets.
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
// Return the id of the reagent source the student should click next
// when holding an unloaded pipette. The source is the container to
// draw from -- a bottle or rack for most steps, falling back to the
// flask for draw-from-flask steps (aspirate old media, seed plate).
// Used by the toolbar hint. Patch 6: now uses interactionIndex-aware highlights.
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
function showWrongOrderHint(clickedItemId: string, step: ProtocolStep | null, interaction: any): void {
	// Apply CSS shake animation to the clicked element
	const clickedElem = document.querySelector(`[data-item-id="${clickedItemId}"]`) as HTMLElement | null;
	if (clickedElem) {
		clickedElem.classList.add('wrong-order-shake');
		setTimeout(() => {
			clickedElem.classList.remove('wrong-order-shake');
		}, 400);
	}

	// Determine the hint message from the interaction shape
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

		// If tool is required but not met, hint to pick up the tool first
		if (interaction.tool && !toolPreconditionMet()) {
			const toolItem = HOOD_SCENE_ITEMS.find(i => i.id === interaction.tool);
			const toolLabel = toolItem ? getHoodItemLabel(interaction.tool) : interaction.tool;
			hintMessage = `Click the ${toolLabel} first.`;
		}
		// Else if source click is expected
		else if (interaction.source) {
			const sourceItem = HOOD_SCENE_ITEMS.find(i => i.id === interaction.source);
			const sourceLabel = sourceItem ? getHoodItemLabel(interaction.source) : interaction.source;
			hintMessage = `Click the ${sourceLabel}.`;
		}
		// Else if destination click is expected
		else if (interaction.destination) {
			const destItem = HOOD_SCENE_ITEMS.find(i => i.id === interaction.destination);
			const destLabel = destItem ? getHoodItemLabel(interaction.destination) : interaction.destination;
			hintMessage = `Click the ${destLabel}.`;
		}
	}

	// Show the toast notification
	showWrongOrderToast(hintMessage);
}

//============================================
// showWrongOrderToast(message)
//
// Display a small toast with the hint message. Toast auto-dismisses after ~2 seconds.
// Multiple calls reset the timer.
//============================================
function showWrongOrderToast(message: string): void {
	let toastContainer = document.getElementById('wrong-order-toast-container');
	if (!toastContainer) {
		toastContainer = document.createElement('div');
		toastContainer.id = 'wrong-order-toast-container';
		toastContainer.style.position = 'fixed';
		toastContainer.style.top = '20px';
		toastContainer.style.right = '20px';
		toastContainer.style.zIndex = '1000';
		toastContainer.style.pointerEvents = 'none';
		document.body.appendChild(toastContainer);
	}

	// Remove any existing toast
	const existingToast = toastContainer.querySelector('.wrong-order-toast');
	if (existingToast) {
		toastContainer.removeChild(existingToast);
	}

	// Create new toast
	const toast = document.createElement('div');
	toast.className = 'wrong-order-toast';
	toast.textContent = message;
	toast.style.backgroundColor = '#fff3cd';
	toast.style.border = '1px solid #ffc107';
	toast.style.borderRadius = '6px';
	toast.style.padding = '12px 16px';
	toast.style.fontSize = '14px';
	toast.style.fontWeight = '500';
	toast.style.color = '#856404';
	toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
	toast.style.maxWidth = '300px';
	toast.style.wordWrap = 'break-word';
	toast.style.animation = 'fadeIn 0.3s ease-in';

	toastContainer.appendChild(toast);

	// Auto-dismiss after 2 seconds
	setTimeout(() => {
		if (toastContainer && toastContainer.contains(toast)) {
			toast.style.animation = 'fadeOut 0.3s ease-out';
			setTimeout(() => {
				if (toastContainer && toastContainer.contains(toast)) {
					toastContainer.removeChild(toast);
				}
			}, 300);
		}
	}, 2000);
}

// Pre-register every step id this scene owns. validateCompletionEventCoverage()
// runs on the load event -- before any click handlers have fired -- and
// verifies that each PROTOCOL_STEPS id is in registeredEmitters. Each
// scene file must list its step ids here so coverage passes at load time.
// The actual state-machine advance still happens inside triggerStep at
// click time; these lines only announce that a live wiring path exists.
registeredEmitters.add('spray_hood');
registeredEmitters.add('pbs_wash');
registeredEmitters.add('add_trypsin');
registeredEmitters.add('seed_plate');
registeredEmitters.add('media_adjust');
registeredEmitters.add('add_mtt');
registeredEmitters.add('decant_mtt');
registeredEmitters.add('add_dmso');
registeredEmitters.add('carb_low_range');

//============================================
// Map item IDs to their SVG generator functions
export function getItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'flask':
			const mediaLevel = gameState.flaskMediaMl / FLASK_MAX_VOLUME_ML;
			return getFlaskSvg(mediaLevel, gameState.flaskMediaAge);
		case 'well_plate': return getWellPlateSvg(gameState.wellPlate);
		case 'media_bottle': return getMediaBottleSvg();
		case 'trypsin_bottle': return getTrypsinBottleSvg();
		case 'aspirating_pipette': return getAspiratingPipetteSvg();
		case 'serological_pipette':
			if (gameState.heldLiquid && gameState.heldLiquid.tool === 'serological_pipette') {
				const reagent = REAGENTS[gameState.heldLiquid.liquid];
				const color = reagent ? reagent.displayColor : COLOR_MAP[gameState.heldLiquid.colorKey as ColorRole] || '#cccccc';
				return getSeroPipetteSvg(gameState.heldLiquid.volumeMl, color);
			}
			return getSeroPipetteSvg();
		case 'waste_container': return getWasteContainerSvg();
		case 'drug_vials': return getDrugVialsSvg();
		case 'multichannel_pipette': return getMultichannelPipetteSvg();
		case 'ethanol_bottle': return getEthanolBottleSvg();
		case 'sterile_water': return getSterileWaterSvg();
		case 'pbs_bottle': return getPbsBottleSvg();
		case 'conical_15ml_rack': return getConical15mlRackSvg();
		case 'dilution_tube_rack': return getDilutionTubeRackSvg();
		case 'mtt_vial': return getMttVialSvg();
		case 'dmso_bottle': return getDmsoBottleSvg();
		case 'carboplatin_stock': return getCarboplatinStockSvg();
		case 'metformin_stock': return getMetforminStockSvg();
		case 'micropipette_rack': return getMicropipetteRackSvg();
		case 'biohazard_decant': return getBiohazardDecanSvg();
		default: return '';
	}
}

export function getHoodItemAccentStyle(itemId: string): string {
	return '';
}

// ============================================
export function renderHoodScene(): void {
	const hoodScene = document.getElementById('hood-scene');
	if (!hoodScene) return;

	// Compute layout from semantic config (no DOM measurements)
	const viewportW = hoodScene.clientWidth || 800;
	const viewportH = hoodScene.clientHeight || 600;
	const layout = computeSceneLayout(
		HOOD_SCENE_ITEMS, ASSET_SPECS, HOOD_LAYOUT_RULES,
		viewportW, viewportH
	);

	// Determine active targets for the current protocol step. Only highlight
	// hood items when the active step lives on the hood; for
	// bench/microscope/incubator/plate_reader steps we clear the hood's
	// highlights so stale highlights from the previous hood step do not
	// linger on the (hidden) hood div.
	// Patch 6: Highlight set comes from the active interaction at interactionIndex,
	// not from all interactions in the sequence.
	const currentStepData = getCurrentStep();
	let activeTargets: string[] = [];
	if (currentStepData && currentStepData.scene === 'hood') {
		const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
		activeTargets = deriveActiveInteractionTargets(
			currentStepData,
			gameState.interactionIndex,
			gameState.selectedTool,
			heldLiquid
		);
	}
	const nextPulseTarget = activeTargets.length > 0 ? activeTargets[0] : null;

	// Build items and labels in one pass into separate layer strings
	let itemsHtml = '';
	let labelsHtml = '';

	for (let i = 0; i < layout.length; i++) {
		const item = layout[i]!;
		// layout is guaranteed to contain items from computeSceneLayout call
		const isSelected = gameState.selectedTool === item.id;
		const isTarget = activeTargets.indexOf(item.id) >= 0;
		const activeClass = isTarget && !isSelected ? ' is-active' : '';
		const pulseClass = item.id === nextPulseTarget && isTarget && !isSelected ? ' is-next-target' : '';
		const selectedClass = isSelected ? ' is-selected' : '';
		const svgHtml = getItemSvgHtml(item.id);
		const accentStyle = getHoodItemAccentStyle(item.id);

		// Item div: coordinates inline, classes handle visual states
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

		// Label div: positioned by layout engine
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

	// Assemble with layer structure
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

	// Toolbar with context-sensitive next-action hint
	const currentStep = getCurrentStep();
	let hintText: string = 'Protocol complete!';
	if (currentStep) {
		// Use getAvailableActions() for specific next-action guidance
		const actions = getAvailableActions();
		if (actions.length > 0) {
			hintText = actions[0]!;
			// actions is non-empty, so [0] is guaranteed to exist
		} else {
			// Base hint is the step's action text. If the step requires a
			// tool (pipette) and the student is not yet holding one, append
			// a "pick up the X" suggestion so the hint tells them where to
			// start. Without this the banner said things like "Wash the
			// flask with 4 mL PBS" with no indication that they must pick
			// up the serological pipette first.
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
		// Provide context-aware next action when holding a tool
		if (gameState.selectedTool === 'serological_pipette') {
			// Held an unloaded serological pipette: the next click is
			// the reagent source for the current protocol step. Derived
			// from the step's used items via getReagentSourceForStep so the
			// hint, the green is-active highlights, and the actual
			// protocol state share one truth. Prior versions peeked at
			// gameState.trypsinAdded/flaskMediaMl/flaskMediaAge and
			// could show a misleading hint -- the source of truth is
			// now the current step's used items.
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
			// Unloaded multichannel pipette: derive next click from the
			// current step's reagent source (from used items). The prior
			// hardcoded "Click the drug vials" only made sense under the
			// legacy 12-step protocol and is wrong for seed_plate,
			// media_adjust, add_carboplatin, add_metformin, add_mtt, add_dmso.
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

	// "Current step" banner. Opaque white background, solid green left
	// accent matching the active-item outline, bold large text. Pairs color
	// with size and weight so the cue is not color-only, per
	// docs/ACCESSIBILITY_REVIEW.md. No drop shadows -- uses a solid green
	// border on all sides for edge definition instead.
	html += '<div id="hood-toolbar" style="position:absolute;top:8px;left:50%;transform:translateX(-50%);';
	html += 'background:#ffffff;padding:12px 28px 12px 22px;border-radius:10px;';
	html += 'border:2px solid #2e7d32;border-left-width:6px;';
	html += 'font-size:18px;font-weight:700;color:#1a1a1a;letter-spacing:0.2px;';
	html += 'white-space:nowrap;z-index:100;display:flex;align-items:center;gap:14px;">';
	html += '<span style="font-size:12px;font-weight:700;text-transform:uppercase;';
	html += 'letter-spacing:1.2px;color:#2e7d32;">Next</span>';
	html += '<span>' + hintText + '</span>';
	// Show put-down button when a tool is selected
	if (gameState.selectedTool) {
		html += '<button id="put-down-btn" style="padding:4px 12px;background:#ef5350;color:#fff;';
		html += 'border:none;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer;">';
		html += 'Put down (Esc)</button>';
	}
	html += '</div>';

	// Scene-switch button to bench. Mirrors the "To Hood" button in
	// bench_scene.ts so the student can walk between the two persistent
	// scenes without a keyboard shortcut.
	html += '<button class="scene-nav-btn" id="hood-to-bench-btn" ';
	html += 'style="right:16px;left:auto;">To Bench &rarr;</button>';

	hoodScene.style.position = 'relative';
	hoodScene.innerHTML = html;

	setupHoodEventListeners();

	const toBenchBtn = document.getElementById('hood-to-bench-btn');
	if (toBenchBtn) {
		toBenchBtn.addEventListener('click', () => {
			switchScene('bench');
			renderGame();
		});
	}
}

// ============================================
// dispatchInteractionClick(itemId: string)
//
// Patch 6: New wiring logic using resolveInteractionByIndex.
// Dispatches a click through the interactionIndex-aware resolver.
// On wrong-order, increments wrongOrderClicks and shows hint.
// On tool-select, updates selectedTool state without advancing.
// On interaction advance, advances interactionIndex and calls triggerStep if sequence complete.
//============================================
export function dispatchInteractionClick(itemId: string): void {
	const activeStep = getCurrentStep();
	if (!activeStep || !activeStep.completionPath || activeStep.completionPath.kind !== 'interactionSequence') {
		return;
	}
	const interactions = activeStep.completionPath.interactions;

	// Use gameState.heldLiquid directly. The legacy deriveHeldLiquid()
	// only knew the serological_pipette_with_* tokens; for any other tool
	// (e.g. micropipette_with_carboplatin) it returned liquid:null and
	// the resolver then mis-classified destination clicks as wrong_order.
	const cleanTool = canonicalTool(gameState.selectedTool);

	const resolveArgs: Parameters<typeof resolveInteractionByIndex>[0] = {
		selectedTool: cleanTool,
		clickedItem: itemId,
		activeStep: activeStep,
		interactionIndex: gameState.interactionIndex,
	};

	if (gameState.heldLiquid && gameState.heldLiquid.liquid) {
		resolveArgs.heldLiquid = gameState.heldLiquid;
	}

	const result = resolveInteractionByIndex(resolveArgs);

	// Wrong-order click: increment wrongOrderClicks, show hint, return without advancing
	if (result.wrongOrder === true) {
		gameState.wrongOrderClicks++;
		const activeInteraction = interactions[gameState.interactionIndex];
		showWrongOrderHint(itemId, activeStep, activeInteraction);
		return;
	}

	// Handle the result based on kind and indexDelta
	if (result.kind === 'load') {
		// Load action: update heldLiquid
		if (result.resultActor && result.resultLiquid) {
			const reagent = REAGENTS[result.resultLiquid];
			const colorKey = reagent ? reagent.colorKey : result.resultLiquid;
			gameState.heldLiquid = {
				tool: result.resultActor,
				liquid: result.resultLiquid,
				volumeMl: result.volumeMl,
				colorKey: colorKey,
			};
		}

		// Build legacy token for downstream code
		const tool = result.resultActor || 'serological_pipette';
		const legacyToken = result.resultLiquid === 'pbs'     ? `${tool}_with_pbs`
					  : result.resultLiquid === 'trypsin' ? `${tool}_with_trypsin`
					  : result.resultLiquid === 'media'   ? `${tool}_with_media`
					  : result.resultLiquid === 'cells'   ? `${tool}_with_cells`
					  : null;
		if (legacyToken) {
			gameState.selectedTool = legacyToken;
		}

		// If indexDelta is 1, advance the interaction index
		if (result.indexDelta === 1) {
			gameState.interactionIndex++;
			// If we've reached the end of the sequence, call triggerStep
			if (gameState.interactionIndex >= interactions.length) {
				triggerStep(activeStep.id);
			}
		}

		let notification = 'Loaded ' + result.resultLiquid + '.';
		if (result.resultLiquid === 'pbs') notification = 'PBS loaded into pipette. Click the flask to rinse.';
		if (result.resultLiquid === 'trypsin') notification = 'Loaded trypsin-EDTA. Click the flask to add.';
		if (result.resultLiquid === 'media') notification = 'Media warmed to 37 degrees C and loaded into pipette. Click the flask.';
		if (result.resultLiquid === 'cells') notification = 'Loaded cell suspension. Click the 24-well plate to transfer.';
		showNotification(notification);
		renderGame();
		return;
	}

	if (result.kind === 'discharge') {
		// Discharge action: dispatch based on completionEvent
		// Special case: if indexDelta === 0, this is a tool-select action (pre-discharge setup).
		// Set selectedTool for subsequent source/destination clicks, then return without discharge.
		const currentInteraction = interactions ? interactions[gameState.interactionIndex] : null;
		if (result.indexDelta === 0 && currentInteraction && (currentInteraction.source || currentInteraction.destination)) {
			// Tool-select mode: set selectedTool and wait for source/destination click
			const expectedTool = currentInteraction.tool;
			gameState.selectedTool = expectedTool || null;
			renderGame();
			return;
		}

		if (activeStep && activeStep.id && result.completionEvent) {
			if (result.completionEvent === 'spray_ethanol') {
				gameState.hoodSprayed = true;
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Sprayed hood with 70% ethanol.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'aspirate') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						startAspiration();
					} else {
						renderGame();
					}
				} else {
					renderGame();
				}
				return;
			}
			if (result.completionEvent === 'pbs_wash') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				gameState.flaskMediaAge = 'fresh';
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Flask rinsed with PBS.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'pipette_trypsin') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				gameState.trypsinAdded = true;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'pipette_media') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
					gameState.trypsinNeutralized = true;
				}
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						startAddingMedia();
					} else {
						renderGame();
					}
				} else {
					renderGame();
				}
				return;
			}
			if (result.completionEvent === 'pipette_to_plate') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				gameState.wellPlate.forEach(well => {
					well.hasCells = true;
				});
				gameState.cellsTransferred = true;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Cells transferred to all 24 wells.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'centrifuge') {
				gameState.flaskMediaMl = 0;
				gameState.flaskMediaAge = 'old';
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Cells centrifuged.', 'success');
				renderGame();
				return;
			}
			if (result.completionEvent === 'prewarm') {
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Media warmed.', 'success');
				renderGame();
				return;
			}
			if (result.completionEvent === 'media_adjust') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Media adjusted for all wells.', 'success');
				renderHoodScene();
				renderProtocolPanel();
				renderScoreDisplay();
				return;
			}
			if (result.completionEvent === 'resuspend') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						startAddingMedia();
					} else {
						renderGame();
					}
				} else {
					renderGame();
				}
				return;
			}
			if (result.completionEvent === 'carb-low-range-confirm') {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				if (result.indexDelta === 1) {
					gameState.interactionIndex++;
					if (gameState.interactionIndex >= interactions.length) {
						triggerStep(activeStep.id);
					}
				}
				showNotification('Low-range carboplatin stocks prepared.', 'success');
				renderGame();
				return;
			}
		}
		// Generic discharge fallback: no per-event handler matched (or no
		// completionEvent on this interaction). This branch runs only for
		// successful discharge results (kind === 'discharge') because the
		// outer `if (result.kind === 'discharge')` block already gated us
		// in. Advance the interaction index by exactly the resolver's
		// indexDelta, clear pipette state because a discharge consumes
		// the held liquid, and fire triggerStep when the sequence ends.
		// For tool-select results (indexDelta === 0) we do NOT clear
		// pipette state -- the per-event branches above already handled
		// those before we got here.
		if (activeStep && result.indexDelta === 1) {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			gameState.interactionIndex += result.indexDelta;
			if (gameState.interactionIndex >= interactions.length) {
				triggerStep(activeStep.id);
			}
			renderGame();
			return;
		}
		gameState.selectedTool = canonicalTool(gameState.selectedTool);
		renderGame();
		return;
	}

	// result.kind === 'error' or other error states
	if (result.kind === 'error') {
		showNotification(result.hint);
		return;
	}

	// No match via new resolver; fall through to legacy code
	renderGame();
}

// ============================================
export function onItemClick(itemId: string): void {
	// Route clicks through interaction_resolver for steps with interactionSequence
	const activeStep = getCurrentStep();
	if (activeStep && activeStep.completionPath && activeStep.completionPath.kind === 'interactionSequence') {
		dispatchInteractionClick(itemId);
		return;
	}

	// Legacy path for steps without interactionSequence
	// Old resolver code kept for compatibility with existing steps
	if (activeStep) {
		const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
		const cleanTool = canonicalTool(gameState.selectedTool);
		const result = resolveInteraction({
			selectedTool: cleanTool,
			clickedItem: itemId,
			activeStep: activeStep,
			heldLiquid: heldLiquid,
		});
		if (result.kind === 'load') {
			// Update heldLiquid with the loaded liquid
			if (result.resultActor && result.resultLiquid && result.volumeMl) {
				// Get the color key from REAGENTS if available
				const reagent = REAGENTS[result.resultLiquid];
				const colorKey = reagent ? reagent.colorKey : result.resultLiquid;
				gameState.heldLiquid = {
					tool: result.resultActor,
					liquid: result.resultLiquid,
					volumeMl: result.volumeMl,
					colorKey: colorKey,
				};
			}
			// Set legacy _with_X token from the load result so existing downstream code keeps working.
			// Build the token using the actual tool id from the resolver result,
			// not just hardcoded serological_pipette.
			const tool = result.resultActor || 'serological_pipette';
			const legacyToken = result.resultLiquid === 'pbs'     ? `${tool}_with_pbs`
						  : result.resultLiquid === 'trypsin' ? `${tool}_with_trypsin`
						  : result.resultLiquid === 'media'   ? `${tool}_with_media`
						  : result.resultLiquid === 'cells'   ? `${tool}_with_cells`
						  : null;
			if (legacyToken) {
				gameState.selectedTool = legacyToken;
				let notification = 'Loaded ' + result.resultLiquid + '.';
				if (result.resultLiquid === 'pbs') notification = 'PBS loaded into pipette. Click the flask to rinse.';
				if (result.resultLiquid === 'trypsin') notification = 'Loaded trypsin-EDTA. Click the flask to add.';
				if (result.resultLiquid === 'media') notification = 'Media warmed to 37 degrees C and loaded into pipette. Click the flask.';
				if (result.resultLiquid === 'cells') notification = 'Loaded cell suspension. Click the 24-well plate to transfer.';
				showNotification(notification);
				renderGame();
				return;
			}
			// Unknown liquid; fall through to legacy.
		} else if (result.kind === 'discharge') {
			// For discharge, dispatch based on the completion event name to call
			// the appropriate handler logic.
			if (activeStep && activeStep.id && result.completionEvent) {
				if (result.completionEvent === 'spray_ethanol') {
					gameState.hoodSprayed = true;
					triggerStep(activeStep.id);
					showNotification('Sprayed hood with 70% ethanol.', 'success');
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'aspirate') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					startAspiration();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pbs_wash') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					gameState.flaskMediaAge = 'fresh';
					triggerStep(activeStep.id);
					showNotification('Flask rinsed with PBS.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pipette_trypsin') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					gameState.trypsinAdded = true;
					triggerStep(activeStep.id);
					showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pipette_media') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
						gameState.trypsinNeutralized = true;
					}
					startAddingMedia();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'pipette_to_plate') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					gameState.wellPlate.forEach(well => {
						well.hasCells = true;
					});
					gameState.cellsTransferred = true;
					triggerStep(activeStep.id);
					showNotification('Cells transferred to all 24 wells.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'centrifuge') {
					gameState.flaskMediaMl = 0;
					gameState.flaskMediaAge = 'old';
					triggerStep(activeStep.id);
					showNotification('Cells centrifuged.', 'success');
					return;
				}
				if (result.completionEvent === 'prewarm') {
					triggerStep(activeStep.id);
					showNotification('Media warmed.', 'success');
					return;
				}
				if (result.completionEvent === 'media_adjust') {
					gameState.selectedTool = null;
					gameState.heldLiquid = null;
					triggerStep(activeStep.id);
					showNotification('Media adjusted for all wells.', 'success');
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
				if (result.completionEvent === 'resuspend') {
					gameState.selectedTool = null;
					startAddingMedia();
					renderHoodScene();
					renderProtocolPanel();
					renderScoreDisplay();
					return;
				}
			}
			// Fallback: reset tool and re-render
			gameState.selectedTool = canonicalTool(gameState.selectedTool);
			renderGame();
			return;
		} else if (result.kind === 'error') {
			showNotification(result.hint);
			return;
		}
		// result.kind === 'no-op': fall through to the existing legacy if-ladder.
	}

	// If no tool selected, pick up this item
	if (!gameState.selectedTool) {
		// Ethanol bottle sprays immediately
		if (itemId === 'ethanol_bottle') {
			gameState.hoodSprayed = true;
			triggerStep('spray_hood');
			showNotification('Sprayed hood with 70% ethanol.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}

		// Microscope click: go to microscope if hemocytometer loaded
		if (itemId === 'microscope' && gameState.hemocytometerLoaded
			&& !gameState.completedSteps.includes('count_cells')) {
			switchScene('microscope');
			return;
		}

		// Microscope click but hemocytometer not loaded yet
		if (itemId === 'microscope' && !gameState.hemocytometerLoaded) {
			if (!gameState.trypsinNeutralized) {
				showNotification('Complete trypsinization and media neutralization first.', 'warning');
			} else {
				showNotification('Load a cell sample onto the hemocytometer first.', 'warning');
			}
			return;
		}

		// Well plate click when ready for incubator: pick it up
		if (itemId === 'well_plate' && gameState.cellsTransferred && gameState.drugsAdded
			&& !gameState.incubated) {
			gameState.selectedTool = 'well_plate';
			showNotification('Holding plate. Click the incubator to place it inside.');
			renderHoodScene();
			return;
		}

		// Flask click when trypsin added but not incubated: pick up for incubation
		if (itemId === 'flask' && gameState.trypsinAdded && !gameState.trypsinIncubated) {
			gameState.selectedTool = 'flask';
			showNotification('Holding flask. Click the incubator to incubate with trypsin.');
			renderHoodScene();
			return;
		}

		gameState.selectedTool = itemId;
		showNotification('Picked up ' + getHoodItemLabel(itemId));
		renderHoodScene();
		return;
	}

	const tool = gameState.selectedTool;

	// Aspirating pipette -> flask: aspirate old media
	if (tool === 'aspirating_pipette' && itemId === 'flask') {
		// Check if hood was sprayed first (aseptic technique)
		if (!gameState.hoodSprayed) {
			registerWarning('Always sanitize the hood before working! Spray with 70% ethanol first.');
			recordCleanlinessError('Started work without sanitizing the hood.');
		}
		gameState.selectedTool = null;
		startAspiration();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Flask held -> incubator: trypsin incubation
	if (tool === 'flask' && itemId === 'incubator'
		&& gameState.trypsinAdded && !gameState.trypsinIncubated) {
		gameState.selectedTool = null;
		renderTrypsinIncubation();
		return;
	}

	// Dead code removed: well_plate + incubator was the hood-era path
	// for plate incubation, but incubator now lives on the bench. The
	// bench_scene.ts handler owns this flow.

	// Serological pipette -> trypsin_bottle: load trypsin
	if (tool === 'serological_pipette' && itemId === 'trypsin_bottle') {
		gameState.selectedTool = 'serological_pipette_with_trypsin';
		showNotification('Loaded trypsin-EDTA. Click the flask to add.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette (trypsin) -> flask: add trypsin to detach cells
	if (tool === 'serological_pipette_with_trypsin' && itemId === 'flask') {
		gameState.selectedTool = null;
		gameState.trypsinAdded = true;
		triggerStep('add_trypsin');
		showNotification('Trypsin added to flask. Incubate 3-5 min at 37C.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> media_bottle: load media (and mark as warmed)
	if (tool === 'serological_pipette' && itemId === 'media_bottle') {
		gameState.mediaWarmed = true;
		gameState.selectedTool = 'serological_pipette_with_media';
		showNotification('Media warmed to 37\u00B0C and loaded into pipette. Click the flask.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette -> flask: add fresh media (neutralize trypsin)
	if (tool === 'serological_pipette_with_media' && itemId === 'flask') {
		gameState.selectedTool = null;
		// Mark trypsin as neutralized when media is added
		if (gameState.trypsinIncubated && !gameState.trypsinNeutralized) {
			gameState.trypsinNeutralized = true;
		}
		startAddingMedia();
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> pbs_bottle: load PBS (mirrors trypsin/media flow
	// so all reagent-loading steps use the same pipette pattern)
	if (tool === 'serological_pipette' && itemId === 'pbs_bottle') {
		gameState.selectedTool = 'serological_pipette_with_pbs';
		showNotification('PBS loaded into pipette. Click the flask to rinse.');
		renderHoodScene();
		return;
	}

	// Loaded serological pipette (PBS) -> flask: rinse the flask
	if (tool === 'serological_pipette_with_pbs' && itemId === 'flask') {
		gameState.selectedTool = null;
		gameState.flaskMediaAge = 'fresh';
		triggerStep('pbs_wash');
		showNotification('Flask rinsed with PBS.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Legacy direct PBS-bottle -> flask path. Kept for students who grab
	// the bottle without the pipette. Same completion behavior.
	if (tool === 'pbs_bottle' && itemId === 'flask' && gameState.flaskMediaAge === 'old') {
		gameState.selectedTool = null;
		gameState.flaskMediaAge = 'fresh';
		triggerStep('pbs_wash');
		showNotification('Flask rinsed with PBS.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Serological pipette -> flask (with fresh media): load sample for hemocytometer or plate.
	// The branch is gated on whether count_cells has completed, NOT on
	// the legacy `hemocytometerLoaded` flag. Using completedSteps makes
	// the state machine the single source of truth: once count_cells is
	// in completedSteps, every subsequent serological+flask click loads
	// cells for plate transfer, regardless of whether the student ever
	// walked the hood's "load sample" sub-flow (they might have clicked
	// the bench cell_counter or microscope directly).
	if (tool === 'serological_pipette' && itemId === 'flask' && gameState.flaskMediaAge === 'fresh') {
		const countDone = gameState.completedSteps.indexOf('count_cells') >= 0;
		if (!countDone) {
			// Pre-count: load sample for hemocytometer.
			gameState.selectedTool = 'serological_pipette_with_sample';
			showNotification('Cell sample loaded. Click the microscope to load the hemocytometer.');
			renderHoodScene();
			return;
		}
		// Post-count: load cells for plate transfer.
		gameState.selectedTool = 'serological_pipette_with_cells';
		showNotification('Loaded cell suspension. Click the 24-well plate to transfer.');
		renderHoodScene();
		return;
	}

	// Loaded sample -> microscope: load hemocytometer with trypan blue mix
	if (tool === 'serological_pipette_with_sample' && itemId === 'microscope') {
		gameState.selectedTool = null;
		gameState.hemocytometerLoaded = true;
		showNotification('Sample mixed with trypan blue and loaded onto hemocytometer.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Loaded serological pipette (cells) -> well_plate: transfer cells to all wells
	if (tool === 'serological_pipette_with_cells' && itemId === 'well_plate') {
		gameState.selectedTool = null;
		// Fill all wells with cells
		gameState.wellPlate.forEach(well => {
			well.hasCells = true;
		});
		gameState.cellsTransferred = true;
		triggerStep('seed_plate');
		showNotification('Cells transferred to all 24 wells.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	// Multichannel pipette -> drug_vials: load drug dilutions
	if (tool === 'multichannel_pipette' && itemId === 'drug_vials') {
		if (!gameState.cellsTransferred) {
			showNotification('Transfer cells to the plate first.', 'warning');
			gameState.selectedTool = null;
			renderHoodScene();
			return;
		}
		gameState.selectedTool = 'multichannel_pipette_with_drug';
		showNotification('Loaded drug dilutions. Click the 24-well plate to add drugs.');
		renderHoodScene();
		return;
	}

	// Loaded multichannel pipette -> well_plate: show dilution choice dialog
	if (tool === 'multichannel_pipette_with_drug' && itemId === 'well_plate') {
		gameState.selectedTool = null;
		startDrugAddition();
		return;
	}

	// Multichannel pipette + media_bottle -> well_plate: adjust media for treatment
	if (tool === 'multichannel_pipette' && itemId === 'media_bottle') {
		if (gameState.activeStepId === 'media_adjust') {
			gameState.selectedTool = 'multichannel_pipette_with_media';
			showNotification('Media loaded. Click the 24-well plate to adjust media.');
			renderHoodScene();
			return;
		}
	}

	// Multichannel pipette (with media) -> well_plate: adjust media
	if (tool === 'multichannel_pipette_with_media' && itemId === 'well_plate') {
		if (gameState.activeStepId === 'media_adjust') {
			gameState.selectedTool = null;
			triggerStep('media_adjust');
			showNotification('Media adjusted for all wells.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Multichannel pipette + mtt_vial -> well_plate: add MTT
	if (tool === 'multichannel_pipette' && itemId === 'mtt_vial') {
		if (gameState.activeStepId === 'add_mtt') {
			gameState.selectedTool = 'multichannel_pipette_with_mtt';
			showNotification('MTT loaded. Click the 24-well plate to add.');
			renderHoodScene();
			return;
		}
	}

	// Multichannel pipette (with MTT) -> well_plate: add MTT
	if (tool === 'multichannel_pipette_with_mtt' && itemId === 'well_plate') {
		if (gameState.activeStepId === 'add_mtt') {
			gameState.selectedTool = null;
			triggerStep('add_mtt');
			showNotification('MTT added to all wells.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Well plate -> biohazard_decant: decant MTT
	if (tool === 'well_plate' && itemId === 'biohazard_decant') {
		if (gameState.activeStepId === 'decant_mtt') {
			gameState.selectedTool = null;
			triggerStep('decant_mtt');
			showNotification('MTT decanted into biohazard container.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Multichannel pipette + dmso_bottle -> well_plate: add DMSO
	if (tool === 'multichannel_pipette' && itemId === 'dmso_bottle') {
		if (gameState.activeStepId === 'add_dmso') {
			gameState.selectedTool = 'multichannel_pipette_with_dmso';
			showNotification('DMSO loaded. Click the 24-well plate to add.');
			renderHoodScene();
			return;
		}
	}

	// Multichannel pipette (with DMSO) -> well_plate: add DMSO
	if (tool === 'multichannel_pipette_with_dmso' && itemId === 'well_plate') {
		if (gameState.activeStepId === 'add_dmso') {
			gameState.selectedTool = null;
			triggerStep('add_dmso');
			showNotification('DMSO added to all wells.', 'success');
			renderHoodScene();
			renderProtocolPanel();
			renderScoreDisplay();
			return;
		}
	}

	// Invalid combination -- register a warning with educational guidance
	const stepHint = getCurrentStep();
	let warningMsg = 'That combination does not work.';
	if (stepHint) {
		warningMsg += ' Current step: ' + stepHint.label;
	}
	registerWarning(warningMsg);
	gameState.selectedTool = null;
	renderHoodScene();
}

// ============================================
export function setupHoodEventListeners(): void {
	const items = document.querySelectorAll('.hood-item');
	items.forEach((item) => {
		const el = item as HTMLElement;
		const itemId = el.getAttribute('data-item-id');
		if (!itemId) return;

		el.addEventListener('click', () => {
			onItemClick(itemId);
		});

		el.addEventListener('mouseenter', () => {
			el.style.filter = 'brightness(1.1)';
			el.style.transform = 'scale(1.05)';
		});
		el.addEventListener('mouseleave', () => {
			el.style.filter = '';
			el.style.transform = '';
		});

		// Drag-and-drop: start dragging a tool
		el.addEventListener('dragstart', (e) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', itemId);
				e.dataTransfer.effectAllowed = 'move';
			}
			el.style.opacity = '0.5';
		});
		el.addEventListener('dragend', () => {
			el.style.opacity = '';
		});

		// Drop target: accept a dropped tool
		el.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (e.dataTransfer) {
				e.dataTransfer.dropEffect = 'move';
			}
			el.classList.add('drag-hover');
		});
		el.addEventListener('dragleave', () => {
			el.classList.remove('drag-hover');
		});
		el.addEventListener('drop', (e) => {
			e.preventDefault();
			el.classList.remove('drag-hover');
			const draggedToolId = e.dataTransfer ? e.dataTransfer.getData('text/plain') : '';
			if (draggedToolId && draggedToolId !== itemId) {
				// Simulate picking up the dragged tool then using it on this target
				gameState.selectedTool = draggedToolId;
				onItemClick(itemId);
			}
		});
	});

	// Wire the put-down button
	const putDownBtn = document.getElementById('put-down-btn');
	if (putDownBtn) {
		putDownBtn.addEventListener('click', () => {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Tool deselected.');
			renderHoodScene();
		});
	}

	const hoodScene = document.getElementById('hood-scene');
	if (hoodScene) {
		hoodScene.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			if (gameState.selectedTool) {
				gameState.selectedTool = null;
				gameState.heldLiquid = null;
				showNotification('Tool deselected.');
				renderHoodScene();
			}
		});
	}

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && gameState.selectedTool) {
			gameState.selectedTool = null;
			gameState.heldLiquid = null;
			showNotification('Tool deselected.');
			renderHoodScene();
		}
	});
}

// ============================================
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
		case 'add_fresh_media':
			actions.push('Pick up the serological pipette, click the media bottle, then click the flask');
			break;
		case 'microscope_check':
			actions.push('Click the flask to check cell viability under the microscope');
			break;
		case 'count_cells':
			actions.push('Click the flask to count cells on the hemocytometer');
			break;
		case 'transfer_to_plate':
			actions.push('Pick up the serological pipette, click the flask, then click the 24-well plate');
			break;
		case 'add_drugs':
			actions.push('Pick up the multichannel pipette, click the drug vials, then click the 24-well plate');
			break;
		case 'incubate':
			actions.push('Click the 24-well plate to move it to the incubator');
			break;
		case 'plate_read':
			actions.push('Read the plate on the plate reader');
			break;
	}
	return actions;
}
