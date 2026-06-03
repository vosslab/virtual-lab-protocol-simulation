# M5 SVG file loading prep

Read-only discovery for M5 phase 2 (GitHub Pages-safe SVG file loading). This
note is the executable map for the cutover. It edits no code. All file/line
citations are read-only and reflect the tree at the time of writing.

Source of truth for intent: the M5 sections of the plan
`read-the-tools-svg-code-fluttering-clarke.md`. Canonical pipeline rules now
live in [../specs/SVG_PIPELINE.md](../specs/SVG_PIPELINE.md).

Coordination gate: this whole phase 2 is GATED on the material lane commit
landing first. SVG must not edit `scene_item.tsx`, `inject_svg.ts`,
`visual_state_resolver.ts`, or `generated/` until the material commit (WP-COLOR
scalar `display_color`) is in with build/typecheck green, then rebase.

## 1. Declared fields that feed requires_dom_svg

The plan's predicate names declared triggers `render_effect: material_tint`,
`render_effect: fill_height`, `target: subpart_geometry`, anchor targets
`anchor_liquid_bounds` / `anchor_liquid_clip`, and `visual_states` needing
internal targeting. Discovery finding: those exact field names are NOT emitted
into generated data today. The signals that DO exist and stand in for them:

- `generated/object_library.ts` object records carry `visual_states`. Each
  visual-state entry has a `kind`:
  - `kind: 'composite'` carrying a `fill_height(...)` formula (e.g.
    `generated/object_library.ts:71-75` for `aspirating_pipette`,
    `:107-110` plate `material_name` composite). This is the live stand-in for
    `render_effect: fill_height`.
  - `kind: 'svg'` case maps selecting an `asset_name` per state value (e.g.
    `:48-70`). Recolor/tint is expressed here today, not as a named
    `render_effect: material_tint`.
  - `kind: 'overlay'` (23 occurrences) for overlay visual states.
- `capabilities` lists `material_container` and `structured_surface` (e.g.
  plate at `generated/object_library.ts:5055-5059`). `material_container`
  is the practical "can hold material" signal; `structured_surface` marks
  plates/racks whose subparts use generated overlay geometry.
- Wells use generated overlay geometry, not base-SVG ids. The plate's
  `subpart_state_schema` (e.g. starts `:77`, plate body around `:5092+`) is
  where per-subpart state lives; the well fill path is `target:
  subpart_geometry` in the plan's vocabulary but is generated overlay geometry
  in practice, so wells are SAFE without the anchor resolver.
- The resolver `src/scene_runtime/renderer/visual_state_resolver.ts` parses
  the `fill_height(...)` and `label(...)` formulas (`:111`, `:191`, `:231`)
  and produces `ResolvedVisualState` overlays (`:65`). It is the runtime
  consumer of the composite/svg signals. It does NOT today read any
  `requires_dom_svg` / `render_mode` field; that field does not yet exist.
- `inject_svg.ts:82` is the only place that mentions `anchor_liquid_bounds`,
  as a comment; no generated object record names anchors as a declared field.

Phase 2 implication: the generator must DERIVE `requires_dom_svg` from the
present signals (`visual_states[*].kind in {composite, svg, overlay}`,
`capabilities` containing `material_container` or `structured_surface`) and,
if M5 also introduces the named `render_effect` / `target` / anchor vocabulary
into object YAML, derive from those once emitted. Unknown future internal-SVG
effects default to `true`. See "Ambiguities for phase 2" below.

## 2. Manifest shape and generator emit point

- Generator today: `pipeline/gen_svg_registry.py`. It collects
  `assets/**/*.svg` via `rglob` (`:51`), derives the registry key from the
  source basename only (`key = svg_path.stem`, `:88`), and emits a single
  `SVG_REGISTRY: Record<string, string>` of sanitized inline markup
  (`:359`) to `generated/svg_registry.ts` (output path set at `:131`,
  written at `:379`).
- Phase 2 rename: `git mv pipeline/gen_svg_registry.py
  pipeline/gen_svg_manifest.py` (preserve history). The script stops emitting
  inline markup and instead emits a relative-path manifest mapping
  `asset_name -> "assets/svg/<category>/<name>.svg"` into
  `generated/svg_manifest.ts`. Keep the validation/strip logic; any registry
  kept for validation/tooling must live outside the app render import path and
  be documented as build/test-only.
- Manifest emit insertion point: replace the registry assembly and write block
  (`pipeline/gen_svg_registry.py:349-379`, the `SVG_REGISTRY` emit) with the
  manifest assembly + write to `generated/svg_manifest.ts`.
