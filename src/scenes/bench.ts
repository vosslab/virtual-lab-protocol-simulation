// ============================================
// bench_scene.ts - Bench (outside-the-hood) scene rendering
// ============================================

// Pre-register step ids this scene owns so validateCompletionEventCoverage passes
// at page load time. See hood_scene.ts for the policy rationale.
import { ASSET_SPECS } from "../asset_specs";
import { type Interaction, type ProtocolStep } from "../constants";
import { BENCH_LAYOUT_RULES, BENCH_SCENE_ITEMS, getBenchItemLabel } from "../bench_config";
import { gameState, getCurrentStep, registeredEmitters, renderGame, resolveSceneItemsWithDepth, showNotification, switchScene, triggerStep } from "../game_state";
import { resolveInteraction, resolveInteractionByIndex } from "../interaction_resolver";
import { computeSceneLayout } from "../layout_engine";
import { showWrongOrderToast } from "./shared/wrong_order_feedback";
import { getCellCounterSvg, getCentrifugeSvg, getIncubatorSvg, getMicroscopeSvg, getPlateReaderSvg, getVortexSvg, getWaterBathSvg } from "../svg_assets";
import { canonicalTool, deriveHeldLiquid } from "./hood";
import { renderTrypsinIncubation } from "./incubator";


//============================================
// buildLegacyToken(actor, liquid): string | null
// Construct a legacy token string from an actor (tool) and liquid type.
//============================================
function buildLegacyToken(actor: string | null, liquid: string | null): string | null {
	const tool = actor || 'serological_pipette';
	const legacyToken = liquid === 'pbs'     ? `${tool}_with_pbs`
					  : liquid === 'trypsin' ? `${tool}_with_trypsin`
					  : liquid === 'media'   ? `${tool}_with_media`
					  : liquid === 'cells'   ? `${tool}_with_cells`
					  : null;
	return legacyToken;
}

registeredEmitters.add('centrifuge');
registeredEmitters.add('prewarm_media');
registeredEmitters.add('plate_read');
// The bench is a peer of the hood scene. It holds equipment the student
// uses between hood steps: incubator, microscope, water bath, vortex,
// centrifuge, cell counter, plate reader. The bench wires into the shared layout
// engine via parts/bench_config.ts.
// ============================================

// ============================================
// getBenchItemSvgHtml - bench-only equivalent of getItemSvgHtml() in
// hood_scene.ts.
export function getBenchItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'microscope': return getMicroscopeSvg();
		case 'incubator': return getIncubatorSvg();
		case 'plate_reader': return getPlateReaderSvg();
		case 'centrifuge': return getCentrifugeSvg();
		case 'water_bath': return getWaterBathSvg();
		case 'vortex': return getVortexSvg();
		case 'cell_counter': return getCellCounterSvg();
		default: return '';
	}
}

// ============================================
// Bridge functions for M1.5.C: deriveHeldLiquid and canonicalTool
// are defined in hood_scene.ts and reused here. Both scenes share the
// same liquid-mapping logic.
//============================================

//============================================
// deriveActiveInteractionTargets(step, interactionIndex, ...)
//
// Patch 6: Bench version of hood's highlight derivation.
// Returns the de-duplicated list of item ids (tool/source/destination) from
// the active interaction at step.completionPath.interactions[interactionIndex].
//============================================
function deriveActiveInteractionTargets(
	step: ProtocolStep | null,
	interactionIndex: number,
	selectedTool: string | null,
	heldLiquid: { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null } | null
): string[] {
	if (!step || step.completionPath?.kind !== 'interactionSequence' || interactionIndex < 0 || interactionIndex >= step.completionPath.interactions.length) {
		return [];
	}

	const interaction = step.completionPath.interactions[interactionIndex];
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
// showWrongOrderHint(itemId, step, interaction) - Bench version
//
// Patch 6: Display wrong-order hint for bench clicks.
//============================================
function showWrongOrderHint(clickedItemId: string, step: ProtocolStep | null, interaction: Interaction | undefined): void {
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
			if (canonicalTool(gameState.selectedTool) === interaction.tool) return true;
			const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
			if (heldLiquid && heldLiquid.tool === interaction.tool) return true;
			return false;
		};

		if (interaction.tool && !toolPreconditionMet()) {
			const toolLabel = getBenchItemLabel(interaction.tool);
			hintMessage = `Use the ${toolLabel} first.`;
		} else if (interaction.source) {
			const sourceLabel = getBenchItemLabel(interaction.source);
			hintMessage = `Use the ${sourceLabel}.`;
		} else if (interaction.destination) {
			const destLabel = getBenchItemLabel(interaction.destination);
			hintMessage = `Use the ${destLabel}.`;
		}
	}

	showWrongOrderToast(hintMessage);
}

