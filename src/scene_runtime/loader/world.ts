/* eslint-disable preserve-caught-error */
/**
 * src/scene_runtime/loader/world.ts
 *
 * RuntimeWorld assembly: combines protocol + every referenced scene + every
 * referenced object + every referenced material into a fully typed RuntimeWorld.
 *
 * Workflow:
 * 1. Load the protocol by name.
 * 2. Collect every distinct scene id from entry_step + next_step chains and
 *    SceneChange operations in interactions.
 * 3. Load each scene and validate all referenced objects.
 * 4. Collect every material referenced by any ObjectStateChange in any interaction.
 * 5. Load each material from the protocol's inline materials.
 * 6. Assemble a typed RuntimeWorld with all loaded data.
 *
 * Throws loud errors on any missing or invalid reference.
 */

import type {
  ProtocolConfig,
  ResolvedSceneConfig,
  ObjectConfig,
  MaterialConfig,
  RuntimeWorld,
  Step,
} from "../types";

import { findScenesContainingObject } from "./scene";

// Type definitions for loader functions to avoid circular imports.
type ProtocolName = string & { readonly __brand: "ProtocolName" };
type SceneId = string & { readonly __brand: "SceneId" };
type ObjectId = string & { readonly __brand: "ObjectId" };

/**
 * Extract the base object name from a target by stripping subpart suffix.
 * Examples: "micropipette" -> "micropipette", "well_plate_96.A1" -> "well_plate_96",
 *           "well_plate_96.all_wells" -> "well_plate_96"
 */
export function getBaseObjectName(target: string): string {
  const dotIndex = target.indexOf(".");
  if (dotIndex === -1) {
    return target;
  }
  return target.substring(0, dotIndex);
}

/**
 * Resolve the best matching scene for a target object from a list of candidates.
 * Used by both inferInitialScene and deriveSceneForStep.
 *
 * Algorithm:
 * 1. If currentSceneId is provided and contains the target, return it (no scene switch needed).
 * 2. If multiple scenes contain the target, prefer one whose scene_name starts with protocolPrefix + '_'.
 * 3. If only one scene matches, return it.
 * 4. If no scenes match or multiple matches with no prefix match, throw a loud error listing candidates.
 *
 * @param objectName The base object name to find
 * @param loadedScenes Record of all available scenes
 * @param protocolPrefix The protocol_name to use for prefix matching (e.g., "mtt_solubilization_readout")
 * @param currentSceneId Optional: if the current activeSceneId contains the target, return it unchanged
 * @returns The preferred scene name
 * @throws If no scenes contain the target or if multiple scenes match without a clear prefix preference
 */
export function resolveSceneForTarget(
  objectName: string,
  loadedScenes: Record<string, ResolvedSceneConfig>,
  protocolPrefix: string,
  currentSceneId?: string,
): string {
  // Find all scenes containing this object.
  const matchingScenes: string[] = [];
  for (const sceneName of Object.keys(loadedScenes)) {
    const scene = loadedScenes[sceneName];
    if (!scene) {
      continue;
    }
    if (!scene.placements) {
      continue;
    }
    const hasObject = scene.placements.some(
      (p) => p.object_name === objectName,
    );
    if (hasObject) {
      matchingScenes.push(sceneName);
    }
  }

  // FIRST: if currentSceneId is provided and contains the target, return it (no switch needed).
  if (currentSceneId && matchingScenes.includes(currentSceneId)) {
    return currentSceneId;
  }

  // SECOND: if multiple scenes contain the target, prefer one with protocol-name prefix match.
  if (matchingScenes.length > 1) {
    const protocolNamedScenes = matchingScenes.filter((s) =>
      s.startsWith(protocolPrefix + "_"),
    );
    if (protocolNamedScenes.length === 1) {
      const scene = protocolNamedScenes[0];
      if (scene !== undefined) {
        return scene;
      }
    }
    // If multiple protocol-named scenes or zero, ambiguity remains; fall through to error below.
  }

  // THIRD: only one match -> use it.
  if (matchingScenes.length === 1) {
    const scene = matchingScenes[0];
    if (scene === undefined) {
      throw new Error(`Unexpected: scene list contains undefined after filter`);
    }
    return scene;
  }

  // FOURTH: ambiguous (zero or multiple matches with no prefix preference) -> throw loud error.
  throw new Error(
    `Cannot determine scene for target object "${objectName}". ` +
      `Matching scenes: ${matchingScenes.length === 0 ? "[none found]" : matchingScenes.join(", ")}. ` +
      `This is a content or spec gap: the target must exist in exactly one scene, or scenes must disambiguate via protocol-name prefix.`,
  );
}

