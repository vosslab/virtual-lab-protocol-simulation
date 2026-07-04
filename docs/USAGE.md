# USAGE.md

How to run the tools in this repository.

## reset_repo.py

`reset_repo.py` is the bootstrap entry point for a new consumer repo cloned from this
template. It runs an interactive interview (project type, code license, docs license,
PyPI intent, stage, commit), writes the `REPO_TYPE` marker, installs license files,
seeds `pyproject.toml` when PyPI is requested, runs propagation, and removes
template-meta paths.

### Normal use (interactive)

```bash
source source_me.sh && python3 reset_repo.py
```

The script interviews you in your terminal. No flags are required for normal use.

### CLI flags

| Flag | Description |
| --- | --- |
| `--config <file>` | Supply interview answers from a JSON file (testing/reproducibility mode) |
| `--dry-run` | Log planned actions without writing any files |
| `-h` | Show help and exit |

### Config mode (testing/reproducibility interface)

`--config` is intended for automated testing and reproducible resets, not for
routine human use. Pass a JSON file with the interview answers:

```bash
source source_me.sh && python3 reset_repo.py --config my_config.json
```

Config mode is non-interactive: the script reads answers from the file and proceeds
without prompting. This replaces the interactive interview for the run.

#### JSON schema

| Key | Required | Values | Notes |
| --- | --- | --- | --- |
| `project_type` | YES | `python` / `p`, `typescript` / `t`, `rust` / `r`, `other` / `o` | Short alias or full token |
| `code_license` | YES | SPDX identifier or alias (e.g. `MIT`, `m`, `GPL-3.0`, `g`) | Resolved via `resolve_license` |
| `docs_license` | no | SPDX identifier or alias | Default: `CC-BY-4.0` |
| `pypi` | no | `true` / `false` | Default: `false`; Python-only |
| `stage` | no | `true` / `false` | Default: `true` |
| `commit` | no | `true` / `false` | Default: `false` |

#### Minimal example

```json
{
  "project_type": "python",
  "code_license": "GPL-3.0"
}
```

#### Full example

```json
{
  "project_type": "typescript",
  "code_license": "MIT",
  "docs_license": "CC-BY-4.0",
  "stage": false,
  "commit": false
}
```

### Folder-name guard

The script refuses to run when the repo root directory is named exactly
`starter-repo-template`. This protects the template development checkout from
accidental destruction.

If you see this error, clone or rename the repo to your project name first:

```
This repo is named starter-repo-template. Clone or rename it to the consumer project name before running reset.
```

The guard checks the folder name only; it does not inspect remotes or origin URLs.

### Outside a git repo

Running `reset_repo.py` outside a git repository exits with a clear message
instead of a raw subprocess traceback.

## E2E test harness

For the clone-based reset E2E harness (LOCAL and REMOTE modes), see
[E2E_TESTS.md](E2E_TESTS.md) and the inline documentation in
`tests/meta/e2e/e2e_reset_routing.py`. The harness is template-meta:
it lives under `tests/meta/e2e/` and is removed by reset.

Run all offline E2E tests:

```bash
bash tests/meta/e2e/run_all.sh
```

Run a single E2E test:

```bash
source source_me.sh && python3 tests/meta/e2e/e2e_reset_routing.py
```

## Layout regression harness

`tools/layout_golden_diff.mjs` rebuilds layout for every scene and compares the result
against a reference snapshot. It is the M4/M5 tripwire: any geometry change is detected
before it reaches the consolidation or structural-refactor milestone.

The snapshot is an ephemeral, gitignored baseline stored at
`test-results/layout_reference_snapshot.json`. It is never committed to version control.

### Prerequisites

The `generated/` artifacts must exist. Run the pipeline first if they are missing:

```bash
bash pipeline/build_generated.sh
```

### Refactor session workflow

Start a refactor session by capturing a baseline from the clean engine, then compare
after making changes:

```bash
# Step 1: capture baseline from clean engine (before any M4/M5 changes)
node --import tsx tools/layout_golden_diff.mjs --refresh

# Step 2: make your refactor changes, then compare
node --import tsx tools/layout_golden_diff.mjs
```

Via npm:

```bash
npm run layout:refresh   # capture baseline
npm run layout:diff      # compare against baseline
```

### Compare mode

Exit 0 when all scenes match the snapshot. Exit 1 when any scene differs, with a
per-scene delta report printed to stdout. If the snapshot file is absent, the tool
exits non-zero and instructs you to run `--refresh` first.

### Snapshot lifecycle

- The snapshot lives under `test-results/` (gitignored) and is never committed.
- Capture it with `--refresh` from a clean engine state at the start of a refactor session.
- Compare after making changes to detect geometry regressions.
- If the snapshot is stale or missing, re-run `--refresh` from the current clean state.
- Do not run `--refresh` mid-refactor: that silently accepts in-flight changes as the
  new baseline, defeating the regression check.

### Durable layout baseline

`docs/SCENE_LAYOUT_BASELINE.md` is a committed, hand-refreshed snapshot of the corpus's
health scorecard and `severityDiagnostics` Error table, taken after the failBuild gate
(`countBuildFailures` in `pipeline/precompute_layout.mjs`) went live. Unlike the
gitignored/ephemeral regression snapshot above, this file stays in the repo as a durable
reference point for what "clean" looks like. Refresh it with:

```bash
./build_github_pages.sh
node --import tsx pipeline/precompute_layout.mjs
source source_me.sh && python3 run_scene_health.py
node --import tsx tests/e2e/e2e_layout_diagnostics_baseline.mjs
```

Refresh by hand at each release or whenever the exempt-scene list or scene count changes;
it is not regenerated automatically as part of the build.