- Key/category gap (load-bearing): the current registry key is the bare stem
  with NO category (`:88`). The manifest URL needs the category segment
  (`assets/svg/<category>/<name>.svg`). The category is recoverable from
  `svg_path` (the parent directory under `assets/`), but the generator does
  not currently carry it into the key/value. Phase 2 must thread the category
  from `svg_path.parent` into the manifest URL. Confirm asset basenames are
  unique across categories before keying the manifest by bare `asset_name`
  (the registry already keys by bare stem, so a cross-category basename
  collision would already fail loudly there).

## 3. Build copy insertion point

`build_github_pages.sh` already copies bundled fonts at step 6b:

- `build_github_pages.sh:112-117`:
  - `:116` `mkdir -p dist/assets/fonts`
  - `:117` `cp assets/fonts/*.woff2 dist/assets/fonts/`

Phase 2 adds a parallel SVG copy immediately after step 6b (a new step 6c),
mirroring the fonts copy: create `dist/assets/svg/<category>/` and copy the
used source SVGs into it so the relative manifest URLs resolve under the
served `dist/`. `run_web_server.sh` and the PNG tools serve the same `dist/`,
so the relative paths resolve identically in dev and on GitHub Pages.

## 4. Phase 2 cutover sequence and shared files

Order and the exact shared files each step touches. Every step below is gated
on the material commit; rebase before starting.

1. `pipeline/gen_svg_manifest.py` (renamed from `gen_svg_registry.py`): emit
   `generated/svg_manifest.ts` (relative-path manifest) and derived
   `requires_dom_svg`; stop exporting inline markup to the render path.
   Touches: generator + `generated/` outputs.
2. `build_github_pages.sh`: add the SVG copy step after `:112-117`. Touches:
   build script only.
3. `src/scene_runtime/renderer/inject_svg.ts`: add async fetch+cache loader
   (Solid resource or equivalent tracked async primitive), reuse the existing
   `namespaceSvgIds` helper, add the `resolveAnchor(host, bareAuthoredId)`
   seam, and implement consumption of the derived `requires_dom_svg`.
   SHARED FILE -- material lane also edits this; rebase first.
4. `src/scene_runtime/renderer/scene_item.tsx`: tiered render -- static objects
   as `<img src=<manifest url>>`, DOM-SVG-required objects via the fetched SVG
   DOM path. SHARED FILE -- material lane also edits this; rebase first.
5. `src/scene_runtime/renderer/visual_state_resolver.ts`: only if the derived
   predicate or anchor lookup needs a new consumer hook. SHARED FILE -- material
   lane also edits this; rebase first. Prefer to leave it untouched if the
   predicate can be derived at generation time and consumed in `inject_svg.ts`.
6. Remove the runtime `SVG_REGISTRY` import path; prove with
   `rg "SVG_REGISTRY|svg_registry" src generated` showing no renderer import.
   Touches: `generated/` + any stale `src` import.
7. `tests/playwright/test_svg_file_loading.mjs`: served under the repo subpath
   `http://localhost:<port>/virtual-lab-protocol-simulation/`; assert SVGs load,
   the four wedge pages render cleanly, and at least one DOM-SVG-required object
   (selected by declaration) renders as SVG DOM, not `<img>`.
8. `docs/specs/MATERIAL_CONVENTION.md` reconcile: remove the stale
   `<asset_name>__anchor_liquid_*` composition-time prefixing language and point
   it at the runtime resolver seam. MATERIAL-OWNED FILE -- coordinate with the
   material-spec owner; do not clobber. Not this lane's edit to make unilaterally.

Shared rebase-after surfaces (do NOT edit until the material commit lands):
`scene_item.tsx`, `inject_svg.ts`, `visual_state_resolver.ts`, `generated/`.

## Ambiguities for phase 2 to resolve

- The plan's predicate field names (`render_effect: material_tint`,
  `render_effect: fill_height`, `target: subpart_geometry`, `anchor_liquid_*`)
  are NOT present in `generated/object_library.ts` today. Phase 2 must decide
  whether to (a) derive `requires_dom_svg` from the existing signals
  (`visual_states[*].kind`, `capabilities`), or (b) first introduce the named
  vocabulary into object YAML and the generator, then derive from it. Option
  (a) is implementable against today's generated data; option (b) is a larger
  vocabulary change that must clear the SPEC_DESIGN_CHECKLIST closure rules.
- The manifest URL needs a category segment the current registry key drops.
  Confirm asset-basename uniqueness across `assets/<category>/` before keying
  the manifest by bare `asset_name`.
- Whether `visual_state_resolver.ts` needs any edit at all, or whether the
  derived predicate can be consumed entirely in `inject_svg.ts` /
  `scene_item.tsx`, leaving the resolver untouched to reduce shared-file churn.
