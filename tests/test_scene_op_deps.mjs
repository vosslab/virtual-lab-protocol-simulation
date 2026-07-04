// tests/test_scene_op_deps.mjs
//
// Node --test suite for the store-driven SceneOpDeps (WS-M3-D). Proves that
// each scene operation drives the reactive scene_store correctly, and that the
// SceneChange reset policy holds across a transition.
//
// These deps replace the old imperative build_scene_op_deps that poked DOM
// attributes. Here the contract is: ObjectStateChange/CursorAttach write the
// store; SceneChange reseeds (via the injected render_scene closure) and
// preserves cursor-held state; LayoutMove is a reported no-op (no throw);
// TimedWait is observable through the store only when the target is seeded.
//
// The render_scene closure is the test seam: in the browser, protocol_host
// passes a closure that runs runPipeline + mountScene (which reseeds the store
// from the new scene's PipelineResult, dropping scene-local state). Here we
// inject a closure that reseeds an explicit target list, which is exactly the
// reset behavior under test.
//
// Reset matrix (PRIMARY_SPEC.md / plan WS-M3-D):
//   - scene-local vessel state clears on SceneChange
//   - cursor-held tool persists
//   - cursor-held material persists
//   - active-target + selected flags clear
//   - subpart state clears on leaving the scene

import { test, describe } from "node:test";
import assert from "node:assert";

import { create_scene_store } from "../src/scene_runtime/state/scene_store.ts";
import { build_store_scene_op_deps } from "../src/scene_runtime/protocol/scene_op_deps.ts";
import { OBJECT_LIBRARY } from "../generated/object_library.js";

//============================================
// Helpers
//============================================

// Seed a store with the bench-like fixture set used across the suite.
//   micropipette: cursor-attachable tool with held_material_name + set_volume
//   bme_bottle:   material container (material_name enum + material_volume)
//   centrifuge:   instrument (running bool + set_rpm float)
function seed_scene(store) {
  store.seed_from_scene([
    { target: "micropipette", object_name: "micropipette" },
    { target: "bme_bottle", object_name: "bme_bottle" },
    { target: "centrifuge", object_name: "centrifuge" },
  ]);
}

// Build deps with a render_scene closure that reseeds the store from a fixed
// next-scene target list (the way mountScene reseeds from a PipelineResult).
function deps_with_next_scene(store, nextSceneSeeds) {
  const render_scene = (_scene_name) => {
    store.seed_from_scene(nextSceneSeeds);
  };
  return build_store_scene_op_deps(store, render_scene);
}

//============================================
// ObjectStateChange
//============================================

describe("scene_op_deps ObjectStateChange", () => {
  test("writes a declared object field to the store", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "centrifuge",
      state: { running: true },
    });
    assert.strictEqual(store.state["centrifuge"].state.running, true);
  });

  test("partial-merges: a second write keeps the first", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "centrifuge",
      state: { set_rpm: 3000 },
    });
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "centrifuge",
      state: { running: true },
    });
    assert.strictEqual(store.state["centrifuge"].state.set_rpm, 3000);
    assert.strictEqual(store.state["centrifuge"].state.running, true);
  });

  test("auto-seeds a subpart target on first write", () => {
    // Registry-backed subpart material acceptance (D1): the store carries a
    // registry registering the written material. The test's subject is the
    // auto-seed-on-first-write behavior, not material acceptance.
    const store = create_scene_store({
      media: { label: "Growth media", display_color: "#6c6c00" },
    });
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    // conical_15ml_rack.slot_0 is NOT in the seed list; the deps must seed it.
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "conical_15ml_rack.slot_0",
      state: { material_name: "media" },
    });
    assert.strictEqual(store.state["conical_15ml_rack.slot_0"].state.material_name, "media");
    // Auto-seeding the subpart must not disturb an existing sibling.
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "centrifuge",
      state: { running: true },
    });
    assert.strictEqual(store.state["centrifuge"].state.running, true);
  });
});

//============================================
// ObjectStateChange subpart-group fan-out
//============================================

