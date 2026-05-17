# Plan: lift validation/, unify shared_toolkit/, normalize CLI surface

> **Sequencing rule (manager 2026-05-16).** Milestones run in
> order. M3 cannot start until M2 snapshot diffs empty. M4 cannot
> start until M3 exit gates pass (UX adopted everywhere; JSON
> snapshot test green). Within a milestone, parallel workstreams
> dispatch concurrently per the parallel-plan-ready flag.

> **UX-is-architecture rule (user 2026-05-16).** Existing
> per-tool UX inconsistency IS the design problem. M3 is not
> polish; it is the architectural fix. Plan stays single-piece
> M1->M4. Narrow UX normalization layer: one selection model, one
> verbosity model, one summary style, one JSON schema.

> **Clean-break rule (user 2026-05-16).** No wrappers in `tools/`.
> Every validation script LEAVES `tools/` entirely. `tools/` ends
> the plan with zero validation entry points. **Canonical
> invocation: `validation/validate.py`** (user preference);
> wrap with `source source_me.sh && validation/validate.py` when
> PYTHONPATH bootstrap needed. Per-stage direct invocation
> `python3 -m validation.<sub>` available as secondary path.
> No "which file do I run" confusion. Backward compatibility
> for old flag names handled inside the unified parser, not via
> wrapper scripts.

> **Layout directive (user 2026-05-16, revised twice).**
> Validation moves to `REPO_ROOT/validation/` (top-level, sibling
> of `tools/`). `tools/` retains only isolated one-shot scripts.
> `shared_toolkit/` lives at `validation/shared_toolkit/`
> (NESTED inside `validation/`, not at repo root). Rationale:
> the toolkit serves validation only; nesting it makes ownership
> explicit.
>
> **Validator inventory (user 2026-05-16).** These move into
> `validation/` in M2 and consume `validation.shared_toolkit`:
> - `tools/validate_content_yaml.py` -> `validation/yaml/`
> - `tools/protocol_stepper.py` -> `validation/stepper/` (stepper
>   is a validator)
> - `tools/check_svg_pipeline.py` -> `validation/svg/pipeline_check.py`
>   (check_svg is a validator)
> - `tools/svg_asset_audit.py` -> `validation/svg/asset_audit.py`
> - `tools/analyze_protocol_audit.py` -> `validation/yaml/protocol_audit.py`
> - `tools/protocol_manual.py` -> `validation/manual/` (renderer
>   is a human-readable validator -- it surfaces protocol
>   structure to humans for review)
>
> **Pipeline inventory (user 2026-05-16).** Core codegen scripts
> -- TS runtime cannot start without their output -- move to a
> new top-level `pipeline/`:
> - `tools/build_protocol_data.py` -> `pipeline/build_protocol_data.py`
> - `tools/build_scene_data.py` -> `pipeline/build_scene_data.py`
> - `tools/generate_svg_globals.py` -> `pipeline/generate_svg_globals.py`
> - `tools/bootstrap_generated.sh` -> `pipeline/bootstrap_generated.sh`
> Filenames preserved (no rename) to minimize caller churn.
> Pipeline scripts may import from `validation.shared_toolkit`
> (`load_yaml`, `REPO_ROOT`) -- honest dep, lowest LOC.
>
> **Salvage inventory (user 2026-05-16).** Retired one-offs go to
> `salvage/`:
> - `tools/purge_inline_images.py` -> `salvage/` (one-off, zero
>   callers, work already done)
> - `tools/normalize_svg.py` -> `salvage/` (superseded by
>   normalize_svg_v2.py)
>
> **`tools/` final inventory.** Genuine dev/smoke runners only:
> - `tools/normalize_svg_v2.py` (asset-time SVG normalization;
>   author runs at SVG check-in, NOT runtime pipeline)
> - `tools/run_smoke.py`
> - `tools/run_protocol_walkthrough.py`
> - `tools/build_test_fixture.sh`
> - `tools/run_ui_review_podman.sh`

> **Naming rule.** No filename and folder may share a name within
> any directory. Never create `foo.py` next to `foo/`. Applies to
> all repo-root packages and to every subpackage inside
> `validation/`. Reason: Python import resolution prefers the
> package over the module silently, hiding bugs.

## Context

`tools/` has 14 top-level Python scripts + 3 packages
(`validators/`, `stepper/`, `shared_toolkit/`). Validation logic
is scattered: 5 scripts at top-level are validators dressed as
one-shots (`validate_content_yaml.py`, `check_svg_pipeline.py`,
`svg_asset_audit.py`, `analyze_protocol_audit.py`,
`purge_inline_images.py`), while `validators/` covers only YAML.

Helpers duplicate across the tree:

- REPO_ROOT discovered four different ways in six files
  (`check_svg_pipeline.py:24-34`, `analyze_protocol_audit.py:26-33`,
  `build_protocol_data.py:29-36`, `build_scene_data.py:41-48`,
  plus canonical `shared_toolkit/paths.py`).
- YAML load reimplemented inline in `analyze_protocol_audit.py:36-39`,
  `build_protocol_data.py:39-50`, `build_scene_data.py:51-62`
  while `validators/yaml_io.py:load_yaml()` already exists.
- Two parallel finding/severity models
  (`validators/findings.py:Severity` vs `stepper/findings.py:Level`).
- Three output-format dialects (`shared_toolkit/reporter.py`,
  `validators/compiled_summary.py`, `stepper/dashboard.py`).

CLI / output / feature-parity audit also surfaced:

- Selection flags inconsistent: `-p/--protocol` (validate, stepper,
  analyze) vs `-o/--object` (svg_asset_audit) vs positional
  (protocol_manual) vs none (check_svg_pipeline).
- Verbosity inconsistent: `-q/-v` (validate, stepper, svg_audit),
  `-q` only (protocol_manual), none (check_svg, analyze, purge).
- Only `svg_asset_audit.py` emits JSON; all others text-only.
- `rich` library imported by only `validators/compiled_summary.py`
  and `stepper/dashboard.py`; everyone else hand-rolls tables.
- Exit codes inconsistent: 0/1 (most), 0/2/3 (check_svg), 0/1 under
  `--strict` (analyze), always 0 (purge), 0/2 (manual).
- No tool supports `--no-color`, `--format json` (except svg_audit),
  or `--strict` uniformly.
- No tool supports glob/pattern selection or `--errors-only`.

## UX doctrine (drives CLI, emitters, summaries, JSON, defaults)

Three-mode model. Same backend, same `Finding` records, different
surface per audience.

| Mode | Audience | Trigger | Output |
| --- | --- | --- | --- |
| **overview** | human (95% of runs) | default, tty stdout | rich one-screen summary, errors-first, warnings collapsed |
| **focused** | author mid-edit | `--focus` (git-scoped) or `-p` / `-o` / `--scene` | same summary, scoped subset |
| **agent** | tool consumer | `--json` / `--ndjson` | flat, append-only, one finding per record |

**Scope vs stage.** Scope selectors choose WHAT to validate
(which protocols/objects/scenes). Stage filters choose WHICH
validators run (yaml/svg/stepper). Orthogonal. Combine freely:
`validate --focus --only stepper` is "stepper checks on
git-touched things".

`--focus` is named for intent, not implementation. Today it maps
to `git diff HEAD + --cached + untracked-modified`; future focus
providers (e.g., LSP-driven, branch-diff, since-tag) can plug in
without renaming the flag.

`--list` semantics (per tool): lists the selectable entities for
that tool's primary scope. `validate_content_yaml --list` lists
protocols; `svg_asset_audit --list` lists objects;
`check_svg_pipeline --list` lists assets. Never global,
never recursive.

This doctrine is the conceptual center; every M3 design decision
flows from it.

## Objectives

**M1 -- structural lift + helpers:**

- Lift `shared_toolkit/` to `REPO_ROOT/shared_toolkit/`.
- Grow `shared_toolkit/` (`repo_root.py`, `yaml_io.py`,
  `findings.py`, `discovery.py`).
- Unify `Finding`/`Severity` model used by validators, stepper,
  and SVG audits.
