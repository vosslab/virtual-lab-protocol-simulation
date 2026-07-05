// Shared base-scene discovery for browser tests.
//
// Support file (helper_ prefix) per PLAYWRIGHT_TEST_STYLE.md file-layout
// rules: it exports helpers and is not itself a test.
//
// Source of truth: content/base_scenes/*.yaml. That directory IS the
// definitional set of base scenes -- one YAML file per base scene. Deriving the
// list from it means a base scene added or removed under content/ is picked up
// automatically, so these tests can never silently under-test a real base scene.
//
// Why not generated/scenes.ts's SCENES map: that map mixes every scene the
// pipeline emits -- base scenes PLUS protocol workspace scenes (seeding_workspace,
// dilution_workspace, ...). There is no clean base-only subset of its keys, so it
// is the right authority for "every scene that renders" (see
// tests/e2e/e2e_layout_parity_16x9.mjs, which walks Object.keys(SCENES) for
// exactly that broader purpose) but the wrong authority for "the base scenes that
// exist." content/base_scenes/ is that authority.

import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT } from "./repo_root.mjs";

//============================================
// Base-scene discovery
//============================================

// Directory that defines the base scenes: one <scene_name>.yaml per base scene.
const BASE_SCENES_DIR = path.join(REPO_ROOT, "content/base_scenes");

// Return the sorted list of base-scene names (YAML basenames without extension)
// discovered from content/base_scenes/. Sorted so the test matrix order is
// deterministic across runs and platforms.
export function discoverBaseSceneNames() {
  const entries = fs.readdirSync(BASE_SCENES_DIR);
  const names = entries
    .filter((entry) => entry.endsWith(".yaml"))
    .map((entry) => entry.slice(0, -".yaml".length));
  names.sort();
  return names;
}
