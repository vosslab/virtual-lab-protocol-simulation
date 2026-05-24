/* global React */
// scene-yaml -> 2D layout pipeline.
// Mirrors the semantics described in specs/LAYOUT_ENGINE.md.
// All coordinates are in "scene percent" units (0..100 of viewport W or H).
// Functions are pure - each returns a new value so stage visualizations can
// inspect the exact intermediate data.

// -- 1. Object library (subset, hardcoded for the worked example) ---
// Note: `display_width_cm` is the canonical authored size (SCALING_MODEL.md).
// `default_width` (scene-percent) is the legacy baseline; the engine prefers
// the cm path when both are present.
const OBJECT_LIBRARY = {
  heat_block: {
    object_name: "heat_block",
    kind: "equipment",
    label: "Heat block",
    asset: "heat_block",
    capabilities: ["clickable", "instrument_with_setpoint"],
    layout: { default_width: 18, label_width: 12, anchor_y: "bottom", display_width_cm: 25 },
  },
  microtube_rack_24: {
    object_name: "microtube_rack_24",
    kind: "rack",
    label: "1.5 mL tube rack",
    asset: "microtube_rack",
    capabilities: ["clickable", "structured_surface"],
    layout: { default_width: 13, label_width: 10, anchor_y: "bottom", display_width_cm: 12 },
  },
  protein_ladder_tube: {
    object_name: "protein_ladder_tube",
    kind: "bottle",
    label: "Ladder tube",
    asset: "eppendorf_tube",
    capabilities: ["clickable", "material_container"],
    layout: { default_width: 4, label_width: 8, anchor_y: "bottom", display_width_cm: 3 },
  },
  // Additional objects for demo flexibility
  t75_flask: {
    object_name: "t75_flask",
    kind: "flask",
    label: "T75 flask",
    asset: "t75_flask",
    capabilities: ["clickable", "material_container"],
    layout: { default_width: 14, label_width: 10, anchor_y: "bottom", display_width_cm: 20 },
  },
  media_bottle: {
    object_name: "media_bottle",
    kind: "bottle",
    label: "DMEM media",
    asset: "media_bottle",
    capabilities: ["clickable", "material_container"],
    layout: { default_width: 8, label_width: 9, anchor_y: "bottom", display_width_cm: 12 },
  },
  waste_jar: {
    object_name: "waste_jar",
    kind: "waste",
    label: "Waste",
    asset: "waste_jar",
    capabilities: ["clickable", "material_container"],
    layout: { default_width: 7, label_width: 7, anchor_y: "bottom", display_width_cm: 14 },
  },
  serological_pipette: {
    object_name: "serological_pipette",
    kind: "pipette",
    label: "Pipet aid",
    asset: "pipette",
    capabilities: ["clickable", "cursor_attachable"],
    layout: { default_width: 4, label_width: 8, anchor_y: "tip", anchor_y_offset: 0, display_width_cm: 3 },
  },
};

// -- 2. Asset specs (visual width default + aspect ratio) ----------
// aspect_ratio = w / h of the underlying SVG.
const ASSET_SPECS = {
  heat_block:        { default_width: 18, label_width: 12, aspect: 1.35 },
  microtube_rack:    { default_width: 13, label_width: 10, aspect: 1.55 },
  eppendorf_tube:    { default_width: 4,  label_width: 6,  aspect: 0.46 },
  t75_flask:         { default_width: 14, label_width: 10, aspect: 1.38 },
  media_bottle:      { default_width: 8,  label_width: 9,  aspect: 0.55 },
  waste_jar:         { default_width: 7,  label_width: 7,  aspect: 0.65 },
  pipette:           { default_width: 4,  label_width: 8,  aspect: 0.18 },
};

// Constants from LAYOUT_ENGINE.md
const ZONE_PADDING       = 1.5;   // in scene-% units; shrinks zone inward
const MIN_SCALE          = 0.55;  // minimum allowed footprint scale before negative-gap overflow
const MAX_FOOTPRINT_RATIO = 2.5;  // label-driven footprint cap
const DEPTH_SCALE        = { back: 0.80, mid: 1.00, front: 1.10 };
const DEPTH_BASELINE_OFFSET = { back: -4, mid: 0, front: 4 };
const DEFAULT_VIEWPORT   = { w: 1920, h: 1080 };
const DEFAULT_LABEL_FONT_SIZE = 12;
const PX_PER_SCENE_PERCENT = 11.52;  // empirical: 1280px viewport, 90% usable -> 1152 px / 100%
const MAX_LAYOUT_PASSES = 3;          // convergence-loop iteration budget for Stages 6-10
const LAYOUT_SHRINK_FACTOR = 0.9;     // uniform shrink applied per pass to items in overflowing zones

