// ============================================
// microscope_scene.ts - Microscope (viability + counting) and Plate Reader
// ============================================

// Pre-register step ids this scene owns so validateCompletionEventCoverage passes
// at page load time. See hood_scene.ts for the policy rationale.
import { getCellState } from "../cell_model";
import { gameState, getCurrentStep, getWell, registeredEmitters, showNotification, switchScene, triggerStep } from "../game_state";
import { runMttReadout } from "../steps/mtt_readout";
import { COL_LABELS, PLATE_96_COLS, PLATE_96_ROWS, ROW_LABELS } from "../steps/plate_96";
import type { CellPosition, CellState } from "../constants";


registeredEmitters.add('count_cells');
registeredEmitters.add('plate_read');

// ============================================
// Helper: descriptive health band message based on viability and confluency
// ============================================
export function getHealthBandMessage(viability: number, confluency: number): string {
	// Health bands
	let healthDesc = "stable";
	if (viability >= 0.88) healthDesc = "thriving";
	else if (viability < 0.70) healthDesc = "stressed";

	// Confluency bands
	let confDesc = "moderate";
	if (confluency >= 0.75) confDesc = "dense";
	else if (confluency <= 0.55) confDesc = "light";

	// Compose message
	if (healthDesc === "thriving") {
		return "Cells look bright, spread well, and are ready for counting. "
			+ "Confluency appears " + confDesc + ".";
	} else if (healthDesc === "stressed") {
		return "Cells look stressed -- some appear rounded or detached. "
			+ "Review the order of operations. Confluency appears " + confDesc + ".";
	}
	return "Cells look calm and attached. Confluency appears " + confDesc + ".";
}

