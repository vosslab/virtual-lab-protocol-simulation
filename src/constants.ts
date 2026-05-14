// ============================================
// constants.ts - Game configuration and protocol definitions
// ============================================

// 96-well plate layout: 8 rows (A-H) x 12 columns (1-12)
import type { GameState } from "./game_state";


export const PLATE_ROWS = 8;
export const PLATE_COLS = 12;

// Drug concentration labels for plate layout
export const DRUG_CONCENTRATION_LABELS: string[] = ['0 (ctrl)', '0.1', '0.5', '1', '5', '10'];


// Volume constants (mL)
export const FLASK_MAX_VOLUME_ML = 20;
export const FLASK_STARTING_MEDIA_ML = 12;
export const FRESH_MEDIA_TARGET_ML = 15;
export const WELL_VOLUME_UL = 500; // microliters per well
export const DRUG_STOCK_CONCENTRATION_MM = 10; // millimolar stock solution (10 mM)

// Cell parameters
export const INITIAL_CELL_COUNT = 500000;
export const INITIAL_VIABILITY = 0.95;
export const INITIAL_CONFLUENCY = 0.6;

// Scoring weights (out of 100 total)
export const SCORE_WEIGHTS = {
	order: 30,
	cleanliness: 25,
	wastedMedia: 20,
	timing: 25,
};

// Star thresholds
export const STAR_THRESHOLDS = {
	threeStar: 80,
	twoStar: 50,
};


// Type definitions (used across all modules)

// Completion trigger specification: documents the wiring intent (scene + completionEvent)
// for each protocol step. Advisory in this pass; future refactors will
// use this for step-driven trigger resolution.
export type TriggerSpec = {
	scene: 'cell_culture_hood' | 'bench' | 'incubator' | 'microscope' | 'well_plate_workspace' | 'plate_reader';
	completionEvent: string;
};

// Explicit successor in the state machine. String form for linear transitions,
// function form reserved for future branching. null marks the final step.
// When adding a future step between X and Y, change X.nextId to the new id
// and point the new step's nextId at Y. Reordering is now local.
export type NextStep = string | null | ((state: GameState) => string | null);

// Interaction specification: one valid click in the interactionSequence of a protocol step.
// tool: the item the student must have selected (or click directly for single-click steps).
// source: the container to load from (load interactions).
// destination: the container to discharge into (discharge interactions).
// stateChange: optional state update applied when this interaction fires (e.g. heldLiquid).
// completionEvent: event name emitted when this interaction completes the step.
export interface Interaction {
	tool: string;
	source?: string;
	destination?: string;
	liquid?: string;
	volumeMl?: number;
	consumesVolumeMl?: number;
	completionEvent?: string;
	stateChange?: {
		heldLiquid?: {
			tool: string;
			liquid: string;
			volumeMl: number;
			colorKey: string;
		};
	};
}

//============================================
// Completion path types (SP-K2a)
//============================================

export interface CompletionPathInteractionSequence {
	kind: 'interactionSequence';
	interactions: Interaction[];
	plateTargets?: readonly PlateTarget[];  // optional: per-well liquid targets for plate scene
	tubeTargets?: readonly TubeTarget[];    // optional: microtube liquid targets for dilution prep
}

export interface CompletionPathDirectTool {
	kind: 'directTool';
	tool: string;
	completionEvent: string;
}

export interface CompletionPathModal {
	kind: 'modal';
	openClick?: string;  // optional: if omitted, modal is assumed to be already open from prior step
	advanceClick: string;
	completionEvent: string;
}

export type MultipleChoiceOption = {
	readonly id: string;
	readonly text: string;
	readonly correct?: boolean;
	readonly feedback: string;
};

export interface CompletionPathMultipleChoice {
	kind: 'multipleChoice';
	question: string;
	choices: readonly MultipleChoiceOption[];
	completionEvent: string;
}

export type CompletionPath = CompletionPathInteractionSequence | CompletionPathDirectTool | CompletionPathModal | CompletionPathMultipleChoice;

