// ============================================
// game_state.ts - State machine and protocol tracking
// ============================================

import { BENCH_SCENE_ITEMS } from "./bench_config";
import { FLASK_STARTING_MEDIA_ML, INITIAL_CELL_COUNT, INITIAL_VIABILITY, PLATE_COLS, PLATE_ROWS, type ProtocolStep, type WellData } from "./constants";
import { PROTOCOL_STEPS } from "./content/protocol_data";
import { HOOD_SCENE_ITEMS } from "./hood_config";
import type { SceneItem } from "./scene_types";


export interface HeldLiquid {
	tool: string;        // item id of the held tool
	liquid: string;      // reagent id
	volumeMl: number;    // volume in milliliters
	colorKey: string;    // color role for rendering
}

export interface GameState {
	// State machine: activeStepId replaces currentStep (numeric index).
	// Explicit tracking of protocol progress via id-based lookup.
	activeStepId: string | null;
	// Attempted completions of non-active steps (recorded separately from completedSteps).
	// Allows scoring to distinguish correct-order progress from out-of-order clicks.
	outOfOrderAttempts: string[];
	flaskMediaMl: number;
	flaskMediaAge: 'old' | 'fresh';
	// 24-well plate state
	wellPlate: WellData[];
	cellsTransferred: boolean;
	drugsAdded: boolean;
	incubated: boolean;
	// Cell tracking
	cellCount: number | null;
	actualCellCount: number;
	cellViability: number;
	// Plate reader results
	plateReadComplete: boolean;
	score: number;
	completedSteps: string[];
	hoodSprayed: boolean;
	activeScene: 'hood' | 'bench' | 'incubator' | 'microscope' | 'plate' | 'plate_reader' | 'results';
	// Tracking for scoring
	stepsInCorrectOrder: number;
	stepsOutOfOrder: number;
	mediaWastedMl: number;
	cleanlinessErrors: number;
	// Real-time warning messages
	warnings: string[];
	// Trypsin digestion tracking
	trypsinAdded: boolean;
	trypsinIncubated: boolean;
	trypsinNeutralized: boolean;
	// Hemocytometer loading
	hemocytometerLoaded: boolean;
	// Protocol realism tracking
	mediaWarmed: boolean;
	startTime: number;
	endTime: number | null;
	selectedTool: string | null;
	pipetteVolumeMl: number;
	isDragging: boolean;
	dragItem: string | null;
	// Held liquid state: tracks what liquid is loaded in the current tool
	heldLiquid: HeldLiquid | null;
	// Day state machine
	day: 'day1_seed' | 'day1_wait' | 'day2_treat' | 'day2_wait' | 'day4_readout';
	seenPartIntros: string[];
	// Protocol fidelity counters
	dilutionErrors: number;
	plateMapErrors: number;
	mttTechniqueErrors: number;
	incubationTimingOk: boolean;
	professorMood: 'neutral' | 'pleased' | 'annoyed';
	professorMoodSetAt: number;
	// Interaction sequence tracking (Patch 4)
	interactionIndex: number;
	wrongOrderClicks: number;
	// Manual hemocytometer tracking (M4: tutorial_hemocytometer_count protocol)
	manualHemocytometerViabilityChecked: boolean;
	manualHemocytometerQuadrantCounts: (number | null)[];
	manualHemocytometerSubmitted: boolean;
}

// CRITICAL: Persistence layer must serialize activeStepId, outOfOrderAttempts,
// completedSteps, stepsInCorrectOrder, stepsOutOfOrder, interactionIndex, and
// wrongOrderClicks. Any future save/load implementation must include these fields
// or reloaded sessions will diverge from in-memory protocol state. Missing fields
// in old saves should default to 0 (interactionIndex and wrongOrderClicks).

// ============================================
export function createWellPlate(): WellData[] {
	const wells: WellData[] = [];
	for (let row = 0; row < PLATE_ROWS; row++) {
		for (let col = 0; col < PLATE_COLS; col++) {
			wells.push({
				row: row,
				col: col,
				hasCells: false,
				drugConcentrationUm: 0,
				absorbance: 0,
			});
		}
	}
	return wells;
}

