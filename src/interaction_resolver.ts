// ============================================
// interaction_resolver.ts - Data-driven click dispatcher
// ============================================
// Reads the active step's completionPath.interactions (K2 schema) for steps with
// kind: interactionSequence and turns a (selectedTool, clickedItem) pair into a
// structured result. Pure function. No side effects.
//
// Returns { kind: 'no-op' } when:
//   - no active step
//   - active step has no completionPath of kind interactionSequence
//   - no interaction matches the click

import type { ProtocolStep, Interaction } from "./constants";


export type InteractionResult =
	| { kind: 'no-op'; indexDelta?: 0; wrongOrder?: false }
	| { kind: 'load'; resultActor: string; resultLiquid: string; volumeMl: number; colorKey: string; indexDelta?: 0 | 1; wrongOrder?: false }
	| { kind: 'discharge'; completionEvent: string; destination: string; consumesVolumeMl: number; indexDelta?: 0 | 1; wrongOrder?: false }
	| { kind: 'error'; hint: string; indexDelta?: 0; wrongOrder?: false }
	| { kind: 'wrong_order'; indexDelta?: 0; wrongOrder: true };

// ============================================
// getInteractionSequence - Extract interaction array from K2 completionPath
// ============================================
// Helper to read the interaction sequence from step.completionPath (K2 schema).
// For interactionSequence kind: returns the interactions array directly.
// Returns null for all other kinds (directTool, modal), which are not handled
// by the resolver. directTool dispatch occurs via scene click handlers and
// data-walker-advance paths; modal dispatch via modal system.
//
function getInteractionSequence(step: ProtocolStep | null): readonly Interaction[] | null {
	if (!step || !step.completionPath) return null;
	if (step.completionPath.kind !== 'interactionSequence') return null;
	return step.completionPath.interactions;
}

// ============================================
// resolveInteraction - Pure dispatcher function
// ============================================
// Given selectedTool, clickedItem, activeStep, and optional heldLiquid state,
// attempt to match an interaction in the step's completionPath.interactions (K2 schema)
// and return a structured result.
//
// Matching algorithm:
// - For interactions with both source and destination (pass-through):
//   Match when the `tool` field matches selectedTool AND the step has a
//   completionEvent AND clickedItem matches either source or destination.
//   Result: discharge to the destination.
//
// - For interactions with only source (load):
//   Match when the `tool` field matches selectedTool AND clickedItem
//   matches source AND the `stateChange.heldLiquid` state change is defined.
//   Result: load action with the held liquid properties.
//
// - For interactions with only destination (discharge/apply):
//   Case 1 (tool-mediated discharge): `tool` matches selectedTool AND
//     clickedItem matches `destination`. If liquid is set,
//     heldLiquid.liquid must match. Result: discharge.
//   Case 2 (direct tool click): no selectedTool AND `tool` matches
//     clickedItem AND destination is defined.
//     Result: discharge (no volume consumed for direct clicks).
//
export function resolveInteraction(args: {
	selectedTool: string | null;
	clickedItem: string;
	activeStep: ProtocolStep | null;
	heldLiquid?: { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null };
}): InteractionResult {
	// Guard: no active step or no interaction sequence
	const interactions = getInteractionSequence(args.activeStep);
	if (!interactions || interactions.length === 0) {
		return { kind: 'no-op' };
	}

	// Walk through each interaction in the sequence, attempt to match
	for (let i = 0; i < interactions.length; i++) {
		const interaction = interactions[i];

		// Guard: ensure interaction is defined (array element cannot be undefined)
		if (interaction === undefined) {
			continue;
		}

		// Case 1: interaction has both source and destination (pass-through)
		// Example: aspirate_old_media has tool=aspirating_pipette, source=flask, destination=waste_container
		if (interaction.source && interaction.destination) {
			// Match: tool matches selectedTool AND completionEvent is defined AND
			// clickedItem matches source OR destination
			if (
				interaction.tool === args.selectedTool &&
				interaction.completionEvent &&
				(args.clickedItem === interaction.source || args.clickedItem === interaction.destination)
			) {
				return {
					kind: 'discharge',
					completionEvent: interaction.completionEvent,
					destination: interaction.destination,
					consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				};
			}
		}
		// Case 2: interaction has only source (load)
		// Example: pbs_wash first interaction - load PBS into pipette
		else if (interaction.source && !interaction.destination) {
			// Match: tool matches selectedTool AND clickedItem matches source
			// AND stateChange.heldLiquid is defined (this is a load interaction)
			if (
				interaction.tool === args.selectedTool &&
				args.clickedItem === interaction.source &&
				interaction.stateChange &&
				interaction.stateChange.heldLiquid
			) {
				const r = interaction.stateChange.heldLiquid;
				return {
					kind: 'load',
					resultActor: r.tool,
					resultLiquid: r.liquid,
					volumeMl: r.volumeMl,
					colorKey: r.colorKey,
				};
			}
		}
		// Case 3: interaction has only destination (discharge/apply)
		// Example: pbs_wash second interaction - discharge PBS into flask
		// Example: a discharge with no source (held liquid applied to destination)
		else if (!interaction.source && interaction.destination) {
			// Subcase 3a: Tool-mediated discharge
			// Match: tool matches selectedTool AND clickedItem matches destination
			// If liquid is set, heldLiquid.liquid must match
			if (interaction.tool === args.selectedTool && args.clickedItem === interaction.destination) {
				// If liquid requirement is set, enforce it
				if (interaction.liquid) {
					if (!args.heldLiquid || args.heldLiquid.liquid !== interaction.liquid) {
						// Liquid requirement not met; skip this interaction
						continue;
					}
				}
				return {
					kind: 'discharge',
					completionEvent: interaction.completionEvent ?? '',
					destination: interaction.destination,
					consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				};
			}

			// Subcase 3b: Direct tool click (no selectedTool required)
			// Example: legacy spray-style step with tool=ethanol_bottle destination=<some-id>
			// Student clicks the tool item directly (no prior tool selection)
			if (!args.selectedTool && interaction.tool === args.clickedItem && interaction.destination) {
				// Student clicked the tool itself; treat as self-discharge to destination
				return {
					kind: 'discharge',
					completionEvent: interaction.completionEvent ?? '',
					destination: interaction.destination,
					consumesVolumeMl: 0,
				};
			}
		}
	}

	// No interaction matched; return no-op so legacy code path continues
	return { kind: 'no-op' };
}

