# Mirror content/objects/ filesystem to the ratified kind enum

## Context

`content/objects/` holds 77 flat YAML files. Discovery degrades as the
catalog grows. Every object already declares a required `kind` field whose
value comes from the closed enum ratified in
[docs/specs/OBJECT_VOCABULARY.md](../specs/OBJECT_VOCABULARY.md):
`plate`, `bottle`, `flask`, `pipette`, `rack`, `waste`, `equipment`,
`decoration`. The systematic move is to mirror the filesystem to that
enum: filesystem matches vocabulary, no parallel taxonomy. Tally across
the 77 current objects:

| kind | count |
| --- | --- |
| bottle | 31 |
| equipment | 22 |
| decoration | 8 |
| pipette | 6 |
| waste | 4 |
| rack | 3 |
| flask | 2 |
| plate | 1 |

Object references are by `object_name`, not by path. Filesystem moves do
not change cross-file references. Two tools list `content/objects/` with
non-recursive globs and need promotion to recursive listings; the
validator and the shared `ContentDatabase` already use `**/*.yaml`.

One pre-move content fix: `microtube_rack_24.yaml` declares
`kind: decoration`. That is a content authoring bug; it must be `rack`
before the move so the path-kind invariant holds.

Sibling concern: `content/protocols/` (31 entries) also wants grouping.
Out of scope here; separate plan.

## Objectives

- Move every `content/objects/<name>.yaml` to
  `content/objects/<kind>/<name>.yaml` where `<kind>` is the object's
  declared `kind` value. No filename renames.
- Fix `microtube_rack_24.kind` from `decoration` to `rack` before the
  move.
- Add a validator check that asserts the file path matches the declared
  `kind`. Self-enforcing layout.
- Promote two tools to recursive globbing so no caller breaks.
- Update every spec doc citation that names a `content/objects/<name>.yaml`
  path.

## Design philosophy

Filesystem mirrors ratified vocabulary. The `kind` enum is closed and
required; the YAML already chose the bucket for every object. Inventing
a parallel taxonomy ("containers", "tools", "consumables") forks
authority and decays. Cite `docs/REPO_STYLE.md` long-term over
short-term and fix-the-design-not-the-symptom.

Trade-off: collapses M1 from a human-judgement classification table to a
30-second `grep ^kind:` script. New objects self-place from their
declared `kind`. If the vocabulary grows later (split `bottle` into
`bottle` + `tube`, or split `equipment` into `instrument` + `tool`), the
filesystem follows the spec change automatically without re-debate.

Alternative rejected: invent 6-9 discovery buckets. Two taxonomies
(`kind` field + folder name) drift apart over time; one taxonomy stays
true.

## Scope

- File moves under `content/objects/` (77 files) via `git mv`.
- One content fix: `microtube_rack_24.kind` -> `rack`.
- Recursive-glob promotion in 2 tools.
- New validator check: declared `kind` matches parent folder name.
- Spec doc path updates (active specs only; archive untouched).
- One `docs/CHANGELOG.md` entry per patch.

## Non-goals

- Splitting the `kind` enum. `tube` and `instrument` are future
  vocabulary questions, not this migration.
- Protocol-directory grouping. Separate plan.
- Renaming any `object_name`, `placement_name`, or YAML field other
  than the one `kind` fix.
- SVG asset moves (`assets/` stays as is). SVG orphan/missing audit
  is a separate concern.
- Schema changes to object YAML.
- Touching scene, protocol, or material files.
- `src/` runtime code (still frozen).
- Adding new objects.

## Current state summary

| Surface | Count | Listing pattern | Recursive ready |
| --- | --- | --- | --- |
| `content/objects/*.yaml` | 77 files | flat directory | n/a (source) |
| `tools/validate_content_yaml.py` | line 98 | `glob('content/objects/**/*.yaml')` | YES |
| `tools/validators/database.py` | line 32 | `objects_dir.glob('**/*.yaml')` | YES |
| `tools/shared_toolkit/objects.py` | line 19 | `glob('*.yaml')` | NO -- needs fix |
| `tools/svg_asset_audit.py` | line 548 | `os.listdir(OBJECTS_DIR)` | NO -- needs fix |
| `tools/protocol_manual.py` | line 1227 | comment only | n/a |
| Spec doc citations | ~10 files | hard-coded paths | n/a -- needs sweep |

## Target layout

```
content/objects/
  bottle/        (31)
  equipment/     (22)
  decoration/    (8, after microtube_rack_24 -> rack: 7)
  pipette/       (6)
  waste/         (4)
  rack/          (3, +1 from microtube_rack_24: 4)
  flask/         (2)
  plate/         (1)
```

