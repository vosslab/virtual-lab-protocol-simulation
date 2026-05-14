//============================================
// incubator.ts - Incubator scene adapter (driver mode)
// Render ownership: moved from src/scenes/incubator.ts in Patch A4
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import type { ProtocolStep } from "../../constants";
import {
	gameState,
	registeredEmitters,
	showNotification,
	switchScene,
	triggerStep,
} from "../../game_state";
import { isIncubationStep, getIncubationSteps } from "../../step_dispatch";
import { applyIncubation } from "../../cell_model";
import { renderEquipmentSvg } from "../../svg_assets";
import { renderProtocolPanel, renderScoreDisplay } from "../../ui_rendering";
import { renderHoodScene } from "../cell_culture_hood/render";

//============================================
// Module-scope lock for incubation animation.
// Prevents stacked overlay animations during renderGame() calls.
//============================================
let incubationInProgress: boolean = false;

//============================================
// Generic incubation timer that drives the overlay progress bar
//============================================
function runIncubationOverlay(
	simulatedMinutes: number,
	animationMs: number,
	label: string,
	onComplete: () => void,
): void {
	if (incubationInProgress) return;
	const overlay = document.getElementById('incubator-screen');
	if (!overlay) return;
	incubationInProgress = true;

	// Update the heading text
	const heading = overlay.querySelector('h2');
	if (heading) heading.textContent = label;

	// Update the status label
	const statusP = overlay.querySelector('.incubation-timer p');
	if (statusP) statusP.textContent = label + '...';

	// Inject incubator SVG into the view area
	const incubatorView = overlay.querySelector('.incubator-view');
	if (incubatorView) {
		incubatorView.innerHTML = renderEquipmentSvg({ assetId: 'incubator' });
	}

	overlay.classList.add('active');

	const progressFill = document.querySelector('#incubator-screen .progress-fill') as HTMLElement;
	const timerText = document.getElementById('timer-text');
	if (!progressFill || !timerText) return;

	// Reset progress bar
	progressFill.style.width = '0%';

	const startTime = Date.now();
	// Format time remaining based on scale
	const useHours = simulatedMinutes >= 60;

	const interval = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min(elapsed / animationMs, 1);
		const remaining = simulatedMinutes * (1 - progress);

		progressFill.style.width = (progress * 100) + '%';
		if (useHours) {
			timerText.textContent = 'Time remaining: ' + Math.round(remaining / 60) + 'h';
		} else {
			timerText.textContent = 'Time remaining: ' + Math.ceil(remaining) + ' min';
		}

		if (progress >= 1) {
			clearInterval(interval);
			timerText.textContent = 'Complete!';
			setTimeout(() => {
				overlay.classList.remove('active');
				try {
					onComplete();
				} finally {
					incubationInProgress = false;
				}
			}, 1000);
		}
	}, 50);
}

//============================================
// Trypsin incubation: 5 min simulated over 3 seconds
//============================================
export function renderTrypsinIncubation(): void {
	runIncubationOverlay(5, 3000, 'Trypsin Incubation', () => {
		gameState.trypsinIncubated = true;
		showNotification('Cells detached! Neutralize trypsin with fresh media.', 'success');
		renderHoodScene();
		renderProtocolPanel();
		renderScoreDisplay();
	});
}

//============================================
// Plate incubation: 24h simulated over 4 seconds
//============================================
function renderIncubatorScene(): void {
	runIncubationOverlay(1440, 4000, 'Incubator', () => {
		applyIncubation();
		gameState.incubated = true;
		const active = gameState.activeStepId;
		if (active && isIncubationStep(active)) {
			triggerStep(active);
		} else {
			const candidates = getIncubationSteps().map((step: ProtocolStep) => step.id);
			for (const cand of candidates) {
				if (!gameState.completedSteps.includes(cand)) {
					triggerStep(cand);
					break;
				}
			}
		}
		switchScene('cell_culture_hood');
	});
}

//============================================
// dispatchIncubatorInteraction - Incubator scene dispatch
// Routes incubator interactions through game-state dispatch.
// Incubator is overlay-only; no clickable items trigger interactions.
//============================================

function dispatchIncubatorInteraction(itemId: string, ctx: SceneContext): void {
	// Incubator is a passive modal overlay; no click-driven interactions.
}

function renderIncubator(ctx: SceneContext): void {
	renderIncubatorScene();
}

const incubatorSceneAdapter = {
	sceneId: 'incubator',
	dispatchInteraction: dispatchIncubatorInteraction,
	render: renderIncubator,
};

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
registeredEmitters.add('incubate_day1');
registeredEmitters.add('incubate_48h');
registeredEmitters.add('incubate_mtt');

//============================================
// registerScene at module load
//============================================

registerScene(incubatorSceneAdapter);
