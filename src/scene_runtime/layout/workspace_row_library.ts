// Schema B (row + slot) requires a closed library of named rows per workspace.
// Authors using row_slot pick row_name from this enum; coordinates come from
// here. Adding a new row_name requires a code edit, not a YAML edit. See
// design_advice/LAYOUT_PIPELINE.md §3.

import type { WorkspaceRowLibrary } from "./types.js";

export const WORKSPACE_ROW_LIBRARY: WorkspaceRowLibrary = {
  bench: [
    {
      row_name: "rear_reagents",
      bounds: { left: 5, right: 95, top: 10, bottom: 35 },
      align: "tab-stops",
      baseline: 32,
    },
    {
      row_name: "rear_supplies",
      bounds: { left: 5, right: 95, top: 10, bottom: 35 },
      align: "tab-stops",
      baseline: 32,
    },
    {
      row_name: "rear_bench",
      bounds: { left: 5, right: 95, top: 10, bottom: 35 },
      align: "tab-stops",
      baseline: 32,
    },
    {
      row_name: "rear_imaging",
      bounds: { left: 5, right: 95, top: 10, bottom: 35 },
      align: "center",
      baseline: 32,
    },
    {
      row_name: "work_surface",
      bounds: { left: 10, right: 80, top: 45, bottom: 75 },
      align: "center",
      baseline: 72,
    },
    {
      row_name: "tools",
      bounds: { left: 80, right: 95, top: 55, bottom: 80 },
      align: "center",
      baseline: 78,
    },
    {
      row_name: "gel_staging",
      bounds: { left: 5, right: 95, top: 80, bottom: 95 },
      align: "tab-stops",
      baseline: 93,
    },
  ],
  hood: [
    {
      row_name: "rear_reagents",
      bounds: { left: 5, right: 95, top: 10, bottom: 35 },
      align: "tab-stops",
      baseline: 32,
    },
    {
      row_name: "work_surface",
      bounds: { left: 10, right: 80, top: 45, bottom: 75 },
      align: "center",
      baseline: 72,
    },
    {
      row_name: "tools",
      bounds: { left: 80, right: 95, top: 55, bottom: 80 },
      align: "center",
      baseline: 78,
    },
  ],
  microscope: [
    {
      row_name: "instrument_row",
      bounds: { left: 15, right: 85, top: 20, bottom: 70 },
      align: "center",
      baseline: 65,
    },
  ],
  cell_counter: [
    {
      row_name: "instrument_row",
      bounds: { left: 15, right: 85, top: 15, bottom: 55 },
      align: "center",
      baseline: 50,
    },
    {
      row_name: "accessory_row",
      bounds: { left: 25, right: 75, top: 65, bottom: 90 },
      align: "center",
      baseline: 85,
    },
  ],
  incubator: [],
  plate_reader: [],
};