// -- Workspace px-per-cm scaling constants (SCALING_MODEL.md) -------
// Per-scene/workspace tuning dial: how many pixels represent 1 cm of
// "display real-world dimension." Authors write `display_width_cm` on
// the object; the engine multiplies by px_per_cm of the scene's workspace.
const WORKSPACE_PX_PER_CM = {
  bench:        3.2,   // tuned for 7-item single row at 1280x720
  hood:         8.0,   // hood items mostly bottles + pipettes
  microscope:   8.0,
  incubator:    6.0,
  plate_reader: 8.0,
  cell_counter: 8.0,
};

// -- Workspace row library (Schema B -> Schema A bridge) -------------
// Each workspace declares its named rows. row_slot YAML authors pick
// row names from this closed enum; coordinates come from here.
// New row names require an edit here, not a YAML edit.
const WORKSPACE_ROW_LIBRARY = {
  bench: [
    { row_name: "rear_reagents",  bounds: { left: 5,  right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "rear_supplies",  bounds: { left: 5,  right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "rear_bench",     bounds: { left: 5,  right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "rear_imaging",   bounds: { left: 5,  right: 95, top: 10, bottom: 35 }, align: "center",    baseline: 32 },
    { row_name: "work_surface",   bounds: { left: 10, right: 80, top: 45, bottom: 75 }, align: "center",    baseline: 72 },
    { row_name: "tools",          bounds: { left: 80, right: 95, top: 55, bottom: 80 }, align: "center",    baseline: 78 },
    { row_name: "gel_staging",    bounds: { left: 5,  right: 95, top: 80, bottom: 95 }, align: "tab-stops", baseline: 93 },
  ],
  hood: [
    { row_name: "rear_reagents",  bounds: { left: 5,  right: 95, top: 10, bottom: 35 }, align: "tab-stops", baseline: 32 },
    { row_name: "work_surface",   bounds: { left: 10, right: 80, top: 45, bottom: 75 }, align: "center",    baseline: 72 },
    { row_name: "tools",          bounds: { left: 80, right: 95, top: 55, bottom: 80 }, align: "center",    baseline: 78 },
  ],
  microscope: [
    { row_name: "instrument_row", bounds: { left: 15, right: 85, top: 20, bottom: 70 }, align: "center",    baseline: 65 },
  ],
  cell_counter: [
    { row_name: "instrument_row", bounds: { left: 15, right: 85, top: 15, bottom: 55 }, align: "center",    baseline: 50 },
    { row_name: "accessory_row",  bounds: { left: 25, right: 75, top: 65, bottom: 90 }, align: "center",    baseline: 85 },
  ],
};

// Default scene_bounds applied when row_slot YAML doesn't declare them.
const DEFAULT_SCENE_BOUNDS = { left: 1, right: 99, top: 5, bottom: 95 };
const DEFAULT_LAYOUT_RULES = { label_font_size: 9, label_line_height: 1.1, label_offset_y: 4, zone_gap: 2 };

// -----------------------------------------------------------------
// Stage 2: Schema normalize.
// If the scene uses `rows[]` (Schema B), expand each row into a zone via the
// workspace row library and assign depth_tier from slot order. If the scene
// already has `zones[]` (Schema A), passthrough with provenance noted.
function normalizeSchema(scene, rowLibrary = WORKSPACE_ROW_LIBRARY) {
  if (!scene) return { scene: null, source: "none", trace: [] };
  if (scene.rows) {
    // Schema B -> expand to Schema A
    const lib = rowLibrary[scene.workspace] || [];
    const byName = new Map(lib.map(r => [r.row_name, r]));
    const zones = [];
    const placements = [];
    const trace = [{ op: "detect", value: "row_slot" }];
    for (const row of scene.rows) {
      const ref = byName.get(row.row_name);
      if (!ref) {
        trace.push({ op: "row_missing", row: row.row_name, workspace: scene.workspace });
        continue;
      }
      zones.push({
        id: row.row_name,
        bounds: ref.bounds,
        align: ref.align,
        baseline: ref.baseline,
        label: row.row_name,
      });
      trace.push({ op: "row->zone", row: row.row_name, slots: (row.slots || []).length });
      (row.slots || []).forEach((slot, i) => {
        placements.push({
          placement_name: slot.placement_name,
          object_name:    slot.object_name,
          zone:           row.row_name,
          depth_tier:     slot.depth_tier ?? (i + 1),
          align_stop:     slot.align_stop, // optional override
        });
      });
    }
    return {
      scene: {
        ...scene,
        scene_bounds: scene.scene_bounds || DEFAULT_SCENE_BOUNDS,
        layout_rules: scene.layout_rules || DEFAULT_LAYOUT_RULES,
        zones,
        placements,
      },
      source: "row_slot",
      trace,
    };
  }
  // Schema A passthrough
  const trace = [{ op: "detect", value: "zone_bounds" }];
  return { scene: { ...scene }, source: "zone_bounds", trace };
}

// -----------------------------------------------------------------
// Stage 1: Resolve inheritance
// Walk `extends` chain, apply remove -> deactivate -> reposition -> add.
// For the demo, supports a single optional `_base_scenes` map passed in.
function resolveInheritance(scene, baseSceneMap = {}) {
  if (!scene.extends) {
    // No extends - flat list of placements.
    return {
      placements: (scene.placements || []).map(p => ({ ...p, active: true })),
      provenance: (scene.placements || []).map(p => ({ name: p.placement_name, from: "own" })),
      operations: [],
    };
  }
  const base = baseSceneMap[scene.extends];
  if (!base) {
    return {
      placements: (scene.placements || []).map(p => ({ ...p, active: true })),
      provenance: [],
      operations: [{ op: "extends", target: scene.extends, status: "missing base scene" }],
    };
  }
  const operations = [];
  let placements = (base.placements || []).map(p => ({ ...p, active: true, _from: "base" }));
  operations.push({ op: "extends", target: scene.extends, count: placements.length });

  // remove_placements
  for (const r of (scene.remove_placements || [])) {
    const name = typeof r === "string" ? r : r.placement_name;
    const before = placements.length;
    placements = placements.filter(p => p.placement_name !== name);
    operations.push({ op: "remove", target: name, removed: before - placements.length });
  }
  // deactivate_placements (mark as inactive - kept but excluded from layout)
  for (const d of (scene.deactivate_placements || [])) {
    const name = typeof d === "string" ? d : d.placement_name;
    placements = placements.map(p => p.placement_name === name ? { ...p, active: false } : p);
    operations.push({ op: "deactivate", target: name });
  }
  // reposition_placements (override zone, depth_tier, align_stop)
  for (const r of (scene.reposition_placements || [])) {
    const name = r.placement_name;
    placements = placements.map(p => p.placement_name === name ? { ...p, ...r } : p);
    operations.push({ op: "reposition", target: name, to_zone: r.zone });
  }
  // add_placements
  for (const a of (scene.add_placements || [])) {
    placements.push({ ...a, active: true, _from: "own" });
    operations.push({ op: "add", target: a.placement_name });
  }
  const provenance = placements.map(p => ({ name: p.placement_name, from: p._from || "own" }));
  return { placements, provenance, operations };
}

// -----------------------------------------------------------------
// Stage 2: Bind objects
// For each placement, look up its object in the library and merge layout hints.
function bindObjects(placements, library = OBJECT_LIBRARY, assets = ASSET_SPECS, diagnostics = []) {
  return placements.map(p => {
    const obj = library[p.object_name];
    if (!obj) {
      diagnostics.push({
        stage: "bind", severity: "error", kind: "unknown_object",
        placement_name: p.placement_name, object_name: p.object_name,
      });
      return {
        ...p,
        _error: `unknown object "${p.object_name}"`,
        kind: "unknown",
        label: p.object_name,
      };
    }
    const asset = assets[obj.asset];
    const layoutFromObject = obj.layout || {};
    const layoutOverride = p.layout || {};
    const layout = {
      default_width:     layoutOverride.default_width     ?? layoutFromObject.default_width     ?? asset?.default_width ?? 10,
      label_width:       layoutOverride.label_width       ?? layoutFromObject.label_width       ?? asset?.label_width ?? 8,
      anchor_y:          layoutOverride.anchor_y          ?? layoutFromObject.anchor_y          ?? "bottom",
      anchor_y_offset:   layoutOverride.anchor_y_offset   ?? layoutFromObject.anchor_y_offset   ?? 0,
      width_scale:       layoutOverride.width_scale       ?? layoutFromObject.width_scale       ?? 1.0,
      display_width_cm:  layoutOverride.display_width_cm  ?? layoutFromObject.display_width_cm,
      fudge:             layoutOverride.fudge             ?? layoutFromObject.fudge             ?? 1.0,
    };
    return {
      ...p,
      kind: obj.kind,
      label: obj.label,
      asset: obj.asset,
      capabilities: obj.capabilities,
      aspect: asset?.aspect ?? 1.0,
      layout,
    };
  });
}

// -----------------------------------------------------------------
// Stage 5: Scale to real-world dimensions (SCALING_MODEL.md).
// Computes a per-placement `_width_scale` from the cm model:
//   width_scale = (display_width_cm x px_per_cm) / (default_width x 11.52)
// Falls back to authored layout.width_scale if the object lacks cm or
// the workspace has no px_per_cm registered.
function scaleToRealWorld(boundPlacements, workspace, opts = {}, diagnostics = []) {
  const pxPerCmMap = opts.workspacePxPerCm || WORKSPACE_PX_PER_CM;
  const pxPerCm = pxPerCmMap[workspace];
  return boundPlacements.map(p => {
    if (p._error) return { ...p, _width_scale: 1.0, _scale_source: "skipped_error" };
    const cm = p.layout?.display_width_cm;
    const fudge = p.layout?.fudge ?? 1.0;
    const def = p.layout?.default_width;
    let scale, source;
    if (cm != null && pxPerCm != null && def) {
      scale = (cm * pxPerCm) / (def * PX_PER_SCENE_PERCENT) * fudge;
      source = "cm_model";
    } else if (cm != null && pxPerCm == null) {
      scale = p.layout?.width_scale ?? 1.0;
      source = "fallback_no_workspace";
      diagnostics.push({
        stage: "scale", severity: "warn", kind: "unknown_workspace",
        workspace, placement_name: p.placement_name,
      });
    } else {
      scale = p.layout?.width_scale ?? 1.0;
      source = "fallback_authored";
    }
    return {
      ...p,
      _width_scale: scale,
      _scale_source: source,
      _px_per_cm: pxPerCm ?? null,
    };
  });
}

// -----------------------------------------------------------------
// Stage 3: Group by zone, sort by depth_tier (asc), then by placement_name.
function groupByZone(boundPlacements, zones) {
  const zoneIndex = new Map(zones.map(z => [z.id, z]));
  const groups = new Map();
  for (const z of zones) groups.set(z.id, []);
  const orphans = [];
  for (const p of boundPlacements) {
    if (!p.active) continue;
    if (!zoneIndex.has(p.zone)) { orphans.push(p); continue; }
    groups.get(p.zone).push(p);
  }
  // sort
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.depth_tier ?? 0) - (b.depth_tier ?? 0)
                    || String(a.placement_name).localeCompare(String(b.placement_name)));
  }
  return { groups, orphans };
}

