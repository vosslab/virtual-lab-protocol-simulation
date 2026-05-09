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
//============================================
function getHealthBandMessage(viability: number, confluency: number): string {
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
// Quadrant corner positions matching the SVG grid corners
// Each quadrant covers a 100x100 region of the 400x400 SVG
//============================================
const QUADRANT_CORNERS = [
	{ x: 0, y: 0, label: 'Top-Left (A1)' },
	{ x: 300, y: 0, label: 'Top-Right (A4)' },
	{ x: 0, y: 300, label: 'Bottom-Left (D1)' },
	{ x: 300, y: 300, label: 'Bottom-Right (D4)' },
];

// Track which quadrants are selected (indices 0-3 for TL, TR, BL, BR)
let selectedQuadrants: boolean[] = [false, false, false, false];
// User-entered cell counts per quadrant (null means not yet counted)
let quadrantCounts: (number | null)[] = [null, null, null, null];

//============================================
// Draw hemocytometer grid
//============================================
function drawHemocytometerGrid(svg: SVGElement): void {
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
//============================================
function drawCellsOnGrid(cellState: CellState): void {
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
// Render quadrant buttons
//============================================
function renderQuadrantButtons(): string {
	let html = '';
	for (let i = 0; i < 4; i++) {
		const c = QUADRANT_CORNERS[i]!;
		const leftPct = (c.x / 400) * 100;
		const topPct = (c.y / 400) * 100;
		const widthPct = (100 / 400) * 100;
		const heightPct = (100 / 400) * 100;
		html += '<div class="quadrant-btn" data-quadrant="' + i + '" ';
		html += 'title="' + c.label + '" ';
		html += 'style="position:absolute;';
		html += 'left:' + leftPct + '%;top:' + topPct + '%;';
		html += 'width:' + widthPct + '%;height:' + heightPct + '%;';
		html += 'cursor:pointer;border:2px solid transparent;border-radius:3px;';
		html += 'transition:all 0.2s ease;z-index:10;';
		html += 'display:flex;align-items:center;justify-content:center;">';
		html += '<span class="quadrant-count-badge" data-badge="' + i + '" ';
		html += "style='display:none;background:rgba(255,255,255,0.9);";
		html += "border-radius:4px;padding:2px 8px;font-size:14px;font-weight:600;";
		html += "color:#2e7d32;pointer-events:none;'></span>";
		html += '</div>';
	}
	return html;
}

//============================================
// Setup quadrant listeners
//============================================
function setupQuadrantListeners(): void {
	selectedQuadrants = [false, false, false, false];
	quadrantCounts = [null, null, null, null];
	const buttons = document.querySelectorAll('.quadrant-btn');
	buttons.forEach((btn) => {
		const el = btn as HTMLElement;
		const idx = parseInt(el.getAttribute('data-quadrant') || '0');
		const corner = QUADRANT_CORNERS[idx]!;

		el.addEventListener('click', () => {
			const existing = quadrantCounts[idx];
			const defaultVal = existing !== null ? String(existing) : '';
			const input = prompt(
				'How many LIVE cells do you count in ' + corner.label + '?',
				defaultVal,
			);
			if (input === null) return;
			const parsed = parseInt(input, 10);
			if (isNaN(parsed) || parsed < 0) {
				showNotification('Enter a non-negative whole number.', 'warning');
				return;
			}
			quadrantCounts[idx] = parsed;
			selectedQuadrants[idx] = true;
			el.style.border = '3px solid #4caf50';
			el.style.backgroundColor = 'rgba(76, 175, 80, 0.15)';
			const badge = el.querySelector('.quadrant-count-badge') as HTMLElement;
			if (badge) {
				badge.style.display = 'block';
				badge.textContent = String(parsed);
			}
			updateQuadrantStatus();
		});

		el.addEventListener('mouseenter', () => {
			if (!selectedQuadrants[idx]) {
				el.style.backgroundColor = 'rgba(76, 175, 80, 0.08)';
			}
		});
		el.addEventListener('mouseleave', () => {
			if (!selectedQuadrants[idx]) {
				el.style.backgroundColor = 'transparent';
			}
		});
	});
}

//============================================
// Update quadrant status
//============================================
function updateQuadrantStatus(): void {
	let count = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) count++;
	}
	const statusEl = document.getElementById('quadrant-status');
	if (statusEl) {
		statusEl.textContent = count + ' of 4 quadrants counted';
	}
	const submitBtn = document.getElementById('submit-cell-count') as HTMLButtonElement;
	if (submitBtn) {
		submitBtn.disabled = count < 4;
	}
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
// Render manual hemocytometer viability screen
//============================================
function renderManualHemocytometerViabilityScreen(): void {
	const overlay = document.getElementById('instrument-overlay');
	if (!overlay) return;

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	const cellState = getCellState();
	const viabilityPct = Math.round(cellState.viability * 100);

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Hemocytometer - Viability Check</h2>';
	html += '<div class="microscope-view">';
	html += '<svg id="microscope-svg" viewBox="0 0 400 430" width="400" height="430"></svg>';
	html += '</div>';
	html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
	html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
	html += 'Hemocytometer loaded with trypan-blue-stained sample. Verify cell viability before counting.';
	html += '</p>';
	html += '<p style="margin:0 0 4px 0;font-size:13px;color:#757575;">Live cells appear clear/gray. Dead cells stain blue.</p>';
	html += '<p style="margin:0 0 8px 0;font-size:13px;color:#757575;">Viability: <strong>' + viabilityPct + '%</strong></p>';
	html += '<p style="margin:0;font-size:13px;color:#555555;font-style:italic;">';
	html += getHealthBandMessage(cellState.viability, cellState.confluency);
	html += '</p>';
	html += '</div>';
	html += '<button id="confirm-viability" class="btn-primary" data-walker-advance="confirm-viability" style="padding:10px 24px;">Confirm and Proceed to Counting</button>';

	modal.innerHTML = html;

	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (svg) {
		svg.innerHTML = '';
		drawHemocytometerGrid(svg);
		drawCellsOnGrid(cellState);
	}

	const confirmBtn = document.getElementById('confirm-viability');
	if (confirmBtn) {
		confirmBtn.addEventListener('click', () => {
			gameState.manualHemocytometerViabilityChecked = true;
			if (gameState.activeStepId) {
				triggerStep(gameState.activeStepId);
			}
		});
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			overlay.classList.remove('active');
			switchScene('hood');
		});
	}
}

