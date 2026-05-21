/**
 * src/scene_runtime/layout/css_native_adapter.ts
 *
 * CSS-native layout adapter for the well_plate_96_zoom spike.
 * Renders a detached DOM scaffold, lets the browser CSS engine
 * compute layout, reads getBoundingClientRect() per placement,
 * and returns ComputedItemLayout[] with integer-pixel positions
 * scaled into SVG viewBox space via a renderer-compatibility shim.
 *
 * No coordinate solver logic. No track sizing math. No gap distribution.
 * Delegates all layout to the browser's CSS engine.
 *
 * NEW1 spike code: snake_case throughout; no Id-suffix; no as-any casts.
 */

import type { RuntimeWorld, ResolvedSceneConfig, PlacementConfig } from '../types';
import type { ComputedItemLayout } from './types';

/**
 * Default five-region vocabulary for scene layout.
 * Used when scene.regions is not available; derived from NEW0 CSS template.
 */
const DEFAULT_REGION_VOCABULARY = [
	'rear_shelf',
	'work_surface',
	'front_tools',
	'instrument_station',
	'popup_layer',
];

/**
 * Public export: compute layout for well_plate_96_zoom using CSS-native rendering.
 *
 * Reads world.scenes[scene_name], attaches a detached scaffold to the DOM,
 * measures placement positions via getBoundingClientRect(), and returns
 * ComputedItemLayout[] with integer-pixel coordinates scaled into SVG viewBox space.
 *
 * Type signature matches computeSceneLayout in adapter.ts exactly.
 */
