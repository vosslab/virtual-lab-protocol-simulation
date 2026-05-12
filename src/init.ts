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
import { PROTOCOL_ID, PROTOCOL_STEPS } from "./protocol";
import {
	PROTOCOL_CATALOG,
	PROTOCOL_IDS,
	PROTOCOL_SUMMARY,
	REQUESTED_PROTOCOL_ID,
	SELECTED_PROTOCOL_ID,
	type ProtocolSummary,
} from "../generated/protocol_data";
import { completeStep, createInitialGameState, gameState, renderGame, setGameState, setRenderGame } from "./game_state";
import { createProfessorOverlay, renderProfessorOverlay } from "./professor_overlay";
import { renderProtocolUI } from "./protocol_ui";
import { calculateScore } from "./scoring";
import { renderMeters, renderProtocolPanel, renderResultsScreen, renderScoreDisplay } from "./ui_rendering";
import { runSceneRender, runScene } from "./scenes/scene_driver";

//============================================
// Side-effect imports: each per-scene adapter module registers itself with the
// scene registry and emits its completion-event registrations at module load.
// To add a new scene: (1) import its adapter module here, (2) add a `case` for
// its sceneId to the runSceneRender dispatch switch below.
//============================================
import "./scenes/capabilities/item_workspace";
import "./scenes/capabilities/modal_workspace";
import "./scenes/capabilities/plate_reader_workspace";
import "./scenes/capabilities/instrument_workspace";
import "./scenes/capabilities/incubator_workspace";
import "./scenes/capabilities/grid_counting_workspace";
import "./scenes/bench/bench";
import "./scenes/cell_culture_hood/cell_culture_hood";
import "./scenes/incubator/incubator";
import "./scenes/well_plate_workspace/well_plate_workspace";
import "./scenes/plate_reader/plate_reader";
import "./scenes/microscope/microscope";

const PROTOCOL_KIND_LABELS: Record<ProtocolSummary["kind"], string> = {
	full_protocol: "Full protocol",
	tutorial: "Tutorial",
};


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

function navigateToProtocol(protocolId: string): void {
	window.location.href = `${window.location.pathname}?protocol=${encodeURIComponent(protocolId)}`;
}

function navigateToLauncher(): void {
	window.location.href = window.location.pathname;
}

function deriveProtocolTitle(protocolId: string): string {
	if (protocolId === "cell_culture") {
		return "Cell Culture Protocol";
	}
	const titleWords = protocolId.replace(/^tutorial_/, "").split("_");
	const title = titleWords
		.map((word) => word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)
		.join(" ");
	return `${title} Tutorial`;
}

function getProtocolTitle(summary: ProtocolSummary): string {
	if (summary.title) {
		return summary.title;
	}
	return deriveProtocolTitle(summary.id);
}

function renderProtocolLauncherCard(summary: ProtocolSummary, primary: boolean): string {
	const title = escapeLauncherHtml(getProtocolTitle(summary));
	const kindLabel = escapeLauncherHtml(PROTOCOL_KIND_LABELS[summary.kind]);
	const stepText = summary.stepCount === 1 ? "1 step" : `${summary.stepCount} steps`;
	const description = summary.description
		? `<p class="protocol-card-description">${escapeLauncherHtml(summary.description)}</p>`
		: "";
	const primaryClass = primary ? " protocol-card-primary" : "";
	const buttonText = primary ? "Start full protocol" : "Start";
	const html = `
		<article class="protocol-card${primaryClass}" data-protocol-id="${escapeLauncherHtml(summary.id)}" tabindex="0">
			<div class="protocol-card-topline">
				<span class="protocol-card-kind">${kindLabel}</span>
				<span class="protocol-card-steps">${escapeLauncherHtml(stepText)}</span>
			</div>
			<h3>${title}</h3>
			${description}
			<button class="btn-primary protocol-card-start" type="button" data-protocol-id="${escapeLauncherHtml(summary.id)}">${escapeLauncherHtml(buttonText)}</button>
		</article>
	`;
	return html;
}

