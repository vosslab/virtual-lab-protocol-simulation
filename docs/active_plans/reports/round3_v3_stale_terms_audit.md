# Round 3 V3 stale terms doc audit

Date: 2026-05-22

## Scope

Cross-check whether canonical docs still reference terms that R4/B3/V1 verified
do NOT exist in production code: `ASSET_SPECS`, `ASSET_SPECS.defaultWidth`,
`display_width_cm`, `layout.display_width_cm`, `width_scale`, `widthScale`,
`alias map` / `asset alias`, `footprint vocabulary`, CSS class names
`footprint--small` / `footprint--large` in static-template context.

Search method: `git ls-files docs/ | xargs grep -nE ...` on canonical specs,
active plans, archive, and changelogs.

## Summary

- HARD findings (canonical specs): 41 lines across 6 files. Must-fix or
  must-explicitly-deprecate; these docs claim a vocabulary the code does not
  implement.
- SOFT findings (active_plans): 189 lines across 14 files. Historical
  snapshots of in-flight work; leave with a footnote unless misleading.
- Archive findings: 30 files contain hits. Frozen; do not edit.
- Changelog findings: 3 lines in `docs/CHANGELOG-2026-05b.md`. Historical
  record; do not edit.
- ASCII check: pass.
- Markdown links check: pass.

## HARD findings (canonical specs - must-fix)

These files are referenced from `AGENTS.md`, `docs/PRIMARY_CONTRACT.md`,
and `docs/PRIMARY_SPEC.md` as the authoring vocabulary surface. Stale terms
here mislead authors and contradict the implementation.

### docs/specs/LAYOUT_ENGINE.md (16 hits)

Term: `ASSET_SPECS` and `width_scale` used as live, current vocabulary.

| Line | Context (excerpt)                                              | Term            |
| ---- | -------------------------------------------------------------- | --------------- |
| 67   | `computeSceneLayout(items, ASSET_SPECS, layoutRules, ...)`     | ASSET_SPECS     |
| 172  | table row defining `width_scale` as a per-scene multiplier     | width_scale     |
| 184  | "Use `width_scale` for scene-specific relative size"           | width_scale     |
| 185  | "base size comes from `ASSET_SPECS[asset_name].default_width`" | ASSET_SPECS     |
| 206  | "Add an `ASSET_SPECS` entry with a realistic `default_width`"  | ASSET_SPECS     |
| 208  | "Render the scene at several viewport sizes before tuning `width_scale`" | width_scale |
| 261  | "Item `width_scale`"                                           | width_scale     |
| 295  | "Reduce `width_scale` for the least important objects"         | width_scale     |
| 472  | code sample passing `ASSET_SPECS` to a helper                  | ASSET_SPECS     |
| 511  | "`width_scale`, `label`, `anchor_y`, and `align_stop`"         | width_scale     |
| 516  | "Tune zone baselines and item `width_scale` before changing engine constants" | width_scale |
| 526  | "`width_scale`, `label`, and `anchor_y`"                       | width_scale     |
| 531  | "Add missing `ASSET_SPECS` entries"                            | ASSET_SPECS     |
| 535  | "Call `computeSceneLayout()` with scene items, `ASSET_SPECS`, layout rules" | ASSET_SPECS |
| 553  | YAML example: `width_scale: 1`                                 | width_scale     |
| 583  | "Item `width_scale`, if the asset is only wrong in this scene" | width_scale     |
| 645  | "semantic inputs (`zone`, `depth_tier`, `width_scale`, ...)"   | width_scale     |

Recommendation: **rewrite**. Either (a) remove `ASSET_SPECS` and `width_scale`
references entirely if both are dead post-R11, replacing with the current
sizing primitive, or (b) add a leading "Status: deprecated terms in this doc"
note and a pointer to the live mechanism. Per R4+B3+V1 evidence,
`ASSET_SPECS` is no longer a runtime symbol; document accordingly.

### docs/specs/SCALING_MODEL.md (15 hits)

Term: entire doc is built around `display_width_cm` and `width_scale`. R4
confirmed `display_width_cm` does not exist in production code.

| Line | Context (excerpt)                                                   | Term              |
| ---- | ------------------------------------------------------------------- | ----------------- |
| 3    | "Items are defined with a `display_width_cm` value"                 | display_width_cm  |
| 7    | "**display_width_cm** is the game-display footprint..."             | display_width_cm  |
| 9    | "**px_per_cm** ... converts display_width_cm to visual width"       | display_width_cm  |
| 36   | YAML example: `display_width_cm: 60`                                | display_width_cm  |
| 43   | "compute `width_scale` from `display_width_cm`"                     | both              |
| 46-47| `compute_width_scale_from_display(display_width_cm, ...)`           | both              |
| 56   | formula `width_scale = (display_width_cm * px_per_cm) / ...`        | both              |
| 61   | "Layout engine uses `width_scale` to render"                        | width_scale       |
| 71   | YAML example: `display_width_cm: 45`                                | display_width_cm  |
| 89   | "Objects without `layout.display_width_cm` fall back to hardcoded `width_scale`" | both    |
| 98   | "To migrate an object to `layout.display_width_cm`"                 | display_width_cm  |
| 100  | "Add `layout.display_width_cm` to `content/objects/...`"            | display_width_cm  |
| 132  | example: `display_width_cm: 45`                                     | display_width_cm  |
| 136  | "This multiplies the final `width_scale`: `width_scale *= (fudge ?? 1.0)`" | width_scale |
| 142  | "All scaling happens at the scene config level via `width_scale` computation" | width_scale |
| 144  | "Items without `display_width_cm` continue to work with their hardcoded `width_scale`" | both |

