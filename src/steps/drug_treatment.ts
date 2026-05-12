// ============================================
// drug_treatment.ts - Step-aware drug and dilution prep modal
// ============================================
// One modal, one protocol step at a time. startDrugAddition() opens
// #instrument-overlay and renders the screen for whatever step is
// active (carb_intermediate .. add_metformin). Each screen has a
// single advance interaction that fires triggerStep(activeStepId)
// for exactly that one step. After the completion trigger fires, the modal rerenders:
// if the new active step is still modal-owned it shows the next
// screen; otherwise it closes and returns to the hood.
//
// This replaces the old cascade where selectDilutionSeries() fired
// four or six triggers in a single click. That collapse was the
// source of the walkthrough's (auto) labels and prevented the
// explicit-transition state machine from tracking dilution mistakes
// per step.

// NOTE: carb_low_range has been migrated to interactionSequence (SP-K2f).
// It is no longer modal-owned. The dilution-choice screen and
// DILUTION_OPTIONS are deprecated and will be removed in a future cleanup.
//
// Legacy comment: The low-range working stocks for rows B-F were where the
// "pick a dilution scheme" decision actually mattered (intermediate -> 5
// working stocks spanning three orders of magnitude). The physical interaction
// sequence now encodes all dilution steps explicitly.
import type { ProtocolStep } from "../constants";
import { gameState, registerWarning, registeredEmitters, showNotification, triggerStep } from "../game_state";
import { renderHoodScene } from "../scenes/cell_culture_hood/render";
import { getModalOwnedSteps } from "../step_dispatch";
import { renderProtocolPanel, renderScoreDisplay } from "../ui_rendering";
import { applyPlateDoseMap } from "./plate_96";

// Per-step screen content. Keyed by protocol step id. Each entry
// describes the modal body for that one step. The dispatcher reads
// the active step id from gameState and looks up the matching entry.
export type DrugModalScreen = {
	title: string;
	recipe: string;
	buttonLabel: string;
	successMessage: string;
};

export const DRUG_MODAL_SCREENS: Record<string, DrugModalScreen> = {
	carb_intermediate: {
		title: 'Carboplatin 400 µM Parent Stock',
		recipe: 'Mix 40 &micro;L 10 mM carboplatin with 960 &micro;L sterile water. '
			+ 'This 400 &micro;M parent stock is the source for the low-range working stocks.',
		buttonLabel: 'Prepare intermediate stock',
		successMessage: 'Carboplatin parent stock prepared (400 µM).',
	},
	metformin_stock: {
		title: 'Metformin 10 mM Working Stock',
		recipe: 'Mix 10 &micro;L 1 M metformin with 990 &micro;L sterile water. '
			+ 'Fresh metformin working stock is prepared on the day of treatment.',
		buttonLabel: 'Prepare metformin stock',
		successMessage: 'Metformin working stock prepared (10 mM).',
	},
	add_carboplatin: {
		title: 'Add Carboplatin to Plate',
		recipe: 'Add 5 &micro;L carboplatin working stock per well across rows B-H. '
			+ 'Row A stays drug-free as a vehicle control. The 8-point dose series '
			+ 'lets you compute an IC50 curve.',
		buttonLabel: 'Add carboplatin (rows B-H)',
		successMessage: 'Carboplatin added to rows B-H.',
	},
	add_metformin: {
		title: 'Add Metformin to Columns 7-12',
		recipe: 'Add 5 &micro;L metformin working stock to columns 7-12 only. '
			+ 'Columns 1-6 stay carboplatin-only. Metformin sensitizes cells so '
			+ 'the +metformin curve shifts left.',
		buttonLabel: 'Add metformin (cols 7-12)',
		successMessage: 'Metformin added to columns 7-12.',
	},
};

// ============================================
// Pre-register every step id that this module may advance. One
// registration per step because each step now has its own advance
// handler; validateCompletionEventCoverage (the completion-event coverage check)
// runs at the `load` event before any user click and needs these visible
// at module load time.