//============================================
// showWrongOrderToast(message) - Bench version
//
// Display a small toast with the hint message.
//============================================
//============================================
// dispatchBenchInteractionClick(itemId: string)
//
// Patch 6: New wiring logic for bench using resolveInteractionByIndex.
//============================================
function dispatchBenchInteractionClick(itemId: string): void {
	const activeStep = getCurrentStep();
	if (!activeStep || activeStep.completionPath?.kind !== 'interactionSequence') {
		return;
	}

	const interactions = activeStep.completionPath.interactions;

	const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
	const cleanTool = canonicalTool(gameState.selectedTool);
	const result = resolveInteractionByIndex({
		selectedTool: cleanTool,
		clickedItem: itemId,
		activeStep: activeStep,
		interactionIndex: gameState.interactionIndex,
		heldLiquid: heldLiquid,
	});

	// Wrong-order click: increment wrongOrderClicks, show hint, return
	if (result.wrongOrder === true) {
		gameState.wrongOrderClicks++;
		const activeInteraction = interactions[gameState.interactionIndex];
		showWrongOrderHint(itemId, activeStep, activeInteraction);
		return;
	}

	// Handle the result based on kind and indexDelta
	if (result.kind === 'load') {
		const reagent = (window as any).__REAGENTS?.[result.resultLiquid];
		const colorKey = reagent ? reagent.colorKey : result.resultLiquid;
		gameState.heldLiquid = {
			tool: result.resultActor,
			liquid: result.resultLiquid,
			volumeMl: result.volumeMl,
			colorKey: colorKey,
		};

		const legacyToken = buildLegacyToken(result.resultActor, result.resultLiquid);
		if (legacyToken) {
			gameState.selectedTool = legacyToken;
		}

		if (result.indexDelta === 1) {
			gameState.interactionIndex++;
			if (gameState.interactionIndex >= interactions.length) {
				triggerStep(activeStep.id);
			}
		}

		let notification = 'Loaded ' + result.resultLiquid + '.';
		showNotification(notification);
		renderGame();
		return;
	}

	if (result.kind === 'discharge') {
		if (activeStep && activeStep.id && result.completionEvent) {
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
		}
		gameState.selectedTool = canonicalTool(gameState.selectedTool);
		renderGame();
		return;
	}

	if (result.kind === 'error') {
		showNotification(result.hint);
		return;
	}

	// No match via new resolver; fall through to legacy code
	renderGame();
}