- Land naming-collision test.
- Preserve every CLI surface (byte-identical pre/post).

**M2 -- validation/ package lift:**

- Lift validation into `REPO_ROOT/validation/` (top-level package,
  sibling of `tools/`) covering YAML + SVG + stepper.
- `tools/` retains only one-shot scripts (no validation entry
  points). Validation invoked exclusively via
  `python3 -m validation` or `python3 -m validation.<sub>`.
- Preserve every CLI flag + exit-code surface byte-identical
  (only invocation path changes).

**M3 -- unified UX (humans + agents in one milestone):**

- `validation/validate.py` aggregate orchestration entry.
- Shared CLI builder `shared_toolkit/cli.py`.
- Unified `rich` console `shared_toolkit/console.py`.
- Unified text/JSON/NDJSON emitter `shared_toolkit/emit.py`.
- **One selection model**: `--focus` (git-scoped, the daily
  loop), `-p/--protocol`, `-o/--object`, `--scene` (mutually
  exclusive; no selector = whole suite).
- **One verbosity model**: `-q/--quiet`, `-v/--verbose`,
  `--errors-only`.
- **One summary style**: rich overview block (errors first,
  warnings collapsed) when stdout is tty; plain text otherwise.
- **One JSON schema**: `--json` (alias `--format json`) emits
  flat document; `--ndjson` (alias `--format ndjson`) streams
  one finding per line + final summary record.
- Shared semantics: exit codes 0/1/2, `--no-color`, `--strict`,
  `--list`, `--interactive`, `--only {yaml,svg,stepper}`.
- Per-domain selection names preserved (`-p` for protocols,
  `-o`/`--asset` for objects/assets).
- Backward-compat aliases for any renamed flag (deprecated in
  `--help`, removed in M4).
- Validation entry: `validation/validate.py` (single aggregate
  CLI) + `python3 -m validation.<sub>` for per-stage invocation.
- Per-tool scripts run as `python3 -m validation.yaml`,
  `python3 -m validation.svg.asset_audit`,
  `python3 -m validation.stepper`, etc.
- JSON schema snapshot test:
  `tests/test_validation_json_schema.py`.
- Documentation: `docs/USAGE.md` overview + agent examples.

**M4 -- clean break + close:**

- DELETE every validation script from `tools/`
  (`validate_content_yaml.py`, `protocol_stepper.py`,
  `check_svg_pipeline.py`, `svg_asset_audit.py`,
  `analyze_protocol_audit.py`, `purge_inline_images.py`). No
  wrappers retained.
- Delete `tools.validators.findings` + `tools.stepper.findings`
  re-export shims.
- Delete deprecated flag aliases from `--help` output.
- Drop `check_svg_pipeline` legacy exit codes (2/3 -> only 1).
- `docs/FILE_STRUCTURE.md` final pass.
- `docs/CHANGELOG.md` close entry pointing users to new
  invocation paths.
- Plan archived to `docs/archive/`.

**`tools/` final inventory (post-M4):** `build_protocol_data.py`,
`build_scene_data.py`, `generate_svg_globals.py`,
`normalize_svg.py`, `normalize_svg_v2.py`, `protocol_manual.py`,
`run_smoke.py`, `run_protocol_walkthrough.py`,
`bootstrap_generated.sh`, `build_test_fixture.sh`,
`run_ui_review_podman.sh`. Zero validation scripts.

## Design philosophy

Fix-the-design-not-the-symptom (`docs/REPO_STYLE.md`): four
REPO_ROOT implementations, two `Severity` enums, three output
dialects, and seven incompatible argparse surfaces are symptoms of
an under-grown shared layer. Grow `shared_toolkit/` to cover both
helper logic AND CLI primitives (argparse builder, `rich` console,
JSON emitter), then let validators inherit them. Long-term over
short-term (`docs/REPO_STYLE.md`): one larger pass now, sequenced
M1->M4 with snapshot gates between each, beats four small passes
where each one risks user-visible drift. Trade-off: bigger plan,
strict sequencing. Alternative rejected: shipping consolidation
without parity leaves the user-visible surface incoherent even
after the internal cleanup.

Risk-managed via per-milestone snapshot diffs (M1+M2 require
byte-identical output; M3 introduces controlled CLI changes
behind aliases; M4 finishes alias + legacy-exit-code cleanup).

**"Byte-identical" scope (M1+M2 gate definition).** Applies to
normal-success CLI behavior: stdout, stderr, `--help`, exit
codes. Does NOT apply to Python traceback module paths,
`__module__` strings, or import-origin warnings -- those
necessarily change when packages move. Reviewers must not
bikeshed traceback path diffs.

## Scope (full plan, M1->M4)

**Structural (M1+M2):**

- New `REPO_ROOT/validation/` package: hosts YAML validators
  (moved from `tools/validators/`), SVG validators (extracted from
  `tools/check_svg_pipeline.py`, `tools/svg_asset_audit.py`,
  `tools/purge_inline_images.py`), and stepper (moved from
  `tools/stepper/`).
- New `REPO_ROOT/shared_toolkit/` package: lifted from
  `tools/shared_toolkit/`, expanded with `repo_root.py`,
  `yaml_io.py`, `findings.py`, `discovery.py`.
- Unified `Finding`/`Severity` model in
  `shared_toolkit/findings.py`; validators + stepper + SVG audits
  consume it.
- Migrate `tools/build_*.py` and `tools/analyze_protocol_audit.py`
  to `shared_toolkit` helpers.
- DELETE every validation script from `tools/` in M2
  (`validate_content_yaml.py`, `protocol_stepper.py`,
  `check_svg_pipeline.py`, `svg_asset_audit.py`,
  `analyze_protocol_audit.py`, `purge_inline_images.py`).
  Logic relocated into `validation/`; argparse + exit codes
  preserved verbatim in the relocated `main()`. No wrappers.
- `protocol_manual.py` stays in `tools/` (renderer, not
  validator).
**Unified UX (M3):**

- `validation/validate.py` aggregate entry.
- `shared_toolkit/cli.py` + `shared_toolkit/console.py` +
  `shared_toolkit/emit.py`.
- One selection model: `--focus` / `-p` / `-o` / `--scene`.
- One verbosity model: `-q/-v` / `--errors-only`.
- One summary style: rich overview block.
- One JSON schema: flat closed document; `--json` and `--ndjson`.
- `--only {yaml,svg,stepper}` stage filter.
- Exit codes 0/1/2; backward-compat aliases for any rename.

**Cleanup + close (M4):**

- Delete transitional shims (`tools.validators.findings`,
  `tools.stepper.findings` re-exports).
- Delete deprecated flag aliases.
- Drop `check_svg_pipeline.py` legacy exit codes.
- `docs/FILE_STRUCTURE.md` + `docs/CHANGELOG.md` close.
- Plan archived.

Update `docs/CHANGELOG.md` per milestone close. Update
`docs/USAGE.md` in M3.

## Move/stay tables

### `tools/shared_toolkit/` (5 files) -- ALL MOVE to `REPO_ROOT/shared_toolkit/`

| File | From | To | Action |
| --- | --- | --- | --- |
| `__init__.py` | `tools/shared_toolkit/` | `shared_toolkit/` | `git mv` |
| `paths.py` | `tools/shared_toolkit/` | `shared_toolkit/` | `git mv` |
| `objects.py` | `tools/shared_toolkit/` | `shared_toolkit/` | `git mv` |
| `protocols.py` | `tools/shared_toolkit/` | `shared_toolkit/` | `git mv` |
| `interactive.py` | `tools/shared_toolkit/` | `shared_toolkit/` | `git mv` |
| `reporter.py` | `tools/shared_toolkit/` | `shared_toolkit/` | `git mv` |
| `repo_root.py` | new | `shared_toolkit/` | new file (M1) |
| `yaml_io.py` | new (lifted from `tools/validators/yaml_io.py`) | `shared_toolkit/` | new file (M1) |
| `findings.py` | new (unified `Severity` + `Finding`) | `shared_toolkit/` | new file (M1) |
| `discovery.py` | new | `shared_toolkit/` | new file (M1) |

