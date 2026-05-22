/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/**
 * types.ts
 *
 * Comprehensive scene runtime types. Defines the canonical TypeScript shapes
 * for all generated data (protocol, scene, object, material) and all runtime
 * state shapes (layout, dispatch, highlight, world).
 *
 * This is the single source of truth for generated-data imports; builders emit
 * data that must match these types exactly. Types here are widened to match
 * actual builder-emitted data (reality wins over aspiration).
 *
 * No imports from src/scenes/ or src/legacy_*. No runtime code; types only.
 *
 * Forward-compatibility unions (e.g., 'complete' | string, 'mini_protocol' | string)
 * intentionally widen types to allow new variants without schema changes.
 */

// ============================================
// Generated data: Material config

export interface MaterialConfig {
  label: string;
  display_color: { light: string; dark: string };
}

// ============================================
// Generated data: Gesture and validator types

export type GestureKind = "click" | "drag" | "adjust" | "select" | "type";

export type ValidatorPreset =
  | { preset: "correct_target" }
  | { preset: "correct_choice" }
  | {
      preset: "target_with_value";
      value: Record<string, number | string | boolean>;
    };

export type StepValidatorPreset =
  | { preset: "sequence_complete" }
  | { preset: "final_state_matches" };

// ============================================
// Generated data: Scene operations

export type SceneOperationType =
  | "ObjectStateChange"
  | "CursorAttach"
  | "SceneChange"
  | "LayoutMove"
  | "TimedWait";

export interface SceneOperation {
  type: SceneOperationType | string; // string allows unknown ops for forward compat
  target?: string;
  state?: Record<string, number | string | boolean>;
  operation?: string;
  to_scene?: string;
  duration_min?: number; // TimedWait minimum duration in seconds
  display?: string; // TimedWait display label
  transition?: string; // SceneChange transition effect name
}

export interface Response {
  scene_operations: SceneOperation[];
  feedback?: string;
}

// ============================================
// Generated data: Protocol steps and interactions

export interface Interaction {
  target: string;
  gesture: GestureKind | string; // string allows unknown gestures for forward compat
  validator: ValidatorPreset | Record<string, unknown>; // union for flexibility
  response: Response;
}

export interface Step {
  step_name: string;
  prompt: string;
  sequence: Interaction[];
  step_validator: StepValidatorPreset | Record<string, unknown>;
  outcome: { on_success: "complete" | string; on_failure: "retry" | string };
  next_step: string | null;
}

export interface LearningBlock {
  objectives?: string;
  outcomes?: string;
  goals?: string;
}

export interface ProtocolConfig {
  protocol_type: "mini_protocol" | "sequence_runner" | "dev_smoke" | string;
  protocol_name: string;
  entry_step: string;
  learning?: LearningBlock;
  steps: Step[];
  materials: Record<string, MaterialConfig>;
}

// ============================================
// Generated data: Scene configuration

export interface ZoneConfig {
  id: string;
  bounds: { left: number; right: number; top: number; bottom: number };
  align: string;
  label?: string;
}

export interface PlacementConfig {
  placement_name: string;
  object_name: string;
  zone: string;
  depth_tier?: number; // Builder may omit when not present in authored data
  deactivated?: boolean; // Builder only emits when true; when false, omitted
  anchor?: string;
  position?: Record<string, number>;
}

export interface ResolvedSceneConfig {
  scene_name: string;
  extends_base?: string | null; // Builder only emits when protocol-local scene has extends field; base scenes omit it
  workspace: string;
  capabilities: string[];
  scene_bounds?: { left: number; right: number; top: number; bottom: number };
  background: { asset: string };
  zones?: ZoneConfig[];
  placements?: PlacementConfig[];
  layout_rules?: Record<string, unknown>;
  wrong_order_message?: Record<string, unknown>;
  rows?: Array<{
    row_name: string;
    slots: Array<{ placement_name: string; object_name: string }>;
  }>; // Row-slot layout model
}