// ============================================
// Click handler for bench items. Microscope/incubator open their
// modal overlays; the remaining instruments advance their matching
// protocol step when the active step calls for them.
export function onBenchItemClick(itemId: string): void {
	// Route clicks through interactionIndex-aware resolver for steps with completionPath.kind === 'interactionSequence'
	const activeStep = getCurrentStep();
	if (activeStep && activeStep.completionPath?.kind === 'interactionSequence') {
		dispatchBenchInteractionClick(itemId);
		return;
	}

	// Legacy path for steps without interactionSequence
	// Old resolver code kept for compatibility
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
			// Set legacy _with_X token from the load result so existing downstream code keeps working.
			const legacyToken = result.resultLiquid === 'pbs'     ? 'serological_pipette_with_pbs'
						  : result.resultLiquid === 'trypsin' ? 'serological_pipette_with_trypsin'
						  : result.resultLiquid === 'media'   ? 'serological_pipette_with_media'
						  : result.resultLiquid === 'cells'   ? 'serological_pipette_with_cells'
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
			// For discharge, dispatch based on the completion event name
			if (activeStep && activeStep.id && result.completionEvent) {
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
	if (itemId === 'microscope') {
		// Serological pipette loaded with sample: use this click to load
		// the hemocytometer with trypan-blue-stained cells, then open the
		// microscope overlay. Mirrors the legacy hood handler which is
		// now dead because microscope no longer lives on the hood.
		if (gameState.selectedTool === 'serological_pipette_with_sample') {
			gameState.selectedTool = null;
			gameState.hemocytometerLoaded = true;
			showNotification(
				'Sample mixed with trypan blue and loaded onto hemocytometer.',
				'success',
			);
		}
		// switchScene already calls renderGame -- calling it again here
		// would start a second concurrent animation for modal scenes.
		switchScene('microscope');
		return;
	}
	if (itemId === 'incubator') {
		// Flask held + trypsin added + not yet incubated: run trypsin
		// incubation (UI sub-state, not a protocol step). After the
		// animation we return to hood for media neutralization.
		if (gameState.selectedTool === 'flask'
			&& gameState.trypsinAdded && !gameState.trypsinIncubated) {
			gameState.selectedTool = null;
			renderTrypsinIncubation();
			return;
		}
		// Well plate held: run the main incubator animation which
		// dispatches the matching incubate_* protocol step and returns
		// to hood. Do NOT call renderGame() after switchScene -- the
		// switchScene call already does, and a second call would start
		// a second concurrent runIncubationOverlay setInterval, causing
		// onComplete to fire twice. The second fire fell into the
		// fallback branch (since activeStepId had already advanced)
		// and pushed the next incubate_* id into outOfOrderAttempts.
		if (gameState.selectedTool === 'well_plate') {
			gameState.selectedTool = null;
			switchScene('incubator');
			return;
		}
		switchScene('incubator');
		return;
	}
	if (itemId === 'plate_reader') {
		const currentStep = getCurrentStep();
		if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'modal' && currentStep.completionPath.openClick === 'plate_reader') {
			switchScene('plate_reader');
			return;
		}
		showNotification('The plate reader is ready for the readout step.');
		return;
	}
	// Centrifuge: complete the centrifuge step when clicked
	if (itemId === 'centrifuge') {
		const currentStep = getCurrentStep();
		// Use completionPath.tool to match directTool steps (cell_culture centrifuge and tutorials)
		if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'directTool' && currentStep.completionPath.tool === 'centrifuge') {
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
			// Centrifuge pellets the cells; supernatant is discarded.
			// Zero the flask volume so the subsequent resuspend flow
			// (serological + media_bottle + flask) can start from an
			// "empty" container without tripping startAddingMedia's
			// "flask must be aspirated first" guard.
			gameState.flaskMediaMl = 0;
			gameState.flaskMediaAge = 'old';
		}
		showNotification('Cells centrifuged.');
		return;
	}
	// Water bath: complete prewarm_media when clicked
	if (itemId === 'water_bath') {
		const currentStep = getCurrentStep();
		// Use completionPath.tool to match directTool steps
		if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'directTool' && currentStep.completionPath.tool === 'water_bath') {
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
		}
		showNotification('Media warmed.');
		return;
	}
	// Cell counter: counting UI lives in the microscope overlay
	// (manual hemocytometer + quadrant counts). Routing here lets
	// the visibly-highlighted cell_counter item on the bench
	// actually advance count_cells. Mirror the microscope branch's
	// sample-load side effect so hemocytometerLoaded flips and the
	// downstream serological + flask click in the hood routes to
	// "load cells for plate transfer" instead of looping back to
	// "load sample for counting". switchScene already renders; do
	// not call renderGame() after it.
	if (itemId === 'cell_counter') {
		// New protocol: cell_counter is a modal opener that switches to microscope scene
		// Old protocol: cell_counter click after serological_pipette_with_sample
		if (gameState.selectedTool === 'serological_pipette_with_sample') {
			gameState.selectedTool = null;
			gameState.hemocytometerLoaded = true;
			showNotification(
				'Sample mixed with trypan blue and loaded onto hemocytometer.',
				'success',
			);
		}
		switchScene('microscope');
		return;
	}
	showNotification(getBenchItemLabel(itemId));
}

