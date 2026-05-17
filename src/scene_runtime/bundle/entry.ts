/**
 * src/scene_runtime/bundle/entry.ts
 *
 * Browser entry point for the scene runtime.
 *
 * Exports mountRuntime(rootElement, runtimeData) which:
 * 1. Loads the world from generated data.
 * 2. Renders the initial scene into the root element.
 * 3. Wires up click dispatch to update state.
 *
 * Includes a single top-level UI error boundary (the only one permitted in the runtime).
 * On initialization failure, displays a loud visible error to the developer and logs to console.
 */

import type { RuntimeWorld, SceneOperation, InteractionEvent, Interaction, ValidatorPreset, Step } from '../types';
import type { Clock } from '../render/clock';
import { renderScene } from '../render/scene';
import { applySceneOperation } from '../render/apply';
import { attachClickDispatch } from '../dispatch/click';
import { renderAdjustPanel } from '../chrome/adjust_panel';
import { renderNextButton } from '../chrome/next_button';
import { renderPromptPanel } from '../chrome/prompt_panel';
import { renderFeedback } from '../chrome/feedback_area';
import { mountSceneFrame } from '../chrome/scene_frame';
import { setProtocolCatalog, setSceneCatalog, setObjectCatalog } from '../loader/index';
import { loadWorld, getBaseObjectName, resolveSceneForTarget } from '../loader/world';

/**
 * Type for runtime data passed from the HTML embedding code.
 * Includes fully-resolved protocol, scenes, objects, and materials.
 */
export interface RuntimeData {
	world: RuntimeWorld;
	sceneId: string;
}

/**
 * Get the expected value from a target_with_value validator.
 * Returns a Record<string, value> mapping field names to expected values.
 */
function getExpectedValueFromValidator(validator: ValidatorPreset | Record<string, any>): Record<string, number | string | boolean> | null {
	if (typeof validator === 'object' && validator && 'preset' in validator && validator.preset === 'target_with_value' && 'value' in validator) {
		return validator.value as Record<string, number | string | boolean>;
	}
	return null;
}

/**
 * Get the field name from an adjust validator's expected value.
 * target_with_value for adjust has exactly one key (e.g., { set_volume: 200 }).
 */
function getFieldNameFromValidator(validator: ValidatorPreset | Record<string, any>): string | null {
	const expectedValue = getExpectedValueFromValidator(validator);
	if (expectedValue) {
		const keys = Object.keys(expectedValue);
		if (keys.length === 1) {
			const key = keys[0];
			if (key !== undefined) {
				return key;
			}
		}
	}
	return null;
}

/**
 * Evaluate the step validator for the current step.
 * For "sequence_complete" preset: pass if currentInteractionIndex >= sequence.length.
 * For "final_state_matches": compare world state to expected state (not yet implemented for Pilot 1).
 *
 * @param world The current runtime world.
 * @returns true if step validator passes; false otherwise.
 */
function evaluateStepValidator(world: RuntimeWorld): boolean {
	const step = world.protocol.steps[world.activeStepIndex];
	if (!step) {
		return false;
	}

	const validator = step.step_validator;
	if (typeof validator === 'object' && validator && 'preset' in validator) {
		if (validator.preset === 'sequence_complete') {
			// Pass if we've completed all interactions in the sequence
			return world.currentInteractionIndex >= step.sequence.length;
		}
		if (validator.preset === 'final_state_matches') {
			// TODO(pilot 1, non-blocking): implement final_state_matches validation
			// For now, treat as pass if sequence is complete
			return world.currentInteractionIndex >= step.sequence.length;
		}
	}

	return false;
}

/**
 * Derive the scene containing the first interaction's target object in a given step.
 *
 * Algorithm (same as resolveSceneForTarget):
 * 1. FIRST: if current activeSceneId contains the target, return it (no scene switch needed).
 * 2. SECOND: if multiple scenes contain the target, prefer one whose name starts with protocol_name + '_'.
 * 3. THIRD: only one match -> use it.
 * 4. FOURTH: ambiguous or missing target -> return null (content gap; runtime will handle).
 *
 * Returns the scene_name if found, or null if no scene contains the target or ambiguity cannot be resolved.
 */
