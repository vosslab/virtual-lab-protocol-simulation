# No-Crop Render Harness Audit (WS-D re-run)

Date: 2026-05-21
HEAD: 8795d25
Status: DONE_WITH_CONCERNS

Amended 2026-05-21: Vocabulary corrected per
[docs/active_plans/no_crop_round3_architecture_vocabulary_clarification.md](../no_crop_round3_architecture_vocabulary_clarification.md).
`experiments/css_native_layout/regions/*.yaml` is experiment-local
scaffolding for a static visual-test renderer, not sanctioned project
architecture. Durable scene-side terms are `scene`, `scene YAML`,
`scene object`, `SVG asset`, and `zone` per
[docs/specs/SCENE_VOCABULARY.md](../../specs/SCENE_VOCABULARY.md).
Measurements, counts, and baselines below are unchanged.

## Scope

Audit the three render paths the no-crop SVG round-2 work depends on. For
each path, identify the script (or absence), the output generator, where
`footprint--*` CSS classes are assigned, whether assignment is
YAML-driven, and whether the experiment-local
`regions/*.yaml` `kind_to_footprint` mapping is consumed.

The three paths have drifted apart, so each is evaluated independently
against current tree state at HEAD 8795d25.

## Path / version table

| # | Path | Primary script (exists?) | Output generator | Footprint assignment location | YAML-driven? | Consumes regions/*.yaml kind_to_footprint? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Production runtime (dist/-served bundle) | YES - src/scene_runtime/layout/css_native_adapter.ts; src/scene_runtime/render/scene.ts | esbuild via build_github_pages.sh -> dist/runtime.bundle.js; dump shim experiments/css_native_layout/render_and_dump.mjs writes static HTML | NONE in current tree. css_native_adapter.ts builds `.placement` divs (line 116-119) but does NOT add `footprint--<kind>` class. renderScene in render/scene.ts emits SVG, not the CSS-native placement card. | N/A (no assignment) | NO. No source file under src/ reads kind_to_footprint. `git ls-files src/ \| xargs grep -ln "kind_to_footprint"` returns empty. |
| 2 | Static template (per-template HTML) | YES (data only) - experiments/css_native_layout/templates/\*.html (10 production + 2 dir_b/dir_c variants each). No generator script. | Hand-authored. First introduced in commit f437287 ("NEW0 evidence package complete") as 10 new HTML files with no accompanying generator. | Hardcoded as literal class attribute in each template HTML; e.g., templates/bench_basic.html line 25 `class="object-graphic footprint--container"`, line 38 `class="object-graphic footprint--small-tool"`. | NO. Author types class string directly per element. | NO. Templates do not reference regions/*.yaml in any way. |
| 3 | Stress static-HTML harness | NO. experiments/css_native_layout/stress_generators/render_stress_to_html.py is referenced as canonical (FOOTPRINT_KEYWORDS, lines 27-44) in multiple plan docs but does not exist in tree and was never committed. | Output (experiments/css_native_layout/stress_scenes/rendered/*.html) is present on disk but is untracked. No git-tracked script in stress_generators/ produces it. Sibling render_with_label_policy.py is a wrapper that consumes already-rendered HTML and only injects a `<link>` (no footprint assignment). | If render_stress_to_html.py were present, plan doc new3_batch5_stress_pipeline_alignment_options.md lines 35-44 places assignment at lines 27-44 via FOOTPRINT_KEYWORDS dict. In current tree: NO footprint assignment script exists. | N/A (no script) | NO. The (referenced-but-missing) script's hardcoded FOOTPRINT_KEYWORDS diverges from regions/*.yaml (bottle->container in script, bottle->handheld in YAML; pipette->handheld in script, pipette->small-tool in YAML) per new3_batch5_stress_pipeline_alignment_options.md lines 37-44. |

## Per-path one-liner status

- Path 1 (production runtime): css_native_adapter is a measurement
  scaffold only; it does not emit footprint classes. Production CSS is
  not currently driven by `kind_to_footprint`. Misalignment to claims in
  status report section 7 ("css_native_adapter.ts reads
  kind_to_footprint") that is not supported by source.
- Path 2 (static templates): footprint classes are baked into hand-
  authored HTML. No generator, no YAML lookup. Every template edit is
  manual.
- Path 3 (stress static-HTML): canonical renderer is MISSING from git.
  Rendered HTML on disk is an untracked byproduct of an uncommitted
  script. Visual-acceptance evidence in
  docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.md
  was produced against artifacts whose generator no longer exists in
  tree.

## YAML kind_to_footprint consumption

NONE. No path in the current tree at HEAD 8795d25 consumes the
experiment-local `regions/*.yaml` `kind_to_footprint` mapping. The
mapping is experiment-local scaffolding (see Amended footnote at top
of this file); it is not scene YAML in the canonical sense
([docs/specs/SCENE_YAML_FORMAT.md](../../specs/SCENE_YAML_FORMAT.md)).
The mapping exists in:

- experiments/css_native_layout/regions/bench.yaml lines 64-77
- experiments/css_native_layout/regions/hood.yaml (per prior audit)
- experiments/css_native_layout/regions/instrument.yaml (per prior audit)
- experiments/css_native_layout/regions/bench_e.yaml

but no production runtime, template generator, or stress renderer reads
these blocks.

## Missing renderer details (Path 3)

- File checked: experiments/css_native_layout/stress_generators/render_stress_to_html.py
- File exists at HEAD 8795d25: NO
- Tracked anywhere in `git ls-files`: NO
- `git log --all --oneline -- "**/render_stress_to_html.py"`: empty
- `git log --all --oneline -S "FOOTPRINT_KEYWORDS"`: commit 03a50dc
  (matches markdown doc text only, not Python source)
