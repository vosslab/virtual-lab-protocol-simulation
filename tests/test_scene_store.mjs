// tests/test_scene_store.mjs
//
// Node --test suite for the reactive scene store (WS-M2-S).
//
// Proves the behavioral contract:
//   - partial-merge writes at object level (one field changes, others hold)
//   - partial-merge writes at subpart level (e.g. rack.slot_0)
//   - subpart writes validate against the SUBPART schema, not the object one
//   - cursor attach carries held material; detach clears it
//   - reset returns the store to empty
//   - an undeclared-key write throws (ObjectStateChange hard error)
//
// Real object names are used so the test exercises the generated schemas:
//   - "centrifuge": object-level "running" (bool) + "set_rpm" (float)
//   - "bme_bottle": object-level "material_name" (enum) + "material_volume" (float)
//   - "conical_15ml_rack": subpart "material_name" (enum) + "material_volume" (float)

import { test, describe } from "node:test";
import assert from "node:assert";

import { create_scene_store } from "../src/scene_runtime/state/scene_store.ts";
import { OBJECT_LIBRARY } from "../generated/object_library.js";

//============================================
// Helpers
//============================================

// Seed a store with the three fixture targets used across the suite. The
// rack uses a subpart suffix so subpart-schema validation is exercised.
function seeded_store() {
  const store = create_scene_store();
  store.seed_from_scene([
    { target: "centrifuge", object_name: "centrifuge" },
    { target: "bme_bottle", object_name: "bme_bottle" },
    { target: "conical_15ml_rack.slot_0", object_name: "conical_15ml_rack" },
  ]);
  return store;
}

//============================================
// Seeding
//============================================

describe("scene_store seeding", () => {
  test("seeds declared fields to their schema defaults", () => {
    const store = seeded_store();
    // Read the schema default so this assertion stays valid if the YAML default changes.
    const set_rpm_default = OBJECT_LIBRARY["centrifuge"].state_schema["set_rpm"].default;
    assert.strictEqual(store.state["centrifuge"].state.running, false);
    assert.notStrictEqual(store.state["centrifuge"].state.set_rpm, undefined);
    assert.strictEqual(store.state["centrifuge"].state.set_rpm, set_rpm_default);
  });

  test("records object_name and subpart for a subpart target", () => {
    const store = seeded_store();
    const entry = store.state["conical_15ml_rack.slot_0"];
    assert.strictEqual(entry.object_name, "conical_15ml_rack");
    assert.strictEqual(entry.subpart, "slot_0");
  });

  test("object target has a null subpart", () => {
    const store = seeded_store();
    assert.strictEqual(store.state["centrifuge"].subpart, null);
  });
});

//============================================
// Partial-merge writes (object level)
//============================================

describe("scene_store object-level partial merge", () => {
  test("writing one field leaves the others at their seeded value", () => {
    const store = seeded_store();
    // Write only set_rpm; running must stay at its default false.
    store.set_object_state("centrifuge", { set_rpm: 3000 });
    assert.strictEqual(store.state["centrifuge"].state.set_rpm, 3000);
    assert.strictEqual(store.state["centrifuge"].state.running, false);
  });

  test("a second write merges on top of the first", () => {
    const store = seeded_store();
    store.set_object_state("centrifuge", { set_rpm: 3000 });
    store.set_object_state("centrifuge", { running: true });
    // Both writes survive: merge, not replace.
    assert.strictEqual(store.state["centrifuge"].state.set_rpm, 3000);
    assert.strictEqual(store.state["centrifuge"].state.running, true);
  });

  test("material fields merge on a material container", () => {
    const store = seeded_store();
    store.set_object_state("bme_bottle", { material_volume: 2.5 });
    assert.strictEqual(store.state["bme_bottle"].state.material_volume, 2.5);
    // material_name stays at its seeded default.
    assert.strictEqual(store.state["bme_bottle"].state.material_name, "empty");
  });
});

//============================================
// Partial-merge writes (subpart level)
//============================================

describe("scene_store subpart-level partial merge", () => {
  test("writes a subpart field validated against the subpart schema", () => {
    const store = seeded_store();
    store.set_object_state("conical_15ml_rack.slot_0", { material_name: "cells" });
    const entry = store.state["conical_15ml_rack.slot_0"];
    assert.strictEqual(entry.state.material_name, "cells");
    // material_volume holds at the subpart default of 0.
    assert.strictEqual(entry.state.material_volume, 0);
  });

  test("subpart partial merge keeps prior subpart writes", () => {
    const store = seeded_store();
    store.set_object_state("conical_15ml_rack.slot_0", { material_name: "media" });
    store.set_object_state("conical_15ml_rack.slot_0", { material_volume: 12 });
    const entry = store.state["conical_15ml_rack.slot_0"];
    assert.strictEqual(entry.state.material_name, "media");
    assert.strictEqual(entry.state.material_volume, 12);
  });
});

//============================================
// Schema-level validation
//============================================

