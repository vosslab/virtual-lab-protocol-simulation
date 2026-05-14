// Click resolver for walker: converts YAML click targets to DOM elements.
// Implements selector strategy, visibility checks, and diagnostic error messages.

import type { Page, Locator } from 'playwright';

export interface ClickTarget {
	// YAML-declared field: 'tool', 'source', 'destination',
	// 'openClick', 'advanceClick', or 'choices[i].id'
	yamlField: string;
	value: string;  // value from YAML (e.g. 'ethanol_bottle', 'flask', 'choice_a_id')
}

export class ClickResolutionError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ClickResolutionError';
	}
}

//============================================
// Selector strategy
//============================================

// Selectors tried in order. First match that passes visibility wins.
function buildSelectors(value: string): string[] {
	const selectors = [
		`[data-item-id="${value}"]`,
		`[data-step-id="${value}"]`,
		`[data-choice-id="${value}"]`,
		`[data-well-id="${value}"]`,
		`#${value}`,
		`[data-test="${value}"]`,
	];
	return selectors;
}

//============================================
// Visibility check
//============================================

interface VisibilityInfo {
	isVisible: boolean;
	display: string;
	visibility: string;
	pointerEvents: string;
	width: number;
	height: number;
}

async function getVisibilityInfo(locator: Locator): Promise<VisibilityInfo> {
	// Use JS eval to check computed styles and dimensions.
	const info = await locator.evaluate((el: Element) => {
		const computed = window.getComputedStyle(el);
		const rect = el.getBoundingClientRect();
		return {
			display: computed.display,
			visibility: computed.visibility,
			pointerEvents: computed.pointerEvents,
			width: rect.width,
			height: rect.height,
		};
	});

	return {
		isVisible: info.width > 0 && info.height > 0
			&& info.display !== 'none'
			&& info.visibility !== 'hidden'
			&& info.pointerEvents !== 'none',
		display: info.display,
		visibility: info.visibility,
		pointerEvents: info.pointerEvents,
		width: info.width,
		height: info.height,
	};
}

//============================================
// DOM snippet for diagnostics
//============================================

async function getDomSnippet(locator: Locator): Promise<string> {
	// Extract the outer HTML for error diagnostics.
	const snippet = await locator.evaluate((el: Element) => {
		let html = el.outerHTML;
		// Truncate if very long.
		if (html.length > 150) {
			html = html.substring(0, 150) + '...';
		}
		return html;
	});
	return snippet;
}

//============================================
// Main resolver
//============================================

/**
 * Resolve a YAML click target to a DOM element and click it.
 *
 * Selector strategy (try in order):
 * 1. [data-item-id="${value}"]
 * 2. [data-step-id="${value}"]
 * 3. [data-choice-id="${value}"]
 * 4. #${value}
 * 5. [data-test="${value}"]
 *
 * Refuses to click if the resolved node is not actually visible:
 * - width and height > 0
 * - not display: none
 * - not visibility: hidden
 * - not pointer-events: none
 *
 * Throws ClickResolutionError with diagnostic info on failure.
 */
export async function resolveAndClick(page: Page, target: ClickTarget): Promise<void> {
	const selectors = buildSelectors(target.value);

	let bestMatch: Locator | undefined;
	let bestVisibility: VisibilityInfo | undefined;

	// For modal advanceClick, retry up to 20 times (2 seconds total with 100ms waits)
	// to allow the modal to render.
	const maxRetries = target.yamlField === 'advanceClick' ? 20 : 1;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		// Try each selector in order.
		for (const selector of selectors) {
			const locator = page.locator(selector);
			const count = await locator.count();

			// Skip if selector matched nothing.
			if (count === 0) {
				continue;
			}

			// Use first matching element (if multiple, take first).
			const firstElement = locator.first();
			const visibility = await getVisibilityInfo(firstElement);

			// Store best match even if invisible (for diagnostics).
			if (!bestMatch) {
				bestMatch = firstElement;
				bestVisibility = visibility;
			}

			// If visible, click and return immediately.
			if (visibility.isVisible) {
				console.log(`[click_resolver] Clicking target '${target.value}' (field '${target.yamlField}')`);
				await firstElement.click();
				return;
			}
		}

		// If advanceClick and not yet visible, wait and retry
		if (target.yamlField === 'advanceClick' && attempt < maxRetries - 1) {
			await page.waitForTimeout(100);
		}
	}

	// No visible element found. Build error message.
	let errorMsg = `Failed to resolve click target '${target.value}' (field '${target.yamlField}')`;

	if (bestMatch && bestVisibility) {
		const snippet = await getDomSnippet(bestMatch);
		errorMsg += `\nNearest element (not visible): ${snippet}`;
		errorMsg += `\n  display: ${bestVisibility.display}, visibility: ${bestVisibility.visibility}`;
		errorMsg += `\n  pointer-events: ${bestVisibility.pointerEvents}, size: ${bestVisibility.width}x${bestVisibility.height}`;
	} else {
		errorMsg += '\nNo matching selector found for any of: ' + selectors.join(', ');
	}

	throw new ClickResolutionError(errorMsg);
}