// ============================================
export function createInitialGameState(): GameState {
	return {
		activeStepId: PROTOCOL_STEPS[0]!.id,
		outOfOrderAttempts: [],
		flaskMediaMl: FLASK_STARTING_MEDIA_ML,
		flaskMediaAge: 'old',
		wellPlate: createWellPlate(),
		cellsTransferred: false,
		drugsAdded: false,
		incubated: false,
		cellCount: null,
		actualCellCount: INITIAL_CELL_COUNT,
		cellViability: INITIAL_VIABILITY,
		plateReadComplete: false,
		score: 0,
		completedSteps: [],
		hoodSprayed: false,
		activeScene: 'hood',
		stepsInCorrectOrder: 0,
		stepsOutOfOrder: 0,
		mediaWastedMl: 0,
		cleanlinessErrors: 0,
		warnings: [],
		trypsinAdded: false,
		trypsinIncubated: false,
		trypsinNeutralized: false,
		hemocytometerLoaded: false,
		mediaWarmed: false,
		startTime: Date.now(),
		endTime: null,
		selectedTool: null,
		pipetteVolumeMl: 0,
		isDragging: false,
		dragItem: null,
		heldLiquid: null,
		day: 'day1_seed',
		seenPartIntros: [],
		dilutionErrors: 0,
		plateMapErrors: 0,
		mttTechniqueErrors: 0,
		incubationTimingOk: true,
		professorMood: 'neutral',
		professorMoodSetAt: Date.now(),
		interactionIndex: 0,
		wrongOrderClicks: 0,
		manualHemocytometerViabilityChecked: false,
		manualHemocytometerQuadrantCounts: [null, null, null, null],
		manualHemocytometerSubmitted: false,
	};
}

// Global game state
export let gameState: GameState = createInitialGameState();
// Setter used by init.ts to reset state (avoids TS2632 "cannot assign to import")
export function setGameState(newState: GameState): void {
	gameState = newState;
}

// ============================================
// triggerStep registration and wrapper
// ============================================
// Runtime registration set: populated as scenes load and fire their handlers.
// By the time the walkthrough runs, this set reflects every step id that
// actually has a working click path. The startup validator validateCompletionEventCoverage()
// diffs this set against PROTOCOL_STEPS for dead-step detection.
//
// Important: a completion event registers only when its code path actually runs.
// Scenes whose first render fires every handler registration unconditionally
// are fine; any scene that lazy-registers a handler (on hover, on drag-start,
// etc.) must have that handler run once during the walkthrough for the check
// to cover it. Since scenes render on page load and click-handler-setup
// functions run on render, coverage is complete.
export const registeredEmitters: Set<string> = new Set();

// ============================================
export function resetGame(): void {
	// Close all modal overlays before resetting
	const overlays = document.querySelectorAll('.modal-overlay');
	for (let i = 0; i < overlays.length; i++) {
		overlays[i]!.classList.remove('active');
	}
	gameState = createInitialGameState();
	renderGame();
}

// ============================================
// The ONLY accessor for the current step. Direct indexing into PROTOCOL_STEPS
// is forbidden -- it was the load-bearing pattern behind the
// stuck-at-step-1 bug and is replaced here by an explicit lookup.
// ============================================
export function getCurrentStep(): ProtocolStep | null {
	const id = gameState.activeStepId;
	if (id === null) return null;
	const step = PROTOCOL_STEPS.find(s => s.id === id);
	if (!step) throw new Error(`activeStepId '${id}' not in PROTOCOL_STEPS`);
	return step;
}

// ============================================
// completeStep(stepId: string) - State machine transition
//
// Invariants:
// - Idempotent: calling twice for same id is a no-op after first success
// - Only active step advances state. Wrong-step calls record out-of-order
//   attempt and do NOT mutate completedSteps or activeStepId
// - Resolves nextId supporting both string and function forms
// - When activeStepId becomes null, sets endTime and switches to results scene
// - Defensive backstop (Patch 4): if the step has an interactionSequence and
//   the current interactionIndex has not reached the end of the sequence,
//   log an error, increment wrongOrderClicks, and refuse to advance.
// ============================================
export function completeStep(stepId: string): void {
	// Idempotent: already completed is a no-op
	if (gameState.completedSteps.includes(stepId)) return;

	const activeId = gameState.activeStepId;
	if (activeId === null || stepId !== activeId) {
		// Out-of-order attempt: record it, do NOT mark completed,
		// do NOT advance activeStepId
		gameState.outOfOrderAttempts.push(stepId);
		gameState.stepsOutOfOrder++;
		return;
	}

	const activeStep = PROTOCOL_STEPS.find(s => s.id === activeId);
	if (!activeStep) {
		throw new Error(`activeStepId '${activeId}' not in PROTOCOL_STEPS`);
	}

	// Defensive backstop: if the step has an interactionSequence completionPath,
	// ensure all interactions have been completed before advancing.
	const backstopInteractions = activeStep.completionPath && activeStep.completionPath.kind === 'interactionSequence'
		? activeStep.completionPath.interactions
		: null;
	if (backstopInteractions && gameState.interactionIndex < backstopInteractions.length) {
		console.error(`[completeStep backstop] step ${stepId} called early at index ${gameState.interactionIndex} of ${backstopInteractions.length}`);
		gameState.wrongOrderClicks++;
		return;
	}

	gameState.stepsInCorrectOrder++;
	gameState.completedSteps.push(stepId);

	// Resolve nextId: support both string and function forms
	const next = typeof activeStep.nextId === 'function'
		? activeStep.nextId(gameState)
		: activeStep.nextId;
	gameState.activeStepId = next;
	// Reset interactionIndex when transitioning to a new step
	gameState.interactionIndex = 0;

	if (gameState.activeStepId === null) {
		gameState.endTime = Date.now();
		gameState.activeScene = 'results';
	}

	showNotification('Completed: ' + getStepLabel(stepId));
	renderGame();
}

