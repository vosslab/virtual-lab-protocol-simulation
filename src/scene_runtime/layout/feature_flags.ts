/**
 * src/scene_runtime/layout/feature_flags.ts
 *
 * Feature flags for the layout module.
 *
 * NEW1 well_plate_96_zoom spike: CSS-native adapter compatibility path.
 * Default false. Override is test-only and must be cleared after each test.
 *
 * Spike-only API. Must be removed or replaced before NEW1 promotion.
 * See docs/active_plans/new1_well_plate_96_zoom_spike_implementation_packet.md.
 */

// Compile-time default. Hard-coded false.
const CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE_DEFAULT = false;

// Test-only runtime override. null = no override; boolean = explicit value.
// Set via set_css_native_well_plate_zoom_spike_enabled_for_test(). Cleared
// by calling the setter with null.
let css_native_well_plate_zoom_spike_override: boolean | null = null;

// Spike-only invocation counter for Playwright tests.
// Incremented each time compute_scene_layout_css_native is called.
let css_native_invocation_count = 0;

export function is_css_native_well_plate_zoom_spike_enabled(): boolean {
	if (css_native_well_plate_zoom_spike_override !== null) {
		return css_native_well_plate_zoom_spike_override;
	}
	return CSS_NATIVE_WELL_PLATE_ZOOM_SPIKE_DEFAULT;
}

export function set_css_native_well_plate_zoom_spike_enabled_for_test(
	value: boolean | null,
): void {
	css_native_well_plate_zoom_spike_override = value;
}

export function increment_css_native_invocation_count(): void {
	css_native_invocation_count++;
}

export function get_css_native_invocation_count(): number {
	return css_native_invocation_count;
}

export function reset_css_native_invocation_count(): void {
	css_native_invocation_count = 0;
}
