# NEW3 Canonical Scorecard Guardrail

**Status**: ACTIVE RULE (2026-05-21)

**Workstream**: D (extend canonical scorecard execution guardrail)

## Purpose

Extend enforcement of the canonical scorecard rule to include report files. Reject scorecard report files that claim layout quality metrics without documenting how those metrics were produced.

This guardrail prevents methodology mismatch and metric-gaming by requiring provenance tracking for all scorecard claims, not just blocking forbidden helper scripts.

## Guardrail Statement

All report files claiming layout scorecard metrics MUST cite:

1. **Explicit `score_layout.mjs` command invocation**, OR
2. **Known canonical scorecard source** (e.g., batch2_n_canonical, batch1)

Reports that present scorecard results without such citation FAIL validation.

## Compliant Patterns

### Pattern 1: Explicit command citation

Report includes the exact bash invocation that produced the scorecard:

```markdown
## Scorecard Generation

Command:
  node experiments/css_native_layout/score_layout.mjs
Output: test-results/new0_css_native/scorecard/scorecard.json
```

### Pattern 2: Source file citation

Report cites a known scorecard source produced by canonical run:

```markdown
Scorecard source: batch2_n_canonical/scorecard.json
(Canonical run from Batch 2 Workstream N, committed to stress_results/)
```

### Pattern 3: Known canonical batches

Single-batch reports can cite the batch name directly:

- batch1 (original baseline, circa 2026-05-01)
- batch2_n_canonical (Workstream N post-fix canonical, 2026-05-14)

Example:

```markdown
This analysis inherits scorecard metrics from batch1 pre-fix baseline.
Reference: stress_results/scorecard_batch1_summary.md
```

## Non-Compliant Patterns (Forbidden)

1. **Scorecard report with no provenance**
   ```markdown
   # Layout Scorecard Report
   Generated: ...
   Total scenes: 110
   (No mention of score_layout.mjs or source batch)
   ```
   **Fix**: Add generation command or source citation in report header.

2. **Scorecard values inferred from other data**
   ```markdown
   Batch 2 vs Batch 3 shows 12-point improvement.
   (No citation of how improvement was calculated)
   ```
   **Fix**: Run `score_layout.mjs` explicitly and cite the command.

3. **Scorecard metrics from deprecated helper script**
   ```markdown
   Scorecard generated via custom _generate_scorecard.py
   ```
   **Fix**: Regenerate using `score_layout.mjs`, replace helper with canonical invocation.

## Report File Classification

The guardrail applies to files in `experiments/css_native_layout/stress_results/` that are clearly scorecard reports, identified by:

- Header `# Layout Scorecard Report`
- Table titled "Ranked Scenes (by total_layout_score)"
- Generated timestamp and audit source path

Workstream analysis documents and CSS fix summaries that merely MENTION metric terms (e.g., "aspect_ratio" in discussion) are not flagged unless they present scorecard results as fact.

## Non-Compliant Files (Current Repo)

As of 2026-05-21, the following files violate the guardrail:

| File | Issue | Fix Path |
| --- | --- | --- |
| `scorecard_batch3_b.md` | Empty scorecard (0 scenes) claims Layout Scorecard Report header but no source citation | Add comment: "Generated via score_layout.mjs on 2026-05-21" or remove empty report |
| `scorecard_batch2_alt2/scorecard.md` | 110-scene report with no canonical invocation cited | Add section: "## Generation Command" with `node experiments/css_native_layout/score_layout.mjs` |

### Recommended Remediation

Both files are machine-generated scorecard outputs. Add header comment to each:

**scorecard_batch3_b.md**:
```markdown
# Layout Scorecard Report

**Generated via**: `node experiments/css_native_layout/score_layout.mjs` (2026-05-21)
**Audit source**: `test-results/new0_css_native/audit`

Generated: 2026-05-21T12:05:00.512Z
...
```

**scorecard_batch2_alt2/scorecard.md**:
```markdown
# Layout Scorecard Report

**Generated via**: `node experiments/css_native_layout/score_layout.mjs` (2026-05-21)
**Audit source**: `test-results/new0_css_native/audit`

Generated: 2026-05-21T04:49:14.457Z
...
```

These minimal additions satisfy the guardrail by documenting the canonical command used.

## Enforcement Mechanism

**Hygiene test**: `tests/test_canonical_scorecard_rule.py::test_scorecard_claims_require_canonical_command`

The test:
- Scans `experiments/css_native_layout/stress_results/` for `.md` files
- Identifies scorecard reports by header patterns and table structure
- Requires each report to cite `score_layout.mjs` or a known canonical source
- Fails with list of non-compliant files if any violation detected

Run with:
```bash
pytest tests/test_canonical_scorecard_rule.py::test_scorecard_claims_require_canonical_command -v
```

## Adding New Canonical Sources

If a new baseline or canonical batch is approved as a reference source, add it to the test's `canonical_sources` list:

```python
canonical_sources = [
	"score_layout.mjs",
	"batch2_n_canonical",
	"batch1",
	"batch3_new_canonical",  # <- add here
]
```

Notify workstream leads when updating the allowlist.

## Related References

- [docs/active_plans/new3_batch3_canonical_scorecard_rule.md](new3_batch3_canonical_scorecard_rule.md) - Original canonical scorecard rule (forbidden helper patterns)
- [experiments/css_native_layout/score_layout.mjs](../../experiments/css_native_layout/score_layout.mjs) - Authoritative scorecard generator
- [experiments/css_native_layout/precheck.mjs](../../experiments/css_native_layout/precheck.mjs) - Visual diagnostic (input source)
- [PRECHECK_USAGE.md](../../experiments/css_native_layout/PRECHECK_USAGE.md) - Precheck operational guide

## Blockers

None. Rule documentation and test extension complete.