// ============================================
// triggerStep(stepId: string) - Wrapper for all scene code
//
// Every scene calls this instead of completeStep() directly.
// Wraps in orphan check and runtime registration.
// ============================================
export function triggerStep(stepId: string): void {
	// Orphan check: stepId must be a real step. Fail loud at call time.
	const known = PROTOCOL_STEPS.some(s => s.id === stepId);
	if (!known) {
		throw new Error('triggerStep called with unknown id: ' + stepId);
	}
	// Runtime registration: records that this scene has a live wiring
	// path for stepId. validateCompletionEventCoverage() diffs this set against
	// PROTOCOL_STEPS at page load to catch dead steps.
	registeredEmitters.add(stepId);
	completeStep(stepId);
}

// ============================================
export function getStepLabel(stepId: string): string {
	const step = PROTOCOL_STEPS.find(s => s.id === stepId);
	return step ? step.label : stepId;
}

// ============================================
export function switchScene(scene: 'hood' | 'bench' | 'incubator' | 'microscope' | 'plate' | 'plate_reader' | 'results'): void {
	gameState.activeScene = scene;
	renderGame();
}

// ============================================
// deriveActiveTargets(step) - Extract item ids relevant to the active step.
//
// Derives the set of item ids from the step's completionPath.interactions
// (tool, source, destination) when the step uses interactionSequence completion.
// Used by resolveItemDepth and scene renderers for highlight and depth decisions.
// ============================================
export function deriveActiveTargets(step: ProtocolStep | null): string[] {
	if (!step || step.completionPath?.kind !== 'interactionSequence') return [];
	const seen = new Set<string>();
	for (const interaction of step.completionPath.interactions) {
		if (interaction.tool) seen.add(interaction.tool);
		if (interaction.source) seen.add(interaction.source);
		if (interaction.destination) seen.add(interaction.destination);
	}
	return Array.from(seen);
}

// ============================================
// resolveItemDepth(item, activeStepId)
//
// Depth is automatic first, manual second. Given an item and the currently
// active protocol step, return the tier the item should render at:
//
//   'front' : item.id is in the active step's derived targets (tool/source/destination
//             from interactionSequence; the student needs to interact with it now)
//   'mid'   : item shares a group with one of the step's used items
//             (same functional cluster; keeps context close at hand)
//   'back'  : everything else parks on the back shelf, smaller and higher
//
// A manual item.depth on the item spec wins - explicit intent overrides
// auto-resolution. Critical items (plate and bottle kinds) never drop
// below 'mid' so the student never loses sight of the working plate or
// the active reagent.
//
// Returns the resolved depth tier. Pure function; does not mutate.
// ============================================
export function resolveItemDepth(
	item: SceneItem,
	activeStepId: string | null
): 'back' | 'mid' | 'front' {
	// Manual override wins - explicit intent beats auto-resolution.
	if (item.depth) return item.depth;

	// Auto-depth is OPT-IN via the `group` field. An item without a group
	// tag keeps the default behavior ('mid'). Once an item is groupable,
	// it participates in front-promote-on-target and back-park-on-idle.
	if (!item.group) return 'mid';

	// No active step -> default to mid (current rendering).
	if (!activeStepId) return 'mid';

	const step = PROTOCOL_STEPS.find(function (s) { return s.id === activeStepId; });
	// Derive targets from completionPath.interactions (tool/source/destination).
	const targets = deriveActiveTargets(step || null);
	if (targets.length === 0) {
		return 'mid';
	}

	// Item is in the used items list: promote to front.
	if (targets.indexOf(item.id) >= 0) return 'front';

	// Critical items never drop below mid (plate and the active flask).
	if (item.kind === 'plate' || item.kind === 'flask') return 'mid';

	// Share a functional group with one of the used items: stay mid.
	// Consult both hood and bench item pools so a used-items list
	// spanning both scenes resolves correctly.
	var targetGroups: string[] = [];
	var pools: SceneItem[][] = [HOOD_SCENE_ITEMS, BENCH_SCENE_ITEMS];
	for (var pi = 0; pi < pools.length; pi++) {
		var pool = pools[pi]!;
		for (var ii = 0; ii < pool.length; ii++) {
			var it = pool[ii]!;
			if (targets.indexOf(it.id) >= 0 && it.group) {
				if (targetGroups.indexOf(it.group) < 0) {
					targetGroups.push(it.group);
				}
			}
		}
	}
	if (targetGroups.indexOf(item.group) >= 0) return 'mid';

	// Otherwise park the item on the back shelf.
	return 'back';
}

