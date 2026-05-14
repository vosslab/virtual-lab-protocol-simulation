//============================================
// plate_reader.ts - Plate reader scene adapter (driver mode)
// Owns render for plate_reader scene (MTT assay results modal)
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import {
	getCurrentStep,
	gameState,
	getWell,
	registeredEmitters,
	switchScene,
	triggerStep,
} from "../../game_state";
import { runMttReadout } from "../../steps/mtt_readout";
import { COL_LABELS, PLATE_96_COLS, PLATE_96_ROWS, ROW_LABELS } from "../../steps/plate_96";

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
// Register the plate_read emitter at module load
registeredEmitters.add('plate_read');

//============================================
// renderPlateReaderScene() - Plate reader modal renderer
//
// Displays the plate reader results modal with MTT assay absorbance data.
// Shows a table of well values with row means comparison.
//============================================
function renderPlateReaderScene(): void {
	const overlay = document.getElementById('instrument-overlay');
	if (!overlay) return;

	overlay.classList.add('active');
	runMttReadout();

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	let html = '<button class="modal-close" data-walker-advance="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Plate Reader Results (MTT Assay - 560 nm)</h2>';
	html += '<div class="microscope-view" style="flex-direction:column;min-height:auto;padding:16px;overflow-y:auto;">';

	// Split header with column group labels
	html += '<div style="margin-bottom:12px;">';
	html += '<div style="display:flex;font-size:12px;font-weight:600;color:#333;margin-bottom:4px;">';
	html += '<div style="flex:0 0 40px;"></div>';
	html += '<div style="flex:1;text-align:center;padding:4px;">Carboplatin only (1-6)</div>';
	html += '<div style="flex:1;text-align:center;padding:4px;">+ Metformin 5 mM (7-12)</div>';
	html += '</div>';

	// 8x12 well plate grid with headers
	html += '<table style="border-collapse:collapse;width:100%;font-size:12px;margin-bottom:16px;">';

	// Sub-header row: column numbers 1-12
	html += '<tr>';
	html += '<td style="padding:4px;text-align:center;font-weight:600;width:40px;"></td>';
	for (let col = 0; col < PLATE_96_COLS; col++) {
		html += '<td style="padding:4px;text-align:center;font-weight:600;border-bottom:1px solid #ccc;">' + COL_LABELS[col] + '</td>';
	}
	html += '</tr>';

	// Data rows: A-H, with colors based on absorbance (viability)
	for (let row = 0; row < PLATE_96_ROWS; row++) {
		html += '<tr>';
		html += '<td style="padding:4px;text-align:center;font-weight:600;width:40px;background:#f5f5f5;">' + ROW_LABELS[row] + '</td>';
		for (let col = 0; col < PLATE_96_COLS; col++) {
			const well = getWell(row, col);
			const absorbance = well.absorbance;
			// Color scale: lighter = higher viability/absorbance
			const viability = Math.max(0, Math.min(1, absorbance / 1.2));
			const bgR = Math.round(255 - viability * 80);
			const bgG = Math.round(255 - viability * 30);
			const bgB = Math.round(255 - viability * 100);
			html += '<td style="padding:4px;text-align:center;border:1px solid #ddd;background:rgb(' + bgR + ',' + bgG + ',' + bgB + ');">';
			html += absorbance.toFixed(3);
			html += '</td>';
		}
		html += '</tr>';
	}
	html += '</table>';
	html += '</div>';

	// Row means: left columns (1-6) vs right columns (7-12)
	html += '<div style="margin-bottom:16px;">';
	html += '<h3 style="font-size:13px;font-weight:600;margin:0 0 8px 0;">Row Means</h3>';
	html += '<table style="border-collapse:collapse;font-size:12px;width:400px;">';
	html += '<tr>';
	html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;width:30px;">Row</td>';
	html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;">Carb-only mean (1-6)</td>';
	html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;">+Metformin mean (7-12)</td>';
	html += '</tr>';

	for (let row = 0; row < PLATE_96_ROWS; row++) {
		// Carboplatin only: columns 0-5
		let carbSum = 0;
		for (let col = 0; col < 6; col++) {
			carbSum += getWell(row, col).absorbance;
		}
		const carbMean = carbSum / 6;

		// Metformin: columns 6-11
		let metSum = 0;
		for (let col = 6; col < 12; col++) {
			metSum += getWell(row, col).absorbance;
		}
		const metMean = metSum / 6;

		html += '<tr>';
		html += '<td style="padding:6px;border:1px solid #ddd;font-weight:600;background:#f5f5f5;">' + ROW_LABELS[row] + '</td>';
		html += '<td style="padding:6px;border:1px solid #ddd;text-align:center;">' + carbMean.toFixed(3) + '</td>';
		html += '<td style="padding:6px;border:1px solid #ddd;text-align:center;">' + metMean.toFixed(3) + '</td>';
		html += '</tr>';
	}
	html += '</table>';
	html += '</div>';

	html += '<div style="text-align:center;margin-top:16px;">';
	html += '<button id="complete-plate-read" class="btn-primary" data-walker-advance="complete-plate-read" style="padding:10px 24px;">Complete Experiment</button>';
	html += '</div>';

	modal.innerHTML = html;

	const completeBtn = document.getElementById('complete-plate-read');
	if (completeBtn) {
		completeBtn.addEventListener('click', () => {
			// Check if the current step's advanceClick is "complete-plate-read"
			const currentStep = getCurrentStep();
			if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'modal' && currentStep.completionPath.advanceClick === 'complete-plate-read') {
				if (gameState.activeStepId) {
					triggerStep(gameState.activeStepId);
				}
			}
			// Note: "results" is fired separately by the close button so
			// the student has an explicit "I reviewed the results"
			// gesture. See the close-button handler below.
		});
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			// Closing the plate-reader overlay should trigger the active step
			// if its completionPath.advanceClick is "modal-close"
			const currentStep = getCurrentStep();
			if (currentStep && currentStep.completionPath && currentStep.completionPath.kind === 'modal' && currentStep.completionPath.advanceClick === 'modal-close') {
				if (gameState.activeStepId) {
					triggerStep(gameState.activeStepId);
				}
			}
			overlay.classList.remove('active');
			switchScene('cell_culture_hood');
		});
	}
}

//============================================
// dispatchPlateReaderInteraction - Per-protocol dispatch wiring for plate_reader scene
// Plate reader has no item-driven interactions; modal click handlers are wired inside render
//============================================
function dispatchPlateReaderInteraction(itemId: string, ctx: SceneContext): void {
	// Plate reader is a render-only modal scene with no item-zone interactions.
	// All interactions are wired directly in renderPlateReaderScene via button event handlers.
	// This method is a no-op.
}

function renderPlateReader(ctx: SceneContext): void {
	renderPlateReaderScene();
}

const plateReaderSceneAdapter = {
	sceneId: 'plate_reader',
	dispatchInteraction: dispatchPlateReaderInteraction,
	render: renderPlateReader,
};

//============================================
// registerScene at module load
//============================================

registerScene(plateReaderSceneAdapter);
