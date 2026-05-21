#!/usr/bin/env node

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// VIEWPORT AND HELPERS

function parseArgs() {
	const args = process.argv.slice(2);
	let pattern = 'experiments/css_native_layout/templates/*.html';
	let outDir = 'test-results/new0_css_native/audit';
	let annotate = 'on';
	let theme = '';

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--out') {
			outDir = args[++i];
		} else if (args[i] === '--annotate') {
			annotate = args[++i];
		} else if (args[i] === '--theme') {
			theme = args[++i] || '';
		} else if (!args[i].startsWith('--')) {
			pattern = args[i];
		}
	}

	return { pattern, outDir, annotate: annotate === 'on', theme };
}

function resolvePattern(fullPattern) {
	if (!fullPattern.includes('*')) {
		return [fullPattern];
	}

	// Simple glob using fs.readdirSync
	const dir = path.dirname(fullPattern);
	const globPart = path.basename(fullPattern);

	if (!fs.existsSync(dir)) {
		return [];
	}

	const files = fs.readdirSync(dir);
	const globRegex = new RegExp('^' + globPart.replace(/\*/g, '.*') + '$');

	return files
		.filter(f => globRegex.test(f))
		.map(f => path.join(dir, f));
}

function getSceneNameFromPath(filePath) {
	return path.basename(filePath, '.html');
}

// ============================================
// DIAGNOSTIC FUNCTIONS

// 1. Clipped artwork: placement bbox exceeds parent region
async function checkClippedArtwork(page) {
	const result = [];
	const placements = await page.locator('.placement').all();

	for (const placement of placements) {
		const placementBox = await placement.boundingBox();
		const placementName = await placement.getAttribute('data-placement-name');
		const objectName = await placement.getAttribute('data-object-name');

		if (!placementBox) continue;

		// Get the parent region
		const regionElem = await placement.locator('..').locator('..')
			.evaluate(el => el.closest('.region'));

		if (!regionElem) continue;

		const regionBox = await placement.locator('..')
			.locator('..')
			.boundingBox();

		if (!regionBox) continue;

		// Check if placement overflows region
		const overflows = {
			top: placementBox.y < regionBox.y,
			left: placementBox.x < regionBox.x,
			right: placementBox.x + placementBox.width > regionBox.x + regionBox.width,
			bottom: placementBox.y + placementBox.height > regionBox.y + regionBox.height
		};

		const sides = Object.keys(overflows).filter(s => overflows[s]);

		if (sides.length > 0) {
			const overflowPx = {
				top: Math.max(0, regionBox.y - placementBox.y),
				left: Math.max(0, regionBox.x - placementBox.x),
				right: Math.max(0, placementBox.x + placementBox.width - (regionBox.x + regionBox.width)),
				bottom: Math.max(0, placementBox.y + placementBox.height - (regionBox.y + regionBox.height))
			};

			result.push({
				placement_name: placementName,
				object_name: objectName,
				placement_bbox: { x: placementBox.x, y: placementBox.y, w: placementBox.width, h: placementBox.height },
				region_bbox: { x: regionBox.x, y: regionBox.y, w: regionBox.width, h: regionBox.height },
				overflow_sides: sides,
				overflow_px: overflowPx
			});
		}
	}

	return result;
}

// 2. Off-page artwork: placement center or corners outside viewport
async function checkOffPageArtwork(page, viewport) {
	const result = [];
	const placements = await page.locator('.placement').all();

	for (const placement of placements) {
		const placementBox = await placement.boundingBox();
		const placementName = await placement.getAttribute('data-placement-name');
		const objectName = await placement.getAttribute('data-object-name');

		if (!placementBox) continue;

		// Check if center is outside viewport
		const centerX = placementBox.x + placementBox.width / 2;
		const centerY = placementBox.y + placementBox.height / 2;

		const outOfViewport = {
			center: centerX < 0 || centerX > viewport.w || centerY < 0 || centerY > viewport.h,
			corners: []
		};

		const corners = [
			{ name: 'top-left', x: placementBox.x, y: placementBox.y },
			{ name: 'top-right', x: placementBox.x + placementBox.width, y: placementBox.y },
			{ name: 'bottom-left', x: placementBox.x, y: placementBox.y + placementBox.height },
			{ name: 'bottom-right', x: placementBox.x + placementBox.width, y: placementBox.y + placementBox.height }
		];

		for (const corner of corners) {
			if (corner.x < 0 || corner.x > viewport.w || corner.y < 0 || corner.y > viewport.h) {
				outOfViewport.corners.push(corner.name);
			}
		}

		if (outOfViewport.center || outOfViewport.corners.length > 0) {
			result.push({
				placement_name: placementName,
				object_name: objectName,
				placement_bbox: { x: placementBox.x, y: placementBox.y, w: placementBox.width, h: placementBox.height },
				center_out_of_viewport: outOfViewport.center,
				corners_out_of_viewport: outOfViewport.corners
			});
		}
	}

	return result;
}

