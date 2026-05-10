//============================================
// bench/render.ts - Bench scene rendering
//============================================

import {
	gameState,
	getCurrentStep,
	resolveSceneItemsWithDepth,
	renderGame,
	switchScene,
} from "../../game_state";
import { ASSET_SPECS } from "../../asset_specs";
import { SCENE_CONFIGS } from "../../scene_configs";
import { computeSceneLayout } from "../../layout_engine";
import { deriveHeldLiquid } from "../shared/liquid_transfer";
import { renderEquipmentSvg } from "../../svg_assets";
import type { ProtocolStep } from "../../constants";
import type { SceneItem } from "../../scene_configs";
import type { SceneLayoutRules } from "../../scene_types";

//============================================
// getBenchItemSvgHtml - bench-only equivalent of getItemSvgHtml() in
// hood scene adapter
//============================================
export function getBenchItemSvgHtml(itemId: string): string {
	switch (itemId) {
		case 'microscope': return renderEquipmentSvg({ assetId: 'microscope' });
		case 'incubator': return renderEquipmentSvg({ assetId: 'incubator' });
		case 'plate_reader': return renderEquipmentSvg({ assetId: 'plate_reader' });
		case 'centrifuge': return renderEquipmentSvg({ assetId: 'centrifuge' });
		case 'water_bath': return renderEquipmentSvg({ assetId: 'water_bath' });
		case 'vortex': return renderEquipmentSvg({ assetId: 'vortex' });
		case 'cell_counter': return renderEquipmentSvg({ assetId: 'cell_counter' });
		default: return '';
	}
}

//============================================
// deriveActiveInteractionTargets(step, interactionIndex, ...)
//
// Bench version of hood's highlight derivation.
// Returns the de-duplicated list of item ids (tool/source/destination) from
// the active interaction at step.completionPath.interactions[interactionIndex].
//============================================
export function deriveActiveInteractionTargets(
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
// renderBenchScene(): void
//
// Render the bench scene DOM, layout, and event wiring.
// Moved from src/scenes/bench.ts in Patch A2.
//============================================
export function renderBenchScene(onItemClick: (itemId: string) => void): void {
	const benchScene = document.getElementById('bench-scene');
	if (!benchScene) return;

	// Compute layout from bench config. Empty items list during Patch 3
	// is fine: the engine returns [] and the render loop simply paints
	// the background + scene-switch button.
	const viewportW = benchScene.clientWidth || 800;
	const viewportH = benchScene.clientHeight || 600;
	const currentStepData = getCurrentStep();
	const activeStepId = currentStepData ? currentStepData.id : null;
	const BENCH_CONFIG = SCENE_CONFIGS['bench'];

	// Bench scene requires BENCH_CONFIG to render; fail loudly if missing
	if (!BENCH_CONFIG) {
		throw new Error('BENCH_CONFIG missing - bench scene cannot render');
	}

	const benchConfigItems = (BENCH_CONFIG.items || []) as unknown as import('../../scene_types').SceneItem[];
	const resolvedItems = resolveSceneItemsWithDepth(benchConfigItems, activeStepId, [benchConfigItems]);
	// Convert zones array [{id, x0, x1, ...}] to Record<string, ZoneDef>
	// SCENE_CONFIGS emits zones as an array; computeSceneLayout expects a dict.
	const benchZonesArray = BENCH_CONFIG.zones || [];
	const benchZonesRecord: Record<string, any> = {};
	for (let zi = 0; zi < benchZonesArray.length; zi++) {
		const z = benchZonesArray[zi];
		if (z && z.id) {
			benchZonesRecord[z.id] = z;
		}
	}
	// Combine zones and layoutRules for the layout engine.
	// sceneBounds lives at the top level of BENCH_CONFIG (not inside layoutRules),
	// so pull it in explicitly so the clamping pass in computeSceneLayout fires.
	const benchLayoutRules: SceneLayoutRules = {
		...(BENCH_CONFIG.layoutRules || {}),
		zones: benchZonesRecord,
		sceneBounds: BENCH_CONFIG.sceneBounds,
		labelFontSize: BENCH_CONFIG.layoutRules?.labelFontSize || 14,
		labelLineHeight: BENCH_CONFIG.layoutRules?.labelLineHeight || 1.4,
		labelOffsetY: BENCH_CONFIG.layoutRules?.labelOffsetY || 0,
	} as SceneLayoutRules;
	const layout = computeSceneLayout(
		resolvedItems, ASSET_SPECS, benchLayoutRules,
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
	// the hidden bench div. Symmetric with the hood scene fix.
	// Highlight set comes from the active interaction at interactionIndex.
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
			onItemClick(itemId);
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