describe("scene_store schema validation", () => {
  test("undeclared key on an object target throws", () => {
    const store = seeded_store();
    assert.throws(
      () => store.set_object_state("centrifuge", { not_a_field: 1 }),
      /undeclared state key "not_a_field"/,
    );
  });

  test("undeclared key on a subpart target throws", () => {
    const store = seeded_store();
    // set_rpm is a valid OBJECT-level field on some objects but is NOT a
    // declared SUBPART field on the rack: subpart validation must reject it,
    // proving validation uses the subpart schema, not the object schema.
    assert.throws(
      () => store.set_object_state("conical_15ml_rack.slot_0", { set_rpm: 1000 }),
      /undeclared state key "set_rpm"/,
    );
  });

  test("a rejected write leaves the target state untouched", () => {
    const store = seeded_store();
    try {
      store.set_object_state("centrifuge", { running: true, bogus: 1 });
    } catch {
      // Expected: validation throws before any field is written.
    }
    // running must remain at its default because validation failed first.
    assert.strictEqual(store.state["centrifuge"].state.running, false);
  });

  test("a wrong-typed value throws", () => {
    const store = seeded_store();
    // set_rpm is a float; a string value must be rejected.
    assert.throws(
      () => store.set_object_state("centrifuge", { set_rpm: "fast" }),
      /expects number/,
    );
  });

  test("writing to an unseeded target throws", () => {
    const store = seeded_store();
    assert.throws(() => store.set_object_state("microscope", { x: 1 }), /not seeded/);
  });
});

//============================================
// Cursor attach / detach
//============================================

describe("scene_store cursor", () => {
  test("attach carries the held material", () => {
    const store = seeded_store();
    store.set_cursor("bme_bottle", {
      attach: true,
      held_material_name: "bme",
      held_material_volume: 1.0,
    });
    const flags = store.state["bme_bottle"].flags;
    assert.strictEqual(flags.cursor_attached, true);
    assert.strictEqual(flags.held_material_name, "bme");
    assert.strictEqual(flags.held_material_volume, 1.0);
  });

  test("detach clears the held material", () => {
    const store = seeded_store();
    store.set_cursor("bme_bottle", { attach: true, held_material_name: "bme" });
    store.set_cursor("bme_bottle", { attach: false });
    const flags = store.state["bme_bottle"].flags;
    assert.strictEqual(flags.cursor_attached, false);
    assert.strictEqual(flags.held_material_name, null);
    assert.strictEqual(flags.held_material_volume, null);
  });
});

//============================================
// Reset
//============================================

describe("scene_store reset", () => {
  test("reset empties every seeded target", () => {
    const store = seeded_store();
    store.set_object_state("centrifuge", { running: true });
    store.reset();
    assert.strictEqual(store.state["centrifuge"], undefined);
    assert.strictEqual(store.state["bme_bottle"], undefined);
  });

  test("the store is reusable after reset", () => {
    const store = seeded_store();
    store.reset();
    store.seed_from_scene([{ target: "centrifuge", object_name: "centrifuge" }]);
    assert.strictEqual(store.state["centrifuge"].state.running, false);
  });
});

//============================================
// seed_target (single-target insert, WS-M3-D)
//============================================

describe("scene_store seed_target", () => {
  test("adds a subpart instance without resetting siblings", () => {
    const store = seeded_store();
    // Mutate an existing object so we can prove it survives a later seed_target.
    store.set_object_state("centrifuge", { running: true });
    // Add a new subpart instance not present in the original seed list.
    store.seed_target({ target: "conical_15ml_rack.slot_1", object_name: "conical_15ml_rack" });
    // The new subpart exists at its defaults.
    assert.strictEqual(store.state["conical_15ml_rack.slot_1"].state.material_volume, 0);
    // The previously-mutated sibling is untouched.
    assert.strictEqual(store.state["centrifuge"].state.running, true);
  });

  test("seed_target is a no-op for an already-seeded target", () => {
    const store = seeded_store();
    store.set_object_state("bme_bottle", { material_name: "bme" });
    // Re-seeding the same target must NOT reset its written state.
    store.seed_target({ target: "bme_bottle", object_name: "bme_bottle" });
    assert.strictEqual(store.state["bme_bottle"].state.material_name, "bme");
  });
});

//============================================
// Enum membership validation (WS-M3-D)
//============================================

describe("scene_store enum membership", () => {
  test("an enum value outside the allowed set throws", () => {
    const store = seeded_store();
    // bme_bottle.material_name allowed is ['empty', 'bme']; trypan_blue is not.
    assert.throws(
      () => store.set_object_state("bme_bottle", { material_name: "trypan_blue" }),
      /not in allowed/,
    );
  });

  test("an enum value inside the allowed set is accepted", () => {
    const store = seeded_store();
    store.set_object_state("bme_bottle", { material_name: "bme" });
    assert.strictEqual(store.state["bme_bottle"].state.material_name, "bme");
  });

  test("a rejected enum write leaves the target untouched", () => {
    const store = seeded_store();
    try {
      store.set_object_state("bme_bottle", { material_name: "not_real" });
    } catch {
      // expected
    }
    assert.strictEqual(store.state["bme_bottle"].state.material_name, "empty");
  });
});
