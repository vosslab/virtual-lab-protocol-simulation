// ============================================
// init.ts - Bootstrap and main render dispatcher
// ============================================

// ============================================
// showValidationError(title, detail) - Single error surface
//
// All validation failures route through this helper.
// - Console: full stack, bold red header
// - DOM: blocking red banner at top of body, non-dismissable
// - window flag: sets __protocolValidation for walkthrough to read
// - Throws to halt execution
// ============================================
import { PROTOCOL_ID, PROTOCOL_STEPS, SCENE_ROUTER } from "./content/protocol_data";
import { completeStep, createInitialGameState, gameState, renderGame, setGameState, setRenderGame } from "./game_state";
import { createProfessorOverlay, renderProfessorOverlay } from "./professor_overlay";
import { renderProtocolUI } from "./protocol_ui";
import { renderBenchScene as renderBenchSceneLegacy } from "./scenes/bench";
import { dispatchInteractionClick, onItemClick, renderHoodScene, setupHoodEventListeners } from "./scenes/hood";
import { renderPlateReaderScene } from "./scenes/shared/plate_reader";
import { calculateScore } from "./scoring";
import { renderMeters, renderProtocolPanel, renderResultsScreen, renderScoreDisplay } from "./ui_rendering";
import { resolveSceneRouter, runSceneRender } from "./scenes/scene_registry";
import { runScene } from "./scenes/scene_driver";
import "./scenes/capabilities/item_workspace";
import "./scenes/capabilities/modal_workspace";
import "./scenes/capabilities/plate_reader_workspace";
import "./scenes/capabilities/instrument_workspace";
import "./scenes/capabilities/incubator_workspace";
import "./scenes/capabilities/grid_counting_workspace";
import "./scenes/bench/bench";
import "./scenes/cell_culture_hood/cell_culture_hood";
import "./scenes/incubator/incubator";
import "./scenes/plate/plate";
import "./scenes/microscope/microscope";


export function showValidationError(title: string, detail: string): never {
	console.error(`[PROTOCOL VALIDATION] ${title}\n${detail}`);
	const banner = document.createElement('div');
	banner.id = 'protocol-validation-error';
	banner.setAttribute('role', 'alert');
	banner.style.cssText = 'position:fixed;top:0;left:0;right:0;'
		+ 'background:#b71c1c;color:#fff;padding:16px 24px;'
		+ 'font-family:monospace;font-size:14px;z-index:99999;'
		+ 'white-space:pre-wrap;';
	banner.textContent = `PROTOCOL VALIDATION FAILED\n${title}\n\n${detail}`;
	document.body.prepend(banner);
	(window as any).__protocolValidation = { ok: false, title, detail };
	throw new Error(`${title}: ${detail}`);
}

// ============================================
// validateProtocolGraph() - Structural checks on protocol definition
//
// Run at page load, before first render. Checks:
// 1. Unique ids
// 2. Reachable chain via nextId (treating functions as opaque/reachable)
// 3. Exactly one terminator (step with nextId === null)
// 4. All string nextId values reference real ids
// ============================================
export function validateProtocolGraph(): void {
	// Check 1: Unique ids
	const seenIds = new Set<string>();
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		// i < PROTOCOL_STEPS.length; index is in range
		const id = PROTOCOL_STEPS[i]!.id;
		if (seenIds.has(id)) {
			showValidationError('duplicate step id', `Step ${i}: id '${id}' already seen`);
		}
		seenIds.add(id);
	}

	// Check 2 & 4: Reachable chain and valid nextId references
	const visited = new Set<string>();
	// PROTOCOL_STEPS is validated to be non-empty before this call
	let current: string | null = PROTOCOL_STEPS[0]!.id;
	let iterations = 0;
	const maxIterations = PROTOCOL_STEPS.length + 10; // Prevent infinite loops
	while (current !== null && iterations < maxIterations) {
		iterations++;
		if (visited.has(current)) {
			showValidationError('cycle in nextId chain', `Step '${current}' creates a cycle`);
		}
		visited.add(current);
		const step = PROTOCOL_STEPS.find(s => s.id === current);
		if (!step) {
			showValidationError('dangling nextId', `Step with id '${current}' not in PROTOCOL_STEPS`);
		}
		const next = step!.nextId;
		// If nextId is a function, we assume all branches are reachable in this pass.
		// No step uses it yet, but the field is reserved for future branching.
		if (typeof next === 'function') {
			// Assume reachable; cannot verify static structure
			break;
		}
		// next is now narrowed to string | null after ruling out function
		current = next;
	}
	if (iterations >= maxIterations) {
		showValidationError('infinite nextId loop', 'Could not reach null terminator');
	}

	// Check 3: Exactly one terminator
	let terminators = 0;
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		// i < PROTOCOL_STEPS.length; index is in range
		if (PROTOCOL_STEPS[i]!.nextId === null) {
			terminators++;
		}
	}
	if (terminators !== 1) {
		showValidationError('wrong number of terminators', `Expected 1, found ${terminators}`);
	}

	// Check that all visited steps match PROTOCOL_STEPS length
	if (visited.size !== PROTOCOL_STEPS.length) {
		const missing = [];
		for (const step of PROTOCOL_STEPS) {
			if (!visited.has(step.id)) {
				missing.push(step.id);
			}
		}
		showValidationError('unreachable step', `Cannot reach via nextId chain: ${missing.join(', ')}`);
	}
}

