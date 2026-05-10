//============================================
// manual_hemocytometer.ts - Manual hemocytometer viability and counting workflow
// Extracted from microscope.ts (Patch C3).
// Handles manual cell-counting with quadrant-by-quadrant UI and submission.
//============================================

import type { SceneContext } from "../scene_driver";
import type { CellState } from "../../constants";
import {
	getCurrentStep,
	renderGame,
	showNotification,
	switchScene,
	triggerStep,
	gameState,
} from "../../game_state";
import { getCellState } from "../../cell_model";
import { drawHemocytometerGrid, drawCellsOnGrid, getHealthBandMessage } from "./microscope";

//============================================
// Module-level state for quadrant tracking
//============================================

// Track which quadrants are selected (indices 0-3 for TL, TR, BL, BR)
let selectedQuadrants: boolean[] = [false, false, false, false];
// User-entered cell counts per quadrant (null means not yet counted)
let quadrantCounts: (number | null)[] = [null, null, null, null];

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
// Submit quadrant count helper
// Shared logic for both manual submission paths.
// Formula: (sum of counts) / 4 (avg per square) * 10 (dilution) * 10,000 (hemocytometer conversion)
//============================================
function submitQuadrantCount(countSource: (number | null)[]): void {
	let totalUserCount = 0;
	for (let i = 0; i < 4; i++) {
		totalUserCount += countSource[i] as number;
	}
	const avgPerSquare = totalUserCount / 4;
	const estimatedCount = Math.round(avgPerSquare * 10 * 10000);
	gameState.cellCount = estimatedCount;

	gameState.manualHemocytometerQuadrantCounts = countSource.slice();
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

	submitQuadrantCount(quadrantCounts);

	const overlay = document.getElementById('instrument-overlay');
	if (overlay) overlay.classList.remove('active');
	switchScene('hood');
}

//============================================
// Dispatch manual hemocytometer interactions
//============================================
export function dispatchManualHemocytometerInteraction(itemId: string, ctx: SceneContext): boolean {
	const activeStep = getCurrentStep();
	if (!activeStep) {
		return false;
	}

	// MANUAL HEMOCYTOMETER PATH:
	// Two-step viability-then-counting workflow using modal.screen routing.
	if (activeStep.modal?.screen === 'viability') {
		// Viability confirmation step: user clicks "Confirm and Proceed to Counting"
		if (itemId === 'confirm-viability') {
			gameState.manualHemocytometerViabilityChecked = true;
			triggerStep(activeStep.id);
			showNotification('Viability confirmed. Proceed to counting.', 'success');
			renderGame();
			return true;
		}
		return false;
	}

	if (activeStep.modal?.screen === 'counting') {
		// Manual counting step: user submits 4 quadrant counts
		if (itemId === 'submit-cell-count') {
			// Verify all 4 quadrants have counts
			// quadrantCounts must be populated by setupQuadrantListeners, which is called after renderManualHemocytometerCountingScreen
			let countedQuadrants = 0;
			for (let i = 0; i < 4; i++) {
				const count = quadrantCounts[i];
				if (count !== null && count !== undefined && typeof count === 'number') {
					countedQuadrants++;
				}
			}

			if (countedQuadrants < 4) {
				showNotification('Please count cells in all 4 corner quadrants.', 'warning');
				return true;
			}

			submitQuadrantCount(quadrantCounts);
			triggerStep(activeStep.id);
			renderGame();
			return true;
		}
		return false;
	}

	return false;
}

//============================================
// Public exports for microscope.ts to call during render
//============================================

export { renderManualHemocytometerViabilityScreen, renderManualHemocytometerCountingScreen };