### `tools/validators/` (12 files) -- ALL MOVE to `REPO_ROOT/validation/yaml/`

| File | From | To | Action |
| --- | --- | --- | --- |
| `__init__.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `yaml_io.py` | `tools/validators/` | `shared_toolkit/yaml_io.py` | `git mv` + lift to toolkit (M1) |
| `findings.py` | `tools/validators/` | `shared_toolkit/findings.py` | absorbed into unified model (M1); shim re-export until M2 |
| `constants.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `database.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `summary.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `compiled_summary.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `cross_protocol.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `object_validator.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `material_validator.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `protocol_validator.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `scene_base_validator.py` | `tools/validators/` | `validation/yaml/` | `git mv` |
| `scene_protocol_validator.py` | `tools/validators/` | `validation/yaml/` | `git mv` |

After M2: `tools/validators/` directory deleted.

### `tools/stepper/` (8 files) -- ALL MOVE to `REPO_ROOT/validation/stepper/`

| File | From | To | Action |
| --- | --- | --- | --- |
| `__init__.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `loader.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `runner.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `state.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `flow.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `scene_ops.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `cross_mini.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `dashboard.py` | `tools/stepper/` | `validation/stepper/` | `git mv` |
| `findings.py` | `tools/stepper/` | `shared_toolkit/findings.py` | absorbed into unified model (M1); shim re-export until M2 |

After M2: `tools/stepper/` directory deleted.

### `tools/*.py` top-level (14 files) -- clean break

Validation scripts MOVE (M2 lifts logic, M4 deletes the `tools/`
file). One-shot tools STAY.

| File | Action | Notes |
| --- | --- | --- |
| `validate_content_yaml.py` | MOVE in M2 (logic to `validation/yaml/`, `tools/validate_content_yaml.py` deleted same patch) | New invocation: `validation/validate.py --only yaml` or `python3 -m validation.yaml` |
| `protocol_stepper.py` | MOVE in M2 (logic to `validation/stepper/`, file deleted same patch) | New invocation: `validation/validate.py --only stepper` or `python3 -m validation.stepper` |
| `check_svg_pipeline.py` | MOVE in M2 (logic to `validation/svg/pipeline_check.py`, file deleted same patch) | New invocation: `python3 -m validation.svg.pipeline_check` |
| `svg_asset_audit.py` | MOVE in M2 (logic to `validation/svg/asset_audit.py`, file deleted same patch) | New invocation: `python3 -m validation.svg.asset_audit` |
| `purge_inline_images.py` | MOVE in M2 (logic to `validation/svg/inline_image_purge.py`, file deleted same patch) | New invocation: `python3 -m validation.svg.inline_image_purge` |
| `analyze_protocol_audit.py` | MOVE in M2 (logic to `validation/yaml/protocol_audit.py`, file deleted same patch) | New invocation: `python3 -m validation.yaml.protocol_audit` |
| `protocol_manual.py` | STAY unchanged | Renderer, not validator. |
| `build_protocol_data.py` | STAY in place | Switches to `shared_toolkit` helpers; CLI unchanged. |
| `build_scene_data.py` | STAY in place | Switches to `shared_toolkit` helpers; CLI unchanged. |
| `generate_svg_globals.py` | STAY unchanged | Codegen, not validator. |
| `normalize_svg.py` | STAY unchanged | Dev tool. |
| `normalize_svg_v2.py` | STAY unchanged | Dev tool. |
| `run_smoke.py` | STAY unchanged | Smoke runner. |
| `run_protocol_walkthrough.py` | STAY unchanged | Smoke runner. |

**M2 move is final and complete -- no wrappers, even temporary.**
`git mv` (or move-and-delete) takes every validation script out of
`tools/` in M2. From M2 onwards users invoke via
`validation/validate.py` or `python3 -m validation.<sub>`. The
byte-identical gate compares old-path output (captured as M1
baseline) against new-path output (captured at M2 exit); same
logic + same flags = same stdout/stderr/exit-code; only the
invocation path changes.

### SVG validator code -- EXTRACTED into `validation/svg/`

| New file | Source |
| --- | --- |
| `validation/svg/__init__.py` | new |
| `validation/svg/pipeline_check.py` | logic from `tools/check_svg_pipeline.py` |
| `validation/svg/asset_audit.py` | logic from `tools/svg_asset_audit.py` |
| `validation/svg/inline_image_purge.py` | logic from `tools/purge_inline_images.py` |

### `tools/*.sh` (3 files) -- STAY unchanged

| File | Action |
| --- | --- |
| `bootstrap_generated.sh` | STAY |
| `build_test_fixture.sh` | STAY |
| `run_ui_review_podman.sh` | STAY |

### Summary counts

| Bucket | Files | Destination |
| --- | --- | --- |
| Move to `shared_toolkit/` | 6 existing + 7 new (`repo_root`, `yaml_io`, `findings`, `discovery`, `cli`, `console`, `emit`) | `REPO_ROOT/shared_toolkit/` |
| Move to `validation/yaml/` | 10 (12 minus `yaml_io.py` lifted to toolkit, minus `findings.py` absorbed) + `protocol_audit.py` from `analyze_protocol_audit.py` | `REPO_ROOT/validation/yaml/` |
| Move to `validation/stepper/` | 8 (9 minus `findings.py` absorbed; no shim re-export file) | `REPO_ROOT/validation/stepper/` |
| Extract to `validation/svg/` | 3 logic files + `__init__.py` | `REPO_ROOT/validation/svg/` |
| New aggregate entry | 1 (`validate.py`) | `REPO_ROOT/validation/` |
| Stay in `tools/` unchanged | 9 (.py + .sh) | `tools/` |
| Stay in `tools/` w/ toolkit refactor | 2 (`build_protocol_data`, `build_scene_data`) | `tools/` |
| Deleted from `tools/` at M2 close (no wrappers) | 6 validation scripts | -- |
| Directory deleted | `tools/validators/`, `tools/stepper/`, `tools/shared_toolkit/` | -- |

## Target layout (M4 exit -- final state)

```
REPO_ROOT/
  validation/
    __init__.py
    __main__.py          # `python3 -m validation` -> validate.py main()
    validate.py          # new (M3, aggregate orchestration entry)
    yaml/                # was tools/validators/
      __init__.py
      __main__.py        # `python3 -m validation.yaml`
      database.py
      constants.py
      cross_protocol.py
      summary.py
      compiled_summary.py
      object_validator.py
      material_validator.py
      protocol_validator.py
      scene_base_validator.py
      scene_protocol_validator.py
      protocol_audit.py  # was tools/analyze_protocol_audit.py logic
    svg/                 # extracted from top-level tools
      __init__.py
      __main__.py        # `python3 -m validation.svg`
      pipeline_check.py  # was tools/check_svg_pipeline.py logic
      asset_audit.py     # was tools/svg_asset_audit.py logic
      inline_image_purge.py  # was tools/purge_inline_images.py logic
    stepper/             # was tools/stepper/
      __init__.py
      __main__.py        # `python3 -m validation.stepper`
      loader.py
      runner.py
      state.py
      flow.py
      scene_ops.py
      cross_mini.py
      dashboard.py
      # NO findings.py here -- imports shared_toolkit.findings directly
  shared_toolkit/        # was tools/shared_toolkit/, expanded
    __init__.py
    repo_root.py         # new (M1)
    yaml_io.py           # new (M1, lifted from validators)
    findings.py          # new (M1, unified Severity + Finding) -- sole findings module
    discovery.py         # new (M1, iter_protocols/scenes/objects, iter_focus)
    cli.py               # new (M3, shared argparse builder)
    console.py           # new (M3, rich Console factory)
    emit.py              # new (M3, text/JSON/NDJSON renderer)
    paths.py             # existing
    protocols.py         # existing
    objects.py           # existing
    interactive.py       # existing
    reporter.py          # existing
  tools/                 # zero validation scripts (M4 clean state)
    protocol_manual.py            # renderer (unchanged)
    build_protocol_data.py        # uses shared_toolkit
    build_scene_data.py           # uses shared_toolkit
    generate_svg_globals.py       # unchanged
    normalize_svg.py              # dev tool (unchanged)
    normalize_svg_v2.py           # dev tool (unchanged)
    run_smoke.py                  # unchanged
    run_protocol_walkthrough.py   # unchanged
    bootstrap_generated.sh        # unchanged
    build_test_fixture.sh         # unchanged
    run_ui_review_podman.sh       # unchanged
```