// -----------------------------------------------------------------
// Helpers
function depthFor(p) {
  // Manual depth wins; otherwise mid.
  return p.depth || "mid";
}
function widthScaleFor(p) {
  // Computed _width_scale (cm model) wins over authored layout.width_scale.
  return p._width_scale ?? p.layout?.width_scale ?? 1.0;
}
function footprintFor(p, scale = 1) {
  const visual = p.layout.default_width * widthScaleFor(p) * DEPTH_SCALE[depthFor(p)] * scale;
  const label  = p.layout.label_width;
  const capped = Math.min(label, visual * MAX_FOOTPRINT_RATIO);
  return Math.max(visual, capped);
}
function visualWidthFor(p, scale = 1) {
  return p.layout.default_width * widthScaleFor(p) * DEPTH_SCALE[depthFor(p)] * scale;
}

// -----------------------------------------------------------------
// Stage 4: Horizontal layout per zone.
// Computes each item's x (center) and visualWidth in scene %.
function horizontalLayout(groups, zones, layoutRules = {}, diagnostics = []) {
  const result = new Map(); // zoneId -> array of layout items (computed.x, computed.visualWidth, scale)
  const gap = layoutRules.zone_gap ?? 2;
  for (const zone of zones) {
    const items = (groups.get(zone.id) || []);
    // Provisional y so stage-5 visualizers can render anchor dots / footprint bars.
    // verticalLayout will refine this with depth offset + override.
    const provisionalY = zone.baseline ?? (zone.bounds.top + zone.bounds.bottom) / 2;
    if (items.length === 0) { result.set(zone.id, []); continue; }
    const x0 = zone.bounds.left + ZONE_PADDING;
    const x1 = zone.bounds.right - ZONE_PADDING;
    const zoneW = x1 - x0;

    const mode = zone.align || "left";
    // tab-stops: partition by align_stop, layout each sub-bucket
    if (mode === "tab-stops") {
      const buckets = { left: [], center: [], right: [] };
      for (const it of items) {
        const k = it.align_stop || layoutRules.default_align_stop || "center";
        (buckets[k] || buckets.center).push(it);
      }
      const out = [];
      // For each bucket, compute footprint sum and place flush to its edge.
      // left bucket: flush left
      placeBucket(buckets.left, x0, "left", gap, 1, out);
      // right bucket: flush right
      placeBucket(buckets.right, x1, "right", gap, 1, out);
      // center bucket: centered around midpoint
      const mid = (x0 + x1) / 2;
      placeBucket(buckets.center, mid, "center", gap, 1, out);
      // Preserve original sort order in output
      const byName = new Map(out.map(it => [it.placement_name, it]));
      result.set(zone.id, items.map(it => {
        const m = byName.get(it.placement_name) || it;
        return { ...m, _y: m._y ?? provisionalY };
      }));
      continue;
    }

    // single-mode (left, right, center, justify): compute footprints, scale if needed
    let scale = 1;
    let footprints = items.map(it => footprintFor(it, scale));
    let totalFootprint = footprints.reduce((s, f) => s + f, 0) + gap * Math.max(0, items.length - 1);
    if (totalFootprint > zoneW) {
      // shrink gaps first
      const minSpread = footprints.reduce((s, f) => s + f, 0);
      if (minSpread < zoneW) {
        // negative gaps not yet - keep scale 1 with reduced gap
      } else {
        scale = Math.max(MIN_SCALE, zoneW / minSpread);
        footprints = items.map(it => footprintFor(it, scale));
        totalFootprint = footprints.reduce((s, f) => s + f, 0);
        if (totalFootprint > zoneW + 0.5) {
          diagnostics.push({
            stage: "horizontal", severity: "warn", kind: "zone_overflow_negative_gap",
            zone: zone.id, items: items.length,
            overflow_pct: +(totalFootprint - zoneW).toFixed(2),
          });
        }
      }
    }
    const out = [];
    if (mode === "center" || mode === "justify" || items.length === 1) {
      const totalContent = footprints.reduce((s, f) => s + f, 0);
      const effGap = items.length > 1
        ? (mode === "justify" ? (zoneW - totalContent) / (items.length - 1) : gap)
        : 0;
      let startX = (mode === "justify")
        ? x0
        : (x0 + x1) / 2 - (totalContent + effGap * Math.max(0, items.length - 1)) / 2;
      let cursor = startX;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const fw = footprints[i];
        const vw = visualWidthFor(it, scale);
        out.push({ ...it, _scale: scale, _x: cursor + fw / 2, _visualWidth: vw, _footprint: fw });
        cursor += fw + effGap;
      }
    } else if (mode === "right") {
      let cursor = x1;
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const fw = footprints[i];
        const vw = visualWidthFor(it, scale);
        out[i] = { ...it, _scale: scale, _x: cursor - fw / 2, _visualWidth: vw, _footprint: fw };
        cursor -= fw + gap;
      }
    } else {
      // left (default)
      let cursor = x0;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const fw = footprints[i];
        const vw = visualWidthFor(it, scale);
        out.push({ ...it, _scale: scale, _x: cursor + fw / 2, _visualWidth: vw, _footprint: fw });
        cursor += fw + gap;
      }
    }
    result.set(zone.id, out.map(it => ({ ...it, _y: it._y ?? provisionalY })));
  }
  return result;

  function placeBucket(arr, anchor, side, gap, scale, sink) {
    if (arr.length === 0) return;
    const footprints = arr.map(it => footprintFor(it, scale));
    const total = footprints.reduce((s, f) => s + f, 0) + gap * (arr.length - 1);
    let cursor;
    if (side === "left") cursor = anchor;
    else if (side === "right") cursor = anchor - total;
    else cursor = anchor - total / 2;
    for (let i = 0; i < arr.length; i++) {
      const it = arr[i];
      const fw = footprints[i];
      const vw = visualWidthFor(it, scale);
      sink.push({ ...it, _scale: scale, _x: cursor + fw / 2, _visualWidth: vw, _footprint: fw });
      cursor += fw + gap;
    }
  }
}

