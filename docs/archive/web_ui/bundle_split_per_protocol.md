# Bundle splitting per protocol or per runner

Date: 2026-05-28
Status: feasibility report; quick win implemented; full split deferred pending sign-off.

## Current shape

- One esbuild bundle: `dist/protocol_host.js`.
- Every per-protocol HTML host (`dist/<protocol>.html`) loads the same bundle.
- Runtime data is keyed by `protocol_name` at runtime; the host picks its protocol from `window.__PROTOCOL_NAME__` and looks up the config from `generated/protocols.ts`.
- Bundle composition (pre-optimization, see `bundle_audit.md`):
  - `generated/svg_registry.ts`: 1.93 MB (all 125 SVG assets inlined).
  - `generated/protocols.ts`: 170 KB (every protocol's steps).
  - `generated/scenes.ts`: 57 KB (every scene).
  - `generated/object_library.ts`: 19 KB.
  - Runtime + Solid: ~30 KB.

Total `protocol_host.js` minified: 2.2 MB before today, **1.3 MB after the orphan-SVG removal landed in this audit (step 2 below).**

Why one bundle today: simpler build, one HTTP asset cached across all protocol hosts, smaller total bytes if a user opens multiple protocols in one session.

## Three splitting strategies

### Strategy 1: per sequence_runner

One bundle per top-level pathway. Mini-protocols launched standalone share the parent runner's bundle.

- Bundle count: ~5 (cell_culture_full, sdspage_full, routine_passage, sdspage_load_samples_batch, sdspage_prepare_sample_mix_batch). Mini-protocols outside any runner (e.g. bench_basic smoke) would each be a sixth.
- Estimated per-bundle size: cell_culture cluster ~600-800 KB; sdspage cluster ~700-900 KB (most SDS-PAGE SVGs are SDS-PAGE-specific). Smallest runner ~400 KB.
- Build complexity: medium. `tools/build_main_bundle.mjs` grows to N entry points; each entry must import the slice of `generated/*.ts` that the runner needs. Requires per-runner generated stubs (one `generated/runner_<name>/svg_registry.ts`, one `protocols.ts`, etc.).
- Cache implications: first-visit cost is lower (a user lands on one cluster, not on the union). Return-visit cost across clusters is higher (no shared cache across runners). For typical curriculum flow (one runner per session), this is a clear win.
- Browser-cache hit rate within a cluster: very high; same bundle reused across every mini-protocol in that runner.

### Strategy 2: per mini-protocol

One bundle per protocol host. ~31 bundles (matching the 31 dist HTML files).

- Estimated per-bundle size: variable. A single-scene mini-protocol could be ~150 KB; a multi-scene mini-protocol ~400 KB. Worst case is dominated by which SVGs the scenes touch, not by step count.
- Build complexity: high. Same generated-stub plumbing as strategy 1, but multiplied by 6x more outputs. Risk of build-time blowup and cache invalidation churn.
- Cache implications: best first-visit cost; worst return-visit cost. Each mini-protocol is its own asset.
- Hit rate: zero cross-protocol reuse. Bad if students navigate between mini-protocols in one session.

### Strategy 3: code-split assets only

Keep `protocol_host.js` for runtime + renderer code. Split `generated/svg_registry.ts` (and optionally `scenes.ts`, `protocols.ts`) into per-cluster (or per-protocol) JSON assets fetched on demand by the runtime.

- Estimated runtime bundle: ~250-350 KB (everything except SVG/scene/protocol data).
- Per-protocol asset payload: 50-200 KB depending on scene count.
- Build complexity: low to medium. `tools/gen_svg_registry.py` emits one JSON per cluster; runtime adds an `await fetch("/registry/<cluster>.json")` step in the host bootstrap. No esbuild multi-entry work.
- Cache implications: best of both worlds. Runtime bundle cached forever. Per-cluster JSON cached per cluster. Cross-protocol reuse within a cluster is free.
- Hit rate: identical to strategy 1 for SVG reuse, but the runtime code itself is shared across all clusters (unlike strategy 1).

## Recommendation

**Strategy 3, because it keeps the runtime bundle universal (which the contract favors -- shared TypeScript runtime) and isolates per-protocol weight in data files that are cheap to fetch and cache independently.**

Strategy 1 is a defensible runner-up if asset fetching introduces unacceptable latency on first scene mount.

## Work packages

Implement only after sign-off on Strategy 3.

- WP-1: Cluster taxonomy. Decide cluster granularity (per `content/protocols/<cluster>/`, or per sequence_runner). Output: `docs/active_plans/active/web_ui/cluster_taxonomy.md`.
- WP-2: `tools/gen_svg_registry.py` -> emit one JSON per cluster into `generated/svg_registry/<cluster>.json` plus a slim `generated/svg_registry_index.ts` mapping `protocol_name -> cluster`. Depends on WP-1.
- WP-3: Runtime registry loader. New module `src/scene_runtime/asset_loader.ts` that resolves cluster from `window.__PROTOCOL_NAME__` and awaits the cluster JSON before mount. Depends on WP-2.
- WP-4: Update `src/protocol_host_entry.tsx` to call the loader before `render()`. Depends on WP-3.
- WP-5: `build_github_pages.sh` -> copy `generated/svg_registry/*.json` into `dist/`. Walker scripts in `tests/playwright/` already serve `dist/` so they see the JSON automatically. Depends on WP-2.

## Low-hanging fruit (implemented now)

**Found: 60 of 125 SVG assets in `generated/svg_registry.ts` were orphans -- present in `assets/equipment/` but referenced by no scene, object library entry, protocol YAML, or TypeScript source.** Most are legacy variant names (`_new`, `_old`, `_legacy`, `_v2..v5`, `_servier`), separate `_empty`/`_filled` SVGs that the material-convention layer no longer needs, and unused racks/trays (`waste_tray`, `micropipette_rack`, `drug_vial_rack`).

Implementation: `tools/gen_svg_registry.py` now scans `src/`, `tests/`, `content/`, and `generated/` (excluding `svg_registry.ts` itself) for whole-word references to each SVG key, and drops any key with zero references. Pass `--include-orphans` to bypass the filter for asset-authoring previews.

Measurement:

| Artifact | Before | After |
| --- | ---: | ---: |
| `generated/svg_registry.ts`  | 2.0 MB | 1.1 MB |
| `dist/protocol_host.js`      | 2.2 MB | 1.3 MB |
| SVG keys shipped             |    125 |     65 |

**Savings: ~910 KB off the per-page bundle, ~41% reduction**, with no runtime, walker, or content change. All 31 protocol HTML pages still return HTTP 200 with `scene-root`/`shell-root` markers; `test_launcher.mjs` passes (launcher renders 31 entries, `mtt_reagent_prep.html` mounts with 7 scene items).

Orphan list (60 keys) is logged at generation time; see `tools/gen_svg_registry.py` stdout for the current set.