function escapeLauncherHtml(text: string): string {
	const map: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;",
	};
	return text.replace(/[&<>"']/g, (char): string => {
		const escaped = map[char];
		if (!escaped) throw new Error(`Unexpected character in escapeLauncherHtml: ${char}`);
		return escaped;
	});
}

function bindLauncherCards(container: HTMLElement): void {
	const cards = container.querySelectorAll<HTMLElement>("[data-protocol-id]");
	for (const card of cards) {
		const protocolId = card.dataset.protocolId;
		if (!protocolId) continue;
		card.addEventListener("click", () => {
			navigateToProtocol(protocolId);
		});
		card.addEventListener("keydown", (event: KeyboardEvent) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				navigateToProtocol(protocolId);
			}
		});
	}
}

function renderProtocolLauncher(): void {
	const launcher = document.getElementById("protocol-launcher");
	const gameContainer = document.getElementById("game-container");
	const welcomeOverlay = document.getElementById("welcome-overlay");
	const errorBanner = document.getElementById("protocol-launcher-error");
	const fullCard = document.getElementById("protocol-full-card");
	const tutorialGrid = document.getElementById("protocol-tutorial-grid");
	if (!launcher || !gameContainer || !fullCard || !tutorialGrid) {
		throw new Error("Protocol launcher DOM is incomplete.");
	}

	const fullSummaries: ProtocolSummary[] = [];
	const tutorialSummaries: ProtocolSummary[] = [];
	for (const protocolId of PROTOCOL_IDS) {
		const summary = PROTOCOL_CATALOG[protocolId].summary;
		if (summary.kind === "full_protocol") {
			fullSummaries.push(summary);
		} else {
			tutorialSummaries.push(summary);
		}
	}

	fullCard.innerHTML = fullSummaries
		.map((summary) => renderProtocolLauncherCard(summary, true))
		.join("");
	tutorialGrid.innerHTML = tutorialSummaries
		.map((summary) => renderProtocolLauncherCard(summary, false))
		.join("");
	bindLauncherCards(fullCard);
	bindLauncherCards(tutorialGrid);

	if (errorBanner) {
		if (REQUESTED_PROTOCOL_ID !== null && SELECTED_PROTOCOL_ID === null) {
			errorBanner.textContent = `Tutorial not found: ${REQUESTED_PROTOCOL_ID}. Choose one below.`;
			errorBanner.hidden = false;
		} else {
			errorBanner.textContent = "";
			errorBanner.hidden = true;
		}
	}

	if (welcomeOverlay) {
		welcomeOverlay.classList.remove("active");
	}
	gameContainer.hidden = true;
	launcher.hidden = false;
	document.body.classList.add("launcher-active");
}

