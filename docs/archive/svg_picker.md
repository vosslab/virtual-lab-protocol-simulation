# Plan: Fill missing object SVGs via candidate picker

## Context

74 object-YAML `asset_name` references under `content/objects/` point at SVG files that do not
exist in `assets/equipment/`. The repo has 110 SVGs on disk but the authored objects expect
~120 distinct asset names, many of them state variants (`*_empty`, `*_filled`, `*_spinning`,
`*_idle`). There is no validator that catches the mismatch at authoring time; the build
silently produces objects whose `visual_states` cannot resolve.

Source pool now exists: `OTHER_REPOS/` (gitignored, repo-root) holds two upstream SVG
libraries cloned for exactly this purpose -- `bioicons/` (2811 SVGs, mixed CC0 / CC BY / MIT)
and `scienceicons/` (63 SVGs). Combined with the 110 already in `assets/equipment/`, that is
~2984 candidates. Hand-grepping that pool by name is not viable. A static HTML picker with
ranked-suggestion review queue + search lets a human curate fast.

The picker must also support browsing the existing 110 assets (reassign / inventory).

Pipeline (four independent surfaces):

1. **Indexer** (Python) -- crawls source pools, emits `candidates.json` with stable id,
   source repo, repo-relative path, license tag + confidence, filename, search-token corpus
   (filename + parent-folder tokens).
2. **Targets builder** (Python) -- parses `content/objects/<kind>/*.yaml`, diffs against
   `assets/equipment/*.svg`, emits `missing_targets.json` (one record per missing slot,
   grouped by object + state family, with variant-looking flag).
3. **Ranker** (Python) -- joins candidates x targets, emits `suggestions.json` with top-N
   ranked candidate ids per target (token overlap + source trust weighting; existing
   `assets/equipment/` ranks above bioicons above scienceicons).
