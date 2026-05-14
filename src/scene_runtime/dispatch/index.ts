/**
 * Pure click dispatcher: determines if a clicked target matches the next expected
 * step in the protocol's completionPath, and whether the step advances.
 */

import type { SceneConfig, ProtocolStep, CompletionPath } from '../contract';
import type { DispatchResult } from '../types';

/**
 * Dispatch a click on a target and return the match result.
 */
export function dispatchClick(
	scene: SceneConfig,
	step: ProtocolStep,
	target: { id: string; kind: 'item' | 'choice' | 'step' | 'well' }
): DispatchResult {
	const path = step.completionPath;

	switch (path.kind) {
		case 'interactionSequence':
			return dispatchInteractionSequence(scene, step, path, target);
		case 'directTool':
			return dispatchDirectTool(scene, step, path, target);
		case 'modal':
			return dispatchModal(scene, step, path, target);
		case 'multipleChoice':
			return dispatchMultipleChoice(scene, step, path, target);
		default:
			const exhaustive: never = path;
			return {
				matched: false,
				advances: false,
				reason: `Unknown completionPath kind: ${(exhaustive as any).kind}`,
			};
	}
}

/**
 * InteractionSequence: tool -> source -> destination, with optional plateTargets.
 * Supports both item clicks and well clicks (plateTargets expansion).
 */
function dispatchInteractionSequence(
	scene: SceneConfig,
	step: ProtocolStep,
	path: any,
	target: { id: string; kind: 'item' | 'choice' | 'step' | 'well' }
): DispatchResult {
	if (target.kind !== 'item' && target.kind !== 'well') {
		return {
			matched: false,
			advances: false,
			reason: 'interactionSequence expects item or well clicks',
		};
	}

	// Determine the sequence of expected clicks.
	// Support both flat form (tool, source, destination) and array form (interactions).
	const sequence: string[] = [];

	if (path.interactions && Array.isArray(path.interactions)) {
		// Array form: extract tool, source, destination from each interaction
		for (const interaction of path.interactions) {
			if (interaction.tool) {
				sequence.push(interaction.tool);
			}
			if (interaction.source) {
				sequence.push(interaction.source);
			}
			if (interaction.destination) {
				sequence.push(interaction.destination);
			}
		}
	} else {
		// Flat form: tool, source, destination at path level
		if (path.tool) {
			sequence.push(path.tool);
		}
		if (path.source) {
			sequence.push(path.source);
		}
		if (path.destination) {
			sequence.push(path.destination);
		}
	}

	if (sequence.length === 0) {
		return {
			matched: false,
			advances: false,
			reason: 'interactionSequence has no tool/source/destination',
		};
	}

	// Check item sequence first
	if (sequence.includes(target.id)) {
		return {
			matched: true,
			advances: false, // advances=true only when full sequence complete
			expectedNext: sequence[0],
		};
	}

	// Check plateTargets if this is a well click
	if (target.kind === 'well' && path.plateTargets && Array.isArray(path.plateTargets)) {
		const expandedWells = expandPlateTargets(path.plateTargets);
		if (expandedWells.includes(target.id)) {
			return {
				matched: true,
				advances: false,
				expectedNext: sequence[0],
			};
		}
	}

	// No match found
	return {
		matched: false,
		advances: false,
		reason: `Target ${target.id} not in interactionSequence or plateTargets`,
	};
}

/**
 * Expand plateTargets (rows x cols) into an array of well IDs.
 * Example: rows: ['B', 'C'], cols: [1, 2] -> ['B1', 'B2', 'C1', 'C2']
 */
function expandPlateTargets(plateTargets: any[]): string[] {
	const wells: string[] = [];
	for (const target of plateTargets) {
		if (target.rows && target.cols) {
			for (const row of target.rows) {
				for (const col of target.cols) {
					wells.push(`${row}${col}`);
				}
			}
		}
	}
	return wells;
}

//============================================

/**
 * DirectTool: click the tool to complete the step.
 */
function dispatchDirectTool(
	scene: SceneConfig,
	step: ProtocolStep,
	path: any,
	target: { id: string; kind: 'item' | 'choice' | 'step' | 'well' }
): DispatchResult {
	if (target.kind !== 'item') {
		return {
			matched: false,
			advances: false,
			reason: 'directTool expects item click',
		};
	}

	if (!path.tool) {
		return {
			matched: false,
			advances: false,
			reason: 'directTool missing tool field',
		};
	}

	if (target.id !== path.tool) {
		return {
			matched: false,
			advances: false,
			expectedNext: path.tool,
			reason: `Expected tool ${path.tool}, got ${target.id}`,
		};
	}

	return {
		matched: true,
		advances: true,
	};
}

//============================================

/**
 * Dispatch modal: openClick followed by advanceClick.
 * Returns wrongOrder=true if clicking advanceClick before openClick.
 */
function dispatchModal(
	scene: SceneConfig,
	step: ProtocolStep,
	path: any,
	target: { id: string; kind: 'item' | 'choice' | 'step' | 'well' }
): DispatchResult {
	if (target.kind !== 'item') {
		return {
			matched: false,
			advances: false,
			reason: 'modal expects item click',
		};
	}

	if (!path.openClick) {
		return {
			matched: false,
			advances: false,
			reason: 'modal missing openClick',
		};
	}

	// If clicking the openClick, it matches and does not advance.
	if (target.id === path.openClick) {
		return {
			matched: true,
			advances: false,
			expectedNext: path.advanceClick || path.openClick,
		};
	}

	// If an advanceClick is defined and they click it, check order.
	if (path.advanceClick && target.id === path.advanceClick) {
		// Advancing the modal completes the step. (Caller must track if modal opened.)
		return {
			matched: true,
			advances: true,
		};
	}

	// Clicked neither openClick nor advanceClick.
	return {
		matched: false,
		advances: false,
		expectedNext: path.openClick,
		reason: `Expected modal ${path.openClick}, got ${target.id}`,
	};
}

//============================================

/**
 * Dispatch multipleChoice: any choice click is valid, but only correct=true advances.
 */
function dispatchMultipleChoice(
	scene: SceneConfig,
	step: ProtocolStep,
	path: any,
	target: { id: string; kind: 'item' | 'choice' | 'step' | 'well' }
): DispatchResult {
	if (target.kind !== 'choice') {
		return {
			matched: false,
			advances: false,
			reason: 'multipleChoice expects choice click',
		};
	}

	if (!path.choices || !Array.isArray(path.choices)) {
		return {
			matched: false,
			advances: false,
			reason: 'multipleChoice missing or invalid choices',
		};
	}

	// Find the choice with matching id.
	const choice = path.choices.find((c: any) => c.id === target.id);
	if (!choice) {
		return {
			matched: false,
			advances: false,
			reason: `Choice ${target.id} not found in multipleChoice`,
		};
	}

	// The choice matches. Advances only if correct=true.
	const advances = choice.correct === true;
	return {
		matched: true,
		advances,
		reason: advances ? undefined : 'Choice incorrect',
	};
}