describe("scene_op_deps ObjectStateChange group fan-out", () => {
  test("a group write fans out to every declared member well", () => {
    // Registry registers the drug so the subpart material write is accepted.
    const store = create_scene_store({
      cells: { label: "Cells", display_color: "#6c6c00" },
    });
    store.seed_from_scene([{ target: "well_plate_96", object_name: "well_plate_96" }]);
    const deps = build_store_scene_op_deps(store, () => {});
    // Bulk write to the all_wells subpart_group.
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "well_plate_96.all_wells",
      state: { material_name: "cells", material_volume: 100 },
    });
    // Every declared member (all 96 wells) received the write to its own slot.
    const members = OBJECT_LIBRARY["well_plate_96"].subpart_groups["all_wells"];
    assert.strictEqual(members.length, 96);
    for (const well of members) {
      const entry = store.state[`well_plate_96.${well}`];
      assert.ok(entry !== undefined, `well ${well} should be seeded by the fan-out`);
      assert.strictEqual(entry.state.material_name, "cells");
      assert.strictEqual(entry.state.material_volume, 100);
    }
    // No non-rendered "all_wells" pseudo-node was written.
    assert.strictEqual(store.state["well_plate_96.all_wells"], undefined);
  });

  test("a smaller group write reaches only its members", () => {
    const store = create_scene_store({
      cells: { label: "Cells", display_color: "#6c6c00" },
    });
    store.seed_from_scene([{ target: "well_plate_96", object_name: "well_plate_96" }]);
    const deps = build_store_scene_op_deps(store, () => {});
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "well_plate_96.row_A",
      state: { material_name: "cells", material_volume: 50 },
    });
    // row_A members written; a non-member (B1) is untouched (unseeded).
    assert.strictEqual(store.state["well_plate_96.A1"].state.material_volume, 50);
    assert.strictEqual(store.state["well_plate_96.A12"].state.material_volume, 50);
    assert.strictEqual(store.state["well_plate_96.B1"], undefined);
  });

  test("a single-subpart write is not fanned out", () => {
    const store = create_scene_store({
      cells: { label: "Cells", display_color: "#6c6c00" },
    });
    store.seed_from_scene([{ target: "well_plate_96", object_name: "well_plate_96" }]);
    const deps = build_store_scene_op_deps(store, () => {});
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "well_plate_96.A1",
      state: { material_name: "cells", material_volume: 25 },
    });
    assert.strictEqual(store.state["well_plate_96.A1"].state.material_volume, 25);
    assert.strictEqual(store.state["well_plate_96.A2"], undefined);
  });
});

//============================================
// CursorAttach
//============================================

describe("scene_op_deps CursorAttach", () => {
  test("attach sets the cursor_attached flag", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    deps.apply_cursor_attach({
      type: "CursorAttach",
      target: "micropipette",
      operation: "attach",
    });
    assert.strictEqual(store.state["micropipette"].flags.cursor_attached, true);
  });

  test("attach preserves an already-held material", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    // First an ObjectStateChange sets the held material on the tool, then a
    // later CursorAttach must not clobber it.
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "micropipette",
      state: { held_material_name: "trypan_blue", held_material_volume: 10 },
    });
    // Held-material lives in the object state for the tool; mirror it onto the
    // cursor flags via attach. attach reads current held flags (none yet), so
    // first set the cursor held material directly, then re-attach.
    store.set_cursor("micropipette", {
      attach: true,
      held_material_name: "trypan_blue",
      held_material_volume: 10,
    });
    deps.apply_cursor_attach({
      type: "CursorAttach",
      target: "micropipette",
      operation: "attach",
    });
    const flags = store.state["micropipette"].flags;
    assert.strictEqual(flags.cursor_attached, true);
    assert.strictEqual(flags.held_material_name, "trypan_blue");
  });

  test("detach clears the cursor flag and held material", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    store.set_cursor("micropipette", { attach: true, held_material_name: "trypan_blue" });
    deps.apply_cursor_attach({
      type: "CursorAttach",
      target: "micropipette",
      operation: "detach",
    });
    const flags = store.state["micropipette"].flags;
    assert.strictEqual(flags.cursor_attached, false);
    assert.strictEqual(flags.held_material_name, null);
  });
});

//============================================
// SceneChange reset matrix
//============================================

