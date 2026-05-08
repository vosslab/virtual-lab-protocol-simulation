// ============================================
// step_dispatch.ts - Derive scene-dispatch metadata from PROTOCOL_STEPS
// ============================================
// So scene handlers don't hardcode step-id lists. Exposes helpers to:
// - Find all modal-driven or incubation steps
// - Filter by scene, owner, or completion trigger status
// - Lookup step details by id

import type { ProtocolStep } from "./constants";
import { PROTOCOL_STEPS } from "./content/protocol_data";


export function findStepById(id: string): ProtocolStep | null {
	for (const step of PROTOCOL_STEPS) {
		if (step.id === id) {
			return step;
		}
	}
	return null;
}

export function getModalOwnedSteps(owner?: string): ProtocolStep[] {
	const result: ProtocolStep[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.modal) {
			if (!owner || step.modal.owner === owner) {
				result.push(step);
			}
		}
	}
	return result;
}

export function getIncubationSteps(): ProtocolStep[] {
	const result: ProtocolStep[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.isIncubation === true) {
			result.push(step);
		}
	}
	return result;
}

export function getStepsForScene(scene: string): ProtocolStep[] {
	const result: ProtocolStep[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.scene === scene) {
			result.push(step);
		}
	}
	return result;
}

export function getStepIdsRequiringTrigger(): string[] {
	const result: string[] = [];
	for (const step of PROTOCOL_STEPS) {
		if (step.completionTrigger) {
			result.push(step.id);
		}
	}
	return result;
}

export function isModalOwnedStep(stepId: string): boolean {
	const step = findStepById(stepId);
	return step !== null && step.modal !== undefined;
}

export function isIncubationStep(stepId: string): boolean {
	const step = findStepById(stepId);
	return step !== null && step.isIncubation === true;
}

export function getModalOwnerForStep(stepId: string): string | null {
	const step = findStepById(stepId);
	if (step && step.modal) {
		return step.modal.owner;
	}
	return null;
}