Rule: a file at `content/objects/<kind>/<name>.yaml` must declare
`kind: <kind>` and `object_name: <name>`. The validator enforces this
after WS-VALIDATOR lands.

## Architecture boundaries and ownership

| Boundary | Owner | Touch rule |
| --- | --- | --- |
| Pre-move content fix | content author | Edits `content/objects/microtube_rack_24.yaml` `kind` field |
| Tool glob promotion | tooling author | Edits `tools/shared_toolkit/objects.py`, `tools/svg_asset_audit.py` |
| Validator path-kind check | validator author | Adds check in `tools/validators/object_validator.py` (or new module) |
| File moves | maintainer | Runs `git mv` per the kind tally |
| Spec doc path updates | docs author | Edits every active spec under `docs/specs/` that cites a `content/objects/<name>.yaml` path |
| Verification | any | Runs validator + stepper + svg audit + pytest |

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component | Expected patches |
| --- | --- | --- |
| M1 / WS-KIND-FIX | `microtube_rack_24` kind correction | 1 |
| M1 / WS-TOOLS | tool glob promotion | 1 |
| M1 / WS-VALIDATOR | path-kind consistency check | 1 |
| M2 / WS-MOVE | `git mv` 77 files | 1 |
| M2 / WS-DOCS-PATHS | spec doc path updates | 1 |
| M3 / WS-VERIFY | full validator + stepper + audit + pytest sweep | 1 |
| M3 / WS-CLOSE | changelog + archive | 1 |

## Milestone plan

### Milestone M1: Pre-move prep (parallel)

- Depends on: none.
- Workstreams: WS-KIND-FIX, WS-TOOLS, WS-VALIDATOR.
- Entry criteria: kind tally captured.
- Exit criteria:
  - WS-KIND-FIX: `content/objects/microtube_rack_24.yaml` carries
    `kind: rack`; validator + stepper still exit 0 against the flat
    layout.
  - WS-TOOLS: `tools/shared_toolkit/objects.py` and
    `tools/svg_asset_audit.py` walk `content/objects/` recursively;
    both tools produce matching output on the flat layout (no
    regression) and on a nested test fixture.
  - WS-VALIDATOR: new check rejects any object YAML whose
    `<parent_folder_name>` does not equal the declared `kind`. The
    check is skipped when the file sits directly under
    `content/objects/` (transitional, removed after M2 lands).
  - `docs/CHANGELOG.md` entry per workstream.
