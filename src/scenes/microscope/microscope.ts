//============================================
// microscope.ts - Microscope scene adapter (driver mode)
// Render ownership: moved from src/scenes/microscope.ts in Patch A6a
// Handles AUTOMATED cell-counter path (Patch 11).
// Handles MANUAL hemocytometer path (Patch 16).
//============================================

import type { SceneContext } from "../scene_driver";
import { registerScene } from "../scene_registry";
import type { CellState } from "../../constants";
import {
	getCurrentStep,
	renderGame,
	registeredEmitters,
	showNotification,
	switchScene,
	triggerStep,
	gameState,
} from "../../game_state";
import { getCellState } from "../../cell_model";
import {
	dispatchManualHemocytometerInteraction,
	renderManualHemocytometerViabilityScreen,
	renderManualHemocytometerCountingScreen,
} from "./manual_hemocytometer";

//============================================
// MODULE-LOAD SIDE EFFECTS - DO NOT MOVE OR REMOVE
// These registrations fire only when this module is imported (directly or transitively)
// from src/init.ts. If a future change removes or re-routes that import, these emitters
// silently stop firing -- the validator passes at build time and the walker fails at runtime.
// See docs/archive/scene_render_migration_2026-05-09.md "Module-load side effects are ownership too".
//============================================
// Register microscope-related emitters at module load
//============================================
registeredEmitters.add('count_cells');
registeredEmitters.add('hemocytometer-viability-confirmed');
registeredEmitters.add('hemocytometer-count-submitted');

//============================================
// Helper: descriptive health band message based on viability and confluency
// Exported for use by manual_hemocytometer.ts
//============================================
export function getHealthBandMessage(viability: number, confluency: number): string {
	let healthDesc = "stable";
	if (viability >= 0.88) healthDesc = "thriving";
	else if (viability < 0.70) healthDesc = "stressed";

	let confDesc = "moderate";
	if (confluency >= 0.75) confDesc = "dense";
	else if (confluency <= 0.55) confDesc = "light";

	if (healthDesc === "thriving") {
		return "Cells look bright, spread well, and are ready for counting. "
			+ "Confluency appears " + confDesc + ".";
	} else if (healthDesc === "stressed") {
		return "Cells look stressed -- some appear rounded or detached. "
			+ "Review the order of operations. Confluency appears " + confDesc + ".";
	}
	return "Cells look calm and attached. Confluency appears " + confDesc + ".";
}

//============================================
// Draw hemocytometer grid
// Exported for use by manual_hemocytometer.ts
//============================================
export function drawHemocytometerGrid(svg: SVGElement): void {
	const ns = 'http://www.w3.org/2000/svg';
	const w = 400;
	const h = 400;

	const bg = document.createElementNS(ns, 'rect');
	bg.setAttribute('width', String(w));
	bg.setAttribute('height', String(h));
	bg.setAttribute('fill', '#fafafa');
	svg.appendChild(bg);

	const corners = [
		{ x: 0, y: 0 }, { x: 300, y: 0 },
		{ x: 0, y: 300 }, { x: 300, y: 300 },
	];
	corners.forEach((c) => {
		const rect = document.createElementNS(ns, 'rect');
		rect.setAttribute('x', String(c.x));
		rect.setAttribute('y', String(c.y));
		rect.setAttribute('width', '100');
		rect.setAttribute('height', '100');
		rect.setAttribute('fill', '#e8f5e9');
		rect.setAttribute('fill-opacity', '0.4');
		rect.setAttribute('stroke', '#4caf50');
		rect.setAttribute('stroke-width', '2');
		rect.setAttribute('rx', '3');
		svg.appendChild(rect);
	});

	for (let i = 0; i <= 4; i++) {
		const vLine = document.createElementNS(ns, 'line');
		vLine.setAttribute('x1', String(i * 100));
		vLine.setAttribute('y1', '0');
		vLine.setAttribute('x2', String(i * 100));
		vLine.setAttribute('y2', String(h));
		vLine.setAttribute('stroke', '#999');
		vLine.setAttribute('stroke-width', i === 0 || i === 4 ? '2' : '1');
		svg.appendChild(vLine);

		const hLine = document.createElementNS(ns, 'line');
		hLine.setAttribute('x1', '0');
		hLine.setAttribute('y1', String(i * 100));
		hLine.setAttribute('x2', String(w));
		hLine.setAttribute('y2', String(i * 100));
		hLine.setAttribute('stroke', '#999');
		hLine.setAttribute('stroke-width', i === 0 || i === 4 ? '2' : '1');
		svg.appendChild(hLine);
	}

	for (let i = 0; i < 16; i++) {
		if (i % 4 === 0) continue;
		const vLine = document.createElementNS(ns, 'line');
		vLine.setAttribute('x1', String(i * 25));
		vLine.setAttribute('y1', '0');
		vLine.setAttribute('x2', String(i * 25));
		vLine.setAttribute('y2', String(h));
		vLine.setAttribute('stroke', '#ddd');
		vLine.setAttribute('stroke-width', '0.5');
		svg.appendChild(vLine);
	}
	for (let i = 0; i < 16; i++) {
		if (i % 4 === 0) continue;
		const hLine = document.createElementNS(ns, 'line');
		hLine.setAttribute('x1', '0');
		hLine.setAttribute('y1', String(i * 25));
		hLine.setAttribute('x2', String(w));
		hLine.setAttribute('y2', String(i * 25));
		hLine.setAttribute('stroke', '#ddd');
		hLine.setAttribute('stroke-width', '0.5');
		svg.appendChild(hLine);
	}

	const label = document.createElementNS(ns, 'text');
	label.setAttribute('x', '200');
	label.setAttribute('y', '418');
	label.setAttribute('text-anchor', 'middle');
	label.setAttribute('font-size', '10');
	label.setAttribute('fill', '#999');
	label.textContent = 'Count cells in highlighted corner squares';
	svg.appendChild(label);
}