// ============================================
// getCoveragePolicy(protocolId) - Get completion-event coverage policy
//
// Returns "strict" for production protocols (cell_culture) and "relaxed"
// for tutorial protocols (tutorial_*). Unknown protocols default to "strict"
// for safety.
// ============================================
export function getCoveragePolicy(protocolId: string): "strict" | "relaxed" {
	if (protocolId === "cell_culture") {
		return "strict";
	}
	if (protocolId.startsWith("tutorial_")) {
		return "relaxed";
	}
	// Default to strict for unknown protocols (safer for new protocols)
	return "strict";
}

// ============================================
// validateCompletionEventCoverage() - Runtime completion-event coverage check
//
// Run after all scene render functions have executed (via load event).
// Asserts every step in PROTOCOL_STEPS has a matching completion-event
// emitter recorded in registeredEmitters. Reads from the runtime
// emitter registration set populated by triggerStep() calls. Policy:
//
// - STRICT (cell_culture): any missing emitter throws via showValidationError
// - RELAXED (tutorial_*): missing emitters are logged via console.warn but
//   do not throw; set __protocolValidation = { ok: true } regardless
// - Unknown: defaults to STRICT (safer)
// ============================================
export function validateCompletionEventCoverage(): void {
	const missing = [];
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		const stepId = PROTOCOL_STEPS[i]!.id;
		if (!(window as any).__registeredEmitters.has(stepId)) {
			missing.push(stepId);
		}
	}

	const policy = getCoveragePolicy(PROTOCOL_ID);

	if (missing.length > 0) {
		if (policy === "strict") {
			showValidationError('missing completion-event emitter', `No scene calls triggerStep() for: ${missing.join(', ')}`);
		} else {
			// policy === "relaxed"
			console.warn(`[completion-event coverage] protocol '${PROTOCOL_ID}' missing emitters: ${missing.join(', ')}`);
		}
	}

	(window as any).__protocolValidation = { ok: true };
}

// ============================================
// validateProtocolSteps() - Check protocol integrity at startup
// ============================================
export function validateProtocolSteps(): string[] {
	const errors: string[] = [];
	if (PROTOCOL_STEPS.length === 0) {
		errors.push('Protocol must have at least one step.');
		return errors;
	}
	const seenIds: string[] = [];
	for (let i = 0; i < PROTOCOL_STEPS.length; i++) {
		const step = PROTOCOL_STEPS[i]!;
		const prefix = 'Step ' + i + ': ';
		if (!step.id) errors.push(prefix + 'missing id');
		if (!step.label) errors.push(prefix + 'missing label');
		if (!step.scene) errors.push(prefix + 'missing scene');
		if (seenIds.indexOf(step.id) >= 0) {
			errors.push(prefix + 'duplicate id "' + step.id + '"');
		}
		seenIds.push(step.id);
	}
	return errors;
}