/**
 * Infer the initial scene by finding which scene contains the entry_step's
 * first interaction's target object.
 *
 * Per PRIMARY_SPEC.md "Entry step":
 * "The scene a protocol opens in is not a protocol-level field. The protocol
 * vocabulary is geometry-free and scene-free at the flow level; a step's
 * interactions name semantic target objects, and the scene adapter resolves
 * those names."
 *
 * Uses resolveSceneForTarget helper which applies prefix matching.
 * Throws a loud error if the target is not found in exactly one scene.
 */
function inferInitialScene(
  protocol: ProtocolConfig,
  loadedScenes: Record<string, ResolvedSceneConfig>,

  _sceneIdsFromChanges: Set<string>,

  _sceneIdsFromTargets: Set<string>,
): string {
  // Find the entry step.
  const entryStep = protocol.steps.find(
    (s) => s.step_name === protocol.entry_step,
  );
  if (!entryStep || entryStep.sequence.length === 0) {
    throw new Error(
      `entry_step "${protocol.entry_step}" has no interactions. ` +
        `Cannot infer initial scene from target.`,
    );
  }

  // Get the first interaction's target object name (stripped of subpart).
  const firstInteraction = entryStep.sequence[0];
  if (!firstInteraction) {
    throw new Error(
      `entry_step "${protocol.entry_step}" sequence[0] is missing. ` +
        `Cannot infer initial scene from target.`,
    );
  }

  const firstTarget = firstInteraction.target;
  const objectName = getBaseObjectName(firstTarget);

  // Find which scenes contain this object; prioritize target-inferred scenes.
  const matchingScenes: string[] = [];
  for (const sceneName of Object.keys(loadedScenes)) {
    const scene = loadedScenes[sceneName];
    if (!scene) {
      continue;
    }
    if (!scene.placements) {
      continue;
    }
    const hasObject = scene.placements.some(
      (p) => p.object_name === objectName,
    );
    if (hasObject) {
      matchingScenes.push(sceneName);
    }
  }

  // Use the shared resolver to pick the best match (with prefix preference and no-switch logic).
  // For entry, we don't have a currentSceneId, so pass undefined.
  try {
    return resolveSceneForTarget(
      objectName,
      loadedScenes,
      protocol.protocol_name,
      undefined,
    );
  } catch (err) {
    // Wrap error with entry-step context.
    const errorMsg = err instanceof Error ? err.message : String(err);
    const wrappedMsg = `entry_step "${protocol.entry_step}" references target "${firstTarget}": ${errorMsg}`;
    if (err instanceof Error) {
      err.message = wrappedMsg;
      throw err;
    }

    throw new Error(wrappedMsg);
  }
}

/**
 * Collect all distinct scene ids referenced by SceneChange operations
 * in a protocol's step chain. This is a first pass to load explicit scenes.
 */
function collectSceneIdsFromSceneChanges(
  protocol: ProtocolConfig,
): Set<string> {
  const sceneIds = new Set<string>();

  // Build a map of step_name -> step for fast lookup during traversal.
  const stepMap = new Map<string, Step>();
  for (const step of protocol.steps) {
    stepMap.set(step.step_name, step);
  }

  // Traverse the protocol's step chain starting from entry_step.
  // Collect any scene referenced in SceneChange operations.
  const visited = new Set<string>();
  const queue: string[] = [protocol.entry_step];

  while (queue.length > 0) {
    const stepName = queue.shift();
    if (!stepName || visited.has(stepName)) {
      continue;
    }
    visited.add(stepName);

    const step = stepMap.get(stepName);
    if (!step) {
      // step_name validation happens in loadProtocol, so we trust it exists.
      continue;
    }

    // Scan interactions for SceneChange operations that name a scene.
    for (const interaction of step.sequence) {
      const response = interaction.response;
      if (!response || !Array.isArray(response.scene_operations)) {
        continue;
      }

      for (const op of response.scene_operations) {
        if (op.type === "SceneChange" && op.to_scene) {
          sceneIds.add(op.to_scene);
        }
      }
    }

    // Add next step to the queue.
    if (step.next_step) {
      queue.push(step.next_step);
    }
  }

  return sceneIds;
}

/**
 * Collect scene ids based on target objects referenced in the first interaction
 * of each step in the protocol, following the step chain from entry_step.
 * For each target object, find all scenes that contain it and add those scenes.
 * Used to infer which scenes are needed from target references.
 *
 * Requires sceneLookup callback to query the catalog for scenes containing an object.
 * (This callback is provided because the module-level SCENE_CATALOG_INJECTED in
 * scene.ts may not be initialized if this module is compiled separately via esbuild.)
 */