//============================================
// Draw cells on grid
// Exported for use by manual_hemocytometer.ts
//============================================
export function drawCellsOnGrid(cellState: CellState): void {
	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (!svg) return;

	cellState.positions.forEach((pos) => {
		const circle = document.createElementNS(ns, 'circle');
		circle.setAttribute('cx', String(pos.x * 400));
		circle.setAttribute('cy', String(pos.y * 400));
		circle.setAttribute('r', String(pos.radius * 400));
		if (pos.alive) {
			circle.setAttribute('fill', 'rgba(220,220,210,0.7)');
			circle.setAttribute('stroke', '#888');
			circle.setAttribute('stroke-width', '0.8');
		} else {
			circle.setAttribute('fill', 'rgba(30,70,180,0.8)');
			circle.setAttribute('stroke', '#1a3a80');
			circle.setAttribute('stroke-width', '1.0');
		}
		svg.appendChild(circle);
	});
}

//============================================
// Capture cell count
//============================================
function captureCellCount(): void {
	gameState.cellCount = gameState.actualCellCount;
	const cellState = getCellState();
	const viabilityPct = Math.round(cellState.viability * 100);
	showNotification('Captured: ~' + gameState.cellCount.toLocaleString() + ' cells/mL at ' + viabilityPct + '% viability.', 'success');
	if (gameState.activeStepId) {
		triggerStep(gameState.activeStepId);
	}
	const overlay = document.getElementById('instrument-overlay');
	if (overlay) overlay.classList.remove('active');
	switchScene('hood');
}

//============================================
// Render microscope scene (automated counter view)
//============================================
function renderMicroscopeScene(): void {
	const overlay = document.getElementById('instrument-overlay');
	if (!overlay) return;

	overlay.classList.add('active');

	const currentStep = getCurrentStep();
	if (currentStep && currentStep.modal?.screen === 'viability') {
		renderManualHemocytometerViabilityScreen();
		return;
	}
	if (currentStep && currentStep.modal?.screen === 'counting') {
		renderManualHemocytometerCountingScreen();
		return;
	}

	const cellState = getCellState();
	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	const viabilityPct = Math.round(cellState.viability * 100);
	const reportedCount = gameState.actualCellCount;

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Cell Counter - Trypan Blue Capture</h2>';
	html += '<div class="microscope-view">';
	html += '<svg id="microscope-svg" viewBox="0 0 400 430" width="400" height="430"></svg>';
	html += '</div>';
	html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
	html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
	html += 'Slide loaded with trypan-blue-stained sample. Press Capture to record count and viability.';
	html += '</p>';
	html += '<p style="margin:0 0 4px 0;font-size:13px;color:#757575;">Live cells appear clear/gray. Dead cells stain blue.</p>';
	html += '<p style="margin:0 0 4px 0;font-size:13px;color:#757575;">Reported viability: <strong>' + viabilityPct + '%</strong></p>';
	html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">Reported density: <strong>~' + reportedCount.toLocaleString() + ' cells/mL</strong></p>';
	html += '<p style="margin:0;font-size:13px;color:#555555;font-style:italic;">';
	html += getHealthBandMessage(cellState.viability, cellState.confluency);
	html += '</p>';
	html += '</div>';
	html += '<button id="capture-count" class="btn-primary" data-walker-advance="capture-count" style="padding:10px 24px;">Capture</button>';

	modal.innerHTML = html;

	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (svg) {
		svg.innerHTML = '';
		drawHemocytometerGrid(svg);
		drawCellsOnGrid(cellState);
	}

	const captureBtn = document.getElementById('capture-count');
	if (captureBtn) {
		captureBtn.addEventListener('click', captureCellCount);
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			const countDone = gameState.completedSteps.includes('count_cells');
			if (!countDone) {
				const confirmed = confirm('Cell counting is not finished. Are you sure you want to leave?');
				if (!confirmed) return;
			}
			overlay.classList.remove('active');
			switchScene('hood');
		});
	}
}

//============================================
// dispatchMicroscopeInteraction - Per-protocol dispatch wiring for microscope scene
// Routes microscope interactions through game-state dispatch
//============================================

function dispatchMicroscopeInteraction(itemId: string, ctx: SceneContext): void {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return;
	}

	// Try manual hemocytometer path first (viability or counting)
	if (dispatchManualHemocytometerInteraction(itemId, ctx)) {
		return;
	}

	// AUTOMATED CELL COUNTER PATH (Patch 11):
	// Modal completion path triggered by clicking the capture button
	if (activeStep.completionPath?.kind === 'modal') {
		const completionPath = activeStep.completionPath;

		// The advanceClick triggers the step completion
		// For cell counter: advanceClick is "capture-count"
		if (itemId === completionPath.advanceClick) {
			triggerStep(activeStep.id);
			showNotification('Cell count captured.', 'success');
			renderGame();
		}
		return;
	}
}

function renderMicroscope(ctx: SceneContext): void {
	renderMicroscopeScene();
}

const microscopeSceneAdapter = {
	sceneId: 'microscope',
	dispatchInteraction: dispatchMicroscopeInteraction,
	render: renderMicroscope,
};

//============================================
// registerScene at module load
//============================================

registerScene(microscopeSceneAdapter);