// -----------------------------------------------------------------
// Stage 7 (was 5): Vertical placement. Adds _y (anchor point), _height, _top.
// Aspect-correct: a square asset (aspect = 1) renders square in pixels at
// any viewport. Formula: heightPct = visualWidth x (viewport.w / viewport.h) / aspect.
function verticalLayout(zoneLayouts, zones, viewport = DEFAULT_VIEWPORT, diagnostics = []) {
  const viewportAspect = viewport.w / viewport.h;
  const result = new Map();
  for (const zone of zones) {
    const items = zoneLayouts.get(zone.id) || [];
    const zoneBaselineY = zone.baseline ?? (zone.bounds.top + zone.bounds.bottom) / 2;
    result.set(zone.id, items.map(it => {
      const depthOffset = DEPTH_BASELINE_OFFSET[depthFor(it)];
      const baseline = it.baseline_override ?? (zoneBaselineY + depthOffset);
      // heightPct = visualWidth x (vp.w / vp.h) / aspect. Keeps pixel aspect
      // constant regardless of viewport shape (percent is per-axis).
      const heightPct = (it._visualWidth * viewportAspect) / Math.max(0.01, it.aspect);
      let top;
      if (it.layout.anchor_y === "bottom") top = baseline - heightPct;
      else if (it.layout.anchor_y === "tip") top = baseline + (it.layout.anchor_y_offset || 0) - heightPct;
      else /* top / fallback: center around baseline */ top = baseline - heightPct / 2;
      // Diagnostic: item escapes zone bounds vertically
      if (top < zone.bounds.top - 3 || top + heightPct > zone.bounds.bottom + 3) {
        diagnostics.push({
          stage: "vertical", severity: "warn", kind: "item_escapes_zone_vertically",
          zone: zone.id, placement_name: it.placement_name,
        });
      }
      return { ...it, _y: baseline, _top: top, _height: heightPct };
    }));
  }
  return result;
}