// Helper: check AABB intersection
function bboxIntersects(a, b) {
	return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function computeIntersection(a, b) {
	const x1 = Math.max(a.x, b.x);
	const y1 = Math.max(a.y, b.y);
	const x2 = Math.min(a.x + a.w, b.x + b.w);
	const y2 = Math.min(a.y + a.h, b.y + b.h);

	if (x2 <= x1 || y2 <= y1) return { w: 0, h: 0, area: 0 };

	return {
		w: x2 - x1,
		h: y2 - y1,
		area: (x2 - x1) * (y2 - y1)
	};
}

// 3. SVG-to-SVG overlaps
async function checkSvgSvgOverlap(page) {
	const result = [];
	const placements = await page.locator('.placement').all();

	const bboxData = [];
	for (const placement of placements) {
		const box = await placement.boundingBox();
		const placementName = await placement.getAttribute('data-placement-name');
		const objectName = await placement.getAttribute('data-object-name');

		if (box) {
			bboxData.push({
				placement_name: placementName,
				object_name: objectName,
				x: box.x,
				y: box.y,
				w: box.width,
				h: box.height
			});
		}
	}

	for (let i = 0; i < bboxData.length; i++) {
		for (let j = i + 1; j < bboxData.length; j++) {
			const a = bboxData[i];
			const b = bboxData[j];

			if (bboxIntersects(a, b)) {
				const inter = computeIntersection(a, b);
				result.push({
					placement_a: a.placement_name,
					placement_b: b.placement_name,
					object_a: a.object_name,
					object_b: b.object_name,
					overlap_w: inter.w.toFixed(1),
					overlap_h: inter.h.toFixed(1),
					overlap_area: inter.area.toFixed(1)
				});
			}
		}
	}

	return result;
}

// 4. Label-to-label overlaps
async function checkLabelLabelOverlap(page) {
	const result = [];
	const labels = await page.locator('.placement-label').all();

	const labelBboxes = [];
	for (const label of labels) {
		const box = await label.boundingBox();
		const placement = await label.locator('..').getAttribute('data-placement-name');

		if (box) {
			labelBboxes.push({
				placement_name: placement,
				x: box.x,
				y: box.y,
				w: box.width,
				h: box.height
			});
		}
	}

	for (let i = 0; i < labelBboxes.length; i++) {
		for (let j = i + 1; j < labelBboxes.length; j++) {
			const a = labelBboxes[i];
			const b = labelBboxes[j];

			if (bboxIntersects(a, b)) {
				const inter = computeIntersection(a, b);
				result.push({
					label_a: a.placement_name,
					label_b: b.placement_name,
					overlap_w: inter.w.toFixed(1),
					overlap_h: inter.h.toFixed(1),
					overlap_area: inter.area.toFixed(1)
				});
			}
		}
	}

	return result;
}

// ============================================
// ARTWORK INTEGRITY DIAGNOSTIC CHECKS (P3.0)
// Six sub-checks per placement:
// a. Image/SVG natural bbox vs rendered bbox (aspect ratio mismatch, shrink detection)
// b. Visible artwork bbox vs card/container bbox (clipping by ancestors)
// c. Object clipped by parent region (overflow:hidden + overflow content)
// d. Label clipped separately from artwork
// e. clipped_by_parent: img bbox clipped by any ancestor with overflow != visible (HARD FAIL)
// f. aspect_distorted: rendered aspect ratio differs from natural by more than tolerance
//    (HARD FAIL for glassware/pipette/plate/instrument; otherwise WARN)

// Tolerance (percent) for rendered vs natural aspect ratio mismatch in sub-check f.
// Used as the threshold for both the advisory and escalation. Configurable here.
const ASPECT_DISTORTION_TOLERANCE_PCT = 5;

// Tolerance in pixels for clipping detection in sub-check e. Sub-pixel
// rounding can produce 1px deltas at the visible bbox edge; guard against it.
const CLIP_TOLERANCE_PX = 1;

// Object-name pattern groups for hard-fail escalation. Matched as substrings
// against placement.object_name (case-insensitive).
const HARD_FAIL_OBJECT_PATTERNS = {
	glassware: ['flask', 'beaker', 'bottle', 'tube', 'cylinder'],
	pipette: ['pipette', 'tip'],
	plate: ['plate', 'well'],
	instrument: [
		'microscope', 'centrifuge', 'power_supply', 'electrophoresis',
		'incubator', 'cell_counter', 'hemocytometer', 'vortex', 'heat_block'
	]
};

// Classify an object_name into its hard-fail group, or null if none matches.
function classifyHardFailGroup(objectName) {
	if (!objectName) return null;
	const lower = objectName.toLowerCase();
	for (const group of Object.keys(HARD_FAIL_OBJECT_PATTERNS)) {
		for (const pattern of HARD_FAIL_OBJECT_PATTERNS[group]) {
			if (lower.includes(pattern)) {
				return group;
			}
		}
	}
	return null;
}

async function checkArtworkIntegrity(page, sceneContainer) {
	const result = {
		natural_vs_rendered: [],
		artwork_vs_card: [],
		object_vs_region: [],
		label_clipping: [],
		clipped_by_parent: [],
		aspect_distorted: []
	};

	const placements = await page.locator('.placement').all();

	for (const placement of placements) {
		const placementName = await placement.getAttribute('data-placement-name');
		const objectName = await placement.getAttribute('data-object-name');

		if (!placementName || !objectName) continue;

		// Get placement (card) bbox
		const cardBox = await placement.boundingBox();
		if (!cardBox) continue;

		// Get object-graphic (artwork container) bbox
		const artworkElem = await placement.locator('.object-graphic').first();
		const artworkBox = await artworkElem.boundingBox();

		// Get img element inside object-graphic
		const imgElem = await artworkElem.locator('img').first();
		const imgBox = await imgElem.boundingBox();

		// Get natural dimensions (SVG intrinsic size)
		const naturalDims = await imgElem.evaluate(el => {
			const img = el;
			return {
				width: img.naturalWidth || img.width,
				height: img.naturalHeight || img.height
			};
		});

		// Sub-check a: Image/SVG natural bbox vs rendered bbox
		if (artworkBox && naturalDims.width && naturalDims.height) {
			const renderedW = artworkBox.width;
			const renderedH = artworkBox.height;
			const naturalW = naturalDims.width;
			const naturalH = naturalDims.height;

			const renderedAspect = renderedW / renderedH;
			const naturalAspect = naturalW / naturalH;
			const aspectMismatchPct = Math.abs((renderedAspect - naturalAspect) / naturalAspect * 100).toFixed(1);

			const scaleFactorW = (renderedW / naturalW).toFixed(3);
			const scaleFactorH = (renderedH / naturalH).toFixed(3);

			const renderedArea = renderedW * renderedH;
			const naturalArea = naturalW * naturalH;
			const areaRatio = (renderedArea / naturalArea * 100).toFixed(1);

			let severity = 'OK';
			let reason = '';

			// Detect aspect ratio mismatch (>5%)
			if (parseFloat(aspectMismatchPct) > 5) {
				severity = 'WARN';
				reason = `aspect mismatch ${aspectMismatchPct}% (natural ${naturalAspect.toFixed(2)}, rendered ${renderedAspect.toFixed(2)})`;
			}

			// Detect forced shrink (<60% of natural area)
			if (parseFloat(areaRatio) < 60) {
				severity = 'WARN';
				reason = `rendered area ${areaRatio}% of natural (forced shrink suggests object-fit:contain underutilization)`;
			}

			// Detect unintentional upscaling (>120% of natural area)
			if (parseFloat(areaRatio) > 120) {
				severity = 'WARN';
				reason = `rendered area ${areaRatio}% of natural (unintentional upscaling)`;
			}

			result.natural_vs_rendered.push({
				placement_name: placementName,
				object_name: objectName,
				natural_width_px: naturalW,
				natural_height_px: naturalH,
				rendered_width_px: Math.round(renderedW),
				rendered_height_px: Math.round(renderedH),
				natural_aspect_ratio: naturalAspect.toFixed(3),
				rendered_aspect_ratio: renderedAspect.toFixed(3),
				aspect_ratio_mismatch_pct: parseFloat(aspectMismatchPct),
				area_ratio_pct: parseFloat(areaRatio),
				scale_factor_w: parseFloat(scaleFactorW),
				scale_factor_h: parseFloat(scaleFactorH),
				severity: severity,
				reason: reason
			});
		}

		// Sub-check b: Visible artwork bbox vs card/container bbox
		// Artwork is clipped if it extends outside the card
		if (artworkBox && cardBox) {
			const artworkOutsideCard = {
				top: artworkBox.y < cardBox.y,
				left: artworkBox.x < cardBox.x,
				right: artworkBox.x + artworkBox.width > cardBox.x + cardBox.width,
				bottom: artworkBox.y + artworkBox.height > cardBox.y + cardBox.height
			};

			const sidesOutside = Object.keys(artworkOutsideCard).filter(s => artworkOutsideCard[s]);

			if (sidesOutside.length > 0) {
				result.artwork_vs_card.push({
					placement_name: placementName,
					object_name: objectName,
					card_bbox: { x: cardBox.x, y: cardBox.y, w: cardBox.width, h: cardBox.height },
					artwork_bbox: { x: artworkBox.x, y: artworkBox.y, w: artworkBox.width, h: artworkBox.height },
					overflow_sides: sidesOutside,
					severity: 'WARN',
					reason: `artwork extends outside card on ${sidesOutside.join(', ')}`
				});
			}
		}

		// Sub-check c: Object clipped by parent region (overflow:hidden)
		if (cardBox && sceneContainer) {
			// Get the parent region
			const regionElem = await placement.locator('..').locator('..')
				.evaluate(el => el.closest('.region'));

			if (regionElem) {
				const regionBox = await placement.locator('..')
					.locator('..')
					.boundingBox();

				if (regionBox) {
					// Compute visible area (intersection of card with region)
					const visibleX1 = Math.max(cardBox.x, regionBox.x);
					const visibleY1 = Math.max(cardBox.y, regionBox.y);
					const visibleX2 = Math.min(cardBox.x + cardBox.width, regionBox.x + regionBox.width);
					const visibleY2 = Math.min(cardBox.y + cardBox.height, regionBox.y + regionBox.height);

					const visibleW = Math.max(0, visibleX2 - visibleX1);
					const visibleH = Math.max(0, visibleY2 - visibleY1);
					const visibleArea = visibleW * visibleH;
					const cardArea = cardBox.width * cardBox.height;

					const visiblePct = (visibleArea / cardArea * 100).toFixed(1);

					if (parseFloat(visiblePct) < 100) {
						result.object_vs_region.push({
							placement_name: placementName,
							object_name: objectName,
							card_area: Math.round(cardArea),
							visible_area: Math.round(visibleArea),
							visible_pct: parseFloat(visiblePct),
							region_bbox: { x: regionBox.x, y: regionBox.y, w: regionBox.width, h: regionBox.height },
							card_bbox: { x: cardBox.x, y: cardBox.y, w: cardBox.width, h: cardBox.height },
							severity: 'WARN',
							reason: `object clipped by region overflow: only ${visiblePct}% visible`
						});
					}
				}
			}
		}

		// Sub-check d: Label clipped separately from artwork
		const labelElem = await placement.locator('.placement-label').first();
		const labelBox = await labelElem.boundingBox();

		if (labelBox && sceneContainer) {
			// Get parent region for label too
			const regionElem = await placement.locator('..').locator('..')
				.evaluate(el => el.closest('.region'));

			if (regionElem) {
				const regionBox = await placement.locator('..')
					.locator('..')
					.boundingBox();

				if (regionBox) {
					// Compute visible label area (intersection with region)
					const visibleX1 = Math.max(labelBox.x, regionBox.x);
					const visibleY1 = Math.max(labelBox.y, regionBox.y);
					const visibleX2 = Math.min(labelBox.x + labelBox.width, regionBox.x + regionBox.width);
					const visibleY2 = Math.min(labelBox.y + labelBox.height, regionBox.y + regionBox.height);

					const visibleW = Math.max(0, visibleX2 - visibleX1);
					const visibleH = Math.max(0, visibleY2 - visibleY1);
					const visibleArea = visibleW * visibleH;
					const labelArea = labelBox.width * labelBox.height;

					const visiblePct = (visibleArea / labelArea * 100).toFixed(1);

					if (parseFloat(visiblePct) < 100) {
						result.label_clipping.push({
							placement_name: placementName,
							label_area: Math.round(labelArea),
							visible_area: Math.round(visibleArea),
							visible_pct: parseFloat(visiblePct),
							region_bbox: { x: regionBox.x, y: regionBox.y, w: regionBox.width, h: regionBox.height },
							label_bbox: { x: labelBox.x, y: labelBox.y, w: labelBox.width, h: labelBox.height },
							severity: 'WARN',
							reason: `label clipped by region: only ${visiblePct}% visible`
						});
					}
				}
			}
		}

		// Sub-check e: clipped_by_parent
		// Detect when the rendered <img> bbox extends beyond the intersection of
		// all ancestor clip rects (ancestors with overflow != visible). This
		// catches SVG cropping by parent overflow:hidden, which violates the
		// "never crop SVG assets" rule and must be a hard fail.
		const clipInfo = await imgElem.evaluate((el, tolerancePx) => {
			const imgRect = el.getBoundingClientRect();
			if (imgRect.width === 0 || imgRect.height === 0) return null;

			// Walk ancestors collecting clipping rects. Stop at document root.
			let clipLeft = -Infinity;
			let clipTop = -Infinity;
			let clipRight = Infinity;
			let clipBottom = Infinity;
			let clippedByAncestorTag = null;

			let parent = el.parentElement;
			while (parent && parent !== document.body && parent !== document.documentElement) {
				const style = window.getComputedStyle(parent);
				const overflowX = style.overflowX;
				const overflowY = style.overflowY;
				const clipsX = overflowX !== 'visible';
				const clipsY = overflowY !== 'visible';

				if (clipsX || clipsY) {
					const r = parent.getBoundingClientRect();
					if (clipsX) {
						if (r.left > clipLeft) {
							clipLeft = r.left;
							clippedByAncestorTag = parent.tagName + (parent.className ? '.' + String(parent.className).split(' ').join('.') : '');
						}
						if (r.right < clipRight) clipRight = r.right;
					}
					if (clipsY) {
						if (r.top > clipTop) clipTop = r.top;
						if (r.bottom < clipBottom) clipBottom = r.bottom;
					}
				}
				parent = parent.parentElement;
			}

			// Convert -Infinity / Infinity sentinels to img bounds (no clip).
			if (clipLeft === -Infinity) clipLeft = imgRect.left;
			if (clipTop === -Infinity) clipTop = imgRect.top;
			if (clipRight === Infinity) clipRight = imgRect.right;
			if (clipBottom === Infinity) clipBottom = imgRect.bottom;

			const clipOverLeft = Math.max(0, clipLeft - imgRect.left);
			const clipOverTop = Math.max(0, clipTop - imgRect.top);
			const clipOverRight = Math.max(0, imgRect.right - clipRight);
			const clipOverBottom = Math.max(0, imgRect.bottom - clipBottom);

			const isClipped = (
				clipOverLeft > tolerancePx
				|| clipOverTop > tolerancePx
				|| clipOverRight > tolerancePx
				|| clipOverBottom > tolerancePx
			);

			return {
				img_bbox: {
					x: imgRect.left,
					y: imgRect.top,
					w: imgRect.width,
					h: imgRect.height
				},
				visible_bbox: {
					x: Math.max(imgRect.left, clipLeft),
					y: Math.max(imgRect.top, clipTop),
					w: Math.max(0, Math.min(imgRect.right, clipRight) - Math.max(imgRect.left, clipLeft)),
					h: Math.max(0, Math.min(imgRect.bottom, clipBottom) - Math.max(imgRect.top, clipTop))
				},
				clip_over_px: {
					left: clipOverLeft,
					top: clipOverTop,
					right: clipOverRight,
					bottom: clipOverBottom
				},
				is_clipped: isClipped,
				clipper_tag: clippedByAncestorTag
			};
		}, CLIP_TOLERANCE_PX);

		if (clipInfo && clipInfo.is_clipped) {
			const overflowSides = Object.keys(clipInfo.clip_over_px)
				.filter(s => clipInfo.clip_over_px[s] > CLIP_TOLERANCE_PX);
			result.clipped_by_parent.push({
				placement_name: placementName,
				object_name: objectName,
				img_bbox: clipInfo.img_bbox,
				visible_bbox: clipInfo.visible_bbox,
				clip_over_px: clipInfo.clip_over_px,
				overflow_sides: overflowSides,
				clipper: clipInfo.clipper_tag,
				severity: 'HARD_FAIL',
				reason: `SVG cropped by parent overflow on ${overflowSides.join(', ')}: never crop SVG assets`
			});
		}

		// Sub-check f: aspect_distorted
		// Compare the rendered aspect ratio against the natural asset aspect
		// ratio with a configurable tolerance. For glassware/pipette/plate/
		// instrument objects, distortion is escalated to HARD_FAIL because
		// these are highest-priority semantic objects.
		if (artworkBox && naturalDims.width && naturalDims.height) {
			const renderedAspect = artworkBox.width / artworkBox.height;
			const naturalAspect = naturalDims.width / naturalDims.height;
			const deltaPct = Math.abs((renderedAspect - naturalAspect) / naturalAspect * 100);

			if (deltaPct > ASPECT_DISTORTION_TOLERANCE_PCT) {
				const hardFailGroup = classifyHardFailGroup(objectName);
				const severity = hardFailGroup ? 'HARD_FAIL' : 'WARN';
				const reasonPrefix = hardFailGroup
					? `aspect distorted on ${hardFailGroup}`
					: 'aspect distorted';
				result.aspect_distorted.push({
					placement_name: placementName,
					object_name: objectName,
					hard_fail_group: hardFailGroup,
					natural_aspect_ratio: parseFloat(naturalAspect.toFixed(3)),
					rendered_aspect_ratio: parseFloat(renderedAspect.toFixed(3)),
					delta_pct: parseFloat(deltaPct.toFixed(2)),
					tolerance_pct: ASPECT_DISTORTION_TOLERANCE_PCT,
					severity: severity,
					reason: `${reasonPrefix}: ${deltaPct.toFixed(1)}% (natural ${naturalAspect.toFixed(2)}, rendered ${renderedAspect.toFixed(2)}, tolerance ${ASPECT_DISTORTION_TOLERANCE_PCT}%)`
				});
			}
		}
	}

	return result;
}

// 5. SVG-to-label overlaps (cross-pairs only, excluding self)
async function checkSvgLabelOverlap(page) {
	const result = [];
	const placements = await page.locator('.placement').all();

	const svgBboxes = [];
	for (const placement of placements) {
		const box = await placement.boundingBox();
		const placementName = await placement.getAttribute('data-placement-name');
		const objectName = await placement.getAttribute('data-object-name');

		if (box) {
			svgBboxes.push({
				placement_name: placementName,
				object_name: objectName,
				x: box.x,
				y: box.y,
				w: box.width,
				h: box.height
			});
		}
	}

	const labelBboxes = [];
	for (const placement of placements) {
		const label = await placement.locator('.placement-label');
		const labelBox = await label.boundingBox();
		const placementName = await placement.getAttribute('data-placement-name');

		if (labelBox) {
			labelBboxes.push({
				placement_name: placementName,
				x: labelBox.x,
				y: labelBox.y,
				w: labelBox.width,
				h: labelBox.height
			});
		}
	}

	for (const svg of svgBboxes) {
		for (const label of labelBboxes) {
			// Skip self-label overlaps
			if (svg.placement_name === label.placement_name) continue;

			if (bboxIntersects(svg, label)) {
				const inter = computeIntersection(svg, label);
				result.push({
					svg_placement: svg.placement_name,
					label_placement: label.placement_name,
					overlap_w: inter.w.toFixed(1),
					overlap_h: inter.h.toFixed(1),
					overlap_area: inter.area.toFixed(1)
				});
			}
		}
	}

	return result;
}

// 6. Region overflow
async function checkRegionOverflow(page) {
	const result = [];
	const regions = await page.locator('.region').all();

	for (const region of regions) {
		const regionName = await region.getAttribute('data-region');
		if (regionName === 'popup_layer') continue;

		const box = await region.boundingBox();
		const scrollHeight = await region.evaluate(el => el.scrollHeight);
		const scrollWidth = await region.evaluate(el => el.scrollWidth);

		if (!box) continue;

		const deltaH = scrollHeight - box.height;
		const deltaW = scrollWidth - box.width;

		if (deltaH > 0 || deltaW > 0) {
			result.push({
				region_name: regionName,
				region_bbox: { x: box.x, y: box.y, w: box.width, h: box.height },
				scroll_height: scrollHeight,
				scroll_width: scrollWidth,
				overflow_h: Math.max(0, deltaH),
				overflow_w: Math.max(0, deltaW)
			});
		}
	}

	return result;
}

// 7. Whitespace per region
async function checkRegionWhitespace(page) {
	const result = [];
	const regions = await page.locator('.region').all();

	for (const region of regions) {
		const regionName = await region.getAttribute('data-region');
		if (regionName === 'popup_layer') continue;

		const box = await region.boundingBox();
		if (!box) continue;

		const regionArea = box.width * box.height;

		// Sum placement areas in this region
		const placements = await region.locator('.placement').all();
		let occupiedArea = 0;

		for (const placement of placements) {
			const pBox = await placement.boundingBox();
			if (pBox) {
				occupiedArea += pBox.width * pBox.height;
			}
		}

		const whitespacePercent = regionArea > 0 ? ((regionArea - occupiedArea) / regionArea * 100).toFixed(1) : 0;
		const flag = whitespacePercent > 80 && placements.length > 0;

		result.push({
			region_name: regionName,
			area: regionArea.toFixed(0),
			occupied: occupiedArea.toFixed(0),
			whitespace_pct: parseFloat(whitespacePercent),
			placement_count: placements.length,
			flag: flag
		});
	}

	return result;
}

// 8. Scene-level whitespace
async function checkSceneWhitespace(page) {
	const container = await page.locator('.scene-container').boundingBox();
	if (!container) return null;

	const sceneArea = container.width * container.height;

	const placements = await page.locator('.placement').all();
	let occupiedArea = 0;

	for (const placement of placements) {
		const box = await placement.boundingBox();
		if (box) {
			occupiedArea += box.width * box.height;
		}
	}

	const whitespacePercent = sceneArea > 0 ? ((sceneArea - occupiedArea) / sceneArea * 100).toFixed(1) : 0;

	return {
		scene_area: sceneArea.toFixed(0),
		occupied_area: occupiedArea.toFixed(0),
		whitespace_pct: parseFloat(whitespacePercent)
	};
}

// 9. Primary object detection and area ratio (with scene-mode support)
async function checkPrimaryObjectRatio(page, viewport) {
	const container = await page.locator('.scene-container').boundingBox();
	if (!container) return null;

	const sceneArea = container.width * container.height;

	// Detect scene mode (composition vs template)
	const sceneMode = await page.evaluate(() => {
		const elem = document.querySelector('.scene-container');
		return elem?.getAttribute('data-scene-mode') || 'composition';
	});

	// Template scenes skip primary ratio check entirely
	if (sceneMode === 'template') {
		return {
			placement_name: null,
			area: null,
			ratio: null,
			flag: false,
			is_zoom: false,
			found_by: 'skipped--template-mode',
			threshold: null,
			scene_mode: 'template'
		};
	}

	// Composition scenes: data-primary required; largest-bbox fallback removed
	let primaryPlacement = await page.locator('[data-primary="true"]').first();
	let foundBy = 'data-primary';

	// Fallback: first placement in primary_work_surface
	if (!await primaryPlacement.isVisible().catch(() => false)) {
		primaryPlacement = await page.locator('[data-region="primary_work_surface"] .placement').first();
		foundBy = 'region--primary_work_surface';
	}

	// Fallback: first placement in work_surface
	if (!await primaryPlacement.isVisible().catch(() => false)) {
		primaryPlacement = await page.locator('[data-region="work_surface"] .placement').first();
		foundBy = 'region--work_surface';
	}

	// NO FALLBACK TO LARGEST: composition scenes must declare data-primary
	if (!await primaryPlacement.isVisible().catch(() => false)) {
		return {
			placement_name: null,
			area: null,
			ratio: null,
			flag: true,
			is_zoom: false,
			found_by: 'missing',
			threshold: null,
			scene_mode: 'composition',
			error: 'composition scene must declare data-primary="true"'
		};
	}

	const primaryBox = await primaryPlacement.boundingBox();
	if (!primaryBox) return null;

	const primaryArea = primaryBox.width * primaryBox.height;
	const ratio = (primaryArea / sceneArea * 100).toFixed(1);

	// Determine if zoom scene
	const isZoom = await page.locator('.scene-container.scene-mode--detail').count() > 0;

	const threshold = isZoom ? 70 : 25;
	const flag = ratio < threshold;

	const placementName = await primaryPlacement.getAttribute('data-placement-name');

	return {
		placement_name: placementName,
		area: primaryArea.toFixed(0),
		ratio: parseFloat(ratio),
		flag: flag,
		is_zoom: isZoom,
		found_by: foundBy,
		threshold: threshold,
		scene_mode: 'composition'
	};
}

// 10. Largest empty band (simplified quadrant approach)
async function checkLargestEmptyBand(page, viewport) {
	const container = await page.locator('.scene-container').boundingBox();
	if (!container) return null;

	const placements = await page.locator('.placement').all();
	const placementBoxes = [];

	for (const placement of placements) {
		const box = await placement.boundingBox();
		if (box) {
			placementBoxes.push(box);
		}
	}

	// Simple approach: find largest empty quadrant
	const centerX = container.x + container.width / 2;
	const centerY = container.y + container.height / 2;

	const quadrants = [
		{ name: 'top-left', x: container.x, y: container.y, w: container.width / 2, h: container.height / 2 },
		{ name: 'top-right', x: container.x + container.width / 2, y: container.y, w: container.width / 2, h: container.height / 2 },
		{ name: 'bottom-left', x: container.x, y: container.y + container.height / 2, w: container.width / 2, h: container.height / 2 },
		{ name: 'bottom-right', x: container.x + container.width / 2, y: container.y + container.height / 2, w: container.width / 2, h: container.height / 2 }
	];

	let largestEmpty = null;
	let largestArea = 0;

	for (const quad of quadrants) {
		let hasPlacement = false;

		for (const pBox of placementBoxes) {
			if (bboxIntersects(
				{ x: quad.x, y: quad.y, w: quad.w, h: quad.h },
				{ x: pBox.x, y: pBox.y, w: pBox.width, h: pBox.height }
			)) {
				hasPlacement = true;
				break;
			}
		}

		if (!hasPlacement) {
			const area = quad.w * quad.h;
			if (area > largestArea) {
				largestArea = area;
				largestEmpty = quad;
			}
		}
	}

	return largestEmpty || { x: 0, y: 0, w: 0, h: 0 };
}

// 11. Supporting object distance score (skipped for template scenes)
async function checkSupportingDistance(page) {
	const container = await page.locator('.scene-container').boundingBox();
	if (!container) return null;

	// Skip for template scenes
	const sceneMode = await page.evaluate(() => {
		const elem = document.querySelector('.scene-container');
		return elem?.getAttribute('data-scene-mode') || 'composition';
	});

	if (sceneMode === 'template') {
		return { skipped: true, reason: 'template-mode' };
	}

	// Find primary object
	let primaryPlacement = await page.locator('[data-primary="true"]').first();
	if (!await primaryPlacement.isVisible().catch(() => false)) {
		primaryPlacement = await page.locator('[data-region="primary_work_surface"] .placement').first();
	}
	if (!await primaryPlacement.isVisible().catch(() => false)) {
		primaryPlacement = await page.locator('[data-region="work_surface"] .placement').first();
	}

	const primaryBox = await primaryPlacement.boundingBox();
	if (!primaryBox) return null;

	const primaryCenterX = primaryBox.x + primaryBox.width / 2;
	const primaryCenterY = primaryBox.y + primaryBox.height / 2;

	const placements = await page.locator('.placement').all();
	const distances = [];
	const diagonalDist = Math.sqrt(container.width ** 2 + container.height ** 2);

	for (const placement of placements) {
		const placementName = await placement.getAttribute('data-placement-name');
		const primaryName = await primaryPlacement.getAttribute('data-placement-name');

		if (placementName === primaryName) continue;

		const box = await placement.boundingBox();
		if (!box) continue;

		const centerX = box.x + box.width / 2;
		const centerY = box.y + box.height / 2;

		const dist = Math.sqrt((centerX - primaryCenterX) ** 2 + (centerY - primaryCenterY) ** 2);
		const normDist = (dist / diagonalDist).toFixed(3);

		distances.push({
			placement_name: placementName,
			distance_px: dist.toFixed(1),
			normalized: parseFloat(normDist)
		});
	}

	if (distances.length === 0) return null;

	const meanNorm = (distances.reduce((sum, d) => sum + d.normalized, 0) / distances.length).toFixed(3);
	const maxNorm = Math.max(...distances.map(d => d.normalized)).toFixed(3);

	return {
		mean_norm: parseFloat(meanNorm),
		max_norm: parseFloat(maxNorm),
		distances: distances
	};
}

// ============================================
// PRECHECK ORCHESTRATOR

async function runPrecheck(htmlPath, theme = '', outDir = 'test-results/new0_css_native/audit') {
	const sceneName = getSceneNameFromPath(htmlPath);
	const fileUrl = `file://${htmlPath}`;

	console.log(`\nPrecheck: ${sceneName}${theme ? ` (theme: ${theme})` : ''}`);

	const browser = await chromium.launch();
	const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

	try {
		await page.goto(fileUrl, { waitUntil: 'load' });
		await page.waitForTimeout(500);

		// Inject theme if specified
		if (theme) {
			await page.evaluate((themeName) => {
				const body = document.querySelector('body');
				if (body) {
					body.classList.add(`theme--${themeName}`);
				}
			}, theme);
			await page.waitForTimeout(300);
		}

		// Capture screenshot before closing browser
		const screenshotPath = path.join(outDir, `${sceneName}.png`);
		await page.screenshot({ path: screenshotPath, fullPage: false });

		const viewport = { w: 1920, h: 1080 };
		const container = await page.locator('.scene-container').boundingBox();

		const checks = {
			clipped_artwork: await checkClippedArtwork(page),
			off_page: await checkOffPageArtwork(page, viewport),
			svg_svg_overlap: await checkSvgSvgOverlap(page),
			label_label_overlap: await checkLabelLabelOverlap(page),
			svg_label_overlap: await checkSvgLabelOverlap(page),
			region_overflow: await checkRegionOverflow(page),
			region_whitespace: await checkRegionWhitespace(page),
			scene_whitespace: await checkSceneWhitespace(page),
			primary_object: await checkPrimaryObjectRatio(page, viewport),
			largest_empty_band: await checkLargestEmptyBand(page, viewport),
			supporting_distance: await checkSupportingDistance(page),
			artwork_integrity: await checkArtworkIntegrity(page, container)
		};

		// Detect scene mode
		const sceneMode = checks.primary_object?.scene_mode || 'composition';

		// Determine verdict
		// Artwork integrity sub-checks contribute hard fails when:
		//   - any clipped_by_parent finding (severity HARD_FAIL by design)
		//   - any aspect_distorted finding escalated to HARD_FAIL via the
		//     glassware/pipette/plate/instrument classifier
		const integrityClippedByParent = checks.artwork_integrity?.clipped_by_parent || [];
		const integrityAspectHardFails = (checks.artwork_integrity?.aspect_distorted || [])
			.filter(item => item.severity === 'HARD_FAIL');

		const hardFails = [
			checks.clipped_artwork.length > 0,
			checks.off_page.length > 0,
			checks.svg_svg_overlap.length > 0,
			checks.region_overflow.length > 0,
			integrityClippedByParent.length > 0,
			integrityAspectHardFails.length > 0
		];

		const hasHardFail = hardFails.some(x => x);
		let verdict = 'PASS';

		if (hasHardFail) {
			verdict = 'FAIL';
		} else if (sceneMode === 'template' && !hasHardFail) {
			// Template scenes with 0 hard fails = PASS_TEMPLATE
			verdict = 'PASS_TEMPLATE';
		} else if (checks.label_label_overlap.length > 0
			|| (checks.region_whitespace && checks.region_whitespace.some(r => r.flag))
			|| (checks.primary_object && checks.primary_object.flag)) {
			verdict = 'WARN';
		}

		return {
			scene: sceneName,
			viewport: viewport,
			scene_container: container,
			checks: checks,
			verdict: verdict
		};
	} finally {
		await browser.close();
	}
}

// ============================================
// REPORT GENERATION

function generateMarkdownReport(sceneResults) {
	let md = '# NEW0 Visual Audit Report\n\n';

	const summary = {
		total_scenes: sceneResults.length,
		scenes_pass: sceneResults.filter(r => r.verdict === 'PASS').length,
		scenes_pass_template: sceneResults.filter(r => r.verdict === 'PASS_TEMPLATE').length,
		scenes_warn: sceneResults.filter(r => r.verdict === 'WARN').length,
		scenes_failed: sceneResults.filter(r => r.verdict === 'FAIL').length,
		checks_failed: sceneResults.reduce((sum, r) => {
			let count = 0;
			const checks = r.checks;
			if (checks.clipped_artwork.length > 0) count++;
			if (checks.off_page.length > 0) count++;
			if (checks.svg_svg_overlap.length > 0) count++;
			if (checks.label_label_overlap.length > 0) count++;
			if (checks.region_overflow.length > 0) count++;
			if ((checks.artwork_integrity?.clipped_by_parent || []).length > 0) count++;
			if ((checks.artwork_integrity?.aspect_distorted || []).some(i => i.severity === 'HARD_FAIL')) count++;
			return sum + count;
		}, 0)
	};

	md += '## Summary\n\n';
	md += `| Metric | Value |\n`;
	md += `| --- | --- |\n`;
	md += `| Total Scenes | ${summary.total_scenes} |\n`;
	md += `| PASS | ${summary.scenes_pass} |\n`;
	md += `| PASS_TEMPLATE | ${summary.scenes_pass_template} |\n`;
	md += `| WARN | ${summary.scenes_warn} |\n`;
	md += `| FAIL | ${summary.scenes_failed} |\n`;
	md += `| Checks with Issues | ${summary.checks_failed} |\n`;
	md += '\n';

	md += '## Scene-Composition Diagnostics\n\n';
	md += `| Scene | Mode | Clipped | Off-Page | SVG-SVG | Region-Overflow | Primary-Ratio | Verdict |\n`;
	md += `| --- | --- | --- | --- | --- | --- | --- | --- |\n`;

	for (const result of sceneResults) {
		const checks = result.checks;
		const clipped = checks.clipped_artwork.length;
		const offPage = checks.off_page.length;
		const svgSvg = checks.svg_svg_overlap.length;
		const regionOvf = checks.region_overflow.length;
		const primaryObj = checks.primary_object;
		const primaryFlag = primaryObj ? (primaryObj.flag ? 'Y' : (primaryObj.scene_mode === 'template' ? '—' : 'N')) : '-';
		const sceneMode = primaryObj ? (primaryObj.scene_mode || 'composition') : 'composition';

		md += `| ${result.scene} | ${sceneMode} | ${clipped} | ${offPage} | ${svgSvg} | ${regionOvf} | ${primaryFlag} | **${result.verdict}** |\n`;
	}

	md += '\n';

	md += '## Detailed Findings\n\n';

	for (const result of sceneResults) {
		md += `### ${result.scene}\n\n`;

		const checks = result.checks;

		if (checks.clipped_artwork.length > 0) {
			md += `**Clipped Artwork** (${checks.clipped_artwork.length} items):\n`;
			for (const item of checks.clipped_artwork) {
				md += `- ${item.placement_name} (${item.object_name}): ${item.overflow_sides.join(', ')}\n`;
			}
			md += '\n';
		}

		if (checks.off_page.length > 0) {
			md += `**Off-Page Artwork** (${checks.off_page.length} items):\n`;
			for (const item of checks.off_page) {
				md += `- ${item.placement_name} (${item.object_name}): center out=${item.center_out_of_viewport}\n`;
			}
			md += '\n';
		}

		if (checks.svg_svg_overlap.length > 0) {
			md += `**SVG-SVG Overlaps** (${checks.svg_svg_overlap.length} pairs):\n`;
			for (const item of checks.svg_svg_overlap) {
				md += `- ${item.placement_a} ↔ ${item.placement_b}: ${item.overlap_area}px²\n`;
			}
			md += '\n';
		}

		if (checks.label_label_overlap.length > 0) {
			md += `**Label-Label Overlaps** (${checks.label_label_overlap.length} pairs):\n`;
			for (const item of checks.label_label_overlap) {
				md += `- ${item.label_a} ↔ ${item.label_b}\n`;
			}
			md += '\n';
		}

		if (checks.region_overflow.length > 0) {
			md += `**Region Overflow** (${checks.region_overflow.length} regions):\n`;
			for (const item of checks.region_overflow) {
				md += `- ${item.region_name}: h=${item.overflow_h.toFixed(0)}px, w=${item.overflow_w.toFixed(0)}px\n`;
			}
			md += '\n';
		}

		if (checks.primary_object) {
			const p = checks.primary_object;
			if (p.scene_mode === 'template') {
				md += `**Primary Object Ratio**: SKIPPED (template-mode scene)\n\n`;
			} else if (p.error) {
				md += `**Primary Object Error**: ${p.error}\n\n`;
			} else if (p.flag) {
				md += `**Primary Object Ratio Flag**: ${p.ratio}% (threshold=${p.threshold}%, zoom=${p.is_zoom})\n\n`;
			}
		}

		if (checks.supporting_distance && !checks.supporting_distance.skipped) {
			md += `**Supporting Object Distance**: mean=${checks.supporting_distance.mean_norm}, max=${checks.supporting_distance.max_norm}\n\n`;
		}

		// Artwork integrity findings (new P3.0 diagnostic)
		if (checks.artwork_integrity) {
			const integrity = checks.artwork_integrity;
			const hasFails = integrity.natural_vs_rendered.filter(i => i.severity === 'WARN').length > 0
				|| integrity.artwork_vs_card.length > 0
				|| integrity.object_vs_region.length > 0
				|| integrity.label_clipping.length > 0
				|| (integrity.clipped_by_parent || []).length > 0
				|| (integrity.aspect_distorted || []).length > 0;

			if (hasFails) {
				md += `## Artwork Integrity Diagnostics\n\n`;

				if (integrity.natural_vs_rendered.filter(i => i.severity === 'WARN').length > 0) {
					md += `**Sub-check a: Natural vs Rendered Aspect / Area Issues**\n`;
					for (const item of integrity.natural_vs_rendered.filter(i => i.severity === 'WARN')) {
						md += `- ${item.placement_name} (${item.object_name}): ${item.reason}\n`;
						md += `  - natural ${item.natural_width_px}×${item.natural_height_px}, rendered ${item.rendered_width_px}×${item.rendered_height_px}\n`;
						md += `  - area ratio ${item.area_ratio_pct}%, aspect mismatch ${item.aspect_ratio_mismatch_pct}%\n`;
					}
					md += '\n';
				}

				if (integrity.artwork_vs_card.length > 0) {
					md += `**Sub-check b: Artwork Extends Outside Card**\n`;
					for (const item of integrity.artwork_vs_card) {
						md += `- ${item.placement_name}: ${item.reason}\n`;
					}
					md += '\n';
				}

				if (integrity.object_vs_region.length > 0) {
					md += `**Sub-check c: Object Clipped by Region**\n`;
					for (const item of integrity.object_vs_region) {
						md += `- ${item.placement_name}: ${item.reason}\n`;
					}
					md += '\n';
				}

				if (integrity.label_clipping.length > 0) {
					md += `**Sub-check d: Label Clipped by Region**\n`;
					for (const item of integrity.label_clipping) {
						md += `- ${item.placement_name}: ${item.reason}\n`;
					}
					md += '\n';
				}

				if ((integrity.clipped_by_parent || []).length > 0) {
					md += `**Sub-check e: SVG Clipped by Parent Overflow (HARD FAIL)**\n`;
					for (const item of integrity.clipped_by_parent) {
						md += `- ${item.placement_name} (${item.object_name}): ${item.reason}\n`;
					}
					md += '\n';
				}

				if ((integrity.aspect_distorted || []).length > 0) {
					md += `**Sub-check f: Rendered Aspect Distorted vs Natural**\n`;
					for (const item of integrity.aspect_distorted) {
						const tag = item.severity === 'HARD_FAIL' ? ' (HARD FAIL)' : '';
						md += `- ${item.placement_name} (${item.object_name})${tag}: ${item.reason}\n`;
					}
					md += '\n';
				}
			}
		}

		md += `**Verdict: ${result.verdict}**\n\n`;
	}

	return md;
}

// ============================================
// SIZING MANIFEST GENERATION

function generateSizingManifest(sceneResults, repoRoot) {
	const entries = [];
	const seenObjectScenePairs = new Set();

	for (const result of sceneResults) {
		const integrity = result.checks.artwork_integrity;

		if (integrity && integrity.natural_vs_rendered) {
			for (const item of integrity.natural_vs_rendered) {
				// Per-placement entry (one entry per scene)
				const pairKey = `${item.object_name}|${result.scene}`;
				if (seenObjectScenePairs.has(pairKey)) {
					continue;
				}
				seenObjectScenePairs.add(pairKey);

				const entry = {
					object_name: item.object_name,
					scene: result.scene,
					theme: 'default',
					rendered_width_px: item.rendered_width_px,
					rendered_height_px: item.rendered_height_px,
					natural_width_px: item.natural_width_px,
					natural_height_px: item.natural_height_px,
					natural_aspect_ratio: parseFloat(item.natural_aspect_ratio),
					rendered_aspect_ratio: parseFloat(item.rendered_aspect_ratio),
					aspect_ratio_mismatch_pct: item.aspect_ratio_mismatch_pct,
					scale_factor_used_x: item.scale_factor_w ? parseFloat(item.scale_factor_w) : undefined,
					scale_factor_used_y: item.scale_factor_h ? parseFloat(item.scale_factor_h) : undefined,
					scale_factor_uniform: item.scale_factor_w === item.scale_factor_h
				};

				entries.push(entry);
			}
		}
	}

	return {
		generated_at: new Date().toISOString(),
		total_placements_audited: entries.length,
		entries: entries.sort((a, b) => {
			if (a.object_name !== b.object_name) {
				return a.object_name.localeCompare(b.object_name);
			}
			return a.scene.localeCompare(b.scene);
		})
	};
}

// ============================================
// MAIN

async function main() {
	const { pattern, outDir, annotate, theme } = parseArgs();

	const repoRoot = path.resolve(__dirname, '../..');
	const fullPattern = path.isAbsolute(pattern) ? pattern : path.join(repoRoot, pattern);
	const htmlFiles = resolvePattern(fullPattern);

	if (htmlFiles.length === 0) {
		console.error(`No HTML files matching pattern: ${pattern}`);
		process.exit(1);
	}

	console.log(`Found ${htmlFiles.length} HTML file(s)`);

	// Ensure output directory exists
	if (!fs.existsSync(outDir)) {
		fs.mkdirSync(outDir, { recursive: true });
	}

	const sceneResults = [];

	for (const htmlFile of htmlFiles) {
		try {
			const result = await runPrecheck(htmlFile, theme, outDir);
			sceneResults.push(result);
		} catch (err) {
			console.error(`Error running precheck on ${htmlFile}:`, err.message);
		}
	}

	// Generate reports
	const jsonReport = {
		summary: {
			total_scenes: sceneResults.length,
			scenes_pass: sceneResults.filter(r => r.verdict === 'PASS').length,
			scenes_pass_template: sceneResults.filter(r => r.verdict === 'PASS_TEMPLATE').length,
			scenes_warn: sceneResults.filter(r => r.verdict === 'WARN').length,
			scenes_failed: sceneResults.filter(r => r.verdict === 'FAIL').length,
			checks_failed: sceneResults.reduce((sum, r) => {
				let count = 0;
				if (r.checks.clipped_artwork.length > 0) count++;
				if (r.checks.off_page.length > 0) count++;
				if (r.checks.svg_svg_overlap.length > 0) count++;
				if (r.checks.region_overflow.length > 0) count++;
				if ((r.checks.artwork_integrity?.clipped_by_parent || []).length > 0) count++;
				if ((r.checks.artwork_integrity?.aspect_distorted || []).some(i => i.severity === 'HARD_FAIL')) count++;
				return sum + count;
			}, 0)
		},
		scenes: sceneResults
	};

	const jsonPath = path.join(outDir, 'visual_audit.json');
	fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
	console.log(`\nSaved JSON report: ${jsonPath}`);

	const mdReport = generateMarkdownReport(sceneResults);
	const mdPath = path.join(outDir, 'visual_audit.md');
	fs.writeFileSync(mdPath, mdReport);
	console.log(`Saved Markdown report: ${mdPath}`);

	// Generate sizing manifest
	const manifest = generateSizingManifest(sceneResults, repoRoot);
	const manifestPath = path.join(outDir, 'sizing_manifest.json');
	fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
	console.log(`Saved sizing manifest: ${manifestPath}`);

	// Call annotation script
	console.log(`\nGenerating annotated PNGs...`);
	try {
		const annotateScript = path.join(repoRoot, '_temp_annotate.py');
		execSync(`source ${path.join(repoRoot, 'source_me.sh')} && python3 ${annotateScript}`, {
			stdio: 'inherit'
		});
	} catch (err) {
		console.error(`Warning: annotation script failed:`, err.message);
	}

	console.log(`\n=== Summary ===`);
	console.log(`Scenes processed: ${sceneResults.length}`);
	console.log(`PASS: ${sceneResults.filter(r => r.verdict === 'PASS').length}`);
	console.log(`PASS_TEMPLATE: ${sceneResults.filter(r => r.verdict === 'PASS_TEMPLATE').length}`);
	console.log(`WARN: ${sceneResults.filter(r => r.verdict === 'WARN').length}`);
	console.log(`FAIL: ${sceneResults.filter(r => r.verdict === 'FAIL').length}`);
}

main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