User-facing invocation (post-M4) -- canonical entry is
`validation/validate.py`:

```bash
# whole suite, overview mode (canonical)
validation/validate.py
# or with bootstrap when PYTHONPATH not yet set
source source_me.sh && validation/validate.py

# focused (short flags shown; long forms also accepted)
validation/validate.py -f                              # --focus
validation/validate.py -p mtt_solubilization_readout   # --protocol
validation/validate.py -o electrophoresis_tank         # --object
validation/validate.py -S hood_workspace               # --scene

# stage-filtered
validation/validate.py -O stepper                      # --only
validation/validate.py -O yaml -f                      # --only yaml --focus

# agent
validation/validate.py -j                              # --json
validation/validate.py -J                              # --ndjson

# per-stage direct invocation (equivalent to --only X)
python3 -m validation.yaml
python3 -m validation.svg.asset_audit
python3 -m validation.stepper
```

Naming-rule audit (no file/folder name collision):

- No `validation.py` exists; only `validation/` package.
- No `shared_toolkit.py` exists; only `shared_toolkit/` package.
- Inside `validation/`: no `yaml.py` next to `yaml/`, no `svg.py`
  next to `svg/`, no `stepper.py` next to `stepper/`.
- Inside `validation/yaml/`: existing `yaml_io.py` filename does
  not collide with the `yaml/` subpackage name (different
  directory level).
- Inside `validation/svg/`: `pipeline_check.py`, `asset_audit.py`,
  `inline_image_purge.py` -- no `svg.py` sibling.
- `validation/stepper/` package has no collision with anything
  in `tools/` (no `stepper.py` exists in `tools/` after M2).

Enforced by a new test `tests/test_no_file_folder_name_collision.py`
landed in M1.

## Non-goals

- No behavior change in validator check rules. Same checks, same
  finding text, same severity.
- No user-visible CLI change in M1+M2 (preserved byte-identical).
- M3 may rename flags but ships backward-compat aliases.
- No glob/regex/tag/profile selection. Out of scope until repo
  size forces it.
- No TypeScript or scene-runtime changes.
- No SVG asset edits.
- No content YAML edits.
- No new validation checks. Adding `display_color` etc. stays on
  their own plans.
- `protocol_manual.py` exempt from CLI parity (renderer, not
  validator).
- `normalize_svg{,_v2}.py`, `generate_svg_globals.py`,
  `run_smoke.py`, `run_protocol_walkthrough.py` exempt from CLI
  parity (dev / smoke tools).

## Current state summary

| Layer | File count | LOC | Status |
| --- | --- | --- | --- |
| `tools/*.py` top-level | 14 | ~8500 | mixed validator + one-shot |
| `tools/validators/` | 12 | ~2500 | YAML-only |
| `tools/stepper/` | 8 | ~2700 | parallel `Finding` model |
| `tools/shared_toolkit/` | 5 | ~225 | undersized |

Duplication inventory (from audit):

- 4 REPO_ROOT discovery sites
- 4 inline YAML loaders
- 2 protocol-discovery walks
- 2 `Severity`/`Level` enums
- 3 output-format dialects
- 7 incompatible argparse surfaces

## UX design spec (M3 overview + M4 agent)

Design boundaries:

- Preserve per-domain selection naming -- protocols use
  `-p/--protocol`, objects/assets use `-o/--object` or `--asset`.
  Shared concepts (`--list`, `--interactive`, `-q/-v`, `--format`,
  `--strict`) standardize; selection names stay domain-clear.
- Backward-compatible flag aliases for any rename.
- No flip of `check_svg_pipeline.py` exit codes without explicit
  user sign-off + downstream CI grep landed in M3 spec patch.

### Overview mode (M3 -- humans)

Suite runs in <10s. Optimize for cognition, not throughput.

**Default (tty stdout)**:

- One-screen `rich` summary. Per-stage status row + timing total.

- One-screen `rich` summary. Per-stage status row + timing total.
- Color tag at left rail only; rest plain text (CI/logs friendly).
- Errors always shown grouped by tool. Warnings collapsed unless
  `-v`.
- Exit code printed last line so `tail -1` / pipe consumers work.
- Failures grouped by tool, not by file (humans scan tool -> fail).
- No per-stage timing (noise); single total at top.

Layout sketch:

```
validation suite          12.4s
=================================
yaml          168 files   PASS
svg pipeline   77 assets  PASS
svg audit      77 objects PASS  3 warnings
stepper        31 minis   FAIL  2 errors

errors
  cell_culture_full      ambiguous_target_in_scene  micropipette
  mtt_solubilization     unknown_target_active_scene  plate_a3

warnings (svg audit, -v for detail)
  3x orphan_svg

exit 1
```

### Agent mode (M4 -- `--format json` / `--format ndjson`)

- `--format json` emits one document per invocation; flat closed
  schema with `extras` for tool-specific fields.
- `--format ndjson` emits one finding per line + a final
  `{"summary": true, ...}` record; agents parse incrementally.
- `jq` composability beats nesting; flat `findings[]` array.
- Overview dashboard suppressed under `--format json|ndjson`.

**Selection -- three layers**:

| Layer | Flag | Use case |
| --- | --- | --- |
| everything | none | CI gate, "is repo green" |
| focused | `--protocol NAME` / `--object NAME` / `--scene NAME` | author working on one mini |
| changed | `--focus` (git-aware) | mid-edit feedback loop |

`--focus`: derive scope from
`git diff --name-only HEAD` + `--cached` + untracked-modified.
Map touched paths -> affected protocols/objects/scenes via
`shared_toolkit/discovery.py`. Run only their checks. Cheap to
invoke after every edit. Optional variant: `--changed-since main`.

**Auto-focus** (optional sugar): invoked from
`content/protocols/<name>/`, default scope = that protocol;
override via `--all`.

**Aggregate entry point**: `validation/validate.py`. Naming
the surface "content" matches what the suite actually checks
(YAML + SVG content) and combines with any scope selector without
contradiction. `validate_all` rejected -- pairing it with
`--protocol X` reads as a contradiction.

```
validate_content                       # whole suite, glance (default)
validate_content --changed             # git-scoped, glance
validate_content --protocol X          # one mini, glance
validate_content --object Y            # one object, glance
validate_content --scene Z             # one scene, glance
validate_content --format json         # whole suite, agent
validate_content --only yaml           # skip svg+stepper
validate_content --only stepper -p X   # one mini, stepper only
```

Scope selectors mutually exclusive: `--focus`, `--protocol`,
`--object`, `--scene`. No selector = whole suite.

`--only {yaml,svg,stepper}` (repeatable) skips stages during
focused work. Default = run every stage.

Per-tool scripts stay: `tools/protocol_stepper.py` etc. continue
working as `validate_content --only stepper` under the hood.
Same backend, same JSON, either surface.

**Exit codes (agent-friendly)**:

- `0` clean
- `1` ERROR findings present
- `2` usage error
- WARNING never fails default; `--strict` flips. Agents check
  `summary.errors > 0` from JSON, not exit code, for nuance.

**Three-mode UX synthesis**:

| Mode | Audience | Trigger | Output |
| --- | --- | --- | --- |
| **overview** | human, 95% of runs | default (no flag) | one-screen rich summary, errors first, warnings collapsed |
| **focused** | author mid-edit | `--focus` / `--protocol` / `--object` / `--scene` | same summary, scoped subset |
| **agent** | tool consumers | `--format json` / `--format ndjson` | flat, append-only, one finding per record |

`--focus` is the killer feature, not JSON. Suite already runs
fast enough that humans run it constantly; making it run on the
right subset of files matters more than making it faster.

**JSON shape (flat, agent-grepable, no nesting)**:

