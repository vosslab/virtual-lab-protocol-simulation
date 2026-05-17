/**
 * render/scene.ts
 *
 * Minimal scene renderer: takes a resolved scene from RuntimeWorld and renders
 * it into a DOM container using only direct resolved placement geometry.
 *
 * This renderer does NOT implement the full layout engine (row/zone placement,
 * well-plate geometry, collision handling, responsive layout). It only projects
 * placements as declared in the generated scene data into DOM coordinates.
 *
 * Each placement becomes a DOM element with:
 * - data-target-id: semantic target name (or data-object-id if no target binding)
 * - x/y/width/height inferred from the object's layout config and placement bounds
 * - visual state resolved from state_fields defaults
 */

import type { RuntimeWorld, ResolvedSceneConfig, ObjectConfig, PlacementConfig } from '../types';
import { tryRenderWellPlate } from '../adapters/well_plate';
import { computeSceneLayout } from '../layout';
import type { ComputedItemLayout } from '../layout';
import { getAssetSvgString } from './svg_loader';

/**
 * Render a scene into a DOM container.
 *
 * @param world The RuntimeWorld containing the scene and all objects.
 * @param sceneId The name of the scene to render.
 * @param root The HTML element to render into.
 * @throws If scene or any object is not found in the world.
 */
export function renderScene(
	world: RuntimeWorld,
	sceneId: string,
	root: HTMLElement,
): void {
	// Resolve the scene from the world.
	if (!(sceneId in world.scenes)) {
		throw new Error(`renderScene: scene '${sceneId}' not found in world.scenes`);
	}
	const sceneOrUndefined = world.scenes[sceneId];
	if (!sceneOrUndefined) {
		throw new Error(`renderScene: scene '${sceneId}' resolved to undefined`);
	}
	const scene: ResolvedSceneConfig = sceneOrUndefined;

	// Clear the root container.
	root.innerHTML = '';

	// Compute layout once for the entire scene.
	const computedLayout = computeSceneLayout(world, sceneId);
	const layoutMap = new Map(computedLayout.map(layout => [layout.id, layout]));

	// Create the scene root element (SVG for geometry and placement).
	const sceneRoot = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	const bounds = scene.scene_bounds;

	// Set viewBox and dimensions so the scene fills the container.
	sceneRoot.setAttribute('viewBox', `${bounds.left} ${bounds.top} ${bounds.right - bounds.left} ${bounds.bottom - bounds.top}`);
	sceneRoot.setAttribute('width', '100%');
	sceneRoot.setAttribute('height', '100%');
	sceneRoot.setAttribute('preserveAspectRatio', 'xMidYMid meet');
	sceneRoot.style.border = '1px solid #ccc';
	sceneRoot.style.pointerEvents = 'none';

	// Create a background rect if specified.
	if (scene.background) {
		const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		bgRect.setAttribute('x', String(bounds.left));
		bgRect.setAttribute('y', String(bounds.top));
		bgRect.setAttribute('width', String(bounds.right - bounds.left));
		bgRect.setAttribute('height', String(bounds.bottom - bounds.top));
		bgRect.setAttribute('fill', '#f9f9f9');
		bgRect.setAttribute('stroke', 'none');
		bgRect.setAttribute('pointer-events', 'none');
		sceneRoot.appendChild(bgRect);
	}

	// Render each placement.
	for (const placement of scene.placements) {
		renderPlacement(world, scene, placement, sceneRoot, layoutMap);
	}

	root.appendChild(sceneRoot);
}

/**
 * Insert SVG asset into a placement group with proper positioning and sizing.
 *
 * @param group The SVG group to insert into.
 * @param svgString The SVG markup as a string (from generated assets).
 * @param x The left edge position.
 * @param y The top edge position.
 * @param width The placement width.
 * @param height The placement height.
 */
function insertSvgAsset(
	group: SVGGElement,
	svgString: string,
	x: number,
	y: number,
	width: number,
	height: number,
): void {
	// Create a temporary DOM element to parse the SVG string.
	const tempDiv = document.createElement('div');
	tempDiv.innerHTML = svgString;
	const svgElement = tempDiv.firstElementChild;

	if (!svgElement || !(svgElement instanceof SVGSVGElement)) {
		throw new Error('Failed to parse SVG string');
	}

	// Set the SVG's dimensions and positioning.
	svgElement.setAttribute('x', String(x));
	svgElement.setAttribute('y', String(y));
	svgElement.setAttribute('width', String(width));
	svgElement.setAttribute('height', String(height));
	svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

	// Transfer ownership from tempDiv to group (no clone needed; just move the element).
	group.appendChild(svgElement);
}