function deriveSceneForStep(world: RuntimeWorld, step: Step): string | null {
	if (!step.sequence || step.sequence.length === 0) {
		return null;
	}

	const firstInteraction = step.sequence[0];
	if (!firstInteraction) {
		return null;
	}

	// Extract the base object name (strip subpart suffix like ".A1" or ".all_wells")
	const objectName = getBaseObjectName(firstInteraction.target);
	if (!objectName) {
		return null;
	}

	// Use the shared resolver with currentSceneId to prefer staying in the current scene
	// if it already contains the target.
	try {
		return resolveSceneForTarget(objectName, world.scenes, world.protocol.protocol_name, world.activeSceneId);
	} catch {
		// If ambiguity or missing target, return null to signal content gap.
		// The step will be orchestrated in the current scene, and if target is truly missing,
		// it will fail at interaction time with a clear error.
		return null;
	}
}

/**
 * Advance to the next step in the protocol.
 * Find the next step by name, reset interaction index, render the new prompt,
 * and orchestrate the first interaction. If next_step is null, show protocol complete feedback.
 *
 * Before orchestrating the first interaction, derive the expected scene from the new step's
 * first interaction's target object. If that scene differs from the current activeSceneId,
 * update activeSceneId and re-render the scene.
 */
function advanceStep(
	world: RuntimeWorld,
	adjustPanelContainer: HTMLElement,
	nextButtonContainer: HTMLElement,
	promptPanel: HTMLElement,
	feedbackArea: HTMLElement,
	sceneViewport: HTMLElement,
	simpleClock: Clock
): void {
	const currentStep = world.protocol.steps[world.activeStepIndex];
	if (!currentStep) {
		return;
	}

	// If next_step is null, protocol is complete
	if (currentStep.next_step === null) {
		renderNextButton(nextButtonContainer, { visible: false, onClick: () => {} });
		renderFeedback(feedbackArea, 'Protocol complete! You have successfully completed all steps.');
		return;
	}

	// Find the next step by name
	const nextStep = world.protocol.steps.find(s => s.step_name === currentStep.next_step);
	if (!nextStep) {
		throw new Error(`Next step "${currentStep.next_step}" not found in protocol.steps`);
	}

	// Find the index of the next step
	const nextStepIndex = world.protocol.steps.indexOf(nextStep);
	if (nextStepIndex < 0) {
		throw new Error(`Next step "${currentStep.next_step}" not found in protocol.steps array`);
	}

	// Update world state: advance to next step, reset interaction index
	world.activeStepIndex = nextStepIndex;
	world.currentInteractionIndex = 0;

	// Hide the next button
	renderNextButton(nextButtonContainer, { visible: false, onClick: () => {} });

	// Clear feedback area
	renderFeedback(feedbackArea, null);

	// Render the new step's prompt
	renderPromptPanel(promptPanel, nextStep);

	// Derive the expected scene from the new step's first interaction's target object.
	// If it differs from the current scene, update activeSceneId and re-render.
	const derivedScene = deriveSceneForStep(world, nextStep);
	if (derivedScene) {
		if (derivedScene !== world.activeSceneId) {
			world.activeSceneId = derivedScene;
		}
	} else {
		// Content gap: target not found or ambiguous. Log warning but stay in current scene.
		console.warn(
			`deriveSceneForStep returned null for step "${nextStep.step_name}". ` +
			`Target "${nextStep.sequence[0]?.target}" may not exist in any scene. ` +
			`Continuing in current scene: ${world.activeSceneId}`
		);
	}

	// Re-render the scene (may change if next step is in a different scene)
	renderScene(world, world.activeSceneId, sceneViewport);

	// Orchestrate the first interaction of the next step.
	// Use orchestrateNextInteractionWithCompletion so that when the first interaction
	// completes, we check if the step is complete (and show the next button).
	orchestrateNextInteractionWithCompletion(
		world,
		adjustPanelContainer,
		nextButtonContainer,
		promptPanel,
		feedbackArea,
		sceneViewport,
		simpleClock
	);
}

/**
 * Check if the current step is complete and show the next button if so.
 * Called after each interaction completes.
 */