//============================================
// Well-liquid tracking for plateTargets (mirrors heldLiquid pattern for pipettes)
//============================================

export interface WellLiquid {
	readonly liquid: string;      // reagent id
	readonly volumeMl: number;    // volume in milliliters
	readonly colorKey: string;    // color role for rendering
}

export interface PlateTarget {
	readonly rows: readonly string[];     // e.g. ['B', 'C', 'D']
	readonly cols: readonly number[];     // 1-indexed: e.g. [1, 2, 3]
	readonly liquid: string;              // reagent id
	readonly volumeMl: number;            // volume per well
	readonly label: string;               // user-facing label
}

//============================================
// Microtube-liquid tracking for tubeTargets (mirrors wellLiquid pattern for dilution prep)
//============================================

export interface MicrotubeLiquid {
	readonly liquid: string;      // reagent id
	readonly volumeMl: number;    // volume in milliliters
	readonly colorKey: string;    // color role for rendering
}

export interface TubeTarget {
	readonly source: string;              // item id of stock or earlier dilution tube
	readonly diluent: string;             // reagent id, typically "distilled_water"
	readonly destination: string;         // item id of destination microtube
	readonly soluteVolumeMl: number;      // volume of solute to add
	readonly diluentVolumeMl: number;     // volume of diluent to add
	readonly resultLiquid: string;        // reagent id that ends up in destination
	readonly resultLabel: string;         // user-facing label
}

//============================================

export interface PlateMapAnnotation {
	readonly row?: string;
	readonly colRange?: readonly [number, number];
	readonly text: string;
}

export interface PlateMapSpec {
	readonly annotations?: readonly PlateMapAnnotation[];
}

export interface ProtocolStep {
	id: string;
	label: string;
	action: string;
	why: string;
	partId: string;
	dayId: string;
	stepIndex: number;
	requiredItems: string[];
	errorHints: Record<string, string>;
	scene: 'cell_culture_hood' | 'bench' | 'incubator' | 'microscope' | 'well_plate_workspace' | 'plate_reader';
	correctVolumeMl?: number;
	toleranceMl?: number;
	// Explicit successor for the state machine. null marks the final step.
	// Function form is reserved for future branching; unused in this pass.
	nextId: NextStep;
	// Declarative wiring intent. Advisory in this pass -- actual wiring still
	// goes through triggerStep() calls in scene handlers. Future refactors
	// will use this for step-driven completion trigger resolution.
	completionTrigger?: TriggerSpec | null;
	// Modal-driven steps reference a modal owner and screen name.
	modal?: { owner: 'drug_treatment' | 'microscope' | 'incubator' | 'plate' | 'plate_reader'; screen: string };
	// Pure incubation steps with no resolver interaction.
	isIncubation?: boolean;
	// Completion path (SP-K2). Describes the schema contract for how this step
	// gets completed. The kind discriminator selects one of three shapes:
	// interactionSequence, directTool, or modal.
	completionPath?: CompletionPath;
	// Plate-specific configuration (annotations for Row A labels, etc.)
	plateMap?: PlateMapSpec;
	// Derived list of items used in this step, ordered by first appearance.
	usedItems: string[];
	// Optional structured details (e.g., column-specific volumes) rendered as bullets.
	details?: readonly string[];
}



export interface WellData {
	row: number;
	col: number;
	hasCells: boolean;
	drugConcentrationUm: number;
	absorbance: number; // plate reader result
	metforminPresent?: boolean;
}

export interface CellState {
	totalCells: number;
	liveCells: number;
	deadCells: number;
	viability: number;
	confluency: number;
	positions: CellPosition[];
}

export interface CellPosition {
	x: number;
	y: number;
	alive: boolean;
	radius: number;
}

export interface ScoreResult {
	stars: number;
	totalPoints: number;
	categories: {
		dilutionAccuracy: ScoreCategory;
		plateMap: ScoreCategory;
		timing: ScoreCategory;
		mttTechnique: ScoreCategory;
		absorbancePlausibility: ScoreCategory;
	};
}

export interface ScoreCategory {
	points: number;
	maxPoints: number;
	feedback: string;
}