4. **Picker UI** (static HTML/JS in `tools/svg_picker/`) -- three-pane review queue: missing
   targets grouped by object+state family on the left, target context in middle, ranked
   candidates on the right (search refines, doesn't start blank). Three decision states
   (assign / defer / ignore-intentional). Keyboard-driven. Exports `decisions.json`.
5. **Applier** (Python) -- consumes `decisions.json`, runs collision checks before touching
   disk, copies SVGs into `assets/equipment/<asset_name>.svg`, normalizes via existing
   `tools/normalize_svg_v2.py`, appends to `docs/SVG_ATTRIBUTION.md` for CC BY sources,
   reminds user to run `pipeline/generate_svg_globals.py`.

Round trip (build manifests -> open picker -> export decisions -> apply) keeps the HTML
purely read-only and keeps every disk-mutating step in auditable Python.

## Objectives

- Index all candidate SVGs from `OTHER_REPOS/bioicons/`, `OTHER_REPOS/scienceicons/`, and
  `assets/equipment/` into `candidates.json` with stable IDs, repo-relative paths, license
  metadata + confidence.
- Compute the full missing-`asset_name` list grouped by object + state family, with a
  variant-looking flag, into `missing_targets.json`.
- Compute ranked candidate suggestions per target into `suggestions.json` so the picker opens
  with non-empty proposals.
- Ship a static HTML picker as a **review queue** (not a search grid): three-pane layout,
  ranked default view, keyboard shortcuts, three decision states, progress counters,
  normalized preview tiles. Exports `decisions.json`.
- Ship an applier that runs full collision checks before touching disk, separates
  copy-for-reuse from rename-existing modes (latter requires `--rename-existing`), records
  CC BY attribution, never edits object YAML.
- Add a fast pytest gate (`tests/test_object_asset_refs.py`) that fails when an object YAML
  references an `asset_name` with no `assets/equipment/<asset_name>.svg`. Soft-reporter mode
  on day one; hardens in a follow-up patch once the user has done a picking pass.

## Design philosophy

Manifest -> rank -> pick -> apply, four small surfaces over one monolith. The browser is a
pure consumer/producer of JSON; it never knows the repo layout, never invokes git, never
writes to disk. Trades a tiny coordination cost (CLI invocations bracketing the picker) for
auditability (`--dry-run` on every disk-mutating step), reversibility (a bad decision is one
line in `decisions.json`), and zero new server infrastructure.

Ranker-first UX is the second key choice. A blank-grid-plus-search picker for 2984
candidates feels like asset hunting. Pre-ranking turns the task into approve-or-correct, not
search-from-scratch x 74. Token overlap is cheap to compute and good enough as a first pass;
the user always has search as a fallback override.

Per `docs/REPO_STYLE.md` "Fix the design, not the symptom": the gate test is the design fix.
The picker fills today's 74 gaps; the gate prevents tomorrow's silent regressions.

## Scope

- `tools/svg_picker/build_candidate_manifest.py` (new): walk `assets/equipment/`,
  `OTHER_REPOS/bioicons/`, `OTHER_REPOS/scienceicons/`. Emit `tools/svg_picker/candidates.json`
  with one record per SVG: `{id, source_repo, rel_path (repo-relative), filename,
search_tokens, license_tag, license_url, license_confidence (exact|inferred|unknown),
attribution_required (bool)}`. No `abs_path`; applier resolves against repo root. License
  tags read from each source repo's license file or per-folder metadata; conservative default
  `CC BY` with `license_confidence: inferred` when unclear.
- `tools/svg_picker/build_missing_targets.py` (new): walk `content/objects/<kind>/*.yaml`,
  extract every `asset_name` from `visual_states.<state>.cases[].output` (refs:
  `content/objects/bottle/bme_bottle.yaml:24-26`,
  `content/objects/flask/t75_flask.yaml:26-37`,
  `content/objects/equipment/electrophoresis_tank.yaml:21-31`). Diff against
  `assets/equipment/*.svg`. Emit `tools/svg_picker/missing_targets.json` with one record per
  missing slot: `{asset_name, referenced_by: [object_yaml_paths...], kind, object_label,
state_family (e.g. "electrophoresis_tank" stripped of variant suffix), variant_suffix
(e.g. "_filled"|""), variant_looking (bool, true when suffix matches a known variant token
set), expected_path}`. Records grouped under `state_family` so picker can render coherent
  variant clusters.
- `tools/svg_picker/build_ranked_suggestions.py` (new): join `candidates.json` and
  `missing_targets.json`. For each target emit top-50 candidate ids with score breakdown:
  `{target_asset_name, ranked: [{candidate_id, score, signals: {filename_token_overlap,
parent_folder_overlap, source_trust_boost}}, ...]}`. Source trust order:
  `assets/equipment/` > `bioicons/` > `scienceicons/` (existing assets are stylistically
  consistent with the repo, ranked higher even on tied token scores). Emit
  `tools/svg_picker/suggestions.json`.
- `tools/svg_picker/index.html` + `tools/svg_picker/picker.js` +
  `tools/svg_picker/picker.css` (new): three-pane static page.
  - **Left pane**: missing targets grouped by `state_family`. Show progress
    (`assigned/deferred/ignored/remaining`). Filter chips: "unassigned only", "needs
    attribution", "variant-looking". Selecting a target moves it to middle pane.
  - **Middle pane**: target context. `asset_name`, referenced object YAML path(s), object
    label/kind, nearby `visual_states` cases (so picker sees sibling variants in same
    family), variant-looking flag.
  - **Right pane**: ranked candidates first (from `suggestions.json`), search box refines or
    overrides. Existing `assets/equipment/` candidates badged "trusted source". Normalized
    preview tiles: fixed square, transparent checkerboard background, filename below image,
    light/dark toggle for the panel. Each tile shows a plain-language match label derived
    client-side from `suggestions.json` signals: "strong name match" (filename token overlap
    > =0.7), "partial name match" (0.3-0.7), "same parent folder", "trusted existing asset"
    > (in-repo source), "weak match" (otherwise). Score number shown as tooltip; label is the
    > headline.
  - **Large preview**: highlighted candidate renders at full size in a panel adjacent to the
    middle context pane so the user can compare the candidate against the target context
    side-by-side without leaving the keyboard flow.
  - **Hide-for-target**: per-target "bad for this target" action (key `x`) hides a candidate
    from the current target's ranked list; persists in `decisions.json` as
    `hidden_candidates: [candidate_id, ...]` per target so a reload restores the filter.
    Optional `apply to family` modifier (`X`) hides the candidate across every target sharing
    the current `state_family`.
  - **Batch actions for state families**: when the left-pane selection is a family header
    (not a single target), the action bar exposes "defer all variant-looking in this
    family", "assign same candidate to all selected targets" (with multi-select via shift /
    cmd), and "ignore-intentional all in this family (with shared reason)". Reduces
    per-decision overhead when whole families need the same treatment.
  - **Session autosave**: every state change (assignment, defer, ignore, hide, search query)
    persists to `localStorage` under a stable key (`svg_picker.session.v1`). On reload, the
    picker offers "resume session" vs "start fresh"; resume rehydrates all decisions and
    hidden_candidates so a 74-slot pass can span multiple sittings. Export still produces
    the same `decisions.json` shape.
  - **Decision states** per target: `assigned` (with candidate_id),
    `defer` (needs custom draw / variant derivation), `ignore_intentional` (with required
    reason string). Decisions other than `assigned` still export to `decisions.json` so the
    applier knows which slots were reviewed.
  - **Keyboard**: `Enter` assigns highlighted candidate, arrows navigate candidates, `/`
    focuses search, `n` next unassigned, `b` back, `d` defer, `i` ignore-intentional (opens
    reason prompt), `[` `]` previous/next target, `x` hide-candidate-for-target, `X`
    hide-candidate-for-family, `shift+click` multi-select targets in left pane for batch
    actions.
  - "Export decisions" button downloads `decisions.json`:
    `[{asset_name, state: assigned|defer|ignore_intentional, candidate_id?, source_repo?,
source_path?, license_tag?, license_confidence?, notes?, reason?, hidden_candidates?:
[candidate_id, ...]}, ...]`. Applier ignores `hidden_candidates` (UI-only state) but
    preserves it on round-trip so re-importing a decisions file restores hide state.
  - Loads JSON via relative `fetch()`. Works under `file://` in Firefox; Chrome may block
    cross-origin local fetches -- README documents fallback:
    `python3 -m http.server --directory tools/svg_picker 8127` then
    `http://127.0.0.1:8127/`.