- `git log --all --oneline -S "render_stress_to_html"`: commits 03a50dc
  and 4e2c709 (both match markdown text only, including commit message
  of 4e2c709 line "Confirmed: zoom_detail -> detail mode mapping already
  active in render_stress_to_html.py")
- Conclusion: render_stress_to_html.py has NEVER been tracked in git
  history. Was authored in some prior worktree state, used to produce
  untracked stress_scenes/rendered/ HTML, and never staged before WS-D
  reset.

### Closest sibling renderer candidates

| File | One-line description |
| --- | --- |
| experiments/css_native_layout/stress_generators/render_with_label_policy.py | Wrapper that re-emits existing rendered HTML with an extra label-policy CSS link; does not assign footprint classes; explicitly states (lines 22-25) "wrapper instead of editing render_stress_to_html.py" |
| experiments/css_native_layout/stress_generators/generate_stress_scenes.py | Generates YAML manifests under stress_scenes/generated/ from object pools; does not render HTML or assign footprint classes |
| experiments/css_native_layout/render_and_dump.mjs | Loads production bundle via Playwright and dumps rendered DOM to static HTML; aimed at well_plate_96_zoom_check protocol; does not emit footprint classes |

### Recovery options (Path 3)

1. Reconstruct render_stress_to_html.py from plan-doc specification
   (FOOTPRINT_KEYWORDS lines 27-44 documented in
   new3_batch5_stress_pipeline_alignment_options.md). Smallest path to
   restore the prior evidence pipeline.
2. Reconstruct a static visual-test renderer with ALIGN already
   applied (Option 1 in the alignment plan): the new script reads
   `kind_to_footprint` from an explicit experiment-local footprint
   mapping (today: `experiments/css_native_layout/regions/bench.yaml`;
   future preferred shape:
   `experiments/css_native_layout/object_footprints.yaml` per the
   architecture vocabulary clarification note) instead of a hardcoded
   dict. The mapping is experiment-local and is not part of the
   canonical scene YAML schema; the renderer being reconstructed is a
   static visual-test renderer, not a region-architecture renderer.
   Avoids re-creating known-divergent code.
3. Promote render_and_dump.mjs from a single-protocol bridge to the
   canonical stress renderer (Playwright + production CSS). Removes the
   second renderer entirely; stress and production share one path.
4. Declare prior rendered batches stale and rebuild from production
   runtime (Path 1) only, dropping the Python stress harness.

Recommended: Option 2. Lowest reconstruction effort that also fixes the
known YAML divergence the alignment doc already enumerated. Option 3 is
the durable long-term answer but requires loosening render_and_dump's
single-protocol assumption.

## Source files read

- docs/active_plans/no_cropped_svg_round2_visual_acceptance_report.md
- docs/active_plans/current_css_native_layout_manager_status_report.md
  (header + section 2 layer model)
- docs/active_plans/new3_batch5_stress_pipeline_alignment_options.md
  (lines 1-100)
- docs/active_plans/git_incident_4e2c709_inventory.md (header)
- experiments/css_native_layout/stress_generators/render_with_label_policy.py
- experiments/css_native_layout/stress_generators/generate_stress_scenes.py
  (header)
- experiments/css_native_layout/regions/bench.yaml
- experiments/css_native_layout/templates/bench_basic.html (lines 1-60)
- experiments/css_native_layout/stress_scenes/rendered/stress_composition_001.html
  (lines 1-17)
- experiments/css_native_layout/render_and_dump.mjs (header)
- src/scene_runtime/layout/css_native_adapter.ts
- src/scene_runtime/render/apply.ts (header)
- src/scene_runtime/render/scene.ts (lines 1-60)

## Hard-stop check

No path was BLOCKED. Path 3's primary script was located as missing
(not as unfindable) - the git history search returned definitive
evidence of absence, and the canonical referencing plan doc provides a
spec sufficient to reconstruct. Reporting DONE_WITH_CONCERNS rather
than BLOCKED because the absence is itself the finding.

## Handoff

Status: DONE_WITH_CONCERNS

Summary:

- Production runtime: css_native_adapter is a measurement scaffold; does
  not emit `footprint--*` classes. Status report claim that
  css_native_adapter reads `kind_to_footprint` is unsupported by source.
- Static template: footprint classes hand-typed into HTML; no generator;
  no YAML; every template requires manual edit.
- Stress static-HTML: the prior static visual-test renderer
  (`render_stress_to_html.py`) is MISSING and was never tracked in
  git. Recommend Option 2 (reconstruct a static visual-test renderer
  with ALIGN against an explicit experiment-local footprint mapping
  such as `experiments/css_native_layout/regions/bench.yaml`,
  preferred future shape `object_footprints.yaml`); this is
  experiment-local scaffolding, not a region-architecture pivot.
- YAML kind_to_footprint consumed by: NONE of the three paths.
- Artifact: docs/active_plans/workstreams/no_crop_render_harness_audit.md
- Source files read: see "Source files read" section above.
