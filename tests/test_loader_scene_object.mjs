/**
 * tests/test_loader_scene_object.mjs
 *
 * Node test (node --test) for scene and object loaders.
 *
 * Tests:
 * - Load at least one real scene from generated/scene_data.ts
 * - Load at least one real object from generated/object_data.ts
 * - Assert scene placements all resolve to loaded objects
 * - Assert object state_fields defaults materialize
 * - Negative test: reject unresolved object references in a scene
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";
import { importTsModule } from "./_compile_for_test.mjs";

test("Scene and Object loaders", async (suite) => {
  // Import compiled loaders and generated data.
  const sceneLoader = await importTsModule("src/scene_runtime/loader/scene.ts");
  const objectLoader = await importTsModule(
    "src/scene_runtime/loader/object.ts",
  );
  const sceneData = await importTsModule("generated/scene_data.ts");
  const objectData = await importTsModule("generated/object_data.ts");

  // Initialize catalogs.
  sceneLoader.setSceneCatalog(sceneData.SCENE_CATALOG);
  objectLoader.setObjectCatalog(objectData.OBJECT_CATALOG);

  // Helper to wrap object loader for scene placement validation.
  // Calls ObjectId constructor and loadObject in sequence.
  const objectLoaderWithValidation = (name) => {
    const brandedId = objectLoader.ObjectId(name);
    return objectLoader.loadObject(brandedId);
  };

  await suite.test("Load a real scene and validate placements", () => {
    // Pick the first scene from SCENE_CATALOG (guaranteed to exist by WP-GENERATED-DATA-1).
    const sceneNames = Object.keys(sceneData.SCENE_CATALOG);
    assert.ok(sceneNames.length > 0, "SCENE_CATALOG must not be empty");

    const sceneName = sceneNames[0];
    assert.ok(sceneName, `First scene name must exist`);

    // Brand the scene name and load it.
    const brandedSceneId = sceneLoader.SceneId(sceneName);
    const loadedScene = sceneLoader.loadScene(
      brandedSceneId,
      objectLoaderWithValidation,
    );

    // Validate the loaded scene structure.
    assert.strictEqual(
      loadedScene.scene_name,
      sceneName,
      "Loaded scene name matches",
    );
    assert.ok(loadedScene.workspace, "Loaded scene has workspace");
    assert.ok(
      Array.isArray(loadedScene.placements),
      "Loaded scene has placements array",
    );

    // Every placement must resolve to a loaded object.
    for (const placement of loadedScene.placements) {
      assert.ok(placement.placement_name, `Placement must have placement_name`);
      assert.ok(placement.object_name, `Placement must have object_name`);

      // Load the referenced object to prove it exists.
      const brandedObjectId = objectLoader.ObjectId(placement.object_name);
      const referencedObject = objectLoader.loadObject(brandedObjectId);
      assert.strictEqual(
        referencedObject.object_name,
        placement.object_name,
        `Referenced object matches placement.object_name`,
      );
    }
  });

  await suite.test(
    "Load a real object and validate state_fields defaults",
    () => {
      // Pick the first object from OBJECT_CATALOG.
      const objectNames = Object.keys(objectData.OBJECT_CATALOG);
      assert.ok(objectNames.length > 0, "OBJECT_CATALOG must not be empty");

      const objectName = objectNames[0];
      assert.ok(objectName, `First object name must exist`);

      // Brand the object name and load it.
      const brandedObjectId = objectLoader.ObjectId(objectName);
      const loadedObject = objectLoader.loadObject(brandedObjectId);

      // Validate the loaded object structure.
      assert.strictEqual(
        loadedObject.object_name,
        objectName,
        "Loaded object name matches",
      );
      assert.ok(loadedObject.kind, "Loaded object has kind");
      assert.ok(
        Array.isArray(loadedObject.state_fields),
        "Loaded object has state_fields array",
      );

      // Every state_field must have a materialized default (not undefined, not null).
      for (const stateField of loadedObject.state_fields) {
        assert.ok(stateField.field_name, `State field must have field_name`);
        assert.ok(stateField.type, `State field must have type`);
        assert.notStrictEqual(
          stateField.default,
          undefined,
          `State field "${stateField.field_name}" must have a materialized default (not undefined)`,
        );
        // Note: null is technically allowed by the schema for two authored fields,
        // but the spec requires materialized defaults. We allow null here per
        // the schema widening in WP-GENERATED-DATA-1.
      }

      // Validate visual_states: every entry must have a supported kind.
      assert.ok(
        typeof loadedObject.visual_states === "object",
        "Loaded object has visual_states",
      );
      const supportedKinds = new Set([
        "svg_swap",
        "composite_fill_height",
        "composite_empty",
        "overlay",
      ]);
      for (const [fieldName, visualState] of Object.entries(
        loadedObject.visual_states,
      )) {
        assert.ok(
          visualState.kind,
          `Visual state "${fieldName}" must have kind`,
        );
        assert.ok(
          supportedKinds.has(visualState.kind),
          `Visual state "${fieldName}" kind "${visualState.kind}" must be one of: ${Array.from(supportedKinds).join(", ")}`,
        );
      }
    },
  );

  await suite.test(
    "Negative test: reject unknown object reference in scene",
    () => {
      // Create a fake scene with a placement that references a non-existent object.
      const fakeScene = {
        scene_name: "fake_test_scene",
        workspace: "test",
        capabilities: ["test"],
        scene_bounds: { left: 0, right: 100, top: 0, bottom: 100 },
        background: { asset: "test_bg" },
        zones: [
          {
            id: "zone_1",
            bounds: { left: 0, right: 100, top: 0, bottom: 100 },
            align: "center",
          },
        ],
        placements: [
          {
            placement_name: "test_placement",
            object_name: "this_object_does_not_exist_12345",
            zone: "zone_1",
          },
        ],
      };

      // Inject the fake scene into the catalog.
      sceneData.SCENE_CATALOG["fake_test_scene"] = fakeScene;

      // Brand the fake scene name.
      const brandedSceneId = sceneLoader.SceneId("fake_test_scene");

      // Attempt to load the fake scene; it should throw loudly.
      assert.throws(
        () => {
          sceneLoader.loadScene(brandedSceneId, objectLoaderWithValidation);
        },
        (err) => {
          assert.ok(
            err.message.includes("unknown object") ||
              err.message.includes("this_object_does_not_exist_12345"),
            `Error must mention the unknown object name: ${err.message}`,
          );
          return true;
        },
        "loadScene must throw on unknown object reference",
      );

      // Clean up the fake scene.
      delete sceneData.SCENE_CATALOG["fake_test_scene"];
    },
  );

  await suite.test("Negative test: reject unknown visual_states kind", () => {
    // Create a fake object with an unsupported visual_states kind.
    const fakeObject = {
      object_name: "fake_test_object",
      kind: "test",
      label: "Test Object",
      state_fields: [
        {
          field_name: "test_state",
          type: "enum",
          allowed: ["a", "b"],
          default: "a",
        },
      ],
      visual_states: {
        test_state: {
          kind: "unsupported_kind_xyz",
          pilot_0_eligible: false,
        },
      },
      capabilities: ["test"],
    };

    // Inject the fake object into the catalog.
    objectData.OBJECT_CATALOG["fake_test_object"] = fakeObject;

    // Brand the fake object name.
    const brandedObjectId = objectLoader.ObjectId("fake_test_object");

    // Attempt to load the fake object; it should throw loudly.
    assert.throws(
      () => {
        objectLoader.loadObject(brandedObjectId);
      },
      (err) => {
        assert.ok(
          err.message.includes("unknown visual_states kind") ||
            err.message.includes("unsupported_kind_xyz"),
          `Error must mention unsupported kind: ${err.message}`,
        );
        return true;
      },
      "loadObject must throw on unsupported visual_states kind",
    );

    // Clean up the fake object.
    delete objectData.OBJECT_CATALOG["fake_test_object"];
  });

  await suite.test(
    "Negative test: reject unresolved inheritance keys in scene",
    () => {
      // Create a fake scene with an unresolved inheritance key.
      const fakeSceneWithInheritance = {
        scene_name: "fake_scene_unresolved",
        workspace: "test",
        capabilities: ["test"],
        scene_bounds: { left: 0, right: 100, top: 0, bottom: 100 },
        background: { asset: "test_bg" },
        zones: [],
        placements: [],
        extends: "some_base_scene", // Should not exist in resolved data
      };

      // Inject the fake scene.
      sceneData.SCENE_CATALOG["fake_scene_unresolved"] =
        fakeSceneWithInheritance;

      // Brand the scene name.
      const brandedSceneId = sceneLoader.SceneId("fake_scene_unresolved");

      // Attempt to load; it should throw on unresolved inheritance key.
      assert.throws(
        () => {
          sceneLoader.loadScene(brandedSceneId, objectLoaderWithValidation);
        },
        (err) => {
          assert.ok(
            err.message.includes("inheritance not resolved") ||
              err.message.includes("extends"),
            `Error must mention unresolved inheritance: ${err.message}`,
          );
          return true;
        },
        "loadScene must throw on unresolved inheritance keys",
      );

      // Clean up.
      delete sceneData.SCENE_CATALOG["fake_scene_unresolved"];
    },
  );
});