describe("scene_op_deps SceneChange reset matrix", () => {
  test("scene-local vessel state clears on SceneChange", () => {
    const store = create_scene_store();
    seed_scene(store);
    // The next scene re-seeds bme_bottle fresh (same object placed again).
    const deps = deps_with_next_scene(store, [{ target: "bme_bottle", object_name: "bme_bottle" }]);
    // Read the schema default so this assertion stays valid if the YAML default changes.
    const vol_default = OBJECT_LIBRARY["bme_bottle"].state_schema["material_volume"].default;
    // Dirty the vessel in the current scene.
    store.set_object_state("bme_bottle", { material_name: "bme", material_volume: 2 });
    deps.apply_scene_change({ type: "SceneChange", to_scene: "next" });
    // After the transition the vessel is back at its seeded defaults.
    assert.strictEqual(store.state["bme_bottle"].state.material_name, "empty");
    assert.notStrictEqual(store.state["bme_bottle"].state.material_volume, undefined);
    assert.strictEqual(store.state["bme_bottle"].state.material_volume, vol_default);
  });

  test("cursor-held tool and material persist across SceneChange", () => {
    const store = create_scene_store();
    seed_scene(store);
    // The tool is placed in the NEXT scene too, so its cursor state can carry.
    const deps = deps_with_next_scene(store, [
      { target: "micropipette", object_name: "micropipette" },
    ]);
    store.set_cursor("micropipette", {
      attach: true,
      held_material_name: "trypan_blue",
      held_material_volume: 10,
    });
    deps.apply_scene_change({ type: "SceneChange", to_scene: "next" });
    const flags = store.state["micropipette"].flags;
    assert.strictEqual(flags.cursor_attached, true);
    assert.strictEqual(flags.held_material_name, "trypan_blue");
    assert.strictEqual(flags.held_material_volume, 10);
  });

  test("selected flag clears on SceneChange", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = deps_with_next_scene(store, [{ target: "centrifuge", object_name: "centrifuge" }]);
    store.set_flags("centrifuge", { is_selected: true });
    deps.apply_scene_change({ type: "SceneChange", to_scene: "next" });
    const flags = store.state["centrifuge"].flags;
    assert.strictEqual(flags.is_selected, false);
  });

  test("subpart state clears on leaving the scene", () => {
    // A subpart material write is registry-backed (D1): the store carries a
    // registry that registers the written material so acceptance passes. The
    // test's subject is the scene-change reset, not material acceptance.
    const store = create_scene_store({
      media: { label: "Growth media", display_color: "#6c6c00" },
    });
    seed_scene(store);
    const deps = deps_with_next_scene(store, [{ target: "centrifuge", object_name: "centrifuge" }]);
    // Write a subpart in the current scene (auto-seeded).
    deps.apply_object_state({
      type: "ObjectStateChange",
      target: "conical_15ml_rack.slot_0",
      state: { material_name: "media" },
    });
    assert.strictEqual(store.state["conical_15ml_rack.slot_0"].state.material_name, "media");
    deps.apply_scene_change({ type: "SceneChange", to_scene: "next" });
    // The subpart instance is gone after leaving the scene.
    assert.strictEqual(store.state["conical_15ml_rack.slot_0"], undefined);
  });

  test("a held tool absent from the next scene drops its cursor state", () => {
    const store = create_scene_store();
    seed_scene(store);
    // Next scene does NOT contain the micropipette.
    const deps = deps_with_next_scene(store, [{ target: "centrifuge", object_name: "centrifuge" }]);
    store.set_cursor("micropipette", { attach: true, held_material_name: "trypan_blue" });
    deps.apply_scene_change({ type: "SceneChange", to_scene: "next" });
    // micropipette is not in the new scene, so its cursor state cannot carry.
    assert.strictEqual(store.state["micropipette"], undefined);
  });
});

//============================================
// LayoutMove (Option A: reported no-op)
//============================================

describe("scene_op_deps LayoutMove", () => {
  test("LayoutMove does not throw and does not mutate the store", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    const before = store.state["centrifuge"].state.running;
    // Option A: explicitly unsupported, reported no-op (warn), never a throw.
    assert.doesNotThrow(() =>
      deps.apply_layout_move({ type: "LayoutMove", target: "centrifuge", zone: "mid" }),
    );
    assert.strictEqual(store.state["centrifuge"].state.running, before);
  });
});

//============================================
// TimedWait (observable through the subsequent ObjectStateChange)
//============================================

describe("scene_op_deps TimedWait", () => {
  test("TimedWait on a seeded target does not throw", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    assert.doesNotThrow(() =>
      deps.start_timed_wait({ type: "TimedWait", target: "centrifuge", duration_min: 0.05 }),
    );
  });

  test("TimedWait on an unseeded target is a safe no-op", () => {
    const store = create_scene_store();
    seed_scene(store);
    const deps = build_store_scene_op_deps(store, () => {});
    assert.doesNotThrow(() =>
      deps.start_timed_wait({ type: "TimedWait", target: "not_seeded_equipment", duration_min: 1 }),
    );
  });
});