//============================================
// Render manual hemocytometer counting screen
//============================================
function renderManualHemocytometerCountingScreen(): void {
	const overlay = document.getElementById('instrument-overlay');
	if (!overlay) return;

	const modal = overlay.querySelector('.modal-content') as HTMLElement;
	if (!modal) return;

	const cellState = getCellState();

	let html = '<button class="modal-close" aria-label="Close">&times;</button>';
	html += '<h2>Hemocytometer - Cell Counting</h2>';
	html += '<div class="microscope-view" style="position:relative;min-height:430px;">';
	html += '<svg id="microscope-svg" viewBox="0 0 400 430" width="400" height="430"></svg>';
	html += renderQuadrantButtons();
	html += '</div>';
	html += '<div style="padding:16px;background:#f0f2f5;border-radius:8px;margin-bottom:16px;">';
	html += '<p style="margin:0 0 8px 0;font-size:14px;color:#212121;">';
	html += '<strong>Count live cells in each highlighted corner quadrant.</strong>';
	html += '</p>';
	html += '<p id="quadrant-status" style="margin:0;font-size:13px;color:#757575;">0 of 4 quadrants counted</p>';
	html += '</div>';
	html += '<button id="submit-cell-count" class="btn-primary" data-walker-advance="submit-cell-count" style="padding:10px 24px;width:100%;" disabled>Submit Cell Count</button>';

	modal.innerHTML = html;

	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (svg) {
		svg.innerHTML = '';
		drawHemocytometerGrid(svg);
		drawCellsOnGrid(cellState);
	}

	setupQuadrantListeners();

	const submitBtn = document.getElementById('submit-cell-count');
	if (submitBtn) {
		submitBtn.addEventListener('click', submitManualHemocytometerCount);
	}

	const closeBtn = modal.querySelector('.modal-close') as HTMLElement;
	if (closeBtn) {
		closeBtn.addEventListener('click', () => {
			const countDone = gameState.manualHemocytometerSubmitted;
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
// Submit manual hemocytometer count
//============================================
function submitManualHemocytometerCount(): void {
	let selectedCount = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) selectedCount++;
	}
	if (selectedCount < 4) {
		showNotification('Please count cells in all 4 corner quadrants.', 'warning');
		return;
	}

	let totalUserCount = 0;
	for (let i = 0; i < 4; i++) {
		totalUserCount += quadrantCounts[i] as number;
	}
	const avgPerSquare = totalUserCount / 4;
	const estimatedCount = Math.round(avgPerSquare * 10 * 10000);
	gameState.cellCount = estimatedCount;

	gameState.manualHemocytometerQuadrantCounts = quadrantCounts.slice();
	gameState.manualHemocytometerSubmitted = true;

	const actual = gameState.actualCellCount;
	const errorPercent = Math.abs(estimatedCount - actual) / actual * 100;

	let feedback = 'Your count: ~' + estimatedCount.toLocaleString() + ' cells/mL. ';
	if (errorPercent <= 10) {
		feedback += 'Excellent -- very close to actual!';
	} else if (errorPercent <= 25) {
		feedback += 'Good count, within acceptable range.';
	} else {
		feedback += 'Actual was ~' + actual.toLocaleString() + ' cells/mL.';
	}

	showNotification(feedback, errorPercent <= 25 ? 'success' : 'info');
	if (gameState.activeStepId) {
		triggerStep(gameState.activeStepId);
	}

	const overlay = document.getElementById('instrument-overlay');
	if (overlay) overlay.classList.remove('active');
	switchScene('hood');
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

	// MANUAL HEMOCYTOMETER PATH (Patch 16):
	// Two-step viability-then-counting workflow using modal.screen routing.
	if (activeStep.modal?.screen === 'viability') {
		// Viability confirmation step: user clicks "Confirm and Proceed to Counting"
		if (itemId === 'confirm-viability') {
			gameState.manualHemocytometerViabilityChecked = true;
			triggerStep(activeStep.id);
			showNotification('Viability confirmed. Proceed to counting.', 'success');
			renderGame();
		}
		return;
	}

	if (activeStep.modal?.screen === 'counting') {
		// Manual counting step: user submits 4 quadrant counts
		if (itemId === 'submit-cell-count') {
			// Use module-level quadrantCounts array populated by setupQuadrantListeners
			if (!quadrantCounts || quadrantCounts.length < 4) {
				showNotification('Please count cells in all 4 corner quadrants.', 'warning');
				return;
			}

			// Verify all 4 quadrants have counts
			let countedQuadrants = 0;
			let totalQuadrantCount = 0;
			for (let i = 0; i < 4; i++) {
				const count = quadrantCounts[i];
				if (count !== null && count !== undefined && typeof count === 'number') {
					countedQuadrants++;
					totalQuadrantCount += count;
				}
			}

			if (countedQuadrants < 4) {
				showNotification('Please count cells in all 4 corner quadrants.', 'warning');
				return;
			}

			// Formula: (sum of counts) / 4 (avg per square) * 10 (dilution) * 10,000 (hemocytometer conversion)
			const avgPerSquare = totalQuadrantCount / 4;
			const estimatedCount = Math.round(avgPerSquare * 10 * 10000);
			gameState.cellCount = estimatedCount;

			// Mark as submitted
			gameState.manualHemocytometerSubmitted = true;

			// Provide feedback comparing estimate to actual
			const actual = gameState.actualCellCount;
			const errorPercent = Math.abs(estimatedCount - actual) / actual * 100;

			let feedback = 'Your count: ~' + estimatedCount.toLocaleString() + ' cells/mL. ';
			if (errorPercent <= 10) {
				feedback += 'Excellent -- very close to actual!';
			} else if (errorPercent <= 25) {
				feedback += 'Good count, within acceptable range.';
			} else {
				feedback += 'Actual was ~' + actual.toLocaleString() + ' cells/mL.';
			}

			showNotification(feedback, errorPercent <= 25 ? 'success' : 'info');
			triggerStep(activeStep.id);
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
