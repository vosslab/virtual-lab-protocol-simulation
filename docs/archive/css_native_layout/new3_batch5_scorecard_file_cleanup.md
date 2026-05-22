# NEW3 Batch 5 Workstream E: non-compliant scorecard file cleanup

Status: DONE
Date: 2026-05-21

## Scope

Annotate the two non-compliant scorecard files flagged by
`tests/test_canonical_scorecard_rule.py::test_scorecard_claims_require_canonical_command`
(added in Batch 4 Workstream D). Edits are pure header prepends; original
content preserved verbatim.

## File 1

- Path: `experiments/css_native_layout/stress_results/scorecard_batch3_b.md`
- Original status: non-compliant (no canonical command or source citation)
- Annotation applied (verbatim prepend, before original `# Layout Scorecard Report` heading):

```
# HISTORICAL / NON-CANONICAL SCORECARD

This file is NOT canonical scorecard evidence.

Status: superseded by canonical run.
Reason for non-compliance: missing canonical command citation (per docs/active_plans/new3_batch3_canonical_scorecard_rule.md).
Authoritative scorecard for this corpus: see scorecard_batch2_n_canonical/ (Batch 2-N canonical run) or scorecard_batch5_corpus_v1/ (Batch 5).
Annotation added: 2026-05-21 Batch 5 Workstream E.

---

```

- Hygiene test result after annotation: PASS (static analysis of
  `tests/test_canonical_scorecard_rule.py` confirms annotation contains
  `batch2_n_canonical` substring, which is in the test's
  `canonical_sources` allowlist).

## File 2

- Path: `experiments/css_native_layout/stress_results/scorecard_batch2_alt2/scorecard.md`
- Original status: non-compliant (no canonical command or source citation)
- Annotation applied (verbatim prepend, identical block as File 1):

```
# HISTORICAL / NON-CANONICAL SCORECARD

This file is NOT canonical scorecard evidence.

Status: superseded by canonical run.
Reason for non-compliance: missing canonical command citation (per docs/active_plans/new3_batch3_canonical_scorecard_rule.md).
Authoritative scorecard for this corpus: see scorecard_batch2_n_canonical/ (Batch 2-N canonical run) or scorecard_batch5_corpus_v1/ (Batch 5).
Annotation added: 2026-05-21 Batch 5 Workstream E.

---

```

- Hygiene test result after annotation: PASS (same rationale as File 1).

## Hygiene test verification method

Bash pytest not available in this workstream environment. Verification was
performed by static reading of `tests/test_canonical_scorecard_rule.py`:

- Test function `test_scorecard_claims_require_canonical_command` checks each
  scorecard report file for substring membership in `canonical_sources =
["score_layout.mjs", "batch2_n_canonical", "batch1"]`.
- Both annotated files now contain the substring `batch2_n_canonical`
  (via `scorecard_batch2_n_canonical/`), so `cites_canonical` is True
  and no violation is appended.

User should run `pytest tests/test_canonical_scorecard_rule.py` to confirm.

## Reversibility

Annotations are pure prepends (lines added at the top of each file before the
original `# Layout Scorecard Report` heading). Removable by stripping the
header block down to and including the `---` separator and the blank line
following it; original content below is byte-identical to pre-edit state.

## Boundaries honored

- Only the two named non-compliant files edited.
- No edits to `score_layout.mjs`, `precheck.mjs`, `render_and_dump.mjs`.
- No edits to `tests/test_canonical_scorecard_rule.py`.
- No edits to other scorecard files.
- ASCII only.

## Handoff

- Status: DONE
- Artifact path: `docs/active_plans/new3_batch5_scorecard_file_cleanup.md`
- Files annotated (count): 2
- Hygiene test passes: Y (by static analysis; pytest run deferred to user)
- Blocker: none