- `tools/svg_picker/apply_decisions.py` (new): reads `decisions.json`. Pre-flight checks
  (all run before any disk mutation):
  1. Schema validation per decision record.
  2. No duplicate `asset_name` across decisions.
  3. Every `candidate_id` exists in current `candidates.json` (re-read at apply time, not
     trusted from `decisions.json`).
  4. Every `source_path` still exists on disk and matches the candidate's recorded
     `rel_path`. Mismatch (source moved/edited since manifest build) is a hard fail with
     instruction to re-run `build_candidate_manifest.py`.
  5. No assigned decision targets an `asset_name` that already exists in
     `assets/equipment/` unless `--force`.
  6. `--rename-existing` is required for any decision whose `source_repo == "assets/equipment"`
     (i.e. reassigning an in-repo asset to a new name); default mode rejects this. Default
     mode for in-repo sources is `copy` only.
     After checks pass: `cp` + `git add` for `OTHER_REPOS/` sources, optional `cp` (default) or
     `git mv` (with `--rename-existing`) for in-repo sources, run `tools/normalize_svg_v2.py`,
     append rows to `docs/SVG_ATTRIBUTION.md` for `attribution_required: true` decisions, print
     per-slot summary + reminder to run `python3 pipeline/generate_svg_globals.py`. Supports
     `--dry-run`.
- `tests/test_object_asset_refs.py` (new): for every object YAML under `content/objects/`,
  assert every `asset_name` it references corresponds to an existing
  `assets/equipment/<asset_name>.svg`. Single per-rule test function; cites the design rule
  in the assertion message. Soft-reporter mode on day one (see Acceptance gates).