// Pre-register every step id that this module will advance
// NOTE: carb_intermediate is still registered here but it has migrated to interactionSequence.
// Emitter registration for migrated steps (carb_high_range, metformin_stock, add_carboplatin, add_metformin)
// has been moved to their completionEvent handlers in hood.ts dispatchInteractionClick.
registeredEmitters.add('carb_intermediate');

// Steps owned by this modal, in protocol order. Derived from PROTOCOL_STEPS
// with modal.owner === 'drug_treatment'. Used by rerender to decide whether
// to stay open or close.
export const MODAL_OWNED_STEPS: string[] = getModalOwnedSteps('drug_treatment')
	.map((step: ProtocolStep) => step.id);

// ============================================
// Public entry point. Called from the hood click chain
// (multichannel_pipette + drug_vials + well_plate). Renders the
// modal screen for whatever step is currently active.
export function startDrugAddition(): void {
	const overlay = document.getElementById('instrument-overlay');
	if (!overlay) return;
	overlay.classList.add('active');

	renderDrugModalStep();
}

// ============================================
// Render whichever screen matches the active step. If the active
// step is not one of the six modal-owned steps, close the overlay.
export function renderDrugModalStep(): void {
	const overlay = document.getElementById('instrument-overlay');
	if (!overlay) return;

	const active = gameState.activeStepId;
	if (!active || MODAL_OWNED_STEPS.indexOf(active) < 0) {
		// The active step has moved off the modal-owned block (for
		// example metformin_stock -> prewarm_media, or add_metformin
		// -> incubate_48h). Close the modal and return to the hood.
		overlay.classList.remove('active');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
		return;
	}

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	// All modal-owned steps share the single-button layout.
	// carb_low_range is no longer modal-owned (migrated to interactionSequence).
	renderSingleButtonScreen(modal, active);

	// Close button always attached (student may abort mid-modal).
	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('active');
		});
	}
}

// ============================================
// Single-button screen used by every modal-owned step except
// carb_low_range. Reads the screen text from DRUG_MODAL_SCREENS,
// renders one primary advance button, and wires the button to
// advanceDrugModalStep().
export function renderSingleButtonScreen(modal: HTMLElement, stepId: string): void {
	const screen = DRUG_MODAL_SCREENS[stepId];
	if (!screen) return;

	let html = '<button class="modal-close" data-walker-advance="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>' + screen.title + '</h2>';
	html += '<div style="padding:0 8px 16px 8px;">';
	html += '<p style="font-size:14px;color:#212121;margin:0 0 20px 0;line-height:1.5;">';
	html += screen.recipe;
	html += '</p>';
	html += '<button class="drug-modal-advance btn-primary" data-walker-advance="drug-modal-advance" ';
	html += 'style="padding:12px 24px;font-size:15px;font-weight:600;">';
	html += screen.buttonLabel;
	html += '</button>';
	html += '</div>';
	modal.innerHTML = html;

	const advanceBtn = modal.querySelector('.drug-modal-advance') as HTMLElement;
	if (advanceBtn) {
		advanceBtn.addEventListener('click', () => {
			showNotification(screen.successMessage, 'success');
			advanceDrugModalStep(stepId);
		});
	}
}

// ============================================
// Fire the completion trigger for exactly one step, apply any per-step
// side effects, then rerender the modal so it either shows the next
// screen or closes.
export function advanceDrugModalStep(stepId: string): void {
	if (stepId === 'add_carboplatin') {
		// Apply the per-row dose map (carb conc by row A..H, metformin
		// on cols 7..12). This is the moment the plate receives its
		// real dose response; scoring and MTT readout depend on it.
		applyPlateDoseMap();
		gameState.drugsAdded = true;
	}

	// Emit completion event
	triggerStep(stepId);

	renderDrugModalStep();
}
