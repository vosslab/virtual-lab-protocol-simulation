/**
 * highlight/index.ts
 *
 * Pure highlight derivation: compute next-clickable and completed targets
 * for a protocol step given the set of clicks already performed.
 *
 * Pure function, no DOM, no state writes.
 */

import type { ProtocolStep, CompletionPath } from '../contract';
import type { HighlightState } from '../types';

//============================================

/**
 * Derive highlight state for a step based on completed clicks.
 *
 * Args:
 *   step: ProtocolStep with completionPath defining expected interactions.
 *   completedClicks: Array of target ids already clicked in this step.
 *
 * Returns:
 *   HighlightState with nextTargets and completedTargets arrays.
 */
export function deriveHighlights(
	step: ProtocolStep,
	completedClicks: string[]
): HighlightState {
	const path = step.completionPath;

	switch (path.kind) {
		case 'interactionSequence':
			return highlightInteractionSequence(path, completedClicks);
		case 'directTool':
			return highlightDirectTool(path, completedClicks);
		case 'modal':
			return highlightModal(path, completedClicks);
		case 'multipleChoice':
			return highlightMultipleChoice(path, completedClicks);
		default:
			const exhaustive: never = path;
			return {
				nextTargets: [],
				completedTargets: [],
			};
	}
}

//============================================

/**
 * InteractionSequence: highlights tool, then source, then destination in order.
 * Supports both flat form (tool, source, destination) and array form (interactions).
 * Also expands plateTargets (rows x cols) into well IDs when destination points to well_plate.
 */
function highlightInteractionSequence(
	path: any,
	completedClicks: string[]
): HighlightState {
	// Build the expected sequence.
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

	// Determine next target based on how many clicks have been completed.
	let nextTargets: string[] = [];
	const completedCount = completedClicks.length;

	if (completedCount < sequence.length) {
		const next = sequence[completedCount];
		if (next !== undefined) {
			// Check if this destination is well_plate and we have plateTargets
			if (next === 'well_plate' && path.plateTargets && Array.isArray(path.plateTargets)) {
				// Expand plateTargets to individual well IDs
				nextTargets = expandPlateTargets(path.plateTargets);
			} else {
				nextTargets = [next];
			}
		}
	}

	// Completed targets are those already clicked (items from sequence)
	// Also include clicked wells from plateTargets
	const completedTargets: string[] = [];
	for (const id of completedClicks) {
		if (sequence.includes(id)) {
			completedTargets.push(id);
		}
	}
	// Also add any clicked wells that match plateTargets
	if (path.plateTargets && Array.isArray(path.plateTargets)) {
		const expandedWells = expandPlateTargets(path.plateTargets);
		for (const wellId of expandedWells) {
			if (completedClicks.includes(wellId)) {
				completedTargets.push(wellId);
			}
		}
	}

	return {
		nextTargets,
		completedTargets,
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
 * DirectTool: single tool click highlights that tool.
 */
function highlightDirectTool(
	path: any,
	completedClicks: string[]
): HighlightState {
	if (!path.tool) {
		return {
			nextTargets: [],
			completedTargets: [],
		};
	}

	const isCompleted = completedClicks.includes(path.tool);

	return {
		nextTargets: isCompleted ? [] : [path.tool],
		completedTargets: isCompleted ? [path.tool] : [],
	};
}

//============================================

/**
 * Modal: highlights openClick first, then advanceClick after open.
 */
function highlightModal(
	path: any,
	completedClicks: string[]
): HighlightState {
	if (!path.openClick) {
		return {
			nextTargets: [],
			completedTargets: [],
		};
	}

	const openClicked = completedClicks.includes(path.openClick);

	// If modal not yet opened, highlight the openClick.
	if (!openClicked) {
		return {
			nextTargets: [path.openClick],
			completedTargets: [],
		};
	}

	// If modal is open and advanceClick exists, highlight it.
	if (path.advanceClick !== undefined && path.advanceClick !== null) {
		const advanceClicked = completedClicks.includes(path.advanceClick);
		return {
			nextTargets: advanceClicked ? [] : [path.advanceClick],
			completedTargets: [path.openClick],
		};
	}

	// Modal open but no advanceClick (shouldn't happen, but handle gracefully).
	return {
		nextTargets: [],
		completedTargets: [path.openClick],
	};
}

//============================================

/**
 * MultipleChoice: all choice ids are available for simultaneous clicking.
 */
function highlightMultipleChoice(
	path: any,
	completedClicks: string[]
): HighlightState {
	if (!path.choices || !Array.isArray(path.choices)) {
		return {
			nextTargets: [],
			completedTargets: [],
		};
	}

	// All choices are simultaneously available.
	const choiceIds = path.choices.map((c: any) => c.id);

	// If a choice has been clicked, mark it as completed.
	const completedTargets = completedClicks.filter((id) =>
		choiceIds.includes(id)
	);

	// All choice ids are next targets (choices remain available for re-selection).
	const nextTargets = choiceIds;

	return {
		nextTargets,
		completedTargets,
	};
}