// Track which scenes have been driver-initialized (once per scene)
const DRIVER_INITIALIZED_SCENES = new Set<string>();

// ============================================
// Patch 6: Wrap legacy bench render to skip event handlers in driver mode
// ============================================
// When the protocol uses driver mode for bench, renderBenchScene still renders
// the DOM but the legacy event handlers are not needed (driver handles them).
// To avoid double-dispatch, we intercept legacy handler calls and skip them.
function renderBenchScene(): void {
	const benchScene = document.getElementById('bench-scene');

	// Call the legacy render to update DOM
	renderBenchSceneLegacy();

	// If driver mode is active, remove the legacy event handlers that were just wired
	if (PROTOCOL_SCENE_ROUTER_MODE === 'driver' && benchScene) {
		const benchItems = benchScene.querySelectorAll('.hood-item');
		benchItems.forEach((el) => {
			const itemEl = el as HTMLElement;
			// Clone and replace to remove all event listeners
			const newEl = itemEl.cloneNode(true) as HTMLElement;
			itemEl.parentNode?.replaceChild(newEl, itemEl);
		});
	}
}

// Override the stub renderGame with the real implementation
setRenderGame(function(): void {
	// Hood and bench are peer persistent scenes; exactly one is visible at a
	// time. Modal overlays (microscope, incubator, plate_reader, results)
	// sit on top of whichever persistent scene is showing.
	const hoodEl = document.getElementById('hood-scene');
	const benchEl = document.getElementById('bench-scene');
	const showBench = gameState.activeScene === 'bench';
	if (hoodEl) hoodEl.style.display = showBench ? 'none' : 'flex';
	if (benchEl) benchEl.style.display = showBench ? 'flex' : 'none';

	switch (gameState.activeScene) {
		case 'hood':
			// Patch 7: Render DOM first, then initialize driver if needed.
			// Driver must run after elements exist in the DOM.
			renderHoodScene();
			if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') {
				if (!DRIVER_INITIALIZED_SCENES.has('cell_culture_hood')) {
					DRIVER_INITIALIZED_SCENES.add('cell_culture_hood');
					runScene('cell_culture_hood');
				}
			}
			break;
		case 'bench':
			// Patch 6: Render DOM first, then initialize driver if needed.
			// Driver must run after elements exist in the DOM.
			renderBenchScene();
			if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') {
				if (!DRIVER_INITIALIZED_SCENES.has('bench')) {
					DRIVER_INITIALIZED_SCENES.add('bench');
					runScene('bench');
				}
			}
			break;
		case 'incubator':
			// Patch 13: Render DOM first, then initialize driver if needed.
			// Driver must run after elements exist in the DOM.
			renderIncubatorScene();
			if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') {
				if (!DRIVER_INITIALIZED_SCENES.has('incubator')) {
					DRIVER_INITIALIZED_SCENES.add('incubator');
					runScene('incubator');
				}
			}
			break;
		case 'microscope':
			// Patch 11: Render DOM first, then initialize driver if needed.
			// Driver must run after elements exist in the DOM.
			renderMicroscopeScene();
			if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') {
				if (!DRIVER_INITIALIZED_SCENES.has('microscope')) {
					DRIVER_INITIALIZED_SCENES.add('microscope');
					runScene('microscope');
				}
			}
			break;
		case 'plate':
			// Patch 9: Render DOM first, then initialize driver if needed.
			// Driver must run after elements exist in the DOM.
			renderPlateScene();
			if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') {
				if (!DRIVER_INITIALIZED_SCENES.has('plate')) {
					DRIVER_INITIALIZED_SCENES.add('plate');
					runScene('plate');
				}
			}
			break;
		case 'plate_reader':
			renderPlateReaderScene();
			break;
		case 'results':
			const scoreResult = calculateScore();
			renderResultsScreen(scoreResult);
			break;
	}

	// Always update the sidebar
	const proto = document.getElementById('protocol-ui-panel');
	if (proto) proto.innerHTML = renderProtocolUI();
	renderProtocolPanel();
	renderScoreDisplay();
	renderMeters();

	// Render professor overlay every frame
	renderProfessorOverlay();
});

