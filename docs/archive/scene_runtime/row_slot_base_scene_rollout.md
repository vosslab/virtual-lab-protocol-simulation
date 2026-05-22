# Plan: row+slot base scene rollout

## Context

Prototype plan at
`docs/active_plans/row_slot_base_scene_prototype.md` closed with verdict
`prototype_ready_rollout`. `hood_basic` rendered cleanly via the row+slot path:
4/4 placements preserved, gallery screenshot 71K, no engine errors.

This plan migrates the remaining 8 base scenes to side-by-side row+slot files
using the same additive pattern as the prototype. Legacy zone-bearing files
stay untouched.

## Objectives

- Author 8 new `content/base_scenes/<name>_row_slot.yaml` files.
- Each render cleanly via the existing gallery test.
- No regression on legacy zone path; all 9 legacy scenes still render.
- Side-by-side only; do not delete or modify any legacy file.

## Scope

- 8 scenes to migrate (legacy file -> `_row_slot.yaml` sibling):
  1. `bench_basic` (2 placements)
  2. `cell_counter_basic`
  3. `electrophoresis_bench` (16 placements per WP-IDENT-1)
  4. `heat_block_bench` (3 placements)
  5. `imaging_bench`
  6. `microscope_basic`
  7. `sample_prep_bench`
  8. `staining_bench`
- Gallery test extended (already done by WP-PROTO-4) - should pick up new
  files automatically.

## Non-goals

- Do NOT modify any legacy `<name>.yaml` file.
- Do NOT modify pipeline/, layout engine, or types (WP-PROTO-2/3 already
  cover row+slot).
- Do NOT touch sdspage overrides or any protocol scene.
- Do NOT commit.

## Dispatch order

- WP-ROLL-1: `bench_basic_row_slot.yaml` (simplest, 2 placements). Serial.
- WP-ROLL-2: `heat_block_bench_row_slot.yaml` (3 placements). Serial.
- After both green: WP-ROLL-3 through WP-ROLL-8 in parallel (4 doers max).

## Per-WP shape

- Read legacy YAML + Experiment 1 Section 4 sketch for that scene.
- Author row+slot file preserving every `placement_name` verbatim.
- Zero authored geometry (no `bounds`, `zones`, `scene_bounds`, `depth_tier`,
  `align`, `align_stop`, etc.).
- Run `pytest tests/test_markdown_links.py -q` + `git status --short`.
- Append CHANGELOG entry under `## 2026-05-18 / ### Additions and New Features`.

## Acceptance criteria

- Hard: per scene, every legacy `placement_name` preserved verbatim in the
  row+slot file.
- Hard: zero authored geometry in any new file.
- Hard: gallery test still renders all 9 legacy scenes (no regression).
- Hard: gallery test renders the new row+slot scene without error.
- Hard: pytest green per WP.

## Decision gate at plan close

- `rollout_complete` (all 8 scenes migrated, all gallery renders green) ->
  next plan ratifies row+slot as the canonical authoring shape; legacy zone
  files become deletion candidates (separate plan).
- `rollout_blocked` (one or more scenes cannot be migrated cleanly) ->
  document blocker; open targeted fix plan.