function collectSceneIdsFromTargets(
  protocol: ProtocolConfig,
  sceneLookup: (objectName: string) => string[],
): Set<string> {
  const sceneIds = new Set<string>();

  // Build a map of step_name -> step for fast lookup during traversal.
  const stepMap = new Map<string, Step>();
  for (const step of protocol.steps) {
    stepMap.set(step.step_name, step);
  }

  // Traverse the protocol's step chain starting from entry_step.
  // For each step, find which scene(s) contain its first interaction's target object.
  const visited = new Set<string>();
  const queue: string[] = [protocol.entry_step];

  while (queue.length > 0) {
    const stepName = queue.shift();
    if (!stepName || visited.has(stepName)) {
      continue;
    }
    visited.add(stepName);

    const step = stepMap.get(stepName);
    if (!step) {
      continue;
    }

    // Find the target object from the first interaction (if present).
    if (step.sequence && step.sequence.length > 0) {
      const firstInteraction = step.sequence[0];
      if (firstInteraction) {
        const objectName = getBaseObjectName(firstInteraction.target);
        // Query the scene catalog for which scenes contain this object.
        const scenesWithObject = sceneLookup(objectName);
        for (const sceneName of scenesWithObject) {
          sceneIds.add(sceneName);
        }
      }
    }

    // Add next step to the queue.
    if (step.next_step) {
      queue.push(step.next_step);
    }
  }

  return sceneIds;
}

/**
 * Collect all material names referenced by ObjectStateChange operations
 * across all steps in a protocol.
 *
 * Excludes vocabulary sentinels 'empty' and 'mixed', which are reserved
 * state values meaning "empty container" and "generic blended material"
 * respectively. These sentinels do not appear in materials.yaml and
 * should never be loaded as material configs.
 * See docs/specs/MATERIAL_CONVENTION.md for sentinel definitions.
 */
function collectMaterialNames(protocol: ProtocolConfig): Set<string> {
  const materialNames = new Set<string>();
  const sentinels = new Set<string>(["empty", "mixed"]);

  for (const step of protocol.steps) {
    for (const interaction of step.sequence) {
      const response = interaction.response;
      if (!response || !Array.isArray(response.scene_operations)) {
        continue;
      }

      for (const op of response.scene_operations) {
        if (op.type === "ObjectStateChange" && op.state) {
          // ObjectStateChange.state may contain material_name or held_material_name.
          const state = op.state;
          if (
            "material_name" in state &&
            typeof state.material_name === "string"
          ) {
            const name = state.material_name;
            if (!sentinels.has(name)) {
              materialNames.add(name);
            }
          }
          if (
            "held_material_name" in state &&
            typeof state.held_material_name === "string"
          ) {
            const name = state.held_material_name;
            if (!sentinels.has(name)) {
              materialNames.add(name);
            }
          }
        }
      }
    }
  }

  return materialNames;
}

/**
 * loadWorld(protocolName, loaders): RuntimeWorld
 *
 * Load a protocol by name and assemble a complete RuntimeWorld containing:
 * - protocol: the loaded ProtocolConfig
 * - activeStepIndex: 0 (starting at the first step)
 * - activeSceneId: inferred from the entry_step's first interaction's target object.
 *   The runtime finds which loaded scene contains that object in its placements.
 * - scenes: all loaded ResolvedSceneConfigs, keyed by scene_name
 * - objects: all loaded ObjectConfigs referenced by placements, keyed by object_name
 * - objectStates: initial state values from object state_fields defaults
 * - cursorState: empty initial state
 * - layoutState: empty initial state
 * - materials: all loaded MaterialConfigs, keyed by material_name
 *
 * Inference logic (per PRIMARY_SPEC.md "Entry step"):
 * The initial scene is NOT specified in the protocol; it is inferred from the
 * entry_step's first interaction. The runtime extracts the target object name
 * (stripping subpart suffixes like ".A1" or ".all_wells"), then searches all
 * loaded scenes for the one containing that object in its placements.
 * Exactly one scene must contain the target; ambiguous or missing targets throw
 * loud errors.
 *
 * Loader functions must be pre-initialized (catalogs injected via setProtocolCatalog,
 * setSceneCatalog, setObjectCatalog) before passing here.
 *
 * Throws loud errors on any missing protocol, scene, object, material, or if the
 * entry_step's first target is not found in exactly one loaded scene.
 */