function checkStepCompletion(
	world: RuntimeWorld,
	adjustPanelContainer: HTMLElement,
	nextButtonContainer: HTMLElement,
	promptPanel: HTMLElement,
	feedbackArea: HTMLElement,
	sceneViewport: HTMLElement,
	simpleClock: Clock
): void {
	// Check if all interactions in the current step are done
	const step = world.protocol.steps[world.activeStepIndex];
	if (!step || world.currentInteractionIndex < step.sequence.length) {
		// Step not complete yet
		return;
	}

	// All interactions done, evaluate step validator
	const validatorPassed = evaluateStepValidator(world);

	if (!validatorPassed) {
		// Validator failed; per outcome.on_failure: retry, restart the step
		world.currentInteractionIndex = 0;
		renderFeedback(feedbackArea, 'Step validation failed. Please try again.');
		orchestrateNextInteraction(world, adjustPanelContainer, simpleClock, () => {});
		return;
	}

	// Validator passed; show next button
	renderNextButton(nextButtonContainer, {
		visible: true,
		onClick: () => {
			advanceStep(world, adjustPanelContainer, nextButtonContainer, promptPanel, feedbackArea, sceneViewport, simpleClock);
		},
	});
}

/**
 * Mount the next required interaction's chrome (if needed).
 * For adjust gesture: mounts the adjust panel and wires the commit callback.
 * For click gesture: no special chrome; dispatch handles it.
 *
 * Clears the adjust panel container when advancing to a non-adjust interaction.
 */
function orchestrateNextInteraction(
	world: RuntimeWorld,
	adjustPanelContainer: HTMLElement,
	simpleClock: Clock,
	onInteractionComplete: () => void
): void {
	const step = world.protocol.steps[world.activeStepIndex];
	const interactionIdx = world.currentInteractionIndex;

	if (!step) {
		// No step found
		onInteractionComplete();
		return;
	}

	if (interactionIdx >= step.sequence.length) {
		// Step is complete; no more interactions to orchestrate.
		// Hide the adjust panel since we're done.
		adjustPanelContainer.style.display = 'none';
		adjustPanelContainer.style.pointerEvents = 'none';
		adjustPanelContainer.textContent = '';
		// Call the completion callback so step completion can be checked
		onInteractionComplete();
		return;
	}

	const interaction = step.sequence[interactionIdx];
	if (!interaction) {
		return;
	}

	if (interaction.gesture === 'adjust') {
		// Extract the field name from the validator's expected value.
		const fieldName = getFieldNameFromValidator(interaction.validator);
		if (!fieldName) {
			throw new Error(
				`adjust interaction on target "${interaction.target}" has no field name ` +
				`in validator.value. Validator: ${JSON.stringify(interaction.validator)}`
			);
		}

		// Get the target object to find current value and range.
		const targetParts = interaction.target.split('.');
		const objectName = targetParts[0];
		if (!objectName) {
			throw new Error(`invalid target "${interaction.target}": no object name found`);
		}
		const obj = world.objects[objectName];

		if (!obj) {
			throw new Error(`Object "${objectName}" referenced by adjust interaction not found in world.objects`);
		}

		// Find the state field matching fieldName.
		const stateField = obj.state_fields.find((f: any) => f.field_name === fieldName);
		if (!stateField) {
			throw new Error(
				`Object "${objectName}" has no state field "${fieldName}" required by adjust interaction`
			);
		}

		// Get the current value.
		const currentState = world.objectStates[objectName];
		if (!currentState) {
			throw new Error(`Object "${objectName}" has no state entry in world.objectStates`);
		}
		const currentValue = currentState[fieldName] as number;

		// Get the expected value (the validation target).
		const expectedValue = getExpectedValueFromValidator(interaction.validator);
		if (!expectedValue) {
			throw new Error(`adjust interaction missing expected value in validator`);
		}

		// Make the adjust panel container visible.
		adjustPanelContainer.style.display = 'block';

		// Render the adjust panel.
		renderAdjustPanel(adjustPanelContainer, {
			field: fieldName as any,
			current: currentValue || 0,
			range: {
				min: stateField.min || 0,
				max: stateField.max || 1000,
				step: stateField.step || 1,
			},
			onCommit: (value: number) => {
				// Validate: committed value must match expected value.
				const expectedNum = expectedValue[fieldName];
				if (value !== expectedNum) {
					// Wrong value; don't advance. In a full UI, render feedback here.
					console.warn(
						`adjust value mismatch: expected ${expectedNum}, got ${value}`
					);
					return;
				}

				// Apply the ObjectStateChange from the interaction's response.
				let updatedWorld = world;
				for (const sceneOp of interaction.response.scene_operations) {
					updatedWorld = applySceneOperation(updatedWorld, sceneOp, simpleClock);
				}

				// Update the world state.
				Object.assign(world, updatedWorld);

				// Advance to the next interaction.
				world.currentInteractionIndex++;

				// Re-render the scene with updated state.
				const sceneViewport = document.querySelector('[data-testid="scene-viewport"]');
				if (sceneViewport && sceneViewport instanceof HTMLElement) {
					renderScene(updatedWorld, updatedWorld.activeSceneId, sceneViewport);
				}

				// Recurse to mount the next interaction's chrome (if any).
				// Pass the same onInteractionComplete callback through the recursion
				// so it fires after all chained interactions complete.
				orchestrateNextInteraction(world, adjustPanelContainer, simpleClock, onInteractionComplete);
			},
		});
	} else {
		// Non-adjust gesture (click, drag, select, type).
		// Hide the adjust panel since it's not needed for this interaction.
		adjustPanelContainer.style.display = 'none';
		adjustPanelContainer.style.pointerEvents = 'none';
		adjustPanelContainer.textContent = '';
	}
}