// Split a label at the space nearest the middle if its estimated width
// exceeds the budget. Caps at 2 lines. LAYOUT_ENGINE.md:
// "estimates the widest line after splitting at the space nearest the middle"
const AVG_CHAR_WIDTH_PCT = 0.6;
function wrapLabel(label, budget) {
  if (!label) return [""];
  const estWidth = label.length * AVG_CHAR_WIDTH_PCT;
  if (estWidth <= budget * 1.1) return [label];
  const mid = label.length / 2;
  const re = /\s+/g;
  const spaces = [];
  let m;
  while ((m = re.exec(label)) !== null) spaces.push(m.index);
  if (spaces.length === 0) return [label];
  const nearest = spaces.reduce(
    (best, s) => Math.abs(s - mid) < Math.abs(best - mid) ? s : best
  );
  const head = label.slice(0, nearest).trim();
  const tail = label.slice(nearest).trim();
  return [head, tail];
}

// -----------------------------------------------------------------
// Stage 8 (was 6): Label layout + 3-pass collision nudge within each zone.
function layoutLabels(zoneLayouts, zones, layoutRules = {}, diagnostics = []) {
  const labelOffsetY = layoutRules.label_offset_y ?? 3.5; // in scene-% units
  const result = new Map();
  for (const zone of zones) {
    const items = (zoneLayouts.get(zone.id) || []).map(it => {
      const lines = wrapLabel(it.label, it.layout.label_width);
      return { ...it, _labelX: it._x, _labelY: it._y + labelOffsetY, _labelLines: lines };
    });
    // 3-pass collision nudge
    for (let pass = 0; pass < 3; pass++) {
      items.sort((a, b) => a._labelX - b._labelX);
      for (let i = 1; i < items.length; i++) {
        const prev = items[i - 1];
        const cur = items[i];
        const want = (prev.layout.label_width + cur.layout.label_width) / 2;
        const gap = cur._labelX - prev._labelX;
        if (gap < want) {
          const push = (want - gap) / 2;
          prev._labelX -= push;
          cur._labelX += push;
        }
      }
      // clamp to padded zone
      const x0 = zone.bounds.left + ZONE_PADDING;
      const x1 = zone.bounds.right - ZONE_PADDING;
      for (const it of items) {
        if (it._labelX < x0 + it.layout.label_width / 2) it._labelX = x0 + it.layout.label_width / 2;
        if (it._labelX > x1 - it.layout.label_width / 2) it._labelX = x1 - it.layout.label_width / 2;
      }
    }
    // Diagnostic: residual overlap after nudge
    for (let i = 1; i < items.length; i++) {
      const want = (items[i - 1].layout.label_width + items[i].layout.label_width) / 2;
      if (items[i]._labelX - items[i - 1]._labelX < want - 0.3) {
        diagnostics.push({
          stage: "labels", severity: "warn", kind: "label_collision_residual",
          zone: zone.id, between: [items[i - 1].placement_name, items[i].placement_name],
        });
      }
    }
    // restore original order
    items.sort((a, b) => (a.depth_tier ?? 0) - (b.depth_tier ?? 0)
                      || String(a.placement_name).localeCompare(String(b.placement_name)));
    result.set(zone.id, items);
  }
  return result;
}