- Parallel-plan ready: yes -- max parallel doers 3 (all three lanes
  are independent; nothing reads anyone else's output).

### Milestone M2: Move + spec paths (parallel)

- Depends on: M1.
- Workstreams: WS-MOVE, WS-DOCS-PATHS.
- Entry criteria: M1 exit met. Pre-flight: `.git/index.lock` absent
  and `.git` writable per `docs/REPO_STYLE.md`.
- Exit criteria:
  - WS-MOVE: every object YAML moved via `git mv` to
    `content/objects/<kind>/<name>.yaml`. No renames. Eight subfolders
    populated per the tally. Validator path-kind check now active
    (drop the transitional skip).
  - WS-DOCS-PATHS: every active `content/objects/<name>.yaml`
    citation under `docs/specs/` updated to the new path. Markdown
    link text matches the URL per
    [docs/MARKDOWN_STYLE.md](../MARKDOWN_STYLE.md). Archive docs and
    CHANGELOG entries are not rewritten.
  - `docs/CHANGELOG.md` entry per workstream.
- Parallel-plan ready: yes -- max parallel doers 2 (file moves and
  doc edits are independent; doc edits only need the target paths,
  which are deterministic from the kind tally).
- Patch-stream separation: file moves and doc edits land in
  separate patches. Reviewer rejects a patch that mixes layers.

### Milestone M3: Verify + close

- Depends on: M2.
- Workstreams: WS-VERIFY, WS-CLOSE.
- Entry criteria: M2 exit met.
- Exit criteria:
  - `source source_me.sh && python3 tools/validate_content_yaml.py` exits 0.
  - Validator path-kind check exits 0 on all 77 objects.
  - `source source_me.sh && python3 tools/protocol_stepper.py` exits 0
    with 0 ERRORs and 0 unresolved WARNINGs on all 31 protocols.
  - `source source_me.sh && python3 tools/svg_asset_audit.py` runs
    without "object missing from directory" regressions.
  - `pytest tests/` green.
  - Plan archived to `docs/archive/objects_subfolder_grouping.md`.
  - `docs/CHANGELOG.md` carries "objects subfolders landed" entry
    under today's date.
- Parallel-plan ready: no -- sequential verification + docs.

## Workstream breakdown

### WS-KIND-FIX: correct microtube_rack_24

- Owner: content author.
- Reads: `content/objects/microtube_rack_24.yaml`.
- Provides: single-field edit, `kind: decoration` -> `kind: rack`.
  Justification: file is a 24-position rack for microtubes; matches
  every other rack object. Earlier `decoration` value was a content
  authoring bug; surfaces during the kind tally.
- Verify: validator and stepper exit 0 against the flat layout.
- Expected patches: 1.

### WS-TOOLS: recursive glob promotion

- Owner: tooling author.
- Reads: `tools/shared_toolkit/objects.py`,
  `tools/svg_asset_audit.py`.
- Provides:
  - `tools/shared_toolkit/objects.py` line 19: `glob('*.yaml')` ->
    `glob('**/*.yaml')`.
  - `tools/svg_asset_audit.py` line 548: replace
    `os.listdir(OBJECTS_DIR)` flat walk with recursive walk
    (`Path(OBJECTS_DIR).rglob('*.yaml')`) preserving sorted order.
- Verify: tools produce matching object lists against a nested
  fixture and the current flat layout.
- Expected patches: 1.

### WS-VALIDATOR: path-kind consistency check

- Owner: validator author.
- Reads: `tools/validators/object_validator.py` (or wherever per-file
  object checks live), `tools/validators/database.py`.
- Provides: a check that for each object YAML at path
  `content/objects/<a>/<b>.yaml`, the declared `kind` equals `<a>`.
  Files directly under `content/objects/` (depth 1, no subfolder) are
  skipped during M1; the skip is removed at the end of WS-MOVE so a
  stray flat file becomes an ERROR.
- Verify: check rejects a synthetic test fixture where kind mismatches
  parent folder, accepts the kind-matched layout.
- Expected patches: 1.

### WS-MOVE: filesystem reorganization

- Owner: maintainer.
- Reads: kind tally (`git ls-files 'content/objects/*.yaml' | xargs
  grep -l '^kind: <kind>'`).
- Provides: 77 `git mv` operations grouped by target subfolder:
  ```
  git mv content/objects/<name>.yaml content/objects/<kind>/<name>.yaml
  ```
  One subfolder per batch to keep `git status` reviewable between
  batches. Pre-flight per `docs/REPO_STYLE.md` (verify `.git/index.lock`
  absent, `.git` writable).
- Verify: `git status` clean between batches. Final `find content/objects
  -maxdepth 1 -type f -name '*.yaml'` returns no files.
- Expected patches: 1.

### WS-DOCS-PATHS: spec citation sweep

- Owner: docs author.
- Reads: `git ls-files docs/specs/ | xargs grep -l 'content/objects/'`
  output, kind tally.
- Provides: path updates in every active spec doc. Each
  `content/objects/<name>.yaml` becomes
  `content/objects/<kind>/<name>.yaml`. Archive docs and CHANGELOG
  entries are not touched (historical record).
- Verify: `git ls-files docs/specs/ | xargs grep -E
  'content/objects/[a-z_]+\.yaml'` returns zero lines after the patch
  (no flat citations remain).
- Expected patches: 1.

### WS-VERIFY: full sweep

- Owner: any.
- Provides: validator + stepper + audit + pytest pass evidence.
- Expected patches: 0 to 1 (only if residual drift surfaces).

### WS-CLOSE: changelog + archive

- Owner: maintainer.
- Provides: changelog entry, plan archived to `docs/archive/`.
- Expected patches: 1.

## Acceptance criteria and gates

- **Per-patch gate**: touched tool, content file, validator, or doc
  passes its own check; CHANGELOG updated.
- **Integration gate (M3 exit)**: validator + stepper + audit + pytest
  all clean against the new layout; path-kind check exits 0 on all 77
  objects; archive complete.

## Test and verification strategy

Static-only. No runtime changes.

- `tools/validate_content_yaml.py` -- 0 failures across all object
  files under the new layout, including path-kind check.
- `tools/protocol_stepper.py` -- 0 ERRORs and 0 unresolved WARNINGs on
  all 31 protocols.
- `tools/svg_asset_audit.py` -- runs to completion; previously-listed
  objects still discovered after the recursive glob promotion.
- `pytest tests/` -- repo-wide lint + link checks stay green.

## Migration and compatibility policy

- Additive at the filesystem layer; `object_name` references are
  path-independent and survive untouched.
- No backward-compatibility shims (no symlinks from old paths to new
  paths). Every caller is recursive-glob ready after M1.
- Rollback: revert the patch series in reverse order; `git mv` is
  reversible via `git mv` back.

## Risk register

| Risk | Impact | Trigger | Owner | Mitigation |
| --- | --- | --- | --- | --- |
| A tool elsewhere globs `content/objects/*.yaml` non-recursively and was missed in the survey | high | Validator green but a downstream tool silently sees zero objects | tooling author | M1 publishes a "non-recursive listings of content/objects/" grep audit; any unlisted caller is added before M2 starts |
| The `kind` enum has a stale value somewhere | medium | A file declares a value not in the closed enum and the move script picks an undefined folder | tooling author | Pre-move guard: `grep -E '^kind:' | grep -v -E 'plate|bottle|flask|pipette|rack|waste|equipment|decoration'` returns zero lines |
| `git mv` partial run leaves orphans | medium | Crew interrupts mid-WS-MOVE | maintainer | One subfolder per `git mv` batch; `git status` clean between batches |
| Spec doc citations remain stale | low | Reviewer spots an old `content/objects/<name>.yaml` path | docs author | Final M3 grep pass: `git ls-files docs/specs/ \| xargs grep -E 'content/objects/[a-z_]+\.yaml'` returns zero lines |
| Hooks block `git mv` due to permissions | low | `.git/index.lock` or permission error | maintainer | Pre-flight per `docs/REPO_STYLE.md` |
| Validator path-kind check fires on a content authoring bug we did not anticipate | low | Another object beyond `microtube_rack_24` has a misclassified `kind` | content author | Run a dry validator pass after WS-VALIDATOR lands (on the flat layout with check active for any nested fixtures); fix any surfaced bug before WS-MOVE |

## Rollout and release checklist

- [ ] M1 exit: kind fix landed, tools recursive, validator check live.
- [ ] M2 exit: 77 files moved, specs updated.
- [ ] M3 exit: validator + stepper + audit + pytest clean; plan
  archived.
- [ ] `docs/CHANGELOG.md` carries one entry per workstream close.
- [ ] No file under `src/` modified.
- [ ] No `object_name` field renamed.
- [ ] No SVG asset moved.
- [ ] `kind` enum unchanged (no split into `tube`/`instrument`).

## Documentation close-out requirements

- Active plan `docs/active_plans/objects_subfolder_grouping.md`
  archived to `docs/archive/` on M3 close.
- `docs/CHANGELOG.md` entry per milestone close-out.

## Patch plan and reporting format

M1 (parallel-plan ready, 3 lanes):
- Patch 1: WS-KIND-FIX -- one-field content edit.
- Patch 2: WS-TOOLS -- recursive glob in 2 tools.
- Patch 3: WS-VALIDATOR -- path-kind consistency check.

M2 (parallel-plan ready, 2 lanes):
- Patch 4: WS-MOVE -- 77 `git mv` operations.
- Patch 5: WS-DOCS-PATHS -- spec doc citation updates.

M3:
- Patch 6: WS-VERIFY -- only if residual drift surfaces.
- Patch 7: WS-CLOSE -- changelog + archive.

## Verification

End-to-end check from a clean checkout after M3:

```bash
source source_me.sh
python3 tools/validate_content_yaml.py            # exits 0; path-kind check exits 0
python3 tools/protocol_stepper.py                  # exits 0; 0 ERRORs, 0 unresolved WARNINGs
python3 tools/svg_asset_audit.py                   # no regressions
pytest tests/                                       # green
```

## Open questions and decisions needed

- None. User signed off on the kind-mirrored layout and the deferred
  vocabulary splits (`tube`, `instrument`) on 2026-05-16.

## Resolved decisions

- Scope is objects only. Protocols grouping is a separate plan.
- File renames are out of scope; only paths change.
- No backward-compat symlinks. Every caller is recursive-glob ready
  after M1.
- Archive docs and CHANGELOG entries are not rewritten to reflect
  new paths (historical record preserved).
- Layout mirrors the ratified `kind` enum from
  `docs/specs/OBJECT_VOCABULARY.md`. No parallel taxonomy.
- `microtube_rack_24.kind` is corrected to `rack` in M1 (one-field
  content fix), before the move.
- The `kind` enum is not being split in this plan. `tube` (from
  `bottle`) and `instrument`/`tool` (from `equipment`) are future
  vocabulary questions tracked separately.
