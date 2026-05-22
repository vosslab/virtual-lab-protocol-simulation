/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * tests/test_layout_integration.ts
 *
 * Integration test for layout engine with real generated data.
 *
 * Loads a real protocol + scene + objects via the loaders,
 * calls computeSceneLayout(world, sceneId), and verifies:
 * - Result is an array
 * - Result length matches scene.placements.length
 * - Every item has nonzero width and nonzero footprint
 * - No throw
 */

// File-scoped Node.js types for process object
declare const process: {
  exit(code: number): never;
};

import {
  setProtocolCatalog,
  loadProtocol,
  ProtocolName,
} from "../src/scene_runtime/loader/protocol";
import { setSceneCatalog, loadScene } from "../src/scene_runtime/loader/scene";
import {
  setObjectCatalog,
  loadObject,
} from "../src/scene_runtime/loader/object";
import { loadWorld as loadWorldGeneric } from "../src/scene_runtime/loader/world";
import { computeSceneLayout } from "../src/scene_runtime/layout";
import type { ComputedItemLayout } from "../src/scene_runtime/layout";

// Import generated catalogs
import { PROTOCOL_CONFIGS } from "../generated/protocol_data";
import { SCENE_CATALOG } from "../generated/scene_data";
import { OBJECT_CATALOG } from "../generated/object_data";

function main(): void {
  console.log("Initializing catalogs...");
  setProtocolCatalog(PROTOCOL_CONFIGS);
  setSceneCatalog(SCENE_CATALOG);
  setObjectCatalog(OBJECT_CATALOG);

  console.log("Loading test world...");

  // Pick a protocol with at least 1 placement.
  // Fall back to the first available if none match the criteria.
  let protocolName = "";
  for (const name of Object.keys(PROTOCOL_CONFIGS)) {
    try {
      const world = loadWorldGeneric(ProtocolName(name), {
        loadProtocol,
        loadScene,
        loadObject,
        loadMaterial: (protocol, matName) => {
          if (!protocol.materials[matName]) {
            throw new Error(`Missing material: ${matName}`);
          }
          return protocol.materials[matName];
        },
      });
      const sceneIds = Object.keys(world.scenes);
      for (const sceneId of sceneIds) {
        const scene = world.scenes[sceneId];
        if (scene && scene.placements && scene.placements.length >= 1) {
          protocolName = name;
          break;
        }
      }
      if (protocolName) break;
    } catch (e) {
      // Continue to next protocol
    }
  }

  if (!protocolName) {
    // If no suitable protocol found, use the first available
    const firstKey = Object.keys(PROTOCOL_CONFIGS)[0];
    if (!firstKey) {
      throw new Error("No protocols available in catalog");
    }
    protocolName = firstKey;
  }

  console.log(`Using protocol: ${protocolName}`);
  const world = loadWorldGeneric(ProtocolName(protocolName), {
    loadProtocol,
    loadScene,
    loadObject,
    loadMaterial: (protocol, matName) => {
      if (!protocol.materials[matName]) {
        throw new Error(`Missing material: ${matName}`);
      }
      return protocol.materials[matName];
    },
  });

  // Find the first scene with placements
  let sceneId = "";
  for (const id of Object.keys(world.scenes)) {
    const scene = world.scenes[id];
    if (scene && scene.placements && scene.placements.length > 0) {
      sceneId = id;
      break;
    }
  }

  if (!sceneId) {
    throw new Error(
      `No scenes with placements found in protocol '${protocolName}'`,
    );
  }

  console.log(`Using scene: ${sceneId}`);
  const scene = world.scenes[sceneId];
  if (!scene) {
    throw new Error(`Scene '${sceneId}' not found in world`);
  }
  const placementCount = scene.placements ? scene.placements.length : 0;
  console.log(`Scene has ${placementCount} placements`);

  // Call computeSceneLayout
  console.log("Calling computeSceneLayout...");
  const result: ComputedItemLayout[] = computeSceneLayout(world, sceneId);

  // Assertions
  console.log("Verifying result...");

  if (!Array.isArray(result)) {
    throw new Error("computeSceneLayout did not return an array");
  }

  if (result.length !== placementCount) {
    throw new Error(
      `Result length mismatch: expected ${placementCount}, got ${result.length}`,
    );
  }

  for (let i = 0; i < result.length; i++) {
    const item = result[i];
    if (!item) {
      throw new Error(`Result item ${i} is undefined`);
    }

    if (item.width === 0 || isNaN(item.width)) {
      throw new Error(
        `Item ${i} (${item.id}) has zero or NaN width: ${item.width}`,
      );
    }

    if (item.footprint === 0 || isNaN(item.footprint)) {
      throw new Error(
        `Item ${i} (${item.id}) has zero or NaN footprint: ${item.footprint}`,
      );
    }

    if (isNaN(item.x) || isNaN(item.y)) {
      throw new Error(
        `Item ${i} (${item.id}) has NaN position: (${item.x}, ${item.y})`,
      );
    }
  }

  console.log("All assertions passed!");
  console.log(`Successfully computed layout for ${result.length} items.`);
  console.log("Sample item:", {
    id: result[0]?.id,
    x: result[0]?.x.toFixed(2),
    y: result[0]?.y.toFixed(2),
    width: result[0]?.width.toFixed(2),
    height: result[0]?.height.toFixed(2),
  });

  process.exit(0);
}

try {
  main();
} catch (err: unknown) {
  console.error("Test failed:", err);
  process.exit(1);
}