// ============================================
// Generated data: Object state and visual rendering

export type StateFieldType = "enum" | "float" | "int" | "bool";

export interface StateFieldConfig {
  field_name: string;
  type: StateFieldType;
  allowed?: string[];
  min?: number;
  max?: number;
  step?: number;
  default: string | number | boolean | null; // Widened to null; two authored fields use null default
  unit?: string;
  applies_to?: "subpart" | string;
  description?: string;
}

export interface VisualStateEntry {
  kind: string;
  pilot_0_eligible: boolean;
  cases?: Array<{
    when: string | number | boolean; // Widened to allow boolean; 34 instances emit boolean values
    output?: { asset_name?: string };
    asset_name?: string; // Direct field for backwards compat
  }>;
  formula?: string;
  deferred_milestone?: string;
  reason?: string;
}

export interface SubpartGroupConfig {
  group_kind: string;
  members: Array<{ name: string; contains: string[] }>;
}

export interface StructureConfig {
  subpart_kind: string;
  layout: string;
  rows: number;
  cols: number;
  name_pattern: string;
  subpart_groups: Record<string, SubpartGroupConfig>;
}

export interface ObjectConfig {
  object_name: string;
  kind: string;
  label: string;
  state_fields: StateFieldConfig[];
  visual_states: Record<string, VisualStateEntry>;
  capabilities: string[];
  layout?: {
    default_width?: number;
    label_width?: number;
    anchor_y?: string | number; // Widened to include authored anchor_y values
    anchor_y_offset?: number; // Widened to include anchor_y_offset
  };
  structure?: Record<string, unknown>;
}

// ============================================
// Runtime layout and positioning

/** Zone geometry. */
export interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Positioned item in a layout. */
export interface LayoutItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Result of layout computation. */
export interface LayoutResult {
  zones: Record<string, Zone>;
  itemPositions: Record<string, { x: number; y: number }>;
  items: LayoutItem[];
}

// ============================================
// Runtime interaction and dispatch

/** One interaction event from the UI. */
export interface InteractionEvent {
  targetId: string;
  gesture: string;
  // Adjust gestures carry the set-point value (number, string, or boolean).
  value?: number | string | boolean;
}

/** Outcome of dispatching an interaction. */
export interface DispatchOutcome {
  matched: boolean;
  advancesStep: boolean;
  reason?: string;
}

/** Deprecated: use DispatchOutcome instead. */
export type DispatchResult = DispatchOutcome;

// ============================================
// Runtime highlight state

/** Highlights for the current step. */
export interface HighlightState {
  nextTargets: string[];
  completedTargets: string[];
}

// ============================================
// Runtime world state

/** Mutable game state: protocol, scenes, objects, cursor. */
export interface RuntimeWorld {
  /** Active protocol configuration. */
  protocol: ProtocolConfig;

  /** Current step index in protocol.steps. */
  activeStepIndex: number;

  /** Current interaction index within the active step's sequence. */
  currentInteractionIndex: number;

  /** Active scene id. Identifies which scene is currently rendered. */
  activeSceneId: string;

  /** All loaded scenes, keyed by scene_name. */
  scenes: Record<string, ResolvedSceneConfig>;

  /** All loaded objects, keyed by object_name. */
  objects: Record<string, ObjectConfig>;

  /** Object state: mutable field values. Keyed by object_id / object_name. */
  objectStates: Record<string, Record<string, string | number | boolean>>;

  /** Cursor attachment state. */
  cursorState: {
    attachedTo: string | null;
    operation: "attach" | "detach" | null;
  };

  /** Layout state: mutable position/placement info. Keyed by target name. */
  layoutState?: Record<string, Record<string, unknown>>;

  /** All loaded materials, keyed by material_name. */
  materials: Record<string, MaterialConfig>;

  /** Pending events emitted by scene operations (e.g., '<equipment_name>_elapsed'). */
  pendingEvents: string[];
}