// -----------------------------------------------------------------
// Stage 7: scene_bounds clamp - translate any escaping zone group back in.
function clampSceneBounds(zoneLayouts, zones, sceneBounds, diagnostics = []) {
  if (!sceneBounds) return zoneLayouts;
  const result = new Map();
  for (const zone of zones) {
    const items = (zoneLayouts.get(zone.id) || []);
    if (items.length === 0) { result.set(zone.id, items); continue; }
    let dx = 0, dy = 0;
    const minLeft   = Math.min(...items.map(it => it._x - it._visualWidth / 2));
    const maxRight  = Math.max(...items.map(it => it._x + it._visualWidth / 2));
    const minTop    = Math.min(...items.map(it => it._top));
    const maxBottom = Math.max(...items.map(it => it._top + it._height));
    if (minLeft   < sceneBounds.left)   dx = sceneBounds.left - minLeft;
    if (maxRight  > sceneBounds.right)  dx = sceneBounds.right - maxRight;
    if (minTop    < sceneBounds.top)    dy = sceneBounds.top - minTop;
    if (maxBottom > sceneBounds.bottom) dy = sceneBounds.bottom - maxBottom;
    if (dx !== 0 || dy !== 0) {
      diagnostics.push({
        stage: "clamp", severity: "warn", kind: "zone_clamped_to_bounds",
        zone: zone.id, dx: +dx.toFixed(2), dy: +dy.toFixed(2),
      });
    }
    result.set(zone.id, items.map(it => ({
      ...it,
      _x: it._x + dx,
      _top: it._top + dy,
      _y: it._y + dy,
      _labelX: it._labelX + dx,
      _labelY: it._labelY + dy,
      _clamped: dx !== 0 || dy !== 0,
    })));
  }
  return result;
}

