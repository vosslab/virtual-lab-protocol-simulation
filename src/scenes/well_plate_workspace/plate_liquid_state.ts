// LEGACY: superseded by src/scene_runtime/*. Do not extend.
//============================================
// plate/plate_liquid_state.ts - Pure state classification for well rendering
// Owns: computeTargetClassification - maps step + interaction index to well state sets
//============================================

import type { ProtocolStep, PlateTarget } from "../../constants";

export interface TargetClassification {
	completedWells: ReadonlySet<string>;
	activeWells: ReadonlySet<string>;
	futureWells: ReadonlySet<string>;
	currentTargetIndex: number;
	activeTarget: PlateTarget | null;
	totalTargets: number;
}

//============================================
// computeTargetClassification - Classify wells by target completion state
//
// Input: step (must have plateTargets in completionPath), interactionIndex
// Output: classification showing which wells are completed/active/future
//
// Logic:
// - currentTargetIndex = floor(interactionIndex / 2)
//   (each target = one load + one discharge interaction pair)
// - completedWells = union of all wells from plateTargets[0..currentTargetIndex-1]
// - activeWells = wells from plateTargets[currentTargetIndex] (or empty if past end)
// - futureWells = wells from plateTargets[currentTargetIndex+1..]
// - activeTarget = plateTargets[currentTargetIndex] or null if past end
//============================================
export function computeTargetClassification(
	step: ProtocolStep,
	interactionIndex: number
): TargetClassification {
	const plateTargets = step.completionPath?.kind === 'interactionSequence'
		? step.completionPath.plateTargets || []
		: [];

	if (plateTargets.length === 0) {
		return {
			completedWells: new Set(),
			activeWells: new Set(),
			futureWells: new Set(),
			currentTargetIndex: 0,
			activeTarget: null,
			totalTargets: 0,
		};
	}

	const currentTargetIndex = Math.floor(interactionIndex / 2);
	const completedSet = new Set<string>();
	const activeSet = new Set<string>();
	const futureSet = new Set<string>();

	for (let i = 0; i < plateTargets.length; i++) {
		const target = plateTargets[i]!;
		const wellKeys = target.rows.flatMap(row =>
			target.cols.map(col => `${row}${col}`)
		);

		if (i < currentTargetIndex) {
			// Past targets: completed
			wellKeys.forEach(key => completedSet.add(key));
		} else if (i === currentTargetIndex) {
			// Current target: active
			wellKeys.forEach(key => activeSet.add(key));
		} else {
			// Future targets: future
			wellKeys.forEach(key => futureSet.add(key));
		}
	}

	return {
		completedWells: completedSet,
		activeWells: activeSet,
		futureWells: futureSet,
		currentTargetIndex,
		activeTarget: currentTargetIndex < plateTargets.length ? plateTargets[currentTargetIndex]! : null,
		totalTargets: plateTargets.length,
	};
}