/**
 * Wrapper for orchestrateNextInteraction that also includes the chrome containers
 * and clock needed for step completion checks.
 * Provided for adjust interactions that complete and need to check step completion.
 */
function orchestrateNextInteractionWithCompletion(
	world: RuntimeWorld,
	adjustPanelContainer: HTMLElement,
	nextButtonContainer: HTMLElement,
	promptPanel: HTMLElement,
	feedbackArea: HTMLElement,
	sceneViewport: HTMLElement,
	simpleClock: Clock
): void {
	orchestrateNextInteraction(world, adjustPanelContainer, simpleClock, () => {
		// After orchestrating the next interaction, check if the step is now complete
		checkStepCompletion(world, adjustPanelContainer, nextButtonContainer, promptPanel, feedbackArea, sceneViewport, simpleClock);
	});
}

/**
 * Simple production clock implementation for the browser.
 * Schedules callbacks to fire after a specified duration.
 */
const simpleClock: Clock = {
	schedule(durationMs: number, callback: () => void): () => void {
		const timeoutId = setTimeout(callback, durationMs);
		return () => clearTimeout(timeoutId);
	},
};

/**
 * Check if a clicked targetId matches the expected target.
 * Handles both direct matches and subpart-as-group semantics:
 * if the expected target is a group and the emitted targetId is a member of that group,
 * the click is accepted as satisfying the group target.
 */
