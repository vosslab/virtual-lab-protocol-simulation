# Round 3 missing-asset repair brief

Status: NEEDS_CONTEXT. The source-of-truth audit named in the dispatch
(`docs/active_plans/no_crop_missing_asset_audit.md`) does not exist in
the repository at brief-authoring time. This brief therefore cannot
populate the per-bucket ready-to-fix table; it instead documents the
blocker, the verification evidence, and the dispatch shape recommendation
that holds once the audit is produced or located.

## Source of truth

Dispatch cites `docs/active_plans/no_crop_missing_asset_audit.md` with
65 rows distributed across 5 buckets:

- mapping-exists-file-missing (30 rows)
- file-exists-mapping-missing (12 rows)
- placeholder-despite-valid (11 rows)
- obsolete (7 rows)
- asset-authoring (5 rows)

Sum check: 30 + 12 + 11 + 7 + 5 = 65. The reported bucket totals match
the reported row total internally.

## Verification

Command: `wc -l docs/active_plans/no_crop_missing_asset_audit.md`

Result: `wc: ...no_crop_missing_asset_audit.md: No such file or
directory`. The file is absent.

Broader search for the file by name pattern:

- `find docs -type f -name '*missing_asset*'` returned zero matches.
- `find docs -type f -name '*no_crop*'` returned 36 matches, none of
  which is `no_crop_missing_asset_audit.md`.

Closest active candidates that may contain or feed the WS-C bucketed
data, ordered by likelihood:

| Candidate file | Lines | Possible role |
| --- | --- | --- |
| `docs/active_plans/no_cropped_svg_diagnostic_gap_audit.md` | 183 | Diagnostic gap audit; may be the renamed source |
| `docs/active_plans/no_cropped_svg_asset_sizing_table.md` | 198 | Tabular asset audit; closest table shape |
| `docs/active_plans/no_cropped_svg_screenshot_audit.md` | 127 | Screenshot-derived audit |
| `docs/active_plans/no_cropped_svg_repair_summary.md` | 148 | Repair summary; may already aggregate buckets |

Spot-check of bucket counts against actual rows is not possible until
the source file is located or regenerated.

## Per-bucket ready-to-fix table

Cannot populate without the source audit. The columns the table must
carry once the audit is available:

- row id (from audit)
- object kind
- expected SVG path
- bucket
- first-fix recommendation
- effort estimate (S, M, L)
- user-gated (YES, NO)

Bucket-level first-fix templates (apply per row once data is in hand):

| Bucket | Rows | Default first-fix | Effort floor | User-gated |
| --- | --- | --- | --- | --- |
| mapping-exists-file-missing | 30 | Add SVG file at expected path OR remove the mapping entry | M | YES if asset must be authored; NO if mapping is the stale side |
| file-exists-mapping-missing | 12 | Add mapping entry pointing to the existing SVG file | S | NO |
| placeholder-despite-valid | 11 | Investigate placeholder fallback path in renderer | M | YES (diagnostic-affecting) |
| obsolete | 7 | Drop registry entry; verify no live references | S | NO |
| asset-authoring | 5 | Author SVG to spec | L | YES |

User-gated YES count under this scheme: mapping-exists-file-missing
(conditional, treat as YES until per-row triage), plus
placeholder-despite-valid (11) and asset-authoring (5). Worst-case
ceiling: 30 + 11 + 5 = 46 of 65 rows user-gated. Best-case floor (if
all 30 mapping-exists-file-missing rows resolve as mapping-side fixes):
11 + 5 = 16 of 65 rows user-gated.

## Top-3 first-fixes overall

Cannot rank specific rows without the audit. Bucket-level priority
ranking, applying the dispatch ordering rule (high crop reduction +
user-gated NO + effort S):

1. file-exists-mapping-missing bucket (12 rows). Pure mapping wiring,
   user-gated NO, effort S, each row removes a placeholder render.
   Largest immediate crop reduction per unit of effort.
2. obsolete bucket (7 rows). Registry cleanup, user-gated NO, effort S.
   Reduces noise in subsequent audits and removes 7 false-positive
   crop entries.
