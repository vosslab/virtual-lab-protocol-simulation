// Layout engine type signatures. Mirrors design_advice/LAYOUT_PIPELINE.md §1.
// All coordinates are scene-percent (0..100 of viewport per axis).

import type {
  ALIGN_MODES,
  ALIGN_STOPS,
  ANCHOR_YS,
  DEPTHS,
  KINDS,
  WORKSPACES,
  CAPABILITIES,
  SCALE_SOURCES,
  STAGES,
  DIAGNOSTIC_KINDS,
} from "./constants.js";

export type Workspace = (typeof WORKSPACES)[number];
export type AlignMode = (typeof ALIGN_MODES)[number];
export type AlignStop = (typeof ALIGN_STOPS)[number];
export type AnchorY = (typeof ANCHOR_YS)[number];
export type Depth = (typeof DEPTHS)[number];
export type Kind = (typeof KINDS)[number];
export type Capability = (typeof CAPABILITIES)[number];
export type ScaleSource = (typeof SCALE_SOURCES)[number];
export type StageName = (typeof STAGES)[number];
export type DiagnosticKind = (typeof DIAGNOSTIC_KINDS)[number];

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export type SceneBoundsRect = Bounds;

//============================================
// Background discriminated union. Supports gradient (M2b) and asset forms.
//============================================

export type Background =
  | {
      type: "gradient";
      from: string;
      to: string;
      angle?: number;
    }
  | {
      asset: string;
    };

export interface Zone {
  id: string;
  bounds: Bounds;
  align?: AlignMode;
  baseline?: number;
  label?: string;
}

export interface LayoutHint {
  default_width: number;
  label_width?: number;
  anchor_y?: AnchorY;
  anchor_y_offset?: number;
  display_width_cm?: number;
}

// State-field schema types emitted by the object-library generator.
// These are the declared contract; visual_states is the rendering map.

export type StateFieldType = "enum" | "int" | "float" | "bool";