function isTargetSatisfied(expectedTarget: string, emittedTargetId: string, world: RuntimeWorld): boolean {
	// Direct match: clicked exactly what was expected.
	if (expectedTarget === emittedTargetId) {
		return true;
	}

	// Subpart-as-group semantics: if expectedTarget is <object>.<group_id> and emittedTargetId
	// is <object>.<subpart_id>, check if subpart_id is a member of group_id.
	const expectedParts = expectedTarget.split('.');
	const emittedParts = emittedTargetId.split('.');

	if (expectedParts.length === 2 && emittedParts.length === 2) {
		const expectedObject = expectedParts[0] as string;
		const expectedGroup = expectedParts[1] as string;
		const emittedObject = emittedParts[0] as string;
		const emittedSubpart = emittedParts[1] as string;

		// Objects must match.
		if (expectedObject !== emittedObject) {
			return false;
		}

		// Get the object from the world.
		const obj = world.objects[expectedObject];
		if (!obj) {
			return false;
		}

		// Get the subpart_groups structure.
		const structure = obj.structure as any;
		if (!structure || !structure.subpart_groups) {
			return false;
		}

		// Search all groups for one with the expectedGroup name that contains emittedSubpart.
		for (const groupCategory of Object.values(structure.subpart_groups)) {
			const groupCat = groupCategory as any;
			if (groupCat.members) {
				for (const member of groupCat.members) {
					if (member.name === expectedGroup && member.contains && member.contains.includes(emittedSubpart)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}

/**
 * Mount the scene runtime into a DOM element.
 *
 * Loads one scene, renders it, and wires up interaction dispatch.
 * Fails loudly if the world or scene is invalid.
 *
 * @param rootElement The HTML element to render the scene into.
 * @param runtimeData The pre-assembled RuntimeWorld and initial scene id.
 * @throws If initialization fails, after displaying a visible error.
 */
export function mountRuntime(rootElement: HTMLElement, runtimeData: RuntimeData): void {
	try {
		const { world, sceneId } = runtimeData;

		// Expose the runtime data globally for walkers and debugging.
		// This allows Playwright tests to access the protocol config.
		(globalThis as any).__RUNTIME_PROTOCOL_CONFIG = runtimeData;

		// Validate inputs.
		if (!rootElement) {
			throw new Error('mountRuntime: rootElement is required');
		}
		if (!world) {
			throw new Error('mountRuntime: runtimeData.world is required');
		}
		if (!sceneId) {
			throw new Error('mountRuntime: runtimeData.sceneId is required');
		}

		// Validate that the scene exists in the world.
		if (!(sceneId in world.scenes)) {
			throw new Error(
				`mountRuntime: scene '${sceneId}' not found in world.scenes. ` +
					`Available scenes: ${Object.keys(world.scenes).join(', ')}`
			);
		}

		// Render the initial scene.
		renderScene(world, sceneId, rootElement);

		// Wire up click dispatch on the rendered SVG.
		// Clicks on elements with data-target-id trigger a state update.
		attachClickDispatch(rootElement, (interactionEvent: InteractionEvent) => {
			const targetId = interactionEvent.targetId;
			const gesture = interactionEvent.gesture;

			// For this smoke test, a click on media_bottle should toggle its material_name.
			// In a real protocol, the click would be validated against the current step's
			// interaction sequence.
			// For now, just apply a simple state change to demonstrate the full path.

			const objectName = targetId;
			if (!(objectName in world.objects)) {
				console.warn(`Click target '${objectName}' not found in world.objects`);
				return;
			}

			if (gesture !== 'click') {
				console.log(`Gesture '${gesture}' not handled in smoke test`);
				return;
			}

			// Apply a mock ObjectStateChange: toggle material_name between 'empty' and 'media'.
			const currentState = world.objectStates[objectName];
			const currentMaterial = currentState?.material_name as string | undefined;
			const nextMaterial = currentMaterial === 'media' ? 'empty' : 'media';

			const sceneOp: SceneOperation = {
				type: 'ObjectStateChange',
				target: objectName,
				state: {
					material_name: nextMaterial,
				},
			};

			try {
				const updatedWorld = applySceneOperation(world, sceneOp, simpleClock);

				// Update the world reference (in a real app, this would trigger a re-render).
				Object.assign(world, updatedWorld);

				// Re-render the scene to show the updated state.
				renderScene(updatedWorld, sceneId, rootElement);
			} catch (err) {
				console.error(`Failed to apply state change for '${objectName}':`, err);
			}
		});
	} catch (err) {
		// Top-level UI error boundary (the ONLY one permitted in the runtime).
		// Display the error visibly to the developer and log the full stack.
		const errorMsg = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : '';

		// Create a visible error display.
		const errorDiv = document.createElement('div');
		errorDiv.style.cssText =
			'position: fixed; top: 10px; left: 10px; right: 10px; background-color: #ffcccc; ' +
			'border: 3px solid #cc0000; padding: 20px; font-family: monospace; ' +
			'font-size: 12px; color: #cc0000; white-space: pre-wrap; word-break: break-word; z-index: 10000;';
		errorDiv.textContent = `RUNTIME INITIALIZATION ERROR\n\n${errorMsg}\n\n${errorStack}`;
		document.body.insertBefore(errorDiv, document.body.firstChild);

		// Log to console and re-throw.
		console.error('RUNTIME INITIALIZATION ERROR:', errorMsg, errorStack);
		throw err;
	}
}

/**
 * Load and mount a protocol by name, invoking the bundled catalogs.
 *
 * Architectural flow:
 * 1. Imports PROTOCOL_CATALOG, SCENE_CATALOG, OBJECT_CATALOG from bundled generated data.
 * 2. Calls setProtocolCatalog, setSceneCatalog, setObjectCatalog to inject them.
 * 3. Calls loadWorld(protocolName) to assemble the RuntimeWorld from the catalogs.
 * 4. Calls renderScene to display the initial scene.
 * 5. Mounts chrome (scene viewport, prompt, feedback, adjust panel, next button).
 * 6. Orchestrates the next required interaction (mount adjust panel if needed).
 * 7. Wires attachClickDispatch for click interactions.
 *
 * @param rootElement The HTML element to render the scene into.
 * @param protocolName The protocol to load and mount (e.g., "mtt_solubilization_readout").
 * @throws If initialization fails, after displaying a visible error.
 */
export async function loadAndMountByProtocolName(
	rootElement: HTMLElement,
	protocolName: string
): Promise<void> {
	try {
		// Import the bundled catalogs from generated data.
		// esbuild will resolve these relative imports to the bundled paths.
		const { PROTOCOL_CATALOG } = await import('../../../generated/protocol_data');
		const { SCENE_CATALOG } = await import('../../../generated/scene_data');
		const { OBJECT_CATALOG } = await import('../../../generated/object_data');

		// Validate inputs.
		if (!rootElement) {
			throw new Error('loadAndMountByProtocolName: rootElement is required');
		}
		if (!protocolName || typeof protocolName !== 'string') {
			throw new Error('loadAndMountByProtocolName: protocolName must be a non-empty string');
		}

		// Inject the catalogs into the loaders.
		setProtocolCatalog(PROTOCOL_CATALOG);
		setSceneCatalog(SCENE_CATALOG);
		setObjectCatalog(OBJECT_CATALOG);

		// Assemble the RuntimeWorld by loading the protocol and all referenced scenes/objects/materials.
		const world = loadWorld(protocolName as any, {
			loadProtocol: (name: any) => {
				if (!(name in PROTOCOL_CATALOG)) {
					throw new Error(`protocol "${name}" not found in PROTOCOL_CATALOG`);
				}
				const protocol = PROTOCOL_CATALOG[name];
				if (!protocol) {
					throw new Error(`protocol "${name}" is null or undefined in PROTOCOL_CATALOG`);
				}
				return protocol;
			},
			loadScene: (name: any) => {
				if (!(name in SCENE_CATALOG)) {
					throw new Error(`scene "${name}" not found in SCENE_CATALOG`);
				}
				const scene = SCENE_CATALOG[name];
				if (!scene) {
					throw new Error(`scene "${name}" is null or undefined in SCENE_CATALOG`);
				}
				return scene;
			},
			loadObject: (name: any) => {
				if (!(name in OBJECT_CATALOG)) {
					throw new Error(`object "${name}" not found in OBJECT_CATALOG`);
				}
				const obj = OBJECT_CATALOG[name];
				if (!obj) {
					throw new Error(`object "${name}" is null or undefined in OBJECT_CATALOG`);
				}
				return obj;
			},
			loadMaterial: (protocol: any, name: string) => {
				if (!protocol.materials || !(name in protocol.materials)) {
					throw new Error(`material "${name}" not found in protocol "${protocol.protocol_name}"`);
				}
				const material = protocol.materials[name];
				if (!material) {
					throw new Error(`material "${name}" is null or undefined in protocol "${protocol.protocol_name}"`);
				}
				return material;
			},
			scenesContainingObject: (objectName: string) => {
				const matching: string[] = [];
				for (const sceneName of Object.keys(SCENE_CATALOG)) {
					const scene = SCENE_CATALOG[sceneName];
					if (scene && Array.isArray(scene.placements)) {
						if (scene.placements.some((p: any) => p.object_name === objectName)) {
							matching.push(sceneName);
						}
					}
				}
				return matching;
			},
			objectCatalog: OBJECT_CATALOG,
		});

		// Expose the runtime world globally for walkers and debugging.
		(globalThis as any).__RUNTIME_PROTOCOL_CONFIG = {
			world,
			sceneId: world.activeSceneId,
			protocol: world.protocol,
		};

		// Mount the scene frame chrome (viewport, prompt, feedback, next button)
		const { sceneViewport, promptPanel, feedbackArea, nextButton } = mountSceneFrame(rootElement);

		// Create a container for the adjust panel (separate from the scene root,
		// since renderScene clears the root with innerHTML = '').
		const adjustPanelContainer = document.createElement('div');
		adjustPanelContainer.style.cssText =
			'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
			'background: white; border: 1px solid #ccc; padding: 20px; border-radius: 4px; ' +
			'display: none; z-index: 100;';
		document.body.appendChild(adjustPanelContainer);

		// Render the initial scene into the viewport.
		renderScene(world, world.activeSceneId, sceneViewport);

		// Render the initial step's prompt
		const initialStep = world.protocol.steps[world.activeStepIndex];
		if (initialStep) {
			renderPromptPanel(promptPanel, initialStep);
		}

		// Wire up click dispatch on the rendered SVG.
		// Click interactions are processed here; adjust interactions are orchestrated separately.
		attachClickDispatch(sceneViewport, (interactionEvent: InteractionEvent) => {
			try {
				const step = world.protocol.steps[world.activeStepIndex];
				if (!step) {
					console.warn('No active step');
					return;
				}

				const interactionIdx = world.currentInteractionIndex;
				if (interactionIdx >= step.sequence.length) {
					console.warn('Interaction index out of range');
					return;
				}

				const interaction = step.sequence[interactionIdx];
				if (!interaction) {
					console.warn('Interaction is undefined');
					return;
				}

				// Only handle click gestures here; adjust is handled by orchestrator.
				if (interaction.gesture !== 'click') {
					console.warn(
						`Dispatch received non-click gesture "${interaction.gesture}"; ` +
						`this should be handled by the orchestrator.`
					);
					return;
				}

				const { targetId } = interactionEvent;

				// Validate that the clicked target matches the expected target.
				// Accepts both direct matches and subpart-as-group semantics.
				if (!isTargetSatisfied(interaction.target, targetId, world)) {
					console.warn(
						`Wrong target: expected "${interaction.target}", got "${targetId}"`
					);
					return;
				}

				// Apply the ObjectStateChange operations from the interaction's response.
				let updatedWorld = world;
				for (const sceneOp of interaction.response.scene_operations) {
					updatedWorld = applySceneOperation(updatedWorld, sceneOp, simpleClock);
				}

				// Update world state.
				Object.assign(world, updatedWorld);

				// Advance to the next interaction.
				world.currentInteractionIndex++;

				// Re-render the scene with updated state.
				renderScene(updatedWorld, updatedWorld.activeSceneId, sceneViewport);
			} finally {
				// ALWAYS orchestrate the next interaction after a click, even if there's an error.
				// This ensures the step completion check always happens.
				orchestrateNextInteractionWithCompletion(
					world,
					adjustPanelContainer,
					nextButton,
					promptPanel,
					feedbackArea,
					sceneViewport,
					simpleClock
				);
			}
		});

		// Orchestrate the first interaction (mount adjust panel if the first interaction is adjust).
		orchestrateNextInteractionWithCompletion(
			world,
			adjustPanelContainer,
			nextButton,
			promptPanel,
			feedbackArea,
			sceneViewport,
			simpleClock
		);
	} catch (err) {
		// Top-level UI error boundary (the ONLY one permitted in the runtime).
		const errorMsg = err instanceof Error ? err.message : String(err);
		const errorStack = err instanceof Error ? err.stack : '';

		const errorDiv = document.createElement('div');
		errorDiv.style.cssText =
			'position: fixed; top: 10px; left: 10px; right: 10px; background-color: #ffcccc; ' +
			'border: 3px solid #cc0000; padding: 20px; font-family: monospace; ' +
			'font-size: 12px; color: #cc0000; white-space: pre-wrap; word-break: break-word; z-index: 10000;';
		errorDiv.textContent = `RUNTIME INITIALIZATION ERROR\n\n${errorMsg}\n\n${errorStack}`;
		document.body.insertBefore(errorDiv, document.body.firstChild);

		console.error('RUNTIME INITIALIZATION ERROR:', errorMsg, errorStack);
		throw err;
	}
}