```json
{"severity": "ERROR", "tool": "stepper", "protocol": "sdspage_full", "code": "ambiguous_target_active_scene", "message": "...", "path": "...", "line": 82}
```

NDJSON variant emits one such record per line; agents `jq`-filter
without parsing a whole document. Aggregate summary emitted as a
final separate record:

```json
{"summary": true, "tool": "validate_content", "errors": 2, "warnings": 3, "files_checked": 168, "elapsed_seconds": 7.8, "exit_code": 1}
```

Avoid nested-tool dashboards (`{"tools": {"stepper": {"results": ...}}}`).
Agents want streams.

**Selection model (ratified)**:

| Scope | UX |
| --- | --- |
| everything | no args |
| focused | `-p/--protocol`, `-o/--object`, `--scene` |
| active work | `--focus` |

Out of scope (do not design until repo size forces it): glob,
regex, tags, profiles, pipelines.

**Per-domain selection names (do NOT collapse)**:

- `-p/--protocol`
- `-o/--object`
- `--scene`
- `--asset`

Shared semantics (DO collapse): `--focus`, `--format`, `-q/-v`,
`--strict`, `--only`, `--no-color`, `--list`, `--interactive`.

**Milestone priority order** (ratified):

1. `validation/validate.py` orchestration layer -- single
   entry, changes workflow most.
2. `--focus` git-scoping -- daily-loop multiplier.
3. JSON output -- unlocks agents.
4. Unified `Finding` model -- shared backend (already in M1+M2).
5. CLI parity polish (flag names, exit codes, aliases).
6. `rich` rendering polish.

Order matters: orchestration + `--focus` + JSON are workflow
changes. Parity + rich are aesthetics. Ship the workflow wins
first.

## Architecture boundaries and ownership

| Boundary | Owner | Touch rule |
| --- | --- | --- |
| `REPO_ROOT/shared_toolkit/` | toolkit author | Lift from `tools/shared_toolkit/`; add `repo_root.py`, `yaml_io.py`, `findings.py`, `discovery.py`; no domain logic |
| `REPO_ROOT/validation/` package | validator author | YAML + SVG + stepper; consumes `shared_toolkit` only |
| Stepper relocation | stepper author | `git mv tools/stepper validation/stepper`; output text unchanged |
| `tools/` top-level scripts | tool author | Wrappers around `validation/*`; CLI surface unchanged. `build_*`, `analyze_*` switch to toolkit helpers |
| Naming-rule test | toolkit author | `tests/test_no_file_folder_name_collision.py` enforces no `foo.py` next to `foo/` |
| Documentation | maintainer | `docs/FILE_STRUCTURE.md`, `docs/CHANGELOG.md` |

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-TOOLKIT-LIFT | `git mv tools/shared_toolkit REPO_ROOT/shared_toolkit`; update every importer | 1 |
| M1 / WS-TOOLKIT-HELPERS | add `shared_toolkit/{repo_root,yaml_io,findings,discovery}.py` | 1 |
| M1 / WS-CALLERS | switch `build_*`, `analyze_*`, `check_svg_pipeline`, `svg_asset_audit` to toolkit helpers | 1 to 2 |
| M1 / WS-NAMING-TEST | `tests/test_no_file_folder_name_collision.py` enforces naming rule | 1 |
| M2 / WS-PACKAGE | create `REPO_ROOT/validation/`; `git mv tools/validators validation/yaml`; `git mv tools/stepper validation/stepper` | 1 |
| M2 / WS-SVG-LIFT | extract SVG validation logic from `tools/check_svg_pipeline.py`, `tools/svg_asset_audit.py`, `tools/purge_inline_images.py` into `validation/svg/`; delete top-level files (`git rm`) -- no wrappers | 1 to 2 |
| M2 / WS-TOPLEVEL-DELETE | delete `tools/validate_content_yaml.py`, `tools/protocol_stepper.py`, `tools/analyze_protocol_audit.py` after content moved (`git mv` or move+rm); add `validation/{,yaml,svg,stepper}/__main__.py` so `python3 -m validation.<sub>` works | 1 |
| M2 / WS-FINDINGS | unify `validators.Severity` + `stepper.Level` on `shared_toolkit.findings`; `validation/stepper/` imports `shared_toolkit.findings` directly (no local `findings.py`); output text byte-identical | 1 |
| M2 / WS-FILE-STRUCTURE | `docs/FILE_STRUCTURE.md` refresh | 1 |
| M3 / WS-TOOLKIT-CLI | `shared_toolkit/cli.py` (argparse builder) + `shared_toolkit/console.py` (rich Console factory) + `shared_toolkit/emit.py` (text/JSON/NDJSON renderer) | 1 |
| M3 / WS-ENTRY | `validation/validate.py` aggregate entry; overview-mode rich summary | 1 |
| M3 / WS-FOCUS | `shared_toolkit/discovery.py` git-scoping; `--focus` selector | 1 |
| M3 / WS-CLI-ADOPT | every validation CLI adopts unified flag set + exit codes 0/1/2; backward-compat aliases | 2 to 3 |
| M3 / WS-SCHEMA | JSON schema spec + `tests/test_validation_json_schema.py` snapshot test | 1 |
| M3 / WS-USAGE-DOCS | `docs/USAGE.md` flag table + overview + agent examples + schema reference | 1 |
| M4 / WS-CLEANUP | delete deprecated flag aliases; drop `check_svg_pipeline` legacy exit codes; verify no lingering shims | 1 |
| M4 / WS-CLOSE | `docs/FILE_STRUCTURE.md` final pass; changelog close entry; archive plan | 1 |

## Milestone plan

### Milestone M1: lift shared_toolkit, grow helpers, retire duplication

- Depends on: none.
- Workstreams: WS-TOOLKIT-LIFT, WS-TOOLKIT-HELPERS, WS-CALLERS,
  WS-NAMING-TEST.
- Entry: audit landed.
- Exit:
  - `git mv tools/shared_toolkit REPO_ROOT/shared_toolkit` done;
    every importer updated from `tools.shared_toolkit` to
    `shared_toolkit`.
  - `shared_toolkit/repo_root.py` exports `REPO_ROOT` derived once
    (no subprocess in callers).
  - `shared_toolkit/yaml_io.py` exports `load_yaml(path)` (lifted
    from `tools/validators/yaml_io.py`; validators import from
    toolkit).
  - `shared_toolkit/findings.py` defines `Severity` enum +
    `Finding` dataclass. `tools.validators.findings` and
    `tools.stepper.findings` re-export from toolkit (transitional
    shim, deleted in M2).
  - `shared_toolkit/discovery.py` exports `iter_protocols()`,
    `iter_scenes()`, `iter_objects()` walking `content/`.
  - `tests/test_no_file_folder_name_collision.py` lands; passes
    against current tree.
  - All four REPO_ROOT reimplementations gone. All four inline
    YAML loaders gone. Verified by grep.
  - Validator + stepper exit codes unchanged.
  - `source_me.sh` PYTHONPATH covers `REPO_ROOT` (already does;
    verify).
  - **Obvious follow-ons**: update imports in each caller, rerun
    `pyflakes tools/ shared_toolkit/` and `pytest tests/`, add
    CHANGELOG line.
- Parallel-plan ready: yes -- max parallel doers 3 (LIFT must
  precede HELPERS+CALLERS; HELPERS, CALLERS, NAMING-TEST then
  concurrent).

### Milestone M2: lift validation/, unify Finding model

- Depends on: M1.
- Workstreams: WS-PACKAGE, WS-SVG-LIFT, WS-FINDINGS,
  WS-FILE-STRUCTURE.
