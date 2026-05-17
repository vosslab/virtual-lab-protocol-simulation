/**
 * chrome/adjust_panel.ts
 *
 * Renders a numeric input (with optional slider) for adjust gesture binding.
 * Pilot 1 scope: set_volume (micropipette) and wavelength_nm (plate_reader) only.
 * Field union is CLOSED; passing any other field throws loudly.
 *
 * Uses textContent (NOT innerHTML) for safety. Commits via attachAdjustDispatchToElement
 * from dispatch/adjust.ts on blur / Enter / change.
 */

import { attachAdjustDispatchToElement } from '../dispatch/adjust';
import type { InteractionEvent } from '../types';

// ============================================
// Pilot 1 field union (CLOSED)

type PilotField = 'set_volume' | 'wavelength_nm';

// ============================================
// Options interface

interface AdjustPanelOptions {
	/** Field name: CLOSED to Pilot 1 set only */
	field: PilotField;
	/** Current value */
	current: number;
	/** Min/max/step range spec */
	range: {
		min: number;
		max: number;
		step?: number;
	};
	/** Fired on every commit (blur, Enter, slider release) */
	onCommit: (value: number) => void;
}

// ============================================
// Field metadata (locked to Pilot 1)

const FIELD_METADATA: Record<PilotField, { label: string; unit: string }> = {
	set_volume: {
		label: 'Pipette Volume',
		unit: 'uL',
	},
	wavelength_nm: {
		label: 'Wavelength',
		unit: 'nm',
	},
};

// ============================================
// Validation

/**
 * Validates that the field is a Pilot 1 closed-set member.
 * Throws if field is not in the closed set; no silent fallback.
 */
function validateFieldClosedSet(field: string): asserts field is PilotField {
	if (field !== 'set_volume' && field !== 'wavelength_nm') {
		throw new Error(
			`adjust_panel: field "${field}" is not a Pilot 1 binding. ` +
				`Closed set: ["set_volume", "wavelength_nm"]. ` +
				`New fields require plan approval.`,
		);
	}
}

// ============================================
// Render function

/**
 * Renders an adjust panel with numeric input + optional slider.
 * Wires the commit handler via attachAdjustDispatchToElement.
 *
 * @param container The HTMLElement to mount into.
 * @param options Configuration: field (Pilot 1 only), current, range, onCommit callback.
 * @throws if field is not in the Pilot 1 closed set.
 */
export function renderAdjustPanel(
	container: HTMLElement,
	options: AdjustPanelOptions,
): void {
	// Validate field is in Pilot 1 closed set; throw loudly if not.
	validateFieldClosedSet(options.field);

	const meta = FIELD_METADATA[options.field];
	const step = options.range.step || 1;
	const currentStr = options.current.toString();

	// Clear container
	container.innerHTML = '';

	// Set container attributes
	container.setAttribute('data-testid', 'adjust-panel');
	container.className = 'adjust-panel';

	// Create label
	const label = document.createElement('label');
	label.className = 'adjust-panel-label';
	label.textContent = `${meta.label} (${meta.unit})`;
	container.appendChild(label);

	// Create input row container
	const inputRow = document.createElement('div');
	inputRow.className = 'adjust-panel-input-row';

	// Create numeric input
	const input = document.createElement('input');
	input.type = 'number';
	input.setAttribute('data-testid', `adjust-input-${options.field}`);
	input.className = 'adjust-panel-input';
	input.min = options.range.min.toString();
	input.max = options.range.max.toString();
	input.step = step.toString();
	input.value = currentStr;

	inputRow.appendChild(input);

	// Create unit display
	const unitDisplay = document.createElement('span');
	unitDisplay.className = 'adjust-panel-unit';
	unitDisplay.textContent = meta.unit;
	inputRow.appendChild(unitDisplay);

	container.appendChild(inputRow);

	// Create slider row
	const sliderRow = document.createElement('div');
	sliderRow.className = 'adjust-panel-slider-row';

	// Create slider
	const slider = document.createElement('input');
	slider.type = 'range';
	slider.className = 'adjust-panel-slider';
	slider.min = options.range.min.toString();
	slider.max = options.range.max.toString();
	slider.step = step.toString();
	slider.value = currentStr;

	// Sync input <-> slider (bidirectional)
	const syncInputToSlider = (): void => {
		slider.value = input.value;
	};

	const syncSliderToInput = (): void => {
		input.value = slider.value;
	};

	input.addEventListener('change', syncInputToSlider);
	slider.addEventListener('input', syncSliderToInput);

	sliderRow.appendChild(slider);
	container.appendChild(sliderRow);

	// Attach dispatch handlers to the input element.
	// Commit fires on blur, Enter key, or change.
	// The callback receives the numeric value.
	attachAdjustDispatchToElement(
		input,
		'', // target id not needed for chrome panel; dispatch wires the actual target
		(event: InteractionEvent) => {
			// Extract the numeric value from the event
			const numValue = typeof event.value === 'number' ? event.value : 0;
			options.onCommit(numValue);
		},
	);
}