// ============================================
// CELL COUNTER VIEW - Auto-capture count and viability
// ============================================
// Mirrors the wet-lab protocol (docs/OVCAR8_Carboplatin_Metformin_MTT_Protocol.md
// Part 2): the automated cell counter reads count and viability from the
// trypan-blue-stained sample in a single Capture press. The simulated
// machine reports viability and cells/mL directly; no manual hemocytometer
// quadrant counting is part of the wet-lab procedure.
export function renderMicroscopeScene(): void {
	const overlay = document.getElementById('microscope-overlay');
	if (!overlay) return;

	overlay.classList.add('active');

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

	// Draw cells on the SVG (visual aid; not gating the capture)
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

// ============================================
// captureCellCount - records count + viability and triggers count_cells
// ============================================
// Replaces the legacy submitQuadrantCount() flow. The auto-counter records
// the actual cell density directly; viability has already been displayed.
function captureCellCount(): void {
	gameState.cellCount = gameState.actualCellCount;
	const cellState = getCellState();
	const viabilityPct = Math.round(cellState.viability * 100);
	showNotification('Captured: ~' + gameState.cellCount.toLocaleString() + ' cells/mL at ' + viabilityPct + '% viability.', 'success');
	if (gameState.activeStepId) {
		triggerStep(gameState.activeStepId);
	}
	const overlay = document.getElementById('microscope-overlay');
	if (overlay) overlay.classList.remove('active');
	switchScene('hood');
}

// ============================================
export function drawHemocytometerGrid(svg: SVGElement): void {
	const ns = 'http://www.w3.org/2000/svg';
	const w = 400;
	const h = 400;

	// Background
	const bg = document.createElementNS(ns, 'rect');
	bg.setAttribute('width', String(w));
	bg.setAttribute('height', String(h));
	bg.setAttribute('fill', '#fafafa');
	svg.appendChild(bg);

	// Highlight 4 corner squares
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

	// Major grid lines (4x4)
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

	// Minor grid lines
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

// ============================================
export function drawCellsOnGrid(cellState: CellState): void {
	const ns = 'http://www.w3.org/2000/svg';
	const svg = document.getElementById('microscope-svg') as unknown as SVGElement;
	if (!svg) return;

	cellState.positions.forEach((pos: CellPosition) => {
		const circle = document.createElementNS(ns, 'circle');
		circle.setAttribute('cx', String(pos.x * 400));
		circle.setAttribute('cy', String(pos.y * 400));
		circle.setAttribute('r', String(pos.radius * 400));
		// Live cells appear clear/light, dead cells stain dark blue (trypan blue)
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

// Track which quadrants are selected (indices 0-3 for TL, TR, BL, BR)
export let selectedQuadrants: boolean[] = [false, false, false, false];
// User-entered cell counts per quadrant (null means not yet counted)
export let quadrantCounts: (number | null)[] = [null, null, null, null];

// ============================================
// Quadrant corner positions matching the SVG grid corners
// Each quadrant covers a 100x100 region of the 400x400 SVG
export const QUADRANT_CORNERS = [
	{ x: 0, y: 0, label: 'Top-Left (A1)' },
	{ x: 300, y: 0, label: 'Top-Right (A4)' },
	{ x: 0, y: 300, label: 'Bottom-Left (D1)' },
	{ x: 300, y: 300, label: 'Bottom-Right (D4)' },
];

// ============================================
export function renderQuadrantButtons(): string {
	// Position clickable divs over the 4 corner squares of the hemocytometer
	// SVG is 400x300, each corner square is 100x75
	let html = '';
	for (let i = 0; i < 4; i++) {
		const c = QUADRANT_CORNERS[i]!; // invariant: i in [0,4), QUADRANT_CORNERS has 4 entries
		// Convert SVG coordinates to percentages
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

// ============================================
export function setupQuadrantListeners(): void {
	selectedQuadrants = [false, false, false, false];
	quadrantCounts = [null, null, null, null];
	const buttons = document.querySelectorAll('.quadrant-btn');
	buttons.forEach((btn) => {
		const el = btn as HTMLElement;
		const idx = parseInt(el.getAttribute('data-quadrant') || '0');
		const corner = QUADRANT_CORNERS[idx]!; // invariant: data-quadrant is [0,4), QUADRANT_CORNERS has 4 entries

		el.addEventListener('click', () => {
			// Prompt user for their live cell count in this quadrant
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
			// Show count badge
			const badge = el.querySelector('.quadrant-count-badge') as HTMLElement;
			if (badge) {
				badge.style.display = 'block';
				badge.textContent = String(parsed);
			}
			updateQuadrantStatus();
		});

		// Hover feedback
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

// ============================================
export function updateQuadrantStatus(): void {
	let count = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) count++;
	}
	const statusEl = document.getElementById('quadrant-status');
	if (statusEl) {
		statusEl.textContent = count + ' of 4 quadrants counted';
	}
	// Enable submit only when all 4 are selected
	const submitBtn = document.getElementById('submit-cell-count') as HTMLButtonElement;
	if (submitBtn) {
		submitBtn.disabled = count < 4;
	}
}

// ============================================
export function submitQuadrantCount(): void {
	// Count how many quadrants have been counted
	let selectedCount = 0;
	for (let i = 0; i < 4; i++) {
		if (selectedQuadrants[i]) selectedCount++;
	}
	if (selectedCount < 4) {
		showNotification('Please count cells in all 4 corner quadrants.', 'warning');
		return;
	}

	// Calculate cells/mL from user-entered counts
	// Formula: (avg per square) x dilution_factor(10) x 10,000
	let totalUserCount = 0;
	for (let i = 0; i < 4; i++) {
		totalUserCount += quadrantCounts[i] as number;
	}
	const avgPerSquare = totalUserCount / 4;
	const estimatedCount = Math.round(avgPerSquare * 10 * 10000);
	gameState.cellCount = estimatedCount;

	// Compare against actual for feedback
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

	// Close microscope, return to hood
	const overlay = document.getElementById('microscope-overlay');
	if (overlay) overlay.classList.remove('active');
	switchScene('hood');
}

// ============================================
// PLATE READER VIEW
// ============================================
export function renderPlateReaderScene(): void {
	const overlay = document.getElementById('microscope-overlay');
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
			switchScene('hood');
		});
	}
}