// ============================================
export function renderBenchScene(): void {
	const benchScene = document.getElementById('bench-scene');
	if (!benchScene) return;

	// Compute layout from bench config. Empty items list during Patch 3
	// is fine: the engine returns [] and the render loop simply paints
	// the background + scene-switch button.
	const viewportW = benchScene.clientWidth || 800;
	const viewportH = benchScene.clientHeight || 600;
	const currentStepData = getCurrentStep();
	const activeStepId = currentStepData ? currentStepData.id : null;
	const resolvedItems = resolveSceneItemsWithDepth(BENCH_SCENE_ITEMS, activeStepId);
	const layout = computeSceneLayout(
		resolvedItems, ASSET_SPECS, BENCH_LAYOUT_RULES,
		viewportW, viewportH
	);

	const depthById: Record<string, string> = {};
	for (let ri = 0; ri < resolvedItems.length; ri++) {
		const r = resolvedItems[ri];
		if (!r) continue;
		depthById[r.id] = r.depth || 'mid';
	}

	// Only highlight bench items when the active step actually lives
	// on the bench. For hood/microscope/incubator/plate_reader steps,
	// clear the bench's highlights so stale targets from a previous
	// bench step (e.g. count_cells's cell_counter) do not linger on
	// the hidden bench div. Symmetric with the hood_scene.ts fix.
	// Patch 6: Highlight set comes from the active interaction at interactionIndex.
	let activeTargets: string[] = [];
	if (currentStepData && currentStepData.scene === 'bench') {
		const heldLiquid = deriveHeldLiquid(gameState.selectedTool);
		activeTargets = deriveActiveInteractionTargets(
			currentStepData,
			gameState.interactionIndex,
			gameState.selectedTool,
			heldLiquid
		);
	}

	let itemsHtml = '';
	let labelsHtml = '';

	for (let i = 0; i < layout.length; i++) {
		const item = layout[i];
		if (!item) continue;
		const isSelected = gameState.selectedTool === item.id;
		const isTarget = activeTargets.indexOf(item.id) >= 0;
		const activeClass = isTarget && !isSelected ? ' is-active' : '';
		const selectedClass = isSelected ? ' is-selected' : '';
		const depthClass = ' depth-' + (depthById[item.id] || 'mid');
		const svgHtml = getBenchItemSvgHtml(item.id);

		itemsHtml += '<div class="hood-item' + activeClass + selectedClass + depthClass + '"';
		itemsHtml += ' data-item-id="' + item.id + '"';
		itemsHtml += ' tabindex="0" role="button"';
		itemsHtml += ' aria-label="' + item.tooltip + '"';
		itemsHtml += ' aria-pressed="' + (isSelected ? 'true' : 'false') + '"';
		itemsHtml += ' data-x="' + item.x.toFixed(1) + '"';
		itemsHtml += ' data-y="' + item.y.toFixed(1) + '"';
		itemsHtml += ' title="' + item.tooltip + '"';
		itemsHtml += ' style="left:' + item.x.toFixed(1) + '%;';
		itemsHtml += 'top:' + item.y.toFixed(1) + '%;';
		itemsHtml += 'width:' + item.width.toFixed(1) + '%;';
		itemsHtml += 'height:' + item.height.toFixed(1) + '%;">';
		itemsHtml += svgHtml;
		itemsHtml += '</div>';

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

	// Bench background: back-wall on top, work surface below. The two
	// rows of equipment (mid_bench + front_bench) both sit on the bench
	// surface; the split was pulled higher so both rows fit naturally on
	// the wood rather than the back row hovering on the wall and the
	// front row parked near the floor.
	let html = '';
	html += '<div id="bench-bg" style="position:absolute;top:0;left:0;';
	html += 'width:100%;height:100%;pointer-events:none;">';
	html += '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice"';
	html += ' style="width:100%;height:100%;">';
	// Back wall (upper ~25%)
	html += '<rect x="0" y="0" width="800" height="160" fill="#e8d9bf"/>';
	// Bench surface (lower ~75%)
	html += '<rect x="0" y="160" width="800" height="440" fill="#c9a97a"/>';
	// Surface edge highlight
	html += '<rect x="0" y="158" width="800" height="4" fill="#8a6b3d"/>';
	// Soft shelf line on back wall
	html += '<line x1="40" y1="80" x2="760" y2="80" stroke="#c2ae8a" stroke-width="2"/>';
	html += '</svg>';
	html += '</div>';

	html += '<div id="bench-items-layer">';
	html += itemsHtml;
	html += '</div>';
	html += '<div id="bench-labels-layer">';
	html += labelsHtml;
	html += '</div>';

	// Scene-switch button back to hood
	html += '<button class="scene-nav-btn" id="bench-to-hood-btn">&larr; To Hood</button>';

	benchScene.style.position = 'relative';
	benchScene.innerHTML = html;

	// Wire the scene-switch nav
	const toHoodBtn = document.getElementById('bench-to-hood-btn');
	if (toHoodBtn) {
		toHoodBtn.addEventListener('click', () => {
			switchScene('hood');
			renderGame();
		});
	}

	// Wire click handlers for every bench item
	const benchItems = benchScene.querySelectorAll('.hood-item');
	benchItems.forEach((el) => {
		const itemEl = el as HTMLElement;
		const itemId = itemEl.getAttribute('data-item-id');
		if (!itemId) return;
		itemEl.addEventListener('click', () => {
			onBenchItemClick(itemId);
		});
		itemEl.addEventListener('mouseenter', () => {
			itemEl.style.filter = 'brightness(1.1)';
			itemEl.style.transform = 'scale(1.05)';
		});
		itemEl.addEventListener('mouseleave', () => {
			itemEl.style.filter = '';
			itemEl.style.transform = '';
		});
	});
}
