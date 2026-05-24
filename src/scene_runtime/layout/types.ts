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
// Background discriminated union. M2b supports gradient only.
//============================================

export type Background = {
  type: "gradient";
  from: string;
  to: string;
  angle?: number;
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
  width_scale?: number;
  display_width_cm?: number;
  fudge?: number;
}

export interface ObjectDef {
  object_name: string;
  kind: Kind;
  label: string;
  asset: string;
  capabilities: Capability[];
  layout: LayoutHint;
}

export interface AssetSpec {
  default_width: number;
  label_width: number;
  aspect: number;
}

export type ObjectLibrary = Record<string, ObjectDef>;
export type AssetSpecs = Record<string, AssetSpec>;

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

export interface SceneBRow {
  row_name: string;
  slots: Array<{
    placement_name: string;
    object_name: string;
    depth_tier?: number;
    align_stop?: AlignStop;
    layout?: Partial<LayoutHint>;
  }>;
}

export interface SceneB {
  scene_name: string;
  workspace: Workspace;
  capabilities?: string[];
  background?: Background;
  rows: SceneBRow[];
  scene_bounds?: SceneBoundsRect;
  layout_rules?: LayoutRules;
  wrong_order_message?: { template: string; toast_duration_ms?: number };
}

// Required form of LayoutHint after merge: defaults applied for every field.
// display_width_cm remains optional (may not be authored).
export interface ResolvedLayoutHint {
  default_width: number;
  label_width: number;
  anchor_y: AnchorY;
  anchor_y_offset: number;
  width_scale: number;
  display_width_cm?: number;
  fudge: number;
}

export interface BoundPlacement extends PlacementAuthored {
  kind: Kind | "unknown";
  label: string;
  asset: string;
  capabilities: Capability[];
  aspect: number;
  layout: ResolvedLayoutHint;
  _error?: string;
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
}

export type Diagnostics = Diagnostic[];

export interface NormalizeTrace {
  op: "detect" | "row_missing" | "row_to_zone";
  value?: "row_slot" | "zone_bounds";
  row?: string;
  workspace?: string;
  slots?: number;
}

export interface NormalizedScene {
  scene: SceneA | null;
  source: "row_slot" | "zone_bounds" | "none";
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

export interface ZoneRow {
  row_name: string;
  bounds: Bounds;
  align: AlignMode;
  baseline: number;
}

export type WorkspaceRowLibrary = Record<Workspace, ZoneRow[]>;
export type WorkspacePxPerCm = Record<Workspace, number>;

export interface PipelineInputs {
  scene: SceneA | SceneB;
  library?: ObjectLibrary;
  assets?: AssetSpecs;
  viewport?: { w: number; h: number };
  baseSceneMap?: Record<string, SceneA>;
  workspacePxPerCm?: WorkspacePxPerCm;
  rowLibrary?: WorkspaceRowLibrary;
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
    scene: SceneA | SceneB;
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
  sourceScene: SceneA | SceneB;
  diagnostics: Diagnostic[];
  passes: PassRecord[];
  identityDiagCount: number;
  stages: PipelineStages;
  final: ComputedItem[];
}