// -----------------------------------------------------------------
// Full pipeline runner - returns the data captured at each stage.
function runPipeline(scene, opts = {}) {
  const library = opts.library || OBJECT_LIBRARY;
  const assets  = opts.assets  || ASSET_SPECS;
  const baseSceneMap = opts.baseSceneMap || {};
  const viewport = opts.viewport || DEFAULT_VIEWPORT;
  const rowLibrary = opts.rowLibrary || WORKSPACE_ROW_LIBRARY;
  const workspacePxPerCm = opts.workspacePxPerCm || WORKSPACE_PX_PER_CM;
  const maxPasses = opts.maxPasses ?? MAX_LAYOUT_PASSES;
  const shrinkFactor = opts.shrinkFactor ?? LAYOUT_SHRINK_FACTOR;
  const diagnostics = [];

  // -- Stages 1-5: identity resolution (single-pass) ----------------
  const normalized  = normalizeSchema(scene, rowLibrary);
  for (const t of (normalized.trace || [])) {
    if (t.op === "row_missing") {
      diagnostics.push({ stage: "normalize", severity: "error", kind: "unknown_row",
                         row: t.row, workspace: t.workspace });
    }
  }
  const normalScene = normalized.scene || scene;
  const inheritance = resolveInheritance(normalScene, baseSceneMap);
  const bound       = bindObjects(inheritance.placements, library, assets, diagnostics);
  let scaled        = scaleToRealWorld(bound, normalScene?.workspace, { workspacePxPerCm }, diagnostics);

  // Diagnostics from identity-resolution stages persist across passes.
  const identityDiagCount = diagnostics.length;

  // -- Stages 6-10: convergence loop --------------------------------
  // Each pass runs Group -> Horizontal -> Vertical -> Labels -> Clamp.
  // After each pass, if any zone overflowed (horizontal or vertical),
  // uniformly shrink _width_scale for items in those zones by
  // LAYOUT_SHRINK_FACTOR and re-iterate. Caps at MAX_LAYOUT_PASSES.
  const passes = [];
  let grouped, horizontal, vertical, labelled, clamped;
  let passDiagnostics = [];

  for (let pass = 0; pass < maxPasses; pass++) {
    passDiagnostics = [];
    grouped     = groupByZone(scaled, normalScene.zones || []);
    for (const o of grouped.orphans) {
      passDiagnostics.push({ stage: "group", severity: "error", kind: "unknown_zone",
                             placement_name: o.placement_name, zone: o.zone });
    }
    horizontal  = horizontalLayout(grouped.groups, normalScene.zones || [], normalScene.layout_rules || {}, passDiagnostics);
    vertical    = verticalLayout(horizontal, normalScene.zones || [], viewport, passDiagnostics);
    labelled    = layoutLabels(vertical, normalScene.zones || [], normalScene.layout_rules || {}, passDiagnostics);
    clamped     = clampSceneBounds(labelled, normalScene.zones || [], normalScene.scene_bounds, passDiagnostics);

    // Identify fittable diagnostics for this pass.
    const fittable = passDiagnostics.filter(d =>
      d.kind === "zone_overflow_negative_gap" ||
      d.kind === "tab_stop_overflow" ||
      d.kind === "item_escapes_zone_vertically"
    );
    passes.push({
      pass: pass + 1,
      diagnostics: [...passDiagnostics],
      zones_shrunk: [],
    });
    if (fittable.length === 0) break;
    if (pass === maxPasses - 1) {
      // Final pass, still failing.
      passDiagnostics.push({
        stage: "meta", severity: "warn", kind: "max_iterations_reached",
        passes_used: maxPasses, unresolved: fittable.length,
      });
      break;
    }
    // Shrink uniformly within overflowing zones for the next pass.
    const zonesToShrink = new Set(fittable.map(d => d.zone).filter(Boolean));
    passes[passes.length - 1].zones_shrunk = [...zonesToShrink];
    scaled = scaled.map(p => zonesToShrink.has(p.zone)
      ? { ...p, _width_scale: p._width_scale * shrinkFactor, _shrunk_passes: (p._shrunk_passes || 0) + 1 }
      : p);
  }

  // Merge final-pass diagnostics with identity-stage diagnostics.
  diagnostics.push(...passDiagnostics);

  // Flatten the final result into a single ordered list of computed items
  const final = [];
  for (const zone of (normalScene.zones || [])) {
    for (const it of (clamped.get(zone.id) || [])) final.push(it);
  }
  return {
    scene: normalScene,
    sourceScene: scene,
    diagnostics,
    passes,
    identityDiagCount,
    stages: {
      inputs: { scene, library, assets },
      normalized,
      inheritance,
      bound,
      scaled,
      grouped,
      horizontal,
      vertical,
      labelled,
      clamped,
    },
    final,
  };
}

Object.assign(window, {
  OBJECT_LIBRARY, ASSET_SPECS, WORKSPACE_ROW_LIBRARY, WORKSPACE_PX_PER_CM,
  DEFAULT_SCENE_BOUNDS, DEFAULT_LAYOUT_RULES, PX_PER_SCENE_PERCENT,
  ZONE_PADDING, MIN_SCALE, DEPTH_SCALE, DEPTH_BASELINE_OFFSET, DEFAULT_VIEWPORT,
  normalizeSchema,
  resolveInheritance, bindObjects, scaleToRealWorld, groupByZone,
  horizontalLayout, verticalLayout, layoutLabels, clampSceneBounds, wrapLabel,
  runPipeline,
  depthFor, widthScaleFor, footprintFor, visualWidthFor,
});
