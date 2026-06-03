// Reference object library + asset specs for the heat_block_bench fixture.
// Mirrors design_advice/pipeline.jsx OBJECT_LIBRARY and ASSET_SPECS. Replace
// with a real content/objects/ loader once authored content is available.

import type { AssetSpecs, ObjectLibrary } from "../types.js";

// Shared empty state schema for fixture objects that have no declared state.
const EMPTY_STATE_SCHEMA = {} as const;
const EMPTY_VISUAL_STATES = {} as const;

export const DEMO_OBJECT_LIBRARY: ObjectLibrary = {
  heat_block: {
    object_name: "heat_block",
    kind: "equipment",
    label: "Heat block",
    asset: "heat_block",
    capabilities: ["clickable", "instrument_with_setpoint"],
    layout: {
      default_width: 18,
      label_width: 12,
      anchor_y: "bottom",
      display_width_cm: 25,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
  microtube_rack_24: {
    object_name: "microtube_rack_24",
    kind: "rack",
    label: "1.5 mL tube rack",
    asset: "microtube_rack",
    capabilities: ["clickable", "structured_surface"],
    layout: {
      default_width: 13,
      label_width: 10,
      anchor_y: "bottom",
      display_width_cm: 12,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
  protein_ladder_tube: {
    object_name: "protein_ladder_tube",
    kind: "bottle",
    label: "Ladder tube",
    asset: "eppendorf_tube",
    capabilities: ["clickable", "material_container"],
    layout: {
      default_width: 4,
      label_width: 8,
      anchor_y: "bottom",
      display_width_cm: 3,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
  t75_flask: {
    object_name: "t75_flask",
    kind: "flask",
    label: "T75 flask",
    asset: "t75_flask",
    capabilities: ["clickable", "material_container"],
    layout: {
      default_width: 14,
      label_width: 10,
      anchor_y: "bottom",
      display_width_cm: 20,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
  media_bottle: {
    object_name: "media_bottle",
    kind: "bottle",
    label: "DMEM media",
    asset: "media_bottle",
    capabilities: ["clickable", "material_container"],
    layout: {
      default_width: 8,
      label_width: 9,
      anchor_y: "bottom",
      display_width_cm: 12,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
  waste_jar: {
    object_name: "waste_jar",
    kind: "waste",
    label: "Waste",
    asset: "waste_jar",
    capabilities: ["clickable", "material_container"],
    layout: {
      default_width: 7,
      label_width: 7,
      anchor_y: "bottom",
      display_width_cm: 14,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
  serological_pipette: {
    object_name: "serological_pipette",
    kind: "pipette",
    label: "Pipet aid",
    asset: "pipette",
    capabilities: ["clickable", "cursor_attachable"],
    layout: {
      default_width: 4,
      label_width: 8,
      anchor_y: "tip",
      anchor_y_offset: 0,
      display_width_cm: 3,
    },
    state_schema: EMPTY_STATE_SCHEMA,
    visual_states: EMPTY_VISUAL_STATES,
    subpart_state_schema: EMPTY_STATE_SCHEMA,
  },
};

export const DEMO_ASSET_SPECS: AssetSpecs = {
  heat_block: { default_width: 18, label_width: 12, aspect: 1.35 },
  microtube_rack: { default_width: 13, label_width: 10, aspect: 1.55 },
  eppendorf_tube: { default_width: 4, label_width: 6, aspect: 0.46 },
  t75_flask: { default_width: 14, label_width: 10, aspect: 1.38 },
  media_bottle: { default_width: 8, label_width: 9, aspect: 0.55 },
  waste_jar: { default_width: 7, label_width: 7, aspect: 0.65 },
  pipette: { default_width: 4, label_width: 8, aspect: 0.18 },
};
