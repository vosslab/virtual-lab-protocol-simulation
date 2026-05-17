/**
 * adjust.ts
 *
 * Continuous set-point gesture dispatcher for the realigned scene runtime.
 * Resolves semantic target ids from adjust input elements (sliders, numeric inputs, etc.)
 * and emits one InteractionEvent per discrete commit (blur, Enter key, or slider release).
 * Not per-drag-tick; commits are coarse-grained to avoid cascading updates.
 *
 * No imports from src/scenes/ or legacy src/*.ts. No runtime code outside this module;
 * exported functions only.
 */

import type { InteractionEvent } from '../types';

// ============================================
// Adjust commit interface

/**
 * Represents one discrete adjust gesture commit from a UI control.
 * The value is stored as the control produces it; no normalization in this layer.
 */
export interface AdjustCommit {
	/** Semantic target id (object being adjusted). */
	targetId: string;
	/** The adjusted value (number for slider/numeric input, boolean for toggle, string for select). */
	value: number | string | boolean;
	/** Optional: name of the state field being adjusted (e.g., "set_volume"). */
	field?: string;
}

// ============================================
// Dispatch function

/**
 * Dispatches a single adjust commit into an InteractionEvent.
 * Called by chrome panels or input handlers after a commit (blur, Enter, release).
 *
 * @param commit - the AdjustCommit containing targetId and value.
 * @param onEvent - callback fired with the emitted InteractionEvent.
 */
export function dispatchAdjustCommit(
	commit: AdjustCommit,
	onEvent: (e: InteractionEvent) => void,
): void {
	// Emit one InteractionEvent with adjust gesture and the value attached.
	onEvent({
		targetId: commit.targetId,
		gesture: 'adjust',
		value: commit.value,
	});
}

// ============================================
// Attach helper for existing input elements

/**
 * Attaches adjust gesture listeners to an existing input element.
 * Wires blur, Enter key, and change events to emit one commit per discrete user action.
 * Does NOT create the input element or chrome UI; caller provides the element.
 *
 * Commit triggers:
 * - blur: fires when focus leaves the element.
 * - Enter key: fires when user presses Enter while focused.
 * - change: fires on slider / select release or confirmed input change.
 *
 * Per-drag-tick events are suppressed; only final commits fire.
 *
 * @param element - the <input> or <select> element to monitor.
 * @param targetId - the semantic target id (stored in commit).
 * @param onEvent - callback fired with each InteractionEvent.
 * @returns a detach function that removes all listeners from the element.
 */
export function attachAdjustDispatchToElement(
	element: HTMLElement,
	targetId: string,
	onEvent: (e: InteractionEvent) => void,
): () => void {
	// Resolve the input element; for inputs it is the element itself, for containers it
	// may be a child. For now assume element is the input.
	const input = element as HTMLInputElement;

	// Handler for blur event.
	const handleBlur = (): void => {
		const value = getInputValue(input);
		if (value !== undefined) {
			dispatchAdjustCommit({ targetId, value }, onEvent);
		}
	};

	// Handler for keydown event (capture Enter key).
	const handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key === 'Enter') {
			const value = getInputValue(input);
			if (value !== undefined) {
				dispatchAdjustCommit({ targetId, value }, onEvent);
			}
		}
	};

	// Handler for change event (slider release, select change, etc.).
	const handleChange = (): void => {
		const value = getInputValue(input);
		if (value !== undefined) {
			dispatchAdjustCommit({ targetId, value }, onEvent);
		}
	};

	// Attach all three listeners.
	input.addEventListener('blur', handleBlur);
	input.addEventListener('keydown', handleKeyDown);
	input.addEventListener('change', handleChange);

	// Return detach function.
	return (): void => {
		input.removeEventListener('blur', handleBlur);
		input.removeEventListener('keydown', handleKeyDown);
		input.removeEventListener('change', handleChange);
	};
}

// ============================================
// Helper: extract and normalize input value

/**
 * Extracts the current value from an input element.
 * Returns undefined if the element has no value or the value is empty.
 *
 * @param input - the input element to read.
 * @returns the normalized value, or undefined if empty.
 */
function getInputValue(input: HTMLInputElement): number | string | boolean | undefined {
	// For type="checkbox" or type="radio", use checked state as boolean.
	// Check this first since checkboxes have empty .value by default.
	if (input.type === 'checkbox' || input.type === 'radio') {
		return input.checked;
	}

	const rawValue = input.value;

	// Empty value is treated as undefined (no commit).
	if (rawValue === undefined || rawValue === null || rawValue === '') {
		return undefined;
	}

	// For type="number", try to coerce to number.
	if (input.type === 'number' || input.type === 'range') {
		const numValue = parseFloat(rawValue);
		if (!isNaN(numValue)) {
			return numValue;
		}
	}

	// Otherwise return the string value as-is.
	return rawValue;
}
