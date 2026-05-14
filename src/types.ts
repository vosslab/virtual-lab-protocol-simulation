// ============================================
// types.ts - Shared content/protocol types for legacy content/* files
// ============================================
// These types support the legacy TC_PROTOCOL / TC_TOOLS / validateProtocol
// surface in src/legacy_tc_tools.ts and src/legacy_tc_validate.ts. They are not wired into the active runtime
// (src/init.ts) but exist so strict tsc --noEmit succeeds on these files.

export type TargetRole = "source" | "target" | "tool" | "reagent";

export interface ToolDefinition {
	id: string;
	label: string;
	iconAssetId: string;
	validTargets: string[];
}

export interface StepTarget {
	objectId: string;
	role: TargetRole;
}

export interface BaseStep {
	id: string;
	sceneId: string;
	title: string;
	allowedActions: string[];
	requiredTargets: StepTarget[];
	nextStepId: string | null;
}

export interface InstructionStep extends BaseStep {
	kind: "instruction";
}

export interface CheckpointStep extends BaseStep {
	kind: "checkpoint";
	rubricId?: string;
}

export type Step = InstructionStep | CheckpointStep;

export interface Protocol {
	id: string;
	title: string;
	steps: Step[];
}