/**
 * Compute a deterministic color based on asset_name.
 * Maps asset names to distinct visual colors for testing.
 *
 * @param assetName The asset identifier (e.g., "media_bottle_empty", "media_bottle_filled").
 * @returns A hex color string (#rrggbb).
 */
function colorForAsset(assetName: string): string {
	// Simple hash: sum character codes mod 6 to pick a distinct color.
	const hash = Array.from(assetName).reduce((sum, char) => sum + char.charCodeAt(0), 0);
	const colors: string[] = [
		'#e8f5e9', // light green (default)
		'#c8e6c9', // green
		'#a5d6a7', // darker green
		'#81c784', // medium green
		'#66bb6a', // strong green
		'#ffccaa', // orange (media color)
	];
	const idx = hash % colors.length;
	const selectedColor = colors[idx];
	return selectedColor || '#e8f5e9';
}

/**
 * Resolve the visual asset_name for an object given its current state.
 * For Pilot 0, only svg_swap (svg_swap kind) is supported.
 * Defer other visual_states mechanisms to later milestones.
 *
 * @param objectConfig The ObjectConfig with visual_states defined.
 * @param objectState The current state values for this object.
 * @returns The asset_name to render, or undefined if deferred.
 */
function resolveVisualAsset(
	objectConfig: ObjectConfig,
	objectState: Record<string, string | number | boolean>,
): { asset_name: string | undefined; deferred: boolean } {
	// Find the first svg_swap visual_states entry that applies.
	// Pilot 0: only support enum state_fields with svg_swap or svg kind.
	for (const [fieldName, visualStateEntry] of Object.entries(objectConfig.visual_states)) {
		// Skip deferred mechanisms.
		if (visualStateEntry.kind === 'composite' || visualStateEntry.kind === 'overlay' || visualStateEntry.kind === 'formula') {
			continue;
		}

		// Support svg_swap (kind: 'svg_swap') or legacy svg (kind: 'svg').
		if (visualStateEntry.kind !== 'svg_swap' && visualStateEntry.kind !== 'svg') {
			continue;
		}

		// Get the current state value for this field.
		const currentValue = objectState[fieldName];
		if (currentValue === undefined || currentValue === null) {
			continue;
		}

		// Find the matching case.
		if (visualStateEntry.cases) {
			for (const caseEntry of visualStateEntry.cases) {
				if (caseEntry.when === currentValue) {
					// Return the asset_name from output or direct field.
					const assetName = caseEntry.output?.asset_name || caseEntry.asset_name;
					if (assetName) {
						return { asset_name: assetName, deferred: false };
					}
				}
			}
		}

		// If we found a matching visual_states entry but no matching case,
		// return deferred to signal a visual_states coverage issue.
		return { asset_name: undefined, deferred: true };
	}

	// No svg_swap or svg entry found; all visual_states are deferred.
	return { asset_name: undefined, deferred: true };
}

/**
 * Render one placement into the scene SVG.
 *
 * @param world The RuntimeWorld containing object configs and state.
 * @param scene The ResolvedSceneConfig.
 * @param placement The PlacementConfig to render.
 * @param sceneRoot The SVG element to render into.
 * @param layoutMap Map from placement_name to ComputedItemLayout.
 * @throws If the referenced object is not found or layout is missing.
 */