// ============================================
// resolveSceneItemsWithDepth - return a shallow copy of items with
// `depth` populated from the auto-resolver. Leaves the input array
// untouched so callers can safely pass HOOD_SCENE_ITEMS / BENCH_SCENE_ITEMS.
// ============================================
export function resolveSceneItemsWithDepth(
	items: SceneItem[],
	activeStepId: string | null
): SceneItem[] {
	var out: SceneItem[] = [];
	for (var i = 0; i < items.length; i++) {
		var src = items[i]!;
		var resolved = resolveItemDepth(src, activeStepId);
		// Short-circuit: if the resolved tier matches the existing
		// (absent or already-set) depth, push the original reference to
		// avoid churn in downstream identity checks.
		if (src.depth === resolved) {
			out.push(src);
		} else {
			const copied: SceneItem = {
				id: src!.id,
				asset: src!.asset,
				kind: src!.kind,
				zone: src!.zone,
				priority: src!.priority,
				widthScale: src!.widthScale,
				label: src!.label,
				anchorY: src!.anchorY,
				depth: resolved,
			};
			if (src!.shortLabel !== undefined) {
				copied.shortLabel = src!.shortLabel;
			}
			if (src!.baselineOverride !== undefined) {
				copied.baselineOverride = src!.baselineOverride;
			}
			if (src!.alignStop !== undefined) {
				copied.alignStop = src!.alignStop;
			}
			if (src!.group !== undefined) {
				copied.group = src!.group;
			}
			out.push(copied);
		}
	}
	return out;
}

// ============================================
export function selectTool(toolId: string | null): void {
	gameState.selectedTool = toolId;
	renderGame();
}

// ============================================
export function registerWarning(message: string): void {
	gameState.warnings.push(message);
	showNotification(message, 'warning');
	// Update the warning display in the protocol panel
	renderWarningBanner();
}

// ============================================
export function recordCleanlinessError(message?: string): void {
	gameState.cleanlinessErrors++;
	const warningMsg = message || 'Contamination risk! Remember sterile technique.';
	registerWarning(warningMsg);
}

// ============================================
// Forward declaration - overridden by ui_rendering.ts
// Use setRenderWarningBanner() to install the real implementation.
let _renderWarningBannerImpl: () => void = function() { /* stub */ };
export function renderWarningBanner(): void {
	_renderWarningBannerImpl();
}
export function setRenderWarningBanner(fn: () => void): void {
	_renderWarningBannerImpl = fn;
}

// ============================================
export function getWell(row: number, col: number): WellData {
	return gameState.wellPlate[row * PLATE_COLS + col]!;
}

// ============================================
// Forward declarations - overridden by later modules
// Use setRenderGame() to install the real implementation.
let _renderGameImpl: () => void = function() { /* stub */ };
export function renderGame(): void {
	_renderGameImpl();
}
export function setRenderGame(fn: () => void): void {
	_renderGameImpl = fn;
}

// ============================================
export function advanceDay(): void {
	switch (gameState.day) {
		case 'day1_seed':
			// day1_seed -> day1_wait (after p3_incubate_day1 completes)
			gameState.day = 'day1_wait';
			break;
		case 'day1_wait':
			// day1_wait -> day2_treat (via incubator click)
			gameState.day = 'day2_treat';
			break;
		case 'day2_treat':
			// day2_treat -> day2_wait (after p5_incubate_48h completes)
			gameState.day = 'day2_wait';
			break;
		case 'day2_wait':
			// day2_wait -> day4_readout (via incubator click)
			gameState.day = 'day4_readout';
			break;
		case 'day4_readout':
			// Already at final day; illegal transition
			console.warn('advanceDay: illegal from day4_readout');
			return;
		default:
			console.warn('advanceDay: illegal from ' + gameState.day);
			return;
	}
}

// ============================================
// Use setShowNotification() to install the real implementation from ui_rendering.ts.
let _showNotificationImpl: (message: string, type?: string) => void = function() { /* stub */ };
export function showNotification(message: string, type: string = 'info'): void {
	_showNotificationImpl(message, type);
}
export function setShowNotification(fn: (message: string, type?: string) => void): void {
	_showNotificationImpl = fn;
}

// ============================================
// Expose registeredEmitters on window for the walkthrough test
// ============================================
(window as any).__registeredEmitters = registeredEmitters;