function initializeWelcomeOverlay(): void {
	const welcomeOverlay = document.getElementById("welcome-overlay");
	const startBtn = document.getElementById("welcome-start-btn");
	const changeBtn = document.getElementById("welcome-change-tutorial-btn");
	const titleEl = document.getElementById("welcome-protocol-title");
	const kindEl = document.getElementById("welcome-protocol-kind");
	if (!welcomeOverlay || !startBtn) {
		renderGame();
		return;
	}

	if (titleEl) {
		titleEl.textContent = getProtocolTitle(PROTOCOL_SUMMARY);
	}
	if (kindEl) {
		const stepText = PROTOCOL_SUMMARY.stepCount === 1 ? "1 step" : `${PROTOCOL_SUMMARY.stepCount} steps`;
		kindEl.textContent = `${PROTOCOL_KIND_LABELS[PROTOCOL_SUMMARY.kind]} | ${stepText}`;
	}
	if (changeBtn) {
		changeBtn.addEventListener("click", navigateToLauncher);
	}
	document.addEventListener("click", (event: MouseEvent) => {
		const target = event.target;
		if (target instanceof Element && target.closest("#protocol-change-tutorial-btn")) {
			navigateToLauncher();
		}
	});

	welcomeOverlay.classList.add("active");
	startBtn.addEventListener("click", () => {
		welcomeOverlay.classList.remove("active");
		renderGame();
	});
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


// Override the stub renderGame with the real implementation
setRenderGame(function(): void {
	// Hood and bench are peer persistent scenes; exactly one is visible at a
	// time. Modal overlays (microscope, incubator, plate_reader, results)
	// sit on top of whichever persistent scene is showing.
	const hoodEl = document.getElementById('hood-scene');
	const benchEl = document.getElementById('bench-scene');
	const wellPlateEl = document.getElementById('well-plate-workspace-scene');
	const showBench = gameState.activeScene === 'bench';
	const showWellPlate = gameState.activeScene === 'well_plate_workspace';
	if (hoodEl) hoodEl.style.display = (showBench || showWellPlate) ? 'none' : 'flex';
	if (benchEl) benchEl.style.display = showBench ? 'flex' : 'none';
	if (wellPlateEl) wellPlateEl.style.display = showWellPlate ? 'flex' : 'none';

	// Each scene case: call runSceneRender (one-time per frame), then runScene if first time.
	// runSceneRender: adapter's render() method handles DOM update.
	// runScene: one-time driver initialization (registers interaction handlers, etc).
	switch (gameState.activeScene) {
		case 'hood':
			runSceneRender('cell_culture_hood');
			if (!DRIVER_INITIALIZED_SCENES.has('cell_culture_hood')) {
				DRIVER_INITIALIZED_SCENES.add('cell_culture_hood');
				runScene('cell_culture_hood');
			}
			break;
		case 'bench':
			runSceneRender('bench');
			if (!DRIVER_INITIALIZED_SCENES.has('bench')) {
				DRIVER_INITIALIZED_SCENES.add('bench');
				runScene('bench');
			}
			break;
		case 'incubator':
			runSceneRender('incubator');
			if (!DRIVER_INITIALIZED_SCENES.has('incubator')) {
				DRIVER_INITIALIZED_SCENES.add('incubator');
				runScene('incubator');
			}
			break;
		case 'microscope':
			runSceneRender('microscope');
			if (!DRIVER_INITIALIZED_SCENES.has('microscope')) {
				DRIVER_INITIALIZED_SCENES.add('microscope');
				runScene('microscope');
			}
			break;
		case 'well_plate_workspace':
			runSceneRender('well_plate_workspace');
			if (!DRIVER_INITIALIZED_SCENES.has('well_plate_workspace')) {
				DRIVER_INITIALIZED_SCENES.add('well_plate_workspace');
				runScene('well_plate_workspace');
			}
			break;
		case 'plate_reader':
			runSceneRender('plate_reader');
			if (!DRIVER_INITIALIZED_SCENES.has('plate_reader')) {
				DRIVER_INITIALIZED_SCENES.add('plate_reader');
				runScene('plate_reader');
			}
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

document.addEventListener('DOMContentLoaded', () => {
	if (SELECTED_PROTOCOL_ID === null) {
		renderProtocolLauncher();
		return;
	}

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

	initializeWelcomeOverlay();
});

// ============================================
// Register completion-event coverage check to run after page load.
// This fires after all scene render functions have executed and
// their completion-event emitters registered via triggerStep() calls.
// ============================================
window.addEventListener('load', () => {
	if (SELECTED_PROTOCOL_ID !== null) {
		validateCompletionEventCoverage();
	}
});

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
(window as any).completeStep = completeStep;
(window as any).getCoveragePolicy = getCoveragePolicy;
(window as any).__CAPABILITY_REGISTRY = CAPABILITY_REGISTRY;

// ============================================
// Patch 7: window.sceneTestApi binding for test dispatch
// Routes scene interactions through the registered adapter's dispatchInteraction.
// ============================================
(window as any).sceneTestApi = {
	dispatchClick(sceneId: string, itemId: string): void {
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

		// Unknown scene
		console.warn(`[sceneTestApi] Unknown sceneId: ${sceneId}`);
	},
};
