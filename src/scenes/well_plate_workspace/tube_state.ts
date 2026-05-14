// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// tube_state.ts - Microtube state classification
// Mirrors plate_liquid_state.ts but for microtube tracking
//============================================

import type { ProtocolStep } from "../../constants";

export interface TubeStateClassification {
	readonly activeTube?: {
		readonly tubeId: string;
		readonly resultLabel: string;
	} | undefined;
	readonly completedTubes: string[];
	readonly futureTubes: string[];
}

//============================================
// computeTubeStateClassification - Classify tubes as active/completed/future
// Mirrors computeTargetClassification for tubeTargets (dilution prep steps)
//============================================
export function computeTubeStateClassification(
	step: ProtocolStep,
	interactionIndex: number,
): TubeStateClassification {
	const completionPath = step.completionPath;

	// Return empty classification if no tubeTargets
	if (!completionPath || completionPath.kind !== 'interactionSequence' || !completionPath.tubeTargets) {
		return {
			completedTubes: [],
			futureTubes: [],
		};
	}

	const tubeTargets = completionPath.tubeTargets;
	const interactions = completionPath.interactions;

	// Each tubeTarget corresponds to a pair of interactions: load + discharge
	// Completed = targetIndex < (interactionIndex / 2)
	// Active = targetIndex == floor(interactionIndex / 2) and still progressing
	// Future = targetIndex > floor(interactionIndex / 2)
	const completedTargetIndex = Math.floor((interactionIndex - 1) / 2);
	const activeTargetIndex = Math.floor(interactionIndex / 2);

	const completedTubes: string[] = [];
	const futureTubes: string[] = [];
	let activeTube: { tubeId: string; resultLabel: string } | undefined;

	for (let i = 0; i < tubeTargets.length; i++) {
		const target = tubeTargets[i]!;
		const tubeId = target.destination;

		if (i < completedTargetIndex) {
			completedTubes.push(tubeId);
		} else if (i === activeTargetIndex && interactionIndex < interactions.length) {
			activeTube = {
				tubeId,
				resultLabel: target.resultLabel,
			};
		} else {
			futureTubes.push(tubeId);
		}
	}

	return {
		activeTube,
		completedTubes,
		futureTubes,
	};
}
