//============================================
// plate.ts - Plate scene adapter (driver mode)
// Owns render for plate scene (96-well plate modal overlay)
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	gameState,
	registeredEmitters,
	renderGame,
	switchScene,
	triggerStep,
} from "../../game_state";

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// The YAML completionEvent strings ('tutorial-plate-opened', 'tutorial-plate-submitted')
// are a separate namespace.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
registeredEmitters.add('tutorial_plate_open');
registeredEmitters.add('tutorial_plate_action');

//============================================
// closePlateOverlay() - Cleanup and return to hood
//============================================
function closePlateOverlay(): void {
	const overlay = document.getElementById('plate-overlay');
	if (overlay) {
		overlay.classList.remove('active');
		const modalContent = overlay.querySelector('.modal-content') as HTMLElement;
		if (modalContent) modalContent.innerHTML = '';
	}
	switchScene('hood');
}

//============================================
// renderPlateIntroScreen - Intro modal screen
//============================================
function renderPlateIntroScreen(modal: HTMLElement): void {
	let html = '<button class="modal-close" aria-label="Close plate view">&times;</button>';
	html += '<h2>Open the 96-Well Plate Workspace</h2>';
	html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
	html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
	html += 'Drug additions are easier to see when the plate is the whole scene.';
	html += '</p>';
	html += '<p style="margin:0;font-size:13px;color:#757575;">';
	html += 'Click Confirm to continue.';
	html += '</p>';
	html += '</div>';
	html += '<button id="confirm-plate-intro" class="btn-primary" data-walker-advance="confirm-plate-intro" style="padding:10px 24px;">Confirm</button>';

	modal.innerHTML = html;

	const confirmBtn = document.getElementById('confirm-plate-intro');
	if (confirmBtn) {
		confirmBtn.addEventListener('click', () => {
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
			closePlateOverlay();
		});
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			closePlateOverlay();
		});
	}
}

//============================================
// renderPlateAddCarbRowBScreen - Carboplatin addition screen
//============================================
function renderPlateAddCarbRowBScreen(modal: HTMLElement): void {
	let html = '<button class="modal-close" aria-label="Close plate view">&times;</button>';
	html += '<h2>Add Carboplatin Working Stock to Row B</h2>';
	html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
	html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
	html += 'Use the multichannel pipette to add 5 uL of 400 nM Carboplatin working stock to row B, columns 1-12.';
	html += '</p>';
	html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">';
	html += 'This represents the lowest dose (10 nM final concentration in the well).';
	html += '</p>';
	html += '</div>';

	// Inline SVG showing row B highlighted
	html += '<div style="text-align:center;margin-bottom:16px;">';
	html += '<svg viewBox="0 0 620 80" width="400" height="60" style="border:1px solid #ccc;border-radius:4px;background:#fff;">';
	// Draw 12 circles representing row B wells (columns 1-12)
	html += '<text x="10" y="45" font-size="12" fill="#757575">Row B:</text>';
	for (let col = 0; col < 12; col++) {
		const cx = 60 + col * 45;
		const cy = 30;
		html += `<circle cx="${cx}" cy="${cy}" r="16" fill="#fff8b3" stroke="#f0ad4e" stroke-width="2" />`;
	}
	html += '</svg>';
	html += '</div>';

	html += '<button id="submit-plate-action" class="btn-primary" data-walker-advance="submit-plate-action" style="padding:10px 24px;">Submit</button>';

	modal.innerHTML = html;

	const submitBtn = document.getElementById('submit-plate-action');
	if (submitBtn) {
		submitBtn.addEventListener('click', () => {
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
			closePlateOverlay();
		});
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			closePlateOverlay();
		});
	}
}

//============================================
// renderPlateScene() - Main plate scene renderer
//
// Renders a modal overlay for plate scene steps. Routes to specific screen
// content via the active step's modal.screen field (schema-driven dispatch,
// SP-K2e).
//============================================
function renderPlateScene(): void {
	const overlay = document.getElementById('plate-overlay');
	if (!overlay) {
		console.error('[plate.ts] plate-overlay not found in DOM');
		return;
	}

	overlay.classList.add('active');

	const currentStep = getCurrentStep();
	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) {
		console.error('[plate.ts] modal-content not found in plate-overlay');
		return;
	}

	// Schema-driven dispatch on modal.screen
	if (currentStep && currentStep.modal?.screen === 'plate_intro') {
		renderPlateIntroScreen(modal);
		return;
	}
	if (currentStep && currentStep.modal?.screen === 'plate_add_carb_row_b') {
		renderPlateAddCarbRowBScreen(modal);
		return;
	}

	// Fallback: empty screen (should not reach here in normal flow)
	modal.innerHTML = '<p>Plate scene: no screen matched.</p>';
}

//============================================
// dispatchPlateInteraction - Per-protocol dispatch wiring for plate scene
// Routes plate interactions (modal completion paths) through game-state dispatch
//============================================

function dispatchPlateInteraction(itemId: string, ctx: SceneContext): void {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return;
	}

	// Plate steps use modal completion paths
	if (activeStep.completionPath?.kind === 'modal') {
		const completionPath = activeStep.completionPath;

		// The openClick triggers the modal display (already handled by modal UI)
		// The advanceClick triggers the step completion
		if (itemId === completionPath.advanceClick) {
			triggerStep(activeStep.id);
			renderGame();
		}
	}
}

function renderPlate(ctx: SceneContext): void {
	renderPlateScene();
}

const plateSceneAdapter = {
	sceneId: 'plate',
	dispatchInteraction: dispatchPlateInteraction,
	render: renderPlate,
};

//============================================
// registerScene at module load
//============================================

registerScene(plateSceneAdapter);
