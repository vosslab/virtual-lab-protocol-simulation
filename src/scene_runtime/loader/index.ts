/**
 * src/scene_runtime/loader/index.ts
 *
 * Unified export of loader catalog setters and main world loader.
 * Used by bundle/entry.ts and tests to inject and manage the generated-data catalogs.
 */

export { setProtocolCatalog } from "./protocol";
export { setSceneCatalog } from "./scene";
export { setObjectCatalog } from "./object";
export { loadWorld } from "./world";