- Entry: M1 exit met.
- Exit:
  - `REPO_ROOT/validation/__init__.py` exists.
  - `git mv tools/validators/*.py validation/yaml/`.
  - `git mv tools/stepper/*.py validation/stepper/`.
  - `validation/svg/` houses `pipeline_check.py`, `asset_audit.py`,
    `inline_image_purge.py` (logic extracted from corresponding
    `tools/*.py` scripts).
  - `validators.findings` + `stepper.findings` shims removed; all
    callers import `shared_toolkit.findings`.
  - Top-level `tools/check_svg_pipeline.py`,
    `tools/svg_asset_audit.py`, `tools/purge_inline_images.py`,
    `tools/protocol_stepper.py`, `tools/validate_content_yaml.py`,
    `tools/analyze_protocol_audit.py` DELETED in same M2 patch
    cluster (no wrappers, even temporary). M1 baseline output
    matched against new-invocation-path output captured at M2
    exit; argparse surface + exit codes preserved verbatim in
    the relocated module's main().
  - `tests/test_no_file_folder_name_collision.py` still passes
    against the new layout.
  - Stepper still passes 31/31 protocols, same finding counts.
    Validator still 0 fail on 168 files, same finding counts.
  - `docs/FILE_STRUCTURE.md` reflects `REPO_ROOT/validation/` +
    `REPO_ROOT/shared_toolkit/` + slimmed `tools/`.
  - **Obvious follow-ons**: rerun stepper + validator + pytest,
    snapshot-diff outputs, update import comments, append
    CHANGELOG line.
- Parallel-plan ready: yes -- max parallel doers 4 (WS-PACKAGE,
  WS-SVG-LIFT, WS-FINDINGS, WS-FILE-STRUCTURE concurrent).

### Milestone M3: unified UX (humans + agents in one milestone)

- Depends on: M2 (need lifted `validation/` package + unified
  `Finding` model).
- Workstreams: WS-TOOLKIT-CLI, WS-ENTRY, WS-FOCUS, WS-CLI-ADOPT,
  WS-SCHEMA, WS-USAGE-DOCS.
- Entry: M2 exit met; M2 snapshot diffs empty.
- Exit:
  - `shared_toolkit/cli.py` exposes `build_parser(extras=...)`
    returning argparse parser pre-loaded with the ratified flag
    set (see `## Final argparse table`). Tool-specific flags
    appended via `extras` callback.
  - `shared_toolkit/console.py` exposes
    `make_console(no_color: bool)` -- single `rich` `Console`
    honoring `NO_COLOR` env + `--no-color` flag.
  - `shared_toolkit/emit.py` exposes
    `emit_findings(findings, fmt, console)` rendering text
    (rich overview), JSON (flat closed document), or NDJSON
    (one record per line + final summary record).
  - `shared_toolkit/discovery.py` gains `iter_focus()` returning
    protocols/objects/scenes touched by
    `git diff --name-only HEAD` + `--cached` + untracked-modified.
  - `validation/validate.py` aggregate entry runs every stage,
    emits overview rich summary, supports the full ratified flag
    set.
  - Every validation CLI adopts the ratified flag set (see
    table); exit codes 0/1/2 uniform; per-domain selection names
    preserved; backward-compat aliases (deprecated in `--help`)
    for any renamed flag.
  - `check_svg_pipeline.py` exit codes 2/3 -> 1 (detail moves to
    finding `code`); legacy codes still emitted in deprecated
    form for M3, removed in M4.
  - JSON schema closed, versioned; `extras` for tool-specific
    fields; `tests/test_validation_json_schema.py` snapshot-test
    green.
  - `docs/USAGE.md` overview + agent examples + schema reference
    landed.
  - **Obvious follow-ons**: regenerate `--help` snapshots; rerun
    `validate_content`, `--json`, `--ndjson` smoke; pytest green;
    append CHANGELOG line.
- Parallel-plan ready: yes -- max parallel doers 5
  (WS-TOOLKIT-CLI lands first; then WS-ENTRY, WS-FOCUS,
  WS-CLI-ADOPT, WS-SCHEMA, WS-USAGE-DOCS concurrent).

### Milestone M4: cleanup + close

- Depends on: M3 (must run after every consumer adopts new
  surface).
- Workstreams: WS-CLEANUP, WS-CLOSE.
- Entry: M3 exit met; one cycle elapsed since deprecation
  warnings landed in M3.
- Exit:
  - Any transitional helpers still in `validation/yaml/__init__.py`
    or `validation/stepper/__init__.py` pointing at
    `shared_toolkit.findings` removed (post-M2 there should be
    none; M4 verifies grep clean).
  - Deprecated flag aliases removed from argparse + `--help`.
  - Stepper exit codes from `check_svg_pipeline` finalized at
    0/1/2; legacy 2/3 deprecation code path deleted.
  - `docs/FILE_STRUCTURE.md` final pass.
  - `docs/CHANGELOG.md` close entry.
  - Plan archived (`git mv docs/active_plans/tools_split_and_consolidate.md
    docs/archive/`).
  - **Obvious follow-ons**: pytest green; smoke
    `validation/validate.py`; append final CHANGELOG line.
- Parallel-plan ready: no -- final sequential cleanup.

## Final argparse table (M3 ratified)

Designed per `docs/PYTHON_STYLE.md` argparse minimalism: every
flag must be one users change between runs. Toolkit-internal
constants (timeouts, buffer sizes, retry counts, color theme,
truecolor toggle, table widths) are hardcoded, not exposed.

**Shared flags (every validation CLI; from
`shared_toolkit/cli.build_parser()`).** Short flag provided for
every flag where conflict-free; capital letters used when the
lowercase is already taken (e.g., `-S` for `--scene` because
`-s` is `--strict`).

| Long | Short | Dest | Type | Default | Notes |
| --- | --- | --- | --- | --- | --- |
| `--focus` | `-f` | `focus` | `store_true` | `False` | Run on protocols/objects/scenes touched by `git diff HEAD` + `--cached` + untracked-modified, plus transitive dependents (unchanged protocols that reference a changed object/scene). Mutually exclusive with other selectors. |
| `--protocol` | `-p` | `protocols` | `nargs='+'` | `None` | One or more protocol names. |
| `--object` | `-o` | `objects` | `nargs='+'` | `None` | One or more object names. Alias `--asset` / `-A`. |
| `--scene` | `-S` | `scenes` | `nargs='+'` | `None` | One or more scene names. |
| `--list` | `-l` | `list_only` | `store_true` | `False` | List selectable entities for the tool's primary scope and exit (protocols / objects / assets per tool). |
| `--interactive` | `-i` | `interactive` | `store_true` | `False` | Numbered picker; falls back to `None` when stdin not a tty. |
| `--quiet` | `-q` | `quiet` | `store_true` | `False` | Findings + summary only; suppress per-stage rows. |
| `--verbose` | `-v` | `verbose` | `store_true` | `False` | Per-item state + inline warnings. Mutually exclusive with `--quiet`. |
| `--errors-only` | `-e` | `errors_only` | `store_true` | `False` | Suppress WARNINGs from output (does not change exit code unless `--strict`). |
| `--strict` | `-s` | `strict` | `store_true` | `False` | Exit non-zero on WARNING in addition to ERROR. |
| `--no-color` | -- | `no_color` | `store_true` | `False` | No short flag (avoid clash; rarely used interactively). Also honors `NO_COLOR` env. |
| `--json` | `-j` | `output_format` | `store_const(json)` | `text` | Emit unified JSON document. |
| `--ndjson` | `-J` | `output_format` | `store_const(ndjson)` | `text` | Stream one finding per line + final summary. Mutually exclusive with `--json`. |
| `--only` | `-O` | `stages` | `nargs='+'` choices `{yaml,svg,stepper}` | every stage | Stage filter (aggregate entry only; per-stage `python3 -m validation.<sub>` ignores). |

Short-flag map summary: `-f -p -o -S -l -i -q -v -e -s -j -J -O`,
plus alias `-A` for `--asset`. Capitals reserved for collisions
(`-S` scene, `-J` ndjson, `-O` only, `-A` asset).

**Mutually exclusive groups:**

- Selection: `--focus` xor (`--protocol` and/or `--object` and/or
  `--scene` combined). No selector = whole suite.
- Verbosity: `-q` xor `-v`.
- Format: `--json` xor `--ndjson` (omit both = `text`).

**Deliberately omitted (per PYTHON_STYLE.md minimalism):**