export function loadWorld(
  protocolName: ProtocolName,
  loaders: {
    loadProtocol: (name: ProtocolName) => ProtocolConfig;
    loadScene: (
      name: SceneId,
      objectLoader: (name: string) => ObjectConfig,
    ) => ResolvedSceneConfig;
    loadObject: (name: ObjectId) => ObjectConfig;
    loadMaterial: (protocol: ProtocolConfig, name: string) => MaterialConfig;
    scenesContainingObject?: (objectName: string) => string[];
    objectCatalog?: Record<string, ObjectConfig>;
  },
): RuntimeWorld {
  const {
    loadProtocol,
    loadScene,
    loadObject,
    loadMaterial,
    scenesContainingObject,
    objectCatalog,
  } = loaders;

  // Load the protocol.
  const protocol = loadProtocol(protocolName);

  // First pass: collect all scene ids explicitly referenced via SceneChange operations.
  const sceneIdsFromChanges = collectSceneIdsFromSceneChanges(protocol);

  // Second pass: collect all scene ids inferred from target objects in step first interactions.
  // Use the scenesContainingObject function from loaders if provided (preferred for bundled
  // contexts where module initialization order is unpredictable). Fall back to direct
  // findScenesContainingObject call for tests.
  const sceneIdsFromTargets = collectSceneIdsFromTargets(
    protocol,
    scenesContainingObject ||
      ((objectName: string) => findScenesContainingObject(objectName)),
  );

  // Combine all scene ids (duplicates automatically removed by Set).
  const allSceneIds = new Set([...sceneIdsFromChanges, ...sceneIdsFromTargets]);

  // Load all collected scenes and gather object names.
  const loadedScenes: Record<string, ResolvedSceneConfig> = {};
  const objectNamesToLoad = new Set<string>();

  for (const sceneId of allSceneIds) {
    const scene = loadScene(sceneId as SceneId, (objectName: string) => {
      // Lazy-load object; will be called during scene validation.
      // Use objectCatalog if provided (for bundled contexts where module
      // initialization order is unpredictable), otherwise use loadObject.
      if (objectCatalog && objectName in objectCatalog) {
        const obj = objectCatalog[objectName];
        if (obj) {
          return obj;
        }
      }
      return loadObject(objectName as ObjectId);
    });
    loadedScenes[scene.scene_name] = scene;

    // Collect object names from placements.
    if (scene.placements) {
      for (const placement of scene.placements) {
        objectNamesToLoad.add(placement.object_name);
      }
    }
  }

  // Load all objects and initialize their state.
  const loadedObjects: Record<string, ObjectConfig> = {};
  const objectStates: Record<
    string,
    Record<string, string | number | boolean>
  > = {};

  for (const objectName of objectNamesToLoad) {
    const obj = loadObject(objectName as ObjectId);
    loadedObjects[obj.object_name] = obj;

    // Initialize state: materialize default values from state_fields.
    // loadObject validates that every field.default is a materialized string | number | boolean
    // (not undefined or null).
    const state: Record<string, string | number | boolean> = {};
    for (const field of obj.state_fields) {
      // Since loadObject rejects null defaults, we know field.default is one of the primitives.
      // TypeScript still sees it as string | number | boolean | null; narrow it here.
      const defaultValue = field.default;
      if (defaultValue !== null && defaultValue !== undefined) {
        state[field.field_name] = defaultValue;
      }
    }
    objectStates[obj.object_name] = state;
  }

  // Collect and load all materials referenced by the protocol.
  const materialNames = collectMaterialNames(protocol);
  const loadedMaterials: Record<string, MaterialConfig> = {};

  for (const materialName of materialNames) {
    const material = loadMaterial(protocol, materialName);
    loadedMaterials[materialName] = material;
  }

  // Determine the initial active scene by inferring from the entry_step's
  // first interaction's target object. The scene must contain that object
  // in its placements. Per PRIMARY_SPEC.md, the protocol is geometry-free;
  // the runtime infers the initial scene from which scene contains the
  // entry_step's first target.
  const activeSceneId = inferInitialScene(
    protocol,
    loadedScenes,
    sceneIdsFromChanges,
    sceneIdsFromTargets,
  );

  // Assemble the RuntimeWorld.
  const world: RuntimeWorld = {
    protocol,
    activeStepIndex: 0,
    currentInteractionIndex: 0,
    activeSceneId,
    scenes: loadedScenes,
    objects: loadedObjects,
    objectStates,
    cursorState: {
      attachedTo: null,
      operation: null,
    },
    layoutState: {},
    materials: loadedMaterials,
    pendingEvents: [],
  };

  return world;
}