- `docs/SVG_ATTRIBUTION.md` (new): table of `(asset_name, source_repo, original_rel_path,
license_tag, license_confidence, license_url)`. Created by applier on first run; appended
  thereafter.
- `tools/svg_picker/README.md` (new): one-page workflow doc -- build manifests, open picker
  (with file:// vs http.server fallback note), apply decisions (`--dry-run` first), regen,
  run gate test.
- `docs/CHANGELOG.md`: one entry per patch under today's date.

## Non-goals

- Editing object YAMLs (`asset_name` values stay as authored).
- Authoring new SVGs from scratch. If a missing slot has no acceptable candidate, picker
  marks it `defer` or `ignore_intentional`; applier reports unfilled.
- Auto-deriving state variants (`*_empty` -> `*_filled`) via colormap. Picker tags
  variant-looking slots so user can batch-review them later; actual derivation is a
  follow-up plan.
- Adding a server, build step, or framework dependency. Static HTML + vanilla JS only.
  (`http.server` is a documented fallback, not a dependency.)
- Touching `pipeline/generate_svg_globals.py`, `tools/normalize_svg_v2.py`, or any existing
  pipeline code beyond invoking it.
- Cloning new repos into `OTHER_REPOS/`.

## Architecture boundaries and ownership

| Boundary                   | Owner          | Touch rule                                                                                                      |
| -------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------- |
| Candidate indexing         | tooling author | `tools/svg_picker/build_candidate_manifest.py` only                                                             |
| Missing-target computation | tooling author | `tools/svg_picker/build_missing_targets.py` only                                                                |
| Ranker                     | tooling author | `tools/svg_picker/build_ranked_suggestions.py` only (reads both manifests)                                      |
| Picker UI                  | tooling author | `tools/svg_picker/{index.html,picker.js,picker.css}` only                                                       |
| Applier                    | tooling author | `tools/svg_picker/apply_decisions.py` only; calls existing `tools/normalize_svg_v2.py`; never edits object YAML |
| Gate test                  | tester         | `tests/test_object_asset_refs.py` only                                                                          |
| Workflow docs              | maintainer     | `tools/svg_picker/README.md`, `docs/CHANGELOG.md`                                                               |
| Existing SVG pipeline      | other manager  | Untouched -- `pipeline/generate_svg_globals.py`, `docs/specs/SVG_PIPELINE.md` are read-only inputs              |

### Mapping (milestones -> components -> patches)

| Milestone / Workstream | Component                                   | Expected patches |
| ---------------------- | ------------------------------------------- | ---------------- |
| M1 / WS-INDEX          | Candidate manifest builder                  | 1                |
| M1 / WS-TARGETS        | Missing-target list builder                 | 1                |
| M1.5 / WS-RANK         | Ranked-suggestions builder                  | 1                |
| M2 / WS-PICKER         | Static HTML review-queue picker             | 1                |
| M3 / WS-APPLY          | Apply-decisions script + attribution doc    | 1                |
| M3 / WS-GATE           | Pytest gate (soft-reporter)                 | 1                |
| M4 / WS-DOCS           | README + plan archive + changelog close-out | 1                |

M1 patches are independent (disjoint inputs, disjoint outputs) -- dispatch in parallel.
M1.5 depends on both M1 outputs. M3 patches are independent of each other.

## Milestone plan

### Milestone M1: Source manifests

- Workstreams: WS-INDEX, WS-TARGETS (independent; parallel-ready; max doers 2).
- Entry: `OTHER_REPOS/{bioicons,scienceicons}/` and `assets/equipment/` exist.
- Exit:
  - `candidates.json` and `missing_targets.json` written under `tools/svg_picker/`,
    gitignored.
  - License tags + confidence populated; no `abs_path` fields anywhere.
  - `missing_targets.json` records carry `state_family` and `variant_looking` flag.
  - `pytest tests/` still green (existing 751 pass).
  - `docs/CHANGELOG.md` entry per patch.

### Milestone M1.5: Ranked suggestions

- Workstream: WS-RANK.
- Depends on: M1.
- Entry: both M1 JSONs exist.
- Exit:
  - `suggestions.json` written; every target has 1-50 ranked candidates with score breakdown.
  - Existing `assets/equipment/` sources rank above bioicons above scienceicons on tied
    token scores.
  - `pytest tests/` green.
  - Changelog entry.

### Milestone M2: Review-queue picker

- Workstream: WS-PICKER.
- Depends on: M1.5.
- Entry: all three JSONs exist.
- Exit:
  - `tools/svg_picker/index.html` renders three-pane review queue in Chrome (via
    http.server fallback) and Firefox (via `file://`).
  - Targets grouped by `state_family`; progress counters visible; filter chips functional.
  - Ranked candidates render on target select (no blank state); search refines.
  - Decision states (`assigned` / `defer` / `ignore_intentional`) all selectable; `ignore`
    requires reason.
  - Keyboard shortcuts functional (Enter, arrows, `/`, `n`, `b`, `d`, `i`, `[`, `]`, `x`,
    `X`, shift+click multi-select).
  - Preview tiles normalized: fixed-square frame, checkerboard background, filename below;
    plain-language match labels render per tile.
  - Large side-by-side preview panel renders highlighted candidate at full size.
  - Hide-for-target (`x`) and hide-for-family (`X`) functional; hidden candidates persist
    in decisions.json round-trip.
  - Batch actions on family selection (defer-all-variant-looking, assign-same-to-selected,
    ignore-all-with-shared-reason) functional.
  - Session autosaves to localStorage; reload offers "resume" vs "start fresh".
  - "Export decisions" downloads `decisions.json` with correct shape per decision state,
    including `hidden_candidates` round-trip field.
  - Manual smoke in Chrome + Firefox documented in changelog. Optional Playwright spec
    `tests/playwright/test_svg_picker.mjs` if wiring is light.
  - Changelog entry.

### Milestone M3: Applier + gate

- Workstreams: WS-APPLY, WS-GATE (independent; parallel-ready; max doers 2).
- Depends on: M2.
- Entry: hand-crafted `tools/svg_picker/_test_decisions.json` with one assignment + one
  defer + one ignore-intentional for end-to-end testing.
- Exit:
  - `apply_decisions.py --dry-run` reports all planned actions; runs every collision check
    without touching disk.
  - Real run: pre-flight checks gate every mutation; default mode never `git mv`s in-repo
    sources; `--rename-existing` opt-in respected; attribution rows appended for
    `attribution_required: true` decisions.
  - `tests/test_object_asset_refs.py` lands in soft-reporter mode: prints current gap,
    exits 0 unless gap grew, fails loudly with a synthetic deletion.
  - Synthetic regression: delete one asset, re-run test, confirm informative failure;
    restore.
  - Changelog entries per patch.

### Milestone M4: Docs + close-out

- Workstream: WS-DOCS.
- Depends on: M3.
- Exit:
  - `tools/svg_picker/README.md` documents the five-step workflow + Chrome `file://`
    fallback.
  - `docs/CHANGELOG.md` close-out entry.
  - Plan archived to `docs/archive/svg_picker.md`.

## Acceptance criteria and gates

- Per-patch: touched gate exits 0; changelog updated.
- M1 gate: both JSONs validate against a shape check inside each builder; counts come from
  live tree (no hardcoded numbers).
- M1.5 gate: `suggestions.json` covers every target with at least one ranked candidate (or
  marks `no_suggestions: true` when token overlap is zero).
- M2 gate: picker opens cleanly in Chrome (via http.server) + Firefox (`file://`); ranked
  default view non-empty for ranked targets; keyboard shortcuts work; export shape
  validates.
- M3 gate-test policy: soft-reporter mode -- prints current gap, exits 0 unless gap grows,
  fails loudly on synthetic deletion. Hardening to hard `assert` is a follow-up patch once
  user has done a picking pass closing >=90% of current gaps.
- M3 applier gate: every collision-check path covered by a quick pytest spec
  (`tests/test_apply_decisions_preflight.py`) that exercises each rejection branch with
  synthetic decision payloads (no real disk mutation).
- M4 gate: README links work; plan archived.

## Test and verification strategy

- `pytest tests/` -- fast suite stays green throughout.
- `pytest tests/test_object_asset_refs.py -v` -- soft-reporter on day one.
- `pytest tests/test_apply_decisions_preflight.py -v` -- applier collision-check coverage.
- `source source_me.sh && python3 tools/svg_picker/build_candidate_manifest.py` -- idempotent.
- `source source_me.sh && python3 tools/svg_picker/build_missing_targets.py` -- idempotent.
- `source source_me.sh && python3 tools/svg_picker/build_ranked_suggestions.py` -- idempotent.
- `open tools/svg_picker/index.html` (Firefox) or
  `python3 -m http.server --directory tools/svg_picker 8127` then
  `http://127.0.0.1:8127/` (Chrome) -- manual smoke.
- `source source_me.sh && python3 tools/svg_picker/apply_decisions.py --dry-run decisions.json`.
- `source source_me.sh && python3 tools/svg_picker/apply_decisions.py decisions.json`.
- `source source_me.sh && python3 pipeline/generate_svg_globals.py` -- regen after applier.
- `source source_me.sh && python3 validation/validate.py` -- final sanity.

## Migration and compatibility policy

- Additive: no existing tooling modified; no existing test changed; no asset removed.
- Gate test ships soft-reporter first. Hard `assert` follow-up only after picking pass.
- `decisions.json` and all `tools/svg_picker/*.json` manifests gitignored (user-session /
  derivable artifacts). Applier re-reads `candidates.json` at apply time and verifies every
  `source_path` still resolves; mismatch is a hard fail asking user to rebuild manifest.
- `OTHER_REPOS/` stays gitignored. Only chosen `.svg` files + attribution entries land
  in-tree.

## Risk register

| Risk                                                            | Impact | Trigger                                                 | Owner          | Mitigation                                                                                                                                                                             |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| License confusion (CC BY vs CC0)                                | Medium | Applier mis-tags a bioicons SVG                         | applier author | Per-file license read where bioicons provides metadata; conservative default `CC BY` with `license_confidence: inferred`; picker shows inferred badge; user can override before export |
| Picker performance on 2984 candidates                           | Low    | Render or filter chokes                                 | UI author      | Virtualize candidate grid; index search tokens flat at load; ranked default keeps initial render small; target <100 ms keystroke-to-filter                                             |
| Preview inconsistency across libraries (viewBox, stroke widths) | Medium | Tiny raw SVG thumbnails look chaotic                    | UI author      | Fixed-square tile + transparent checkerboard background + uniform CSS `object-fit: contain`; hover/click expands; light/dark toggle                                                    |
| Existing 110 SVGs accidentally renamed/destroyed                | High   | User reassigns an existing asset, applier `git mv`s it  | applier author | Default mode for in-repo sources is `copy`, never `git mv`; `--rename-existing` opt-in required; `--force` required to overwrite existing target name                                  |
| Source file moved between manifest build and apply              | Medium | OTHER_REPOS updated mid-session                         | applier author | Applier re-reads `candidates.json` + stats every `source_path` at apply time; mismatch fails with "rebuild manifest" instruction                                                       |
| Decision-state-without-reason for ignore-intentional            | Low    | User accidentally exports ignore without reason         | UI + applier   | UI requires non-empty reason on ignore-intentional; applier rejects ignore decisions with empty reason                                                                                 |
| State-variant slots dominate the gap and no candidates match    | Medium | Many `_filled`/`_empty`/`_spinning` slots stay unfilled | user           | Picker tags `variant_looking: true`; user batch-defers them; follow-up plan addresses variant derivation                                                                               |
| Chrome blocks `file://` fetch() of sibling JSON                 | Medium | User opens `index.html` directly in Chrome              | UI author      | README documents `python3 -m http.server` fallback; picker shows clear error banner if fetch fails                                                                                     |
| Manifest stale between sessions                                 | Low    | New OTHER_REPOS clones                                  | tooling author | Builders fast (<1 s each); README workflow says rebuild before picking                                                                                                                 |

## Rollout and release checklist

- [ ] M1 exit met (candidates + targets JSONs build; pytest green).
- [ ] M1.5 exit met (suggestions JSON build; ranker working).
- [ ] M2 exit met (picker review queue in both browsers; keyboard works; export works).
- [ ] M3 exit met (applier dry-run + real; preflight tests green; soft gate test landed).
- [ ] M4 exit met (README + changelog + archive).
- [ ] Follow-up patch: gate test hardened to hard `assert` once picking pass complete.

## Documentation close-out requirements

- `tools/svg_picker/README.md` carries the five-step workflow + Chrome fallback.
- `docs/SVG_ATTRIBUTION.md` carries per-asset attribution rows (CC BY).
- `docs/CHANGELOG.md` entries per milestone close.
- Plan archived to `docs/archive/svg_picker.md` on M4 close.

## Critical files

- `OTHER_REPOS/bioicons/` (read-only, 2811 SVGs, mixed CC0/CC BY/MIT)
- `OTHER_REPOS/scienceicons/` (read-only, 63 SVGs)
- `assets/equipment/` (target dir; currently 110 SVGs)
- `content/objects/<kind>/*.yaml` (read-only; 87 object YAMLs, ~120 `asset_name` refs)
- `tools/normalize_svg_v2.py` (existing; called by applier)
- `pipeline/generate_svg_globals.py` (existing; user runs after applier)
- `docs/specs/SVG_PIPELINE.md` (read-only; normalization + naming rules)
- New: `tools/svg_picker/{build_candidate_manifest.py, build_missing_targets.py,
build_ranked_suggestions.py, index.html, picker.js, picker.css, apply_decisions.py,
README.md}`
- New: `tests/test_object_asset_refs.py`
- New: `tests/test_apply_decisions_preflight.py`
- New: `docs/SVG_ATTRIBUTION.md`

## Patch plan

M1 (parallel-ready):

- Patch 1 (WS-INDEX): `build_candidate_manifest.py` + `.gitignore` rule for
  `tools/svg_picker/*.json` + changelog.
- Patch 2 (WS-TARGETS): `build_missing_targets.py` + changelog.

M1.5:

- Patch 3 (WS-RANK): `build_ranked_suggestions.py` + changelog.

M2:

- Patch 4 (WS-PICKER): `index.html`, `picker.js`, `picker.css` + manual-smoke notes in
  changelog.

M3 (parallel-ready):

- Patch 5 (WS-APPLY): `apply_decisions.py` + `docs/SVG_ATTRIBUTION.md` scaffold +
  `tests/test_apply_decisions_preflight.py` + changelog.
- Patch 6 (WS-GATE): `tests/test_object_asset_refs.py` (soft-reporter) + changelog.

M4:

- Patch 7 (WS-DOCS): `tools/svg_picker/README.md` + plan archive + changelog close-out.

Follow-ups (separate plans):

- Harden gate test from soft reporter to hard `assert`.
- Colormap-based state-variant derivation for unfilled `variant_looking: true` slots.

## Verification

End-to-end from a clean checkout after all patches plus one user picking pass:

```bash
source source_me.sh
python3 tools/svg_picker/build_candidate_manifest.py
python3 tools/svg_picker/build_missing_targets.py
python3 tools/svg_picker/build_ranked_suggestions.py
# Firefox: open tools/svg_picker/index.html
# Chrome:  python3 -m http.server --directory tools/svg_picker 8127 ; open http://127.0.0.1:8127/
# ... user reviews queue, exports decisions.json to repo root ...
python3 tools/svg_picker/apply_decisions.py --dry-run decisions.json
python3 tools/svg_picker/apply_decisions.py decisions.json
python3 pipeline/generate_svg_globals.py
python3 validation/validate.py
pytest tests/
```

All exit 0. `assets/equipment/` gains new files for each `assigned` decision.
`docs/SVG_ATTRIBUTION.md` gains rows per CC BY source. Gate test reports zero gaps once
picking complete.

## Open questions

None blocking M1. Two decisions deferred to follow-up plans:

1. Variant derivation (`*_empty` -> `*_filled` via colormap recolor vs manual Inkscape vs
   `<use>` composition) for unfilled `variant_looking: true` slots.
2. Trigger for hardening gate test from soft reporter to hard `assert`. Proposed: first
   picking pass closes >=90% of current gaps.

## Resolved decisions

- Four-script split (indexer / targets / ranker / applier) + static picker over a monolith.
  Reason: auditability, reversibility, per-stage `--dry-run`.
- Ranker as a separate script feeding the picker. Reason: pre-ranked default view turns the
  picker from a search grid into a review queue; ranking logic is pure data join, lives
  outside the UI layer where it can be tested.
- Static HTML + vanilla JS picker. Reason: zero new infrastructure; works under `file://`
  (Firefox) or `http.server` (Chrome) without server code in the repo.
- Three-pane UX (missing-by-state-family / target context / ranked candidates + search).
  Reason: 2984-candidate search-from-scratch UX is hostile; ranked defaults + state-family
  grouping enable batch-coherent decisions.
- Three decision states (`assigned` / `defer` / `ignore_intentional`) with required reason
  on ignore. Reason: distinguishes "not reviewed" from "reviewed and not solvable" so the
  applier and follow-up plans have complete information.
- Keyboard-first navigation. Reason: 74+ assignments is too many for a mouse-only workflow.
- Normalized preview tiles (fixed square, checkerboard, filename-below). Reason: SVGs
  across libraries vary wildly in viewBox/stroke; uniform display is essential to fair
  visual comparison.
- Existing 110 assets ranked above bioicons above scienceicons on tied scores. Reason:
  in-repo assets are stylistically consistent with the existing scenes.
- Repo-relative paths in manifests, no `abs_path`. Reason: machine-portable and reviewable.
- License confidence + `attribution_required` fields explicit; conservative `CC BY` /
  inferred default. Reason: avoids silent under-attribution; UI badges inferred entries.
- Applier preflight: dup `asset_name`, unknown `candidate_id`, drifted `source_path`,
  overwrite-without-`--force`, in-repo `git mv` without `--rename-existing`. Reason: every
  destructive path requires explicit opt-in.
- Default in-repo source mode is `copy`, not `git mv`. Reason: accidental rename would
  break existing object refs.
- License attribution in `docs/SVG_ATTRIBUTION.md`. Reason: CC BY requires credit; CC0
  doesn't, but recording it is cheap and avoids future research.
- Gate test soft-reporter on day one. Reason: 74 known gaps; hard assert would red-line CI.
- Picker never invokes `git` or regen. Reason: keeps browser surface a pure JSON
  consumer/producer.
- `decisions.json` + `tools/svg_picker/*.json` gitignored. Reason: session / derivable
  artifacts.
- `python3 -m http.server` documented as Chrome fallback, not a dependency. Reason: Chrome
  often blocks `file://` cross-origin fetch; stdlib server is zero-install workaround.
- Plain-language match labels derived client-side from ranker `signals`, not pre-computed in
  `suggestions.json`. Reason: presentation belongs to UI; ranker stays pure data.
- Large side-by-side preview panel adjacent to context pane. Reason: thumbnails are good for
  scanning but final decisions need a bigger view without breaking keyboard flow.
- Hide-for-target / hide-for-family (`x` / `X`) persisted in `decisions.json` as
  `hidden_candidates`. Reason: a high-ranked-but-wrong candidate repeating across a family
  wastes attention; hiding it is cheap and reversible; persistence survives re-import.
- Batch actions on family selection (defer-all, assign-same-to-selected, ignore-all-with-
  shared-reason). Reason: 74 decisions x per-slot click is the wrong cost model when whole
  families need the same treatment.
- Session autosave to `localStorage` under `svg_picker.session.v1`; resume vs start-fresh
  prompt on reload. Reason: 74 slots may span multiple sittings; export-only persistence
  would lose accidental tab-close work.