export function compute_scene_layout_css_native(
	world: RuntimeWorld,
	scene_name: string,
	viewport_width: number = 1200,
	viewport_height: number = 900
): ComputedItemLayout[] {
	//============================================
	// Guard: require DOM
	//============================================

	if (typeof document === 'undefined') {
		throw new Error('compute_scene_layout_css_native: requires a DOM; not callable in non-browser environments');
	}

	//============================================
	// INPUT: resolve scene + placements from runtime world
	//============================================

	const scene = world.scenes[scene_name];
	if (!scene) {
		throw new Error(`compute_scene_layout_css_native: scene '${scene_name}' not found in world.scenes`);
	}

	const placements = scene.placements || [];

	//============================================
	// STEP 1: build detached scaffold root
	//============================================

	const scaffold = document.createElement('div');
	scaffold.className = 'scene-container scene--bench scene-mode--detail';
	scaffold.style.position = 'absolute';
	scaffold.style.left = '-99999px';
	scaffold.style.visibility = 'hidden';
	scaffold.style.width = viewport_width + 'px';
	scaffold.style.height = viewport_height + 'px';

	//============================================
	// STEP 2: derive region list from scene or default vocabulary
	//============================================

	const region_list = get_region_list(scene);

	//============================================
	// STEP 3: scaffold each region as a child div
	//============================================

	const region_map = new Map<string, HTMLElement>();
	for (const region_name of region_list) {
		const region_el = document.createElement('div');
		region_el.className = 'region region--' + region_name;
		region_el.dataset.region = region_name;
		scaffold.appendChild(region_el);
		region_map.set(region_name, region_el);
	}

	//============================================
	// STEP 4: scaffold each placement inside its region
	//============================================

	const placement_els = new Map<string, HTMLElement>();
	for (const placement of placements) {
		// Determine target region: derive from zone or use default
		const region = get_region_for_placement(placement);
		const region_host = region_map.get(region);

		// If region does not exist in region_map, fall back to work_surface
		const fallback_region = 'work_surface';
		const host = region_host || region_map.get(fallback_region);
		if (!host) {
			throw new Error(
				`compute_scene_layout_css_native: no region host found for placement '${placement.placement_name}'`
			);
		}

		const el = document.createElement('div');
		el.className = 'placement';
		el.dataset.placement = placement.placement_name;
		el.dataset.objectName = placement.object_name;
		host.appendChild(el);
		placement_els.set(placement.placement_name, el);
	}

	//============================================
	// STEP 5: attach scaffold so browser runs CSS layout
	//============================================

	document.body.appendChild(scaffold);

	//============================================
	// STEP 6: measure each placement and build result array
	//============================================

	const layouts: ComputedItemLayout[] = [];
	const scaffold_rect = scaffold.getBoundingClientRect();

	for (const placement of placements) {
		const el = placement_els.get(placement.placement_name);
		if (!el) {
			throw new Error(
				`compute_scene_layout_css_native: placement element not found for '${placement.placement_name}'`
			);
		}

		const rect = el.getBoundingClientRect();

		// Compute label text: use object label from world.objects, never placement label
		const object_spec = world.objects[placement.object_name];
		const object_label = object_spec?.label ?? '';

		// Compute raw pixel coordinates relative to scaffold
		const pixel_x = Math.round(rect.left - scaffold_rect.left);
		const pixel_y = Math.round(rect.top - scaffold_rect.top);
		const pixel_w = Math.round(rect.width);
		const pixel_h = Math.round(rect.height);

		// Renderer-compatibility shim: transforms measured CSS rects (pixel space)
		// into renderer SVG-space rects. NOT a layout engine. NOT a coordinate solver.
		// Browser CSS engine still does the actual layout via getBoundingClientRect.
		// Do NOT extend with: gap math, track sizing, content fit, positioning decisions,
		// per-scene solver logic, or any use outside well_plate_96_zoom_check_scene.
		const svg_x_min = 1;
		const svg_x_max = 99;
		const svg_y_min = 5;
		const svg_y_max = 95;
		const svg_width = svg_x_max - svg_x_min;
		const svg_height = svg_y_max - svg_y_min;
		const x = Math.round(svg_x_min + (pixel_x * svg_width / viewport_width));
		const y = Math.round(svg_y_min + (pixel_y * svg_height / viewport_height));
		const width = Math.round(pixel_w * svg_width / viewport_width);
		const height = Math.round(pixel_h * svg_height / viewport_height);

		// Build ComputedItemLayout with integer-pixel coordinates
		const layout: ComputedItemLayout = {
			id: placement.placement_name,
			x: x,
			y: y,
			width: width,
			height: height,
			footprint: Math.round(width * height),
			tooltip: object_label,
			labelLines: object_label ? [object_label] : [],
			labelX: x,
			labelY: y + height + 10,
			labelWidth: width,
			labelMultiline: false,
		};

		layouts.push(layout);
	}

	//============================================
	// STEP 7: tear down scaffold for idempotency
	//============================================

	document.body.removeChild(scaffold);

	//============================================
	// OUTPUT: ComputedItemLayout[] with integer-pixel rects
	//============================================

	return layouts;
}

/**
 * Derive region list from placement zones with DEFAULT_REGION_VOCABULARY fallback.
 * Does NOT read scene.regions (no such field on ResolvedSceneConfig).
 */
function get_region_list(scene: ResolvedSceneConfig): string[] {
	// Derive from placement zone values only.
	const zone_set = new Set<string>();
	const placements = scene.placements || [];
	for (const placement of placements) {
		zone_set.add(placement.zone);
	}

	// If no zones found, return default vocabulary.
	if (zone_set.size === 0) {
		return DEFAULT_REGION_VOCABULARY.slice();
	}

	// Always include work_surface as a fallback host.
	if (!zone_set.has('work_surface')) {
		zone_set.add('work_surface');
	}

	return Array.from(zone_set);
}

/**
 * Determine which region a placement belongs to.
 *
 * Returns the placement's zone name as region, or a default region.
 */
function get_region_for_placement(placement: PlacementConfig): string {
	// For now, treat zone as region name
	if (placement.zone) {
		return placement.zone;
	}

	// Fallback to work_surface
	return 'work_surface';
}
