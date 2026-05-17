/**
 * liquid/index.ts
 *
 * Liquid material rendering for the scene runtime.
 * Renders liquid fill on containers (bottles, wells, tubes) based on material color.
 *
 * Implements MATERIAL_CONVENTION.md color rules: resolves material_name to display_color
 * from the materials registry, applies light/dark theme, and paints the liquid fill.
 *
 * Loud failure on unsupported material render fields (no silent fallback).
 */

import type { MaterialConfig } from '../types';

// Color role map derived from legacy src/style_constants.ts (re-implemented, not imported).
// These are the canonical color values used in legacy rendering for reference.
// Current liquid render uses only display_color from materials registry.
const COLOR_ROLES = {
	primary: '#1976d2',
	success: '#388e3c',
	warning: '#f57c00',
	error: '#d32f2f',
	info: '#0288d1',
	neutral: '#757575',
};

/**
 * Renders liquid fill on an SVG container.
 *
 * @param container - SVG element or containing element
 * @param material - MaterialConfig with display_color.light and display_color.dark
 * @param opts - Rendering options with position, size, and optional fillLevel (0-1)
 *
 * Throws loud Error if material lacks required display_color fields.
 */
export function renderLiquid(
	container: SVGElement | HTMLElement,
	material: MaterialConfig,
	opts: {
		x: number;
		y: number;
		width: number;
		height: number;
		fillLevel?: number;
		theme?: 'light' | 'dark';
	},
): void {
	// Validate required fields per MATERIAL_CONVENTION.md
	if (!material || typeof material !== 'object') {
		throw new Error('Invalid material config: must be an object');
	}

	if (!material.display_color) {
		throw new Error(
			`Unsupported material render field: missing display_color on material`,
		);
	}

	if (
		typeof material.display_color !== 'object' ||
		!material.display_color.light ||
		!material.display_color.dark
	) {
		throw new Error(
			`Unsupported material render field: display_color must have light and dark keys`,
		);
	}

	// Select theme color (default light)
	const theme = opts.theme || 'light';
	const color =
		theme === 'light' ? material.display_color.light : material.display_color.dark;

	// Validate color is a hex string
	if (!color || typeof color !== 'string' || !color.match(/^#[0-9a-fA-F]{6}$/)) {
		throw new Error(
			`Unsupported material render field: display_color.${theme} must be a valid hex color`,
		);
	}

	// Fill level defaults to 1.0 (full)
	const fillLevel = opts.fillLevel !== undefined ? opts.fillLevel : 1.0;

	// Compute filled height: proportional to fillLevel
	const filledHeight = opts.height * fillLevel;
	const fillY = opts.y + (opts.height - filledHeight);

	// Create or update fill rect on the container
	// Find or create an SVG inside the container
	let svg: SVGElement;
	if (container instanceof SVGElement) {
		svg = container;
	} else {
		// If container is HTMLElement, find SVG child or create one
		const svgChild = container.querySelector('svg');
		if (svgChild instanceof SVGElement) {
			svg = svgChild;
		} else {
			// Create new SVG
			svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			svg.setAttribute('width', String(opts.width));
			svg.setAttribute('height', String(opts.height));
			container.appendChild(svg);
		}
	}

	// Find or create fill rect
	let fillRect = svg.querySelector('[data-liquid-fill]');
	if (!fillRect) {
		fillRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		fillRect.setAttribute('data-liquid-fill', 'true');
		svg.appendChild(fillRect);
	}

	// Update rect attributes
	fillRect.setAttribute('x', String(opts.x));
	fillRect.setAttribute('y', String(fillY));
	fillRect.setAttribute('width', String(opts.width));
	fillRect.setAttribute('height', String(filledHeight));
	fillRect.setAttribute('fill', color);
	fillRect.setAttribute('opacity', '0.9');
}

/**
 * Re-export for testing and internal use.
 * Color validation and theme selection are tested separately.
 */
export const _internal = {
	COLOR_ROLES,
};