export interface StateFieldDef {
  field_name: string;
  type: StateFieldType;
  default: string | number | boolean;
  applies_to: "object" | "subpart";
  // enum-specific
  allowed?: string[];
  // numeric-specific
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// Visual state case for enum/bool fields
export interface VisualStateCase {
  when: string | boolean;
  output: VisualStateOutput;
}

// Output shapes for a visual state case
export type VisualStateOutput =
  | { asset_name: string }
  | { overlay_name: string }
  | { composite: VisualStateOutput[] };

// Render-effect tokens (MATERIAL_CONVENTION.md, D12). A material-driven visual
// state may declare a render_effect + target instead of svg/overlay/composite
// cases. The generic interpreter (M3) keys on these tokens, never on object kind.
export type RenderEffect = "material_tint" | "fill_height";
// A render-effect target names either a generated geometry region
// (subpart_geometry) or an authored SVG anchor region. See SubpartGeometry below.
export type RenderEffectTarget = "subpart_geometry" | "anchor_liquid_bounds" | "anchor_liquid_clip";

export interface VisualStateDef {
  // kind is present for svg/overlay/composite visual states. Material-driven
  // render-effect visual states omit kind and carry render_effect/target.
  kind?: "svg" | "overlay" | "composite";
  applies_to: "object" | "subpart";
  // Cases for enum/bool fields
  cases?: VisualStateCase[];
  // Formula string for int/float fields
  formula?: string;
  // Declarative render-effect form (material_tint / fill_height). When set,
  // the field drives the named effect on the named target region.
  render_effect?: RenderEffect;
  target?: RenderEffectTarget;
  // Optional clip region for an anchor-target fill_height effect.
  clip?: RenderEffectTarget;
  // Optional capacity for fill_height normalization (microliters).
  capacity_ul?: number;
}

// Keyed by field_name
export type ObjectVisualStates = Record<string, VisualStateDef>;

// Generated subpart geometry (MATERIAL_CONVENTION.md D10). A render effect whose
// target is subpart_geometry resolves the current subpart name to one of these
// shapes. circle covers round wells; rect covers rectangular subparts.
export type SubpartGeometry =
  | { shape: "circle"; cx: number; cy: number; r: number }
  | { shape: "rect"; x: number; y: number; w: number; h: number };
// Keyed by subpart name (A1, B7, H12). Deterministically ordered by the
// generator (name_pattern order) so the overlay renderer iterates a stable list.
export type SubpartGeometryMap = Record<string, SubpartGeometry>;

// The base-art coordinate frame the subpart geometry is expressed in. Matches
// the asset SVG viewBox so the overlay aligns with the rendered base art.
export interface ViewBox {
  min_x: number;
  min_y: number;
  width: number;
  height: number;
}

// State schema surface for store validation.
// Derived from declared state_fields (not inferred from visual_states).
export type ObjectStateSchema = Record<string, StateFieldDef>;

export interface ObjectDef {
  object_name: string;
  kind: Kind;
  label: string;
  asset: string;
  capabilities: Capability[];
  layout: LayoutHint;
  // Declared state-field schema (object-level fields only; subpart fields in subpart_state_schema)
  state_schema: ObjectStateSchema;
  // Per-object visual_states rendering map
  visual_states: ObjectVisualStates;
  // Subpart state schema (only set on structured objects; empty object otherwise)
  subpart_state_schema: ObjectStateSchema;
  // Generated subpart geometry for structured objects whose subparts render
  // (PATH-B derived from the structure grid; MATERIAL_CONVENTION.md D10). Absent
  // for objects with no rendered subparts.
  subpart_geometry?: SubpartGeometryMap;
  // The base-art coordinate frame subpart_geometry is expressed in (asset SVG
  // viewBox). Present iff subpart_geometry is present.
  view_box?: ViewBox;
}

export interface AssetSpec {
  default_width: number;
  label_width: number;
  aspect: number;
}

export type ObjectLibrary = Record<string, ObjectDef>;
export type AssetSpecs = Record<string, AssetSpec>;

// Top-level schema registries emitted by gen_object_library.py.
// Keys are object_name. Object-level state fields only (subpart fields excluded).
export type ObjectStateSchemas = Record<string, ObjectStateSchema>;
// Subpart-level state fields only (only set for structured objects).
export type ObjectSubpartStateSchemas = Record<string, ObjectStateSchema>;

export interface LayoutRules {
  zone_gap?: number;
  label_font_size?: number;
  label_line_height?: number;
  label_offset_y?: number;
  default_align_stop?: AlignStop;
}

export interface PlacementAuthored {
  placement_name: string;
  object_name: string;
  zone: string;
  depth_tier?: number;
  align_stop?: AlignStop;
  baseline_override?: number;
  depth?: Depth;
  layout?: Partial<LayoutHint>;
  // Internal marker added during inheritance resolution. Not user-authored.
  active?: boolean;
  // Provenance after extends: "base" or "own".
  _from?: "base" | "own";
  // Placeholder mode only: true when the object's SVG assets are missing from assets/.
  // Set by pipeline/gen_scene_index.py --missing-svg=placeholder. Never true in
  // a strict (normal) build. WP-RESOLVE-3 reads this to render a labeled placeholder.
  missing_svg?: true;
}

export interface SceneA {
  scene_name: string;
  workspace: Workspace;
  capabilities?: string[];
  scene_bounds: SceneBoundsRect;
  background?: Background;
  zones: Zone[];
  placements: PlacementAuthored[];
  layout_rules?: LayoutRules;
  wrong_order_message?: { template: string; toast_duration_ms?: number };
  extends?: string;
  add_placements?: PlacementAuthored[];
  reposition_placements?: Array<
    Pick<PlacementAuthored, "placement_name"> & Partial<PlacementAuthored>
  >;
  deactivate_placements?: Array<{ placement_name: string }>;
  remove_placements?: Array<{ placement_name: string } | string>;
}

// Required form of LayoutHint after merge: defaults applied for every field.
// display_width_cm remains optional (may not be authored).
export interface ResolvedLayoutHint {
  default_width: number;
  label_width: number;
  anchor_y: AnchorY;
  anchor_y_offset: number;
  display_width_cm?: number;
}

export interface BoundPlacement extends PlacementAuthored {
  kind: Kind | "unknown";
  label: string;
  asset: string;
  capabilities: Capability[];
  aspect: number;
  layout: ResolvedLayoutHint;
  _error?: string;
  // True when the placement references an object absent from OBJECT_LIBRARY.
  // Set during bind. The placement is bound as a renderable placeholder
  // (missing_svg true) instead of being dropped, so the renderer can show a
  // distinct "missing object" box and structural guards skip it. Distinguished
  // in the DOM from a missing-SVG placeholder via data-placeholder-kind.
  _missing_object?: true;
}

export interface ScaledPlacement extends BoundPlacement {
  _width_scale: number;
  _scale_source: ScaleSource;
  _px_per_cm: number | null;
  _shrunk_passes?: number;
}

export interface ComputedItem extends ScaledPlacement {
  _scale: number;
  _x: number;
  _y: number;
  _top: number;
  _visualWidth: number;
  _height: number;
  _footprint: number;
  _labelX: number;
  _labelY: number;
  _labelLines: string[];
  _clamped?: boolean;
}

export interface Diagnostic {
  stage: StageName;
  severity: "error" | "warn" | "info";
  kind: DiagnosticKind;
  placement_name?: string;
  object_name?: string;
  row?: string;
  zone?: string;
  workspace?: string;
  dx?: number;
  dy?: number;
  overflow_pct?: number;
  between?: [string, string];
  items?: number;
  passes_used?: number;
  unresolved?: number;
  // Stagger row index (0-based) for label_row_staggered diagnostics.
  staggered_row?: number;
}

export type Diagnostics = Diagnostic[];

export interface NormalizeTrace {
  op: "detect";
  value?: "zone_bounds";
}

export interface NormalizedScene {
  scene: SceneA | null;
  source: "zone_bounds" | "none";
  trace: NormalizeTrace[];
}

export interface InheritanceOp {
  op: "extends" | "remove" | "deactivate" | "reposition" | "add";
  target: string;
  count?: number;
  removed?: number;
  to_zone?: string;
  status?: string;
}

export interface InheritanceResolution {
  placements: PlacementAuthored[];
  provenance: Array<{ name: string; from: "base" | "own" }>;
  operations: InheritanceOp[];
}

export interface GroupedPlacements {
  groups: Map<string, ScaledPlacement[]>;
  orphans: ScaledPlacement[];
}

export type WorkspacePxPerCm = Record<Workspace, number>;

export interface PipelineInputs {
  scene: SceneA;
  library?: ObjectLibrary;
  assets?: AssetSpecs;
  viewport?: { w: number; h: number };
  baseSceneMap?: Record<string, SceneA>;
  workspacePxPerCm?: WorkspacePxPerCm;
  maxPasses?: number;
  shrinkFactor?: number;
}

export interface PassRecord {
  pass: number;
  diagnostics: Diagnostic[];
  zones_shrunk: string[];
}

export interface PipelineStages {
  inputs: {
    scene: SceneA;
    library: ObjectLibrary;
    assets: AssetSpecs;
  };
  normalized: NormalizedScene;
  inheritance: InheritanceResolution;
  bound: BoundPlacement[];
  scaled: ScaledPlacement[];
  grouped: GroupedPlacements;
  horizontal: Map<string, ComputedItem[]>;
  vertical: Map<string, ComputedItem[]>;
  labelled: Map<string, ComputedItem[]>;
  clamped: Map<string, ComputedItem[]>;
}

export interface PipelineResult {
  scene: SceneA;
  sourceScene: SceneA;
  diagnostics: Diagnostic[];
  passes: PassRecord[];
  identityDiagCount: number;
  stages: PipelineStages;
  final: ComputedItem[];
}