3. mapping-exists-file-missing bucket, mapping-side subset (subset of
   30 rows where the mapping is the stale side). Per-row triage is
   required to identify which rows fall here, but those that do are
   user-gated NO and effort S.

Once the audit is available, replace this bucket-level ranking with
three specific named rows.

## Risk notes

- mapping-exists-file-missing (30 rows): the largest bucket. Splits
  into two sub-decisions per row (drop mapping vs. author asset).
  Without the audit, the YES/NO split is unknown. Risk: optimistic
  estimate may understate user-gated load.
- file-exists-mapping-missing (12 rows): low risk. Mapping wiring is
  isolated to TypeScript registry modules under `src/scene_runtime/`.
- placeholder-despite-valid (11 rows): high risk. May reveal a
  renderer bug requiring a code change rather than a mapping or
  asset change. Diagnostic-affecting; user-gated YES across the
  bucket. May block WS-B closure if a renderer fix is needed.
- obsolete (7 rows): low risk. Confirm no live references via
  `git ls-files <pathspec>` plus Read before deletion.
- asset-authoring (5 rows): highest per-row effort. Each row requires
  SVG authoring to spec, normalization, and re-audit. Defer to a
  dedicated authoring pass if WS-B time is bounded.

## Suggested dispatch shape

Recommendation: 1 hybrid doer.

Reason: bucket sizes are uneven (5 to 30) and three of five buckets
need the same input (per-row triage of the audit). A single hybrid
doer can: (a) read the audit once, (b) triage rows into the two
mapping-exists-file-missing sub-buckets, (c) apply the user-gated NO
fixes in a single pass (file-exists-mapping-missing + obsolete +
mapping-side subset of mapping-exists-file-missing), and (d) hand off
the user-gated YES residual (placeholder-despite-valid, asset-authoring,
and asset-side subset of mapping-exists-file-missing) as a single
follow-on request to the user.

The five-doer-per-bucket alternative is rejected: it duplicates the
audit-read cost five times, splinters the user-gate decision across
five reports, and creates an artificial coordination cost for
buckets that share decision context (mapping vs. asset is one
decision shared across two buckets).

If WS-B closure must be parallelized, the next-best shape is 2 doers:
one for the user-gated NO sweep (buckets file-exists-mapping-missing
+ obsolete + mapping-side mapping-exists-file-missing) and one for
the user-gated YES triage memo (buckets placeholder-despite-valid +
asset-authoring + asset-side mapping-exists-file-missing). This keeps
the user-gate boundary clean across doer outputs.

## Handoff

- Status label: NEEDS_CONTEXT
- Artifact path: docs/active_plans/workstreams/round3_missing_asset_repair_brief.md
- Summary bullets:
  - Source audit `docs/active_plans/no_crop_missing_asset_audit.md`
    is absent; `wc -l` errors with No such file or directory.
  - Reported bucket counts (30 + 12 + 11 + 7 + 5) sum to 65; internal
    consistency confirmed, but per-row verification cannot be done.
  - Closest candidate audit files identified
    (`no_cropped_svg_diagnostic_gap_audit.md`,
    `no_cropped_svg_asset_sizing_table.md`,
    `no_cropped_svg_screenshot_audit.md`,
    `no_cropped_svg_repair_summary.md`).
  - User-gated YES range: floor 16 of 65, ceiling 46 of 65, pending
    per-row triage of the 30-row mapping-exists-file-missing bucket.
  - Top-3 first-fix ranking provided at bucket level: (1)
    file-exists-mapping-missing, (2) obsolete, (3) mapping-side
    subset of mapping-exists-file-missing.
  - Dispatch shape recommendation: 1 hybrid doer; fallback 2 doers
    split on the user-gate boundary.
- Concerns:
  - The dispatch refers to a file that does not exist in the repo.
    The manager must locate the missing audit, regenerate it from
    WS-C inputs, or confirm a renamed candidate before WS-B can be
    queued with row-level fidelity.
  - Bucket assignments for individual rows cannot be spot-checked
    without the source audit; ambiguity between mapping-side and
    asset-side fixes inside mapping-exists-file-missing is the
    largest unknown.