function renderPlacement(
	world: RuntimeWorld,
	scene: ResolvedSceneConfig,
	placement: PlacementConfig,
	sceneRoot: SVGSVGElement,
	layoutMap: Map<string, ComputedItemLayout>,
): void {
	// Resolve the object from the world.
	if (!(placement.object_name in world.objects)) {
		throw new Error(`renderPlacement: object '${placement.object_name}' not found in world.objects`);
	}
	const objectConfigOrUndefined = world.objects[placement.object_name];
	if (!objectConfigOrUndefined) {
		throw new Error(`renderPlacement: object '${placement.object_name}' resolved to undefined`);
	}
	const objectConfig: ObjectConfig = objectConfigOrUndefined;

	// Look up computed layout for this placement.
	const layout = layoutMap.get(placement.placement_name);
	if (!layout) {
		throw new Error(`renderPlacement: no computed layout for placement '${placement.placement_name}'`);
	}

	// Use layout engine results for position and dimensions.
	const x = layout.x;
	const y = layout.y;
	const width = layout.width;
	const height = layout.height;

	// Create a group for this placement.
	const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	group.setAttribute('data-placement-name', placement.placement_name);
	group.setAttribute('data-object-name', placement.object_name);

	// Assign data-target-id (semantic target name derived from object name, or object name itself).
	const targetId = placement.object_name;
	group.setAttribute('data-target-id', targetId);
	// Ensure the group itself is clickable
	group.setAttribute('pointer-events', 'auto');

	// Try specialized adapters first. If the object is a plate, use the well-plate adapter.
	// Note: layout engine returns x, y as left/top edges, not center coordinates.
	if (tryRenderWellPlate(placement, objectConfig, group, x, y, width, height, world)) {
		// Well-plate adapter handled this placement.
		sceneRoot.appendChild(group);
		return;
	}

	// Resolve visual asset from current object state.
	const objectState = world.objectStates[placement.object_name] || {};
	const visualResult = resolveVisualAsset(objectConfig, objectState);
	const assetName = visualResult.asset_name;
	const isDeferred = visualResult.deferred;

	// Set data-asset attribute for testing.
	if (assetName) {
		group.setAttribute('data-asset', assetName);
	} else if (isDeferred) {
		group.setAttribute('data-visual-state-deferred', 'true');
	}

	// Phase 1: Insert SVG asset if resolved; otherwise use fallback rect.
	let usesFallback = false;
	if (assetName) {
		try {
			const svgString = getAssetSvgString(assetName);
			if (svgString) {
				insertSvgAsset(group, svgString, x, y, width, height);
			} else {
				// Asset id resolved but no SVG found; use fallback.
				usesFallback = true;
			}
		} catch (err) {
			// Asset lookup failed; use fallback and continue.
			usesFallback = true;
		}
	} else {
		// Deferred mechanism; use fallback rect.
		usesFallback = true;
	}

	// Fallback: render green placeholder rect if SVG insertion failed or asset was deferred.
	if (usesFallback) {
		const fillColor = '#e8f5e9'; // light green placeholder
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(x));
		rect.setAttribute('y', String(y));
		rect.setAttribute('width', String(width));
		rect.setAttribute('height', String(height));
		rect.setAttribute('fill', fillColor);
		rect.setAttribute('stroke', '#4caf50');
		rect.setAttribute('stroke-width', '1.5');
		rect.setAttribute('rx', '3');
		rect.setAttribute('pointer-events', 'auto');
		rect.setAttribute('data-render-fallback', 'true');
		group.appendChild(rect);
	}

	// Append group to scene (SVG asset or fallback rect; text follows as sibling below).
	sceneRoot.appendChild(group);

	// Add a label as a sibling of the group (not inside it).
	// This keeps g.bbox === rect.bbox so Playwright clicks hit the rect, not transparent space.
	// Use computed label position, lines, and font-size from layout engine
	// (label_font_size pulled from scene.layout_rules via the layout adapter).
	const fontSize = layout.labelFontSize;
	const lineHeight = fontSize + 1;
	// labelLines comes from layout engine; fall back to single truncated object_name.
	const lines = (layout.labelLines && layout.labelLines.length > 0)
		? layout.labelLines
		: [placement.object_name.substring(0, 12)];
	// labelY from layout is already positioned ABOVE the item (item.y - labelOffsetY).
	// For multi-line, shift the first line up so the block sits above the item.
	const firstLineY = layout.labelY - (lines.length - 1) * lineHeight;
	const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	text.setAttribute('x', String(layout.labelX));
	text.setAttribute('y', String(firstLineY));
	text.setAttribute('text-anchor', 'middle');
	text.setAttribute('font-size', String(fontSize));
	text.setAttribute('font-family', 'monospace');
	text.setAttribute('fill', '#333');
	text.setAttribute('pointer-events', 'none');
	if (lines.length === 1) {
		text.textContent = lines[0] ?? '';
	} else {
		// Multi-line: emit a <tspan> per line so anchors stay aligned.
		for (let i = 0; i < lines.length; i++) {
			const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
			tspan.setAttribute('x', String(layout.labelX));
			tspan.setAttribute('dy', i === 0 ? '0' : String(lineHeight));
			tspan.textContent = lines[i] ?? '';
			text.appendChild(tspan);
		}
	}

	sceneRoot.appendChild(text);
}
