# Round 3 A2: Generated SVG barrel regen audit

Status: complete. Recommendation: keep regen, wire `pipeline/generate_svg_globals.py`
into `build_github_pages.sh` via `pipeline/bootstrap_generated.sh`.

## SVG file list vs const list mismatch

- Equipment SVG sources (`assets/equipment/*.svg`): 125
- `SVG_*` consts found in `generated/svg_assets/index.ts`: 125
- Missing consts before regen: 0
- Extra (orphan) consts before regen: 0
- Missing consts after regen: 0

The R2-era drift (missing `SVG_SEROLOGICAL_PIPETTE`) is no longer present.
The barrel is currently in sync with the on-disk SVG inventory.

Auditor script: `/tmp/_audit_svg.py` (uses `assets/equipment/*.svg` stems vs
extracted `SVG_[A-Z0-9_]+` tokens from `generated/svg_assets/index.ts`).

## Regen diff summary

Captured artifacts under `test-results/round3_svg_barrel_regen_audit/`:

- `barrel_diff.txt` -- diff of `generated/svg_assets/index.ts` before vs after the
  first fresh `python3 pipeline/generate_svg_globals.py` run. Result: empty
  (0 lines).
- `idempotence_diff.txt` -- diff between run 1 and run 2 of the regen. Result:
  empty (0 lines).
- `barrel_after_regen.ts` -- canonical post-regen barrel snapshot.

Net effect: regenerating produced no changes to the barrel. The on-disk barrel
already matches the source-of-truth SVG set. No stale exports detected this
round.

## Build wiring status

Build wiring: NO.

- `pipeline/bootstrap_generated.sh` is the documented entry point that runs
  `build_new_protocol_data.py`, `build_new_scene_data.py`,
  `build_object_data.py`, and `pipeline/generate_svg_globals.py`. Its header
  comment claims it is invoked by `build_github_pages.sh` and
  `export_single_file.sh` before `tsc` and bundling.
- `build_github_pages.sh` was read end-to-end. It runs `tsc --noEmit` and
  `esbuild` but never sources or invokes `pipeline/bootstrap_generated.sh`
  and never invokes `pipeline/generate_svg_globals.py` directly.
- `check_codebase.sh` does not reference either script.
- Only `tests/conftest.py` and `pipeline/bootstrap_generated.sh` reference
  `generate_svg_globals.py`. Tests bootstrap correctly; production build does
  not.

Consequence: a contributor who deletes or adds an SVG without manually running
`bash pipeline/bootstrap_generated.sh` ships a stale barrel through
`build_github_pages.sh`. The R2 `serological_pipette` regression had this exact
shape.

## Idempotence check

Pass. Two back-to-back invocations of `python3 pipeline/generate_svg_globals.py`
produced byte-identical output for `generated/svg_assets/index.ts`. See
`test-results/round3_svg_barrel_regen_audit/idempotence_diff.txt` (empty).

Per-asset files and `generated/svg_manifest.ts` are written deterministically:
sorted asset iteration (`sorted(...)` on `os.listdir`) and `json.dumps(...,
sort_keys=True)` on manifests.

## Fix recommendation

Wire `pipeline/bootstrap_generated.sh` into `build_github_pages.sh` so SVG (and
other generated) outputs are always refreshed before `tsc`/`esbuild`.

## Keep/Reject

Keep regen. Wire into build.

## Next action

Once `build_github_pages.sh` calls `bash pipeline/bootstrap_generated.sh` before
`tsc`, the M1/M2/Q1/Q2 workstreams will inherit a freshly regenerated barrel on
every production build.
