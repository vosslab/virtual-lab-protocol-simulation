// Layout engine constants, mirrors `docs/specs/LAYOUT_ENGINE.md` and the
// reference impl in `design_advice/pipeline.jsx`. Closed sets only.

export const ALIGN_MODES = ["left", "right", "center", "justify", "tab-stops"] as const;
export const ALIGN_STOPS = ["left", "center", "right"] as const;
export const ANCHOR_YS = ["bottom", "tip", "top"] as const;
export const DEPTHS = ["back", "mid", "front"] as const;
export const KINDS = [
  "plate",
  "bottle",
  "flask",
  "pipette",
  "rack",
  "waste",
  "equipment",
  "decoration",
] as const;
export const WORKSPACES = [
  "bench",
  "hood",
  "microscope",
  "incubator",
  "plate_reader",
  "cell_counter",
] as const;
export const CAPABILITIES = [
  "clickable",
  "material_container",
  "instrument_with_setpoint",
  "structured_surface",
  "cursor_attachable",
  "decoration_only",
] as const;
export const SCALE_SOURCES = [
  "cm_model",
  "fallback_no_workspace",
  "fallback_authored",
  "skipped_error",
] as const;
export const STAGES = [
  "normalize",
  "inheritance",
  "bind",
  "scale",
  "group",
  "horizontal",
  "vertical",
  "labels",
  "clamp",
  "meta",
] as const;
export const DIAGNOSTIC_KINDS = [
  "unknown_row",
  "unknown_object",
  "unknown_workspace",
  "unknown_zone",
  "zone_overflow_negative_gap",
  "tab_stop_overflow",
  "item_escapes_zone_vertically",
  "label_collision_residual",
  "zone_clamped_to_bounds",
  "max_iterations_reached",
] as const;

// Numeric constants
export const ZONE_PADDING = 1.5;
export const MIN_SCALE = 0.55;
export const MAX_FOOTPRINT_RATIO = 2.5;
export const PX_PER_SCENE_PERCENT = 11.52;
export const AVG_CHAR_WIDTH_PCT = 0.6;
export const MAX_LAYOUT_PASSES = 3;
export const LAYOUT_SHRINK_FACTOR = 0.9;
export const ITEM_ESCAPES_ZONE_TOLERANCE = 3;

export const DEPTH_SCALE = { back: 0.8, mid: 1.0, front: 1.1 } as const;
export const DEPTH_BASELINE_OFFSET = { back: -4, mid: 0, front: 4 } as const;
export const DEFAULT_VIEWPORT = { w: 1920, h: 1080 } as const;
export const DEFAULT_SCENE_BOUNDS = {
  left: 1,
  right: 99,
  top: 5,
  bottom: 95,
} as const;
export const DEFAULT_LAYOUT_RULES = {
  label_font_size: 9,
  label_line_height: 1.1,
  label_offset_y: 4,
  zone_gap: 2,
  default_align_stop: "center",
} as const;

// Per-workspace px_per_cm (SCALING_MODEL.md). Author writes display_width_cm
// on object; engine multiplies by per-workspace px_per_cm.
export const WORKSPACE_PX_PER_CM: Record<(typeof WORKSPACES)[number], number> = {
  bench: 3.2,
  hood: 8.0,
  microscope: 8.0,
  incubator: 6.0,
  plate_reader: 8.0,
  cell_counter: 8.0,
};