Recommendation: **delete or rewrite entire doc**. R4 evidence is that the
described mechanism is not how scaling works post-R11. If the doc no longer
describes any production behavior, mark deprecated at the top and move to
`docs/archive/` with `git mv` (after V4 confirms there is no live consumer);
or replace contents with the current CSS-native sizing model.

### docs/specs/OBJECT_VOCABULARY.md (3 hits)

| Line | Context (excerpt)                                                                                 | Term        |
| ---- | ------------------------------------------------------------------------------------------------- | ----------- |
| 282  | `layout.width_scale` listed as authorable field: "Per-object width multiplier"                    | width_scale |
| 335  | "`anchor_y_offset`, `width_scale`, `anchor_y`"                                                    | width_scale |
| 505  | glossary: layout hint includes `width_scale`                                                      | width_scale |

Recommendation: **rewrite**. Remove `width_scale` from the closed object
authoring vocabulary, or confirm whether it is still an authorable hint
consumed by the current layout pipeline. Closed vocabularies must match code.

### docs/specs/OBJECT_YAML_FORMAT.md (1 hit)

| Line | Context (excerpt)                                              | Term        |
| ---- | -------------------------------------------------------------- | ----------- |
| 467  | schema table row: `layout.width_scale` float, default `1.0`    | width_scale |

Recommendation: **rewrite**. Same finding as OBJECT_VOCABULARY.md; the
schema table is the canonical YAML surface for object files. Drop the row
if `width_scale` is dead, or document the live primitive.

### docs/specs/SCENE_VOCABULARY.md (3 hits)

| Line | Context (excerpt)                                                                          | Term        |
| ---- | ------------------------------------------------------------------------------------------ | ----------- |
| 71   | "`anchor_y_offset`, `width_scale`, `anchor_y`"                                             | width_scale |
| 127  | "`label_width`, `anchor_y_offset`, `width_scale`, and `anchor_y`"                          | width_scale |
| 141  | placement.layout glossary entry: includes `width_scale`                                    | width_scale |

Recommendation: **rewrite**. Mirror the OBJECT_VOCABULARY decision.

### docs/specs/SCENE_YAML_FORMAT.md (3 hits)

| Line | Context (excerpt)                                                | Term        |
| ---- | ---------------------------------------------------------------- | ----------- |
| 202  | "`anchor_y_offset`, `width_scale`, and `anchor_y`"               | width_scale |
| 216  | schema table row: layout block includes `width_scale`            | width_scale |
| 240  | YAML example: `width_scale: 1.2`                                 | width_scale |

Recommendation: **rewrite**. Mirror OBJECT_YAML_FORMAT.md.

### docs/specs/SPEC_DESIGN_CHECKLIST.md (1 hit)

| Line | Context (excerpt)                                                                                          | Term        |
| ---- | ---------------------------------------------------------------------------------------------------------- | ----------- |
| 46   | "Scene placement may set layout hints only: ..., `width_scale`, ..."                                       | width_scale |

Recommendation: **rewrite**. The Author YAML vocabulary lock cannot reference
a non-existent term.

### docs/PRIMARY_CONTRACT.md / docs/PRIMARY_SPEC.md / docs/PRIMARY_DESIGN.md

No hits. The top-level contract is clean.

## SOFT findings (active_plans - informational)

189 line hits across 14 files under `docs/active_plans/`. These are
in-flight working artifacts and historical snapshots of how the team
analyzed `ASSET_SPECS`, `display_width_cm`, and `width_scale` while the
refactor was in motion. Per `docs/REPO_STYLE.md`, working artifacts can
remain as historical records.

Files with hits (counts approximate):

- `docs/active_plans/active/round3_checkpoint_next_action_queue.md`
- `docs/active_plans/audits/no_crop_asset_specs_coverage.md`
- `docs/active_plans/audits/no_crop_object_sizing_coverage.md`
- `docs/active_plans/audits/no_crop_sizing_chain_root_cause.md`
- `docs/active_plans/audits/no_crop_svg_viewbox_audit.md`
- `docs/active_plans/audits/round3_checkpoint_working_tree_inventory.md`
- `docs/active_plans/current_css_native_layout_manager_status_report.md`
- `docs/active_plans/decisions/no_crop_round3_sizing_source_reconciliation.md`
- `docs/active_plans/no_crop_round3_next_fix_queue.md`
- `docs/active_plans/reports/round3_checkpoint_implementation_summary.md`
- `docs/active_plans/reports/round3_checkpoint_verification_status.md`
- `docs/active_plans/workstreams/no_crop_render_harness_audit.md`
- `docs/active_plans/workstreams/no_crop_round3_plan.md`
- `docs/active_plans/workstreams/no_crop_sizing_source_reconciliation.md`