- No `--format {text,json,ndjson}` choice flag -- two store_const
  flags (`--json`, `--ndjson`) are shorter to type and read.
- No `--changed-since REF` -- single git-diff scope is enough;
  add later only if users ask.
- No `--auto-focus` cwd sugar -- explicit `--focus` is clearer.
- No `--list-protocols` / `--list-objects` -- one `--list` keyed
  off the per-tool domain.
- No `--timeout`, `--retry`, `--no-progress`, `--width`, theme
  toggles -- internal constants.
- No `--all` -- "no selector" already means everything.

**Exit codes (uniform):**

- `0` clean.
- `1` ERROR findings present (or WARNING under `--strict`).
- `2` usage error (argparse fault, missing input).

**Per-tool extensions** (added via `extras` callback to
`build_parser`, must NOT rename shared flags):

| Tool | Extras |
| --- | --- |
| `validate_content.py` | `--only` (shared above) |
| `validate_content_yaml.py` | none |
| `protocol_stepper.py` | none |
| `check_svg_pipeline.py` | none |
| `svg_asset_audit.py` | none beyond `-o/--object` |
| `analyze_protocol_audit.py` | none beyond `-p/--protocol` |
| `purge_inline_images.py` | `--dry-run` (read-only confirmation; fixer tool only) |

**Backward-compat aliases retained through M3, removed in M4:**

| Old | New | Tool |
| --- | --- | --- |
| `--list-protocols` | `--list` | validate_content_yaml, protocol_stepper, analyze_protocol_audit |
| `--list-objects` | `--list` | svg_asset_audit |
| `--format json` (svg_asset_audit existing) | `--json` | svg_asset_audit |
| `--format table` (svg_asset_audit existing) | default (text) | svg_asset_audit |

## Acceptance criteria and gates

- **Repo-wide gates (every patch, every milestone):**
  - `pytest tests/test_pyflakes_code_lint.py` green
  - `pytest tests/test_markdown_links.py` green for files this
    patch touched (any pre-existing failures in unrelated files
    -- e.g., archived CHANGELOGs, other-manager docs -- are
    out of scope; baseline failure count must not increase)
  - `pytest tests/test_no_file_folder_name_collision.py` green
- Per-patch: `pyflakes tools/ shared_toolkit/ validation/ pipeline/ salvage/` clean,
  `pytest tests/` green.
- M1/M2 per-patch: `validate_content_yaml.py` + `protocol_stepper.py`
  + `svg_asset_audit.py` stdout byte-identical to pre-plan baseline.
- M2 integration: snapshot diffs empty. No REPO_ROOT
  reimplementations remain. No parallel `Severity` enums remain.
  Every preserved CLI entry-point reports identical `--help` text
  and exit codes as the pre-plan baseline.
- M3 integration: every validation CLI accepts the ratified flag
  set; `--json` validates against
  `tests/test_validation_json_schema.py`; `--ndjson` emits
  per-line records ending in a `summary` record; `NO_COLOR=1`
  honored; backward-compat aliases work + warn on deprecation.
- M4 integration: shims gone, deprecated aliases gone, legacy
  exit codes gone; pyflakes clean; pytest green; smoke
  `validate_content` exits 0; plan archived.

## Test and verification strategy

Snapshot baseline before starting M1 (old invocation paths):

```bash
source source_me.sh
python3 tools/validate_content_yaml.py > /tmp/baseline_validate.txt 2>&1
python3 tools/protocol_stepper.py     > /tmp/baseline_stepper.txt 2>&1
python3 tools/svg_asset_audit.py      > /tmp/baseline_svg_audit.txt 2>&1
python3 tools/check_svg_pipeline.py   > /tmp/baseline_check_svg.txt 2>&1; echo "exit=$?"
```

Per-patch verification during M1 (paths unchanged):

```bash
python3 tools/validate_content_yaml.py | diff - /tmp/baseline_validate.txt   # empty
python3 tools/protocol_stepper.py     | diff - /tmp/baseline_stepper.txt     # empty
python3 tools/svg_asset_audit.py      | diff - /tmp/baseline_svg_audit.txt   # empty
pytest tests/                                                                 # green
pyflakes tools/ shared_toolkit/                                               # clean
```

Per-patch verification during M2 (paths CHANGED -- old files gone):

```bash
python3 -m validation.yaml      | diff - /tmp/baseline_validate.txt   # empty
python3 -m validation.stepper   | diff - /tmp/baseline_stepper.txt    # empty
python3 -m validation.svg.asset_audit    | diff - /tmp/baseline_svg_audit.txt   # empty
python3 -m validation.svg.pipeline_check | diff - /tmp/baseline_check_svg.txt   # empty
pytest tests/                                                                    # green
pyflakes tools/ shared_toolkit/ validation/                                      # clean
ls tools/validate_content_yaml.py tools/protocol_stepper.py \
   tools/check_svg_pipeline.py tools/svg_asset_audit.py \
   tools/analyze_protocol_audit.py tools/purge_inline_images.py 2>&1 | grep -c "No such"  # 6 (all gone)
git ls-files | grep "^tools/.*\\.py$" | xargs grep -l "git rev-parse"     # empty
git ls-files | grep -E "(class Severity|class Level)" | grep -v shared_toolkit/findings.py  # empty
python3 tests/test_no_file_folder_name_collision.py            # passes
```

## Migration and compatibility policy

- M1 ships transitional re-export shims in
  `tools/validators/findings.py` and `tools/stepper/findings.py`
  so callers keep working mid-flight.
- M2 deletes those shims; packages move to `validation/` and
  import `shared_toolkit.findings` directly.
- M2 also deletes every validation script from `tools/`. Clean
  break: no wrappers, no compatibility imports. Users update
  invocation paths from `tools/foo.py` to
  `python3 -m validation.foo` or `validation/validate.py`.
- M3 introduces the new CLI flag set with backward-compat aliases
  for renamed flags; old flag names accepted with deprecation
  warning in `--help`.
- M4 removes deprecated aliases + `check_svg_pipeline` legacy
  exit codes 2/3.
- "Byte-identical" baseline (M1+M2 gate) compares M1-captured
  output under old paths against M2-exit output under new paths.
  Same content, same exit code; only invocation changes.
- No backward compatibility for internal helpers (REPO_ROOT,
  load_yaml) -- internal-only, callers are in-repo.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| Stepper Finding model shift breaks emitter output text | high | stepper output text differs from baseline | stepper author | Snapshot pre-M1, diff per patch; adjust formatter, not check logic |
| `git mv` of `validators/` collides with other-manager branch | medium | parallel branch touches `tools/validators/` | maintainer | Coordinate; do WS-PACKAGE in one patch, fast |
| SVG-lift introduces silent SVG behavior drift | medium | check_svg_pipeline / svg_asset_audit output differs | validator author | Snapshot pre-M1; diff every patch |
| External script / doc still calls `python3 tools/validate_content_yaml.py` after M2 delete | medium | broken external invocation | maintainer | Grep `docs/`, `tests/`, `OTHER_REPOS/`, `salvage/`, `servier/`, root `.sh` files before M2 patch lands; update or warn |
| Scope creep -- CLI work bleeds into M1+M2 | high | patch touches argparse semantics during structural milestones | manager | M1+M2 = byte-identical baseline diff; reject CLI changes until M3 entry |
| JSON schema churn after M3 | medium | schema_version bumps mid-plan | toolkit author | Freeze schema in WS-SCHEMA spec patch; bump only via documented RFC |
| Deprecated alias removed before consumers migrate | medium | M4 lands while external docs still cite old flag | maintainer | Grep `docs/`, `tests/`, `OTHER_REPOS/` before M4; sweep references |
| `rich` truecolor breaks CI log aggregators | low | log aggregator garbles ANSI | toolkit author | `NO_COLOR` env + `--no-color` honored; CI sets `NO_COLOR=1` |
| Import path churn after `shared_toolkit/` + `validation/` lift breaks unrelated callers | high | `tools.shared_toolkit` import still used somewhere | toolkit author | Grep full repo (`tools/`, `tests/`, `src/`, `devel/`, `salvage/`, `servier/`, root `.py`) before Patch 1 lands; sweep every hit in same patch |
| `source_me.sh` PYTHONPATH does not cover new top-level packages | medium | `import validation` fails at runtime | maintainer | Verify in Patch 1; extend if needed |
| File/folder name collision sneaks back later | low | future coder adds `validation.py` next to `validation/` | toolkit author | `tests/test_no_file_folder_name_collision.py` runs in pytest suite |

