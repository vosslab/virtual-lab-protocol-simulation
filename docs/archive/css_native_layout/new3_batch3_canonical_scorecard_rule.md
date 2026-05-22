# NEW3 Batch 3 Canonical Scorecard Rule

**Status**: ACTIVE RULE (2026-05-21)

## Purpose

Enforce a single authoritative scorecard generation path to prevent methodology mismatch and metric-gaming.

## Rule Statement

**Scorecard claims must be produced by running `score_layout.mjs` directly against fresh `precheck.mjs` output.**

Helper scripts may prepare INPUT (e.g., aggregate precheck JSONs, run precheck.mjs on multiple scenes) but must NOT reimplement scoring logic.

Any report claiming layout quality scores MUST name the exact bash command that produced them (full invocation, including `--compare` args if applicable).

## Canonical invocation

Default single-directory scorecard:

```bash
node experiments/css_native_layout/score_layout.mjs
```

Comparison scorecard (two-directory):

```bash
node experiments/css_native_layout/score_layout.mjs \
  --compare test-results/dir1/audit test-results/dir2/audit
```

Output: `test-results/new0_css_native/scorecard/scorecard.json` and `scorecard.md`.

## Input requirements

- `score_layout.mjs` reads from `test-results/new0_css_native/audit/visual_audit.json` and `sizing_manifest.json` by default.
- These files are produced by `precheck.mjs` running against the rendered HTML.
- Input MUST be fresh: run `precheck.mjs` immediately before `score_layout.mjs`.
- `--compare` mode accepts two directory paths; each must contain both `visual_audit.json` and `sizing_manifest.json`.

## Forbidden patterns

1. **Hardcoded metric values in helpers**
   - NO: `balance: 50`, `region_filling: 50`, `aspect_ratio_fidelity: 100`
   - NO: Placeholder scores substituted for computed values
   - NO: Simplified numeric constants marked as "provisional" or "placeholder"

2. **Python reimplementations of scoring logic**
   - NO: `/tmp/_generate_scorecard_*.py` that recompute metric scores
   - NO: Custom metric weight tables duplicated outside `score_layout.mjs`
   - NO: Field name mapping or alias logic (e.g., checking `mean_norm` when the canonical field is `mean_normalized_distance`)

3. **Stale input data**
   - NO: Using `visual_audit.json` from a prior run as scorecard input
   - NO: Ignoring "READ_ME_STALE_DATA.md" warnings in precheck output directories
   - NO: Citing scores without confirming the input precheck is current

4. **Comparison without matched methodology**
   - NO: Comparing batch1 results (produced by score_layout.mjs) against batch2_n results (produced by helper script)
   - NO: Citing score deltas as evidence of layout regression when input methodology differs

## Case study: Batch 2 Workstream O regression

The regression root cause report (`batch2_o_regression_root_cause.md`) documents how Batch 2 Close violated this rule:

- **batch1 scorecard**: produced by `score_layout.mjs`, full DOM measurement, all metrics computed.
- **batch2_n scorecard**: produced by `/tmp/_generate_scorecard_batch2_n.py`, hardcoded 4 of 9 metrics, stale input data.

Result: Apparent 12-16 point regressions across five scenes were artifacts of scorecard methodology mismatch, not layout failures. The precheck hard failures (clipped_artwork, off_page) were actually fixed by Workstream N; the regression signals were false.

Key evidence:

- `support_distance` calculated from stale field name (`mean_norm` vs `mean_normalized_distance`)
- `primary_prominence` hardcoded to 100 in batch2_n (where batch1 scored 0-100)
- `region_filling` hardcoded to 50 (where batch1 values ranged 14.2-30.3)
- `aspect_ratio_fidelity` hardcoded to 100 (where batch1 values ranged 18.4-88.7)
- Underlying `visual_audit.json` contained pre-fix Batch 1 data, not post-Workstream-N output

Correct mitigation: Regenerate batch2_n scorecards using `score_layout.mjs` against fresh precheck output. Compare apples-to-apples.

## Reporting requirements

Every scorecard citation must include:

1. **Command**: Exact bash invocation (with all flags and directory paths)
2. **Input attestation**: Confirmation that `visual_audit.json` and `sizing_manifest.json` are fresh (not stale warnings)
3. **Date/workspace**: When and where the precheck + scorecard run executed
4. **Output path**: Where the scorecard JSON/MD landed

### Example of compliant report

```markdown
Layout scorecard: Batch 3 baseline (2026-05-21)

Precheck run:
node experiments/css_native_layout/precheck.mjs \
 'experiments/css_native_layout/templates/\*.html' \
 --out test-results/new3_batch3/precheck

Scorecard generation:
node experiments/css_native_layout/score_layout.mjs

Output: test-results/new0_css_native/scorecard/scorecard.json
```

### Example of non-compliant report

```markdown
Batch 2 vs Batch 3 comparison shows 12-point improvement.
(Missing: command invocation, input attestation, data freshness confirmation)
```

## Approved input-preparation helpers

Scripts that aggregate or filter precheck INPUT (not reimplementing scores) are allowed:

- Helpers that run `precheck.mjs` on multiple scenes and collect output directories
- Helpers that extract a subset of scenes from `visual_audit.json` for comparison
- Helpers that format precheck paths for `score_layout.mjs --compare`

Such helpers must:

- Document that they pass inputs to `score_layout.mjs`, not produce scores directly
- Include the downstream `score_layout.mjs` command in their output
- NOT hardcode any metric values
- NOT recompute weights, aspect ratios, or distance measurements

## Enforcement

- **Workstream leads**: Confirm scorecard reports name the canonical command before accepting results.
- **Agents**: Check for hardcoded values and field name mismatches in any helper script before running it.
- **Hygiene test** (`tests/test_canonical_scorecard_rule.py`): Scans experiments/css_native_layout/ and /tmp for forbidden helper patterns.

## Related references

- `score_layout.mjs` - authoritative scorer
- `precheck.mjs` - visual diagnostic (input source)
- `batch2_o_regression_root_cause.md` - case study
- `PRECHECK_USAGE.md` - precheck operational guide
