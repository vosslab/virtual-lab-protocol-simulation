/**
 * highlight/index.ts
 *
 * Interaction target highlighting for the scene runtime.
 * Shows a visible highlight overlay on the current interaction target.
 *
 * Single highlight at a time: adding a new highlight clears the previous one.
 * Passing null removes any existing highlight.
 */

// CSS class for highlighted elements
const HIGHLIGHT_CLASS = 'scene-runtime-highlight';

// Highlight style (injected once)
let highlightStyleInjected = false;

/**
 * Injects the highlight CSS style once into the document.
 */
function injectHighlightStyle(): void {
	if (highlightStyleInjected) {
		return;
	}

	const style = document.createElement('style');
	style.textContent = `
		.${HIGHLIGHT_CLASS} {
			box-shadow: 0 0 8px 2px rgba(255, 193, 7, 0.8) !important;
			outline: 2px solid #ffc107 !important;
			outline-offset: 2px !important;
		}
	`;
	document.head.appendChild(style);
	highlightStyleInjected = true;
}

/**
 * Renders a highlight overlay on the target matching [data-target-id="<targetId>"].
 *
 * @param container - Root container to search within (e.g., document.body or a scene viewport)
 * @param targetId - The target ID to highlight. If null, clears any existing highlight.
 *
 * Removes the previous highlight before applying the new one (single highlight at a time).
 */
export function renderHighlight(
	container: HTMLElement | SVGElement,
	targetId: string | null,
): void {
	// Ensure highlight style is injected
	injectHighlightStyle();

	// Clear any existing highlight
	const previousHighlights = container.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
	previousHighlights.forEach((el) => {
		el.classList.remove(HIGHLIGHT_CLASS);
	});

	// If targetId is null, stop here (highlight cleared)
	if (targetId === null) {
		return;
	}

	// Find the element matching [data-target-id="<targetId>"]
	const selector = `[data-target-id="${CSS.escape(targetId)}"]`;
	const targetElement = container.querySelector(selector);

	if (targetElement && targetElement instanceof HTMLElement) {
		targetElement.classList.add(HIGHLIGHT_CLASS);
	}
	// If target not found, silently do nothing (may be a valid async case)
}