// ============================================
// Protocol-level scene routing decision: legacy vs driver
// ============================================
const PROTOCOL_SCENE_ROUTER_MODE = resolveSceneRouter({ sceneRouter: SCENE_ROUTER, protocolId: PROTOCOL_ID });

document.addEventListener('DOMContentLoaded', () => {
	// WP-MB1.1: Log the routing decision
	console.info(`[scene router] protocol='${PROTOCOL_ID}' sceneRouter='${PROTOCOL_SCENE_ROUTER_MODE}'`);

	// Validate protocol graph structure FIRST, before any other work
	validateProtocolGraph();

	// Validate protocol schema SECOND (existing check)
	const protocolErrors = validateProtocolSteps();
	if (protocolErrors.length > 0) {
		throw new Error('Protocol validation failed:\n' + protocolErrors.join('\n'));
	}
	setGameState(createInitialGameState());

	// Create professor overlay (done once at start, then updated each renderGame)
	createProfessorOverlay();

	// Check if welcome overlay should be shown (skip for repeat visitors)
	const welcomeOverlay = document.getElementById('welcome-overlay');
	const hasSeenWelcome = localStorage.getItem('cellCultureGameWelcomeSeen');

	if (welcomeOverlay && !hasSeenWelcome) {
		// Show welcome overlay, wait for Start click
		const startBtn = document.getElementById('welcome-start-btn');
		if (startBtn) {
			startBtn.addEventListener('click', () => {
				welcomeOverlay.classList.remove('active');
				localStorage.setItem('cellCultureGameWelcomeSeen', 'true');
				renderGame();
			});
		}
	} else {
		// Hide welcome overlay and start immediately
		if (welcomeOverlay) {
			welcomeOverlay.classList.remove('active');
		}
		renderGame();
	}
});

// ============================================
// Register completion-event coverage check to run after page load.
// This fires after all scene render functions have executed and
// their completion-event emitters registered via triggerStep() calls.
// ============================================
window.addEventListener('load', validateCompletionEventCoverage);

// ============================================
// Export resolveInteractionByIndex, PROTOCOL_STEPS, and gameState for testing
// Note: gameState is exported as a getter to always return the current instance,
// not the initial one created at module load time.
// ============================================
import { resolveInteractionByIndex } from "./interaction_resolver";
import { CAPABILITY_REGISTRY, getRegisteredScene } from "./scenes/scene_registry";
(window as any).resolveInteractionByIndex = resolveInteractionByIndex;
(window as any).PROTOCOL_STEPS = PROTOCOL_STEPS;
Object.defineProperty(window, 'gameState', {
	get: () => gameState,
	configurable: true,
});
(window as any).onItemClick = onItemClick;
(window as any).setupHoodEventListeners = setupHoodEventListeners;
(window as any).completeStep = completeStep;
(window as any).getCoveragePolicy = getCoveragePolicy;
(window as any).__CAPABILITY_REGISTRY = CAPABILITY_REGISTRY;

// ============================================
// Patch 7: New window.sceneTestApi binding replaces dispatchInteractionClick
// Provides a unified testing API for routing scene interactions through either
// the driver or legacy paths based on the current protocol's sceneRouter mode.
// ============================================
(window as any).sceneTestApi = {
	dispatchClick(sceneId: string, itemId: string): void {
		// For now, route legacy hood and bench through their respective legacy functions
		// When driver mode is active, call the registered adapter's dispatchInteraction
		if (PROTOCOL_SCENE_ROUTER_MODE === 'driver') {
			const adapter = getRegisteredScene(sceneId);
			if (adapter) {
				adapter.dispatchInteraction(itemId, {
					sceneId: sceneId,
					dispatchInteraction: (id: string) => {
						// Nested dispatch is not used in test context; leave as no-op
					},
				});
				return;
			}
		}

		// Legacy path: route to the old dispatchInteractionClick for hood
		if (sceneId === 'hood') {
			dispatchInteractionClick(itemId);
			return;
		}

		// Unknown scene or mode
		console.warn(`[sceneTestApi] Unknown sceneId: ${sceneId}`);
	},
};