## Rollout and release checklist

- [ ] Baseline snapshots captured before M1.
- [ ] M1 exit met (shared_toolkit lifted + helpers, duplications retired, naming-test green).
- [ ] M2 exit met (`validation/` package, findings unified, every validation script deleted from `tools/` -- clean break, no wrappers).
- [ ] M3 exit met (unified CLI flag set, `--focus`, `--json`, `--ndjson`, JSON schema test green, USAGE.md landed).
- [ ] M4 exit met (shims gone, aliases gone, legacy exit codes gone, plan archived).
- [ ] Stepper + validator + svg_asset_audit stdout byte-identical pre/post M1+M2.
- [ ] No file under `src/` touched.
- [ ] No new validation check added under cover of this plan.

## Documentation close-out requirements

- `docs/active_plans/tools_split_and_consolidate.md` archived on
  M4 close.
- `docs/FILE_STRUCTURE.md` updated in M2 (interim) and M4 (final).
- `docs/USAGE.md` flag table + overview + agent examples + schema
  reference landed in M3.
- `docs/CHANGELOG.md`: one entry per milestone close.

## Patch plan and reporting format

M1:
- Patch 1: WS-TOOLKIT-LIFT -- `git mv tools/shared_toolkit
  REPO_ROOT/shared_toolkit`; rewrite imports across repo.
- Patch 2: WS-TOOLKIT-HELPERS -- grow `shared_toolkit/`
  (`repo_root.py`, `yaml_io.py`, `findings.py`, `discovery.py`).
- Patch 3: WS-CALLERS -- switch `build_*`, `analyze_*`, SVG
  scripts to toolkit helpers.
- Patch 4: WS-NAMING-TEST --
  `tests/test_no_file_folder_name_collision.py`.

M2:
- Patch 5: WS-PACKAGE -- `git mv tools/validators validation/yaml`;
  `git mv tools/stepper validation/stepper`; add
  `validation/__init__.py`, `validation/__main__.py`,
  per-subpackage `__main__.py`.
- Patch 6: WS-SVG-LIFT -- create `validation/svg/` with extracted
  logic; `git rm` `tools/check_svg_pipeline.py`,
  `tools/svg_asset_audit.py`, `tools/purge_inline_images.py`.
- Patch 7: WS-TOPLEVEL-DELETE -- `git rm`
  `tools/validate_content_yaml.py`, `tools/protocol_stepper.py`,
  `tools/analyze_protocol_audit.py` (content already moved to
  `validation/`); verify byte-identical via new paths.
- Patch 8: WS-FINDINGS -- collapse `Severity`/`Level` on toolkit;
  `validation/stepper/` imports `shared_toolkit.findings`
  directly (no local re-export); output text byte-identical.
- Patch 9: WS-FILE-STRUCTURE -- `docs/FILE_STRUCTURE.md` interim
  pass + CHANGELOG entry.

M3:
- Patch 10: WS-TOOLKIT-CLI -- `shared_toolkit/{cli,console,emit}.py`
  + ratified flag spec.
- Patch 11: WS-ENTRY + WS-FOCUS -- `validation/validate.py`
  aggregate entry + `shared_toolkit/discovery.iter_focus()`.
- Patch 12: WS-CLI-ADOPT (YAML side) -- `validation/yaml/` +
  `validation/stepper/` adopt unified flag set; backward-compat
  aliases for old flag names.
- Patch 13: WS-CLI-ADOPT (SVG side) -- `validation/svg/*` adopt;
  exit-code migration for `pipeline_check`; backward-compat
  aliases.
- Patch 14: WS-SCHEMA -- JSON schema spec +
  `tests/test_validation_json_schema.py`.
- Patch 15: WS-USAGE-DOCS -- `docs/USAGE.md` flag table +
  overview + agent examples + schema reference.

M4:
- Patch 16: WS-CLEANUP -- delete deprecated flag aliases,
  legacy exit codes; verify no lingering shims.
- Patch 17: WS-CLOSE -- final `docs/FILE_STRUCTURE.md`,
  `docs/CHANGELOG.md` close, `git mv` plan to `docs/archive/`.

Sizing: each patch right-sized for one coder. Total: 17 patches.

## Open questions and decisions needed

(None. All resolved -- see `## Resolved decisions`.)

## Resolved decisions

- Plan kept single-piece M1->M4 (user direction 2026-05-16).
  UX-is-architecture: CLI normalization stays in scope because
  the inconsistent surface IS the design problem. Deferring
  would violate long-term-over-short-term and finish-the-obvious.
- Validation lifts to `REPO_ROOT/validation/` (user direction
  2026-05-16). NOT `tools/validation/`. `tools/` retains only
  one-shot scripts. No validation entry points in `tools/`.
- `shared_toolkit/` also lifts to `REPO_ROOT/shared_toolkit/`
  since both `validation/` and `tools/` consume it.
- Stepper moves into `validation/stepper/` (it is a validator).
- No filename and folder may share a name within any directory.
  Enforced by `tests/test_no_file_folder_name_collision.py`.
- `validation/` chosen over `content_validation/` (shorter name).
- Stepper stays its own package; only imports unified `Finding`
  model from `shared_toolkit`. Stepper output text unchanged.
- One-shot tools (`build_*`, `protocol_manual`, `protocol_stepper`,
  `run_*`) stay at `tools/` top level.
- Stepper `Finding` + validator `Severity` collapse to single
  `shared_toolkit.findings` definition.
- Every NON-validation top-level script keeps its filename
  through M4 (build_*, normalize_*, protocol_manual, run_*,
  .sh). Every validation script DELETED from `tools/` in M2.
  Clean break, no wrappers. Users invoke validation via
  `validation/validate.py` or `python3 -m validation.<sub>`.
- Argparse surface byte-identical through M2 (just new path);
  evolves under controlled deprecation through M3; cleaned in
  M4.
- `protocol_manual.py` exempt from CLI parity (renderer, not
  validator). Stays unchanged.
- `normalize_svg.py` + `normalize_svg_v2.py` stay top-level as
  dev tools; exempt from CLI parity.
- Per-domain selection naming preserved: `-p/--protocol`,
  `-o/--object` / `--asset`, `--scene`.
- Aggregate entry name: `validation/validate.py` (not
  `validate_all`; "all" reads as contradictory with selectors).
- Canonical invocation: `validation/validate.py` (user
  preference 2026-05-16). `python3 -m validation.<sub>` is
  secondary for per-stage runs. Use
  `source source_me.sh && validation/validate.py` when
  PYTHONPATH bootstrap is needed.
- `--focus` git-diff base: `HEAD` + `--cached` + untracked-
  modified (default; user resolved 2026-05-16).
- `--focus` transitive scope: yes -- if a changed object or
  scene is referenced by unchanged protocols, include those
  dependent protocols. Transitive behavior is the point of
  `--focus`. Implemented via `shared_toolkit/discovery.py`
  reverse-reference map (user resolved 2026-05-16).
- `svg_asset_audit` JSON schema break accepted (user resolved
  2026-05-16). M3 emits unified flat `findings[]`. Legacy rich
  dump preserved under `extras.svg_asset_audit` for one cycle
  (M3 only), removed in M4.
- Format flags: `--json` / `--ndjson` (not `--format {text,json,ndjson}`)
  -- shorter to type per PYTHON_STYLE argparse minimalism.
- `check_svg_pipeline.py` exit codes: 0/2/3 collapses to 0/1/2
  in M3 with deprecation warning; legacy codes removed in M4.
- Argparse minimalism enforced per PYTHON_STYLE: no
  `--timeout`, `--retry`, `--width`, theme toggles, or
  `--no-progress` -- toolkit-internal constants.