//============================================
// resolveInteractionByIndex - Index-aware, tool-first resolver (Patch 5)
//============================================
// Matches ONLY the required interaction at completionPath.interactions[interactionIndex].
// Enforces tool-first: a source/destination click requires the tool to be selected
// or held.
//
// Returns:
// - { kind, indexDelta: 0|1, wrongOrder: false } on success
// - { kind: 'wrong_order', indexDelta: 0, wrongOrder: true } on tool precondition failure or wrong click
//
// Tool-first enforcement:
// - Tool click: selectedTool or clickedItem matches interaction.tool -> indexDelta: 0
//   (tool selection itself does not advance; only the full logical interaction does)
// - Source click: tool must be selected or in heldLiquid.tool -> match source, indexDelta: 1
// - Destination click: tool must be selected or in heldLiquid.tool -> match destination, indexDelta: 1
// - Tool-only interactions (no source/destination): clicking tool -> indexDelta: 1
// - Direct interactions (no tool precondition): clicking destination -> indexDelta: 1
//
export function resolveInteractionByIndex(args: {
	selectedTool: string | null;
	clickedItem: string;
	activeStep: ProtocolStep | null;
	interactionIndex: number;
	heldLiquid?: { tool: string | null; liquid: string | null; volumeMl: number; colorKey: string | null };
}): InteractionResult {
	// Guard: no active step or no sequence
	const interactions = getInteractionSequence(args.activeStep);
	if (!interactions || interactions.length === 0) {
		return { kind: 'no-op' };
	}

	// Guard: index out of bounds
	if (args.interactionIndex < 0 || args.interactionIndex >= interactions.length) {
		return { kind: 'no-op' };
	}

	const interaction = interactions[args.interactionIndex];
	if (!interaction) {
		return { kind: 'no-op' };
	}

	// Helper: check if tool precondition is met (tool must be selected or held)
	const toolPreconditionMet = (): boolean => {
		// Tool is selected
		if (args.selectedTool === interaction.tool) {
			return true;
		}
		// Tool is held in liquid
		if (args.heldLiquid && args.heldLiquid.tool === interaction.tool) {
			return true;
		}
		return false;
	};

	// Helper: check if this is a tool click
	const isToolClick = (): boolean => {
		return args.clickedItem === interaction.tool;
	};

	// Helper: check if this is a matching source click
	const isMatchingSourceClick = (): boolean => {
		return interaction.source !== undefined && args.clickedItem === interaction.source;
	};

	// Helper: check if this is a matching destination click
	const isMatchingDestinationClick = (): boolean => {
		return interaction.destination !== undefined && args.clickedItem === interaction.destination;
	};

	// Case 1: Both source and destination (pass-through)
	if (interaction.source && interaction.destination) {
		// Tool click: tool-select mode; indexDelta: 0 (only the full interaction advances)
		if (isToolClick()) {
			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: interaction.destination,
				consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				indexDelta: 0,
				wrongOrder: false,
			};
		}

		// Source or destination click: requires tool precondition
		if ((isMatchingSourceClick() || isMatchingDestinationClick()) && toolPreconditionMet()) {
			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: interaction.destination,
				consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				indexDelta: 1,
				wrongOrder: false,
			};
		}

		// Tool precondition not met
		if (isMatchingSourceClick() || isMatchingDestinationClick()) {
			return { kind: 'wrong_order', indexDelta: 0, wrongOrder: true };
		}
	}
	// Case 2: Source only (load)
	else if (interaction.source && !interaction.destination) {
		// Tool click: tool-select mode; indexDelta: 0
		if (isToolClick()) {
			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: '',
				consumesVolumeMl: 0,
				indexDelta: 0,
				wrongOrder: false,
			};
		}

		// Source click: requires tool precondition
		if (isMatchingSourceClick() && toolPreconditionMet() && interaction.stateChange && interaction.stateChange.heldLiquid) {
			const r = interaction.stateChange.heldLiquid;
			return {
				kind: 'load',
				resultActor: r.tool,
				resultLiquid: r.liquid,
				volumeMl: r.volumeMl,
				colorKey: r.colorKey,
				indexDelta: 1,
				wrongOrder: false,
			};
		}

		// Tool precondition not met
		if (isMatchingSourceClick()) {
			return { kind: 'wrong_order', indexDelta: 0, wrongOrder: true };
		}
	}
	// Case 3: Destination only (discharge/apply)
	else if (!interaction.source && interaction.destination) {
		// Subcase 3a: Direct tool click (no prior tool selection)
		// Example: legacy spray-style step with tool=ethanol_bottle destination=<some-id>
		// Student clicks the tool directly when no tool is selected
		if (isToolClick() && !args.selectedTool && !args.heldLiquid && !interaction.source) {
			// This is a direct click with no prior tool selection required
			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: interaction.destination,
				consumesVolumeMl: 0,
				indexDelta: 1,
				wrongOrder: false,
			};
		}

		// Tool click with tool already selected: indexDelta: 0 (tool-select mode)
		if (isToolClick() && toolPreconditionMet()) {
			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: interaction.destination,
				consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				indexDelta: 0,
				wrongOrder: false,
			};
		}

		// Destination click: requires tool precondition OR direct: true
		if (isMatchingDestinationClick()) {
			// If liquid requirement is set, enforce it
			if (interaction.liquid) {
				if (!args.heldLiquid || args.heldLiquid.liquid !== interaction.liquid) {
					// Liquid requirement not met
					return { kind: 'wrong_order', indexDelta: 0, wrongOrder: true };
				}
			}

			// If tool precondition is required (unless direct: true), check it
			const directInteraction = (interaction as any).direct === true;
			if (interaction.tool && !directInteraction && !toolPreconditionMet()) {
				return { kind: 'wrong_order', indexDelta: 0, wrongOrder: true };
			}

			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: interaction.destination,
				consumesVolumeMl: interaction.consumesVolumeMl ?? 0,
				indexDelta: 1,
				wrongOrder: false,
			};
		}
	}
	// Case 4: Tool-only (no source, no destination)
	else if (!interaction.source && !interaction.destination) {
		// Tool-only interactions: clicking the tool advances the interaction sequence
		if (isToolClick()) {
			return {
				kind: 'discharge',
				completionEvent: interaction.completionEvent ?? '',
				destination: '',
				consumesVolumeMl: 0,
				indexDelta: 1,
				wrongOrder: false,
			};
		}
	}

	// No match; wrong order
	return { kind: 'wrong_order', indexDelta: 0, wrongOrder: true };
}