Recommendation: **leave as historical snapshots**. Optionally add a
single-line footnote at the top of `active/round3_checkpoint_next_action_queue.md`
noting that R4+B3+V1 confirmed `ASSET_SPECS` / `display_width_cm` /
`width_scale` are not in production code as of 2026-05-22, so any forward
action items referring to them as live symbols are stale.

Two files name promising follow-up surfaces:

- `docs/active_plans/reports/round3_a3_alias_map_justification.md`
- `docs/active_plans/reports/round3_asset_alias_verification.md`
- `docs/active_plans/reports/round3_asset_specs_impact_audit.md`
- `docs/active_plans/reports/round3_display_width_cm_top10_plan.md`

These already exist and presumably document the deprecation evidence; they
are informational and should stay.

## Archive findings

30 files under `docs/archive/` mention the stale terms. Archive is frozen
per `docs/REPO_STYLE.md` policy. **Do not edit.** Listed for completeness:

- `docs/archive/2026-04-09-scene-layout-engine-design.md`
- `docs/archive/2026-04-09-scene-layout-engine.md`
- `docs/archive/LAYOUT_METRICS.md`
- `docs/archive/MORNING_REVIEW_2026-04-28.md`
- `docs/archive/css_native_layout/` (11 files)
- `docs/archive/misc_2026_05/yaml_to_browser_audit.md`
- `docs/archive/no_crop_svg/` (4 files)
- `docs/archive/scene_*` (5 files)
- `docs/archive/well_plate_workspace_pause_note.md`
- `docs/archive/scene_runtime/scene_runtime_spec_index.md`

## Changelog findings

`docs/CHANGELOG-2026-05b.md`: 3 mentions of `ASSET_SPECS` in entries
describing the M4 facade migration. Historical record. **Do not edit.**

`docs/CHANGELOG.md`: 0 hits.

## Recommended doc corrections (feed V4)

Priority order for V4 patches against canonical specs:

1. **docs/specs/SCALING_MODEL.md**: This doc as a whole describes a sizing
   mechanism that R4 says is not in code. Decide between (a) full rewrite
   to current model or (b) move to `docs/archive/scaling_model_pre_r11.md`
   via `git mv`. If choice (b), check the four referrers
   (`grep -l SCALING_MODEL docs/`) and update links.
2. **docs/specs/LAYOUT_ENGINE.md**: 16 hits. Either rewrite all
   `ASSET_SPECS` / `width_scale` references to the live API, or add a
   prominent "DEPRECATED TERMS" header listing both and pointing to the
   live primitive(s). Touch every code sample and every schema table.
3. **docs/specs/OBJECT_YAML_FORMAT.md** and
   **docs/specs/SCENE_YAML_FORMAT.md**: Remove `width_scale` from schema
   tables and YAML examples, OR confirm it is still live and update the
   audit findings. These are the closed YAML vocabulary surfaces; they
   must be exact.
4. **docs/specs/OBJECT_VOCABULARY.md** and
   **docs/specs/SCENE_VOCABULARY.md**: Drop `width_scale` from the layout
   hints lists.
5. **docs/specs/SPEC_DESIGN_CHECKLIST.md** line 46: Drop `width_scale`
   from the placement layout hints allow-list.
6. **AGENTS.md / docs/PRIMARY_CONTRACT.md / docs/PRIMARY_SPEC.md**: no
   changes needed (no hits).
7. Optional: add one-line footnote to
   `docs/active_plans/active/round3_checkpoint_next_action_queue.md`
   pointing at R4+B3+V1 verification status, so future readers do not
   re-treat the stale terms as live.

Open question for V4: confirm with R4 evidence whether `width_scale` is
truly dead, or only `ASSET_SPECS` / `display_width_cm`. The terms travel
together in SCALING_MODEL.md but may have different fates. If `width_scale`
remains an authorable layout hint, the spec rewrites narrow to just the
sizing-source terms.

## Verification

- `python3 tests/check_ascii_compliance.py docs/active_plans/reports/round3_v3_stale_terms_audit.md`: pass
- `pytest tests/test_markdown_links.py -q`: pass

## Other terms scanned, zero hits in canonical docs

- `widthScale` (camelCase variant): 0 hits anywhere under `docs/`.
- "alias map": only in active_plans/archive; 0 in canonical specs.
- "asset alias": same.
- "footprint vocabulary": 0 hits anywhere.
- `footprint--small` / `footprint--large` (CSS class names): 0 hits in
  canonical specs (relevant only to static-template surfaces).
