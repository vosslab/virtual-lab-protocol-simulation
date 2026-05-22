# Round 3 Markdown Link Rot Inventory

Date: 2026-05-21
Status: Pre-existing archive rot catalog (not Round 3 introduced)

## Overview

This inventory documents pre-existing markdown link breakage in the repo, organized by pattern and source. Pre-existing rot is broken links that existed before Round 3 Round 3 new-doc relative-path fixes.

Total pre-existing broken links identified: **498** (after Round 3 fixes applied).

## BUCKET A Status: Round 3 New Docs

Round 3 introduced two new audit/clarification files:

- `docs/active_plans/no_crop_round3_architecture_vocabulary_clarification.md` - FIXED (23 spec links corrected from `specs/` to `../specs/`)
- `docs/active_plans/audits/no_crop_svg_viewbox_audit.md` - FIXED except 3 untracked external links (see below)

**Round 3 mechanical fixes applied:** 26 links (22 from architecture file + 4 from removing backtick-wrapped link text from audit file).

**Remaining issues in Round 3 docs:** 3 links to untracked test-results files (external reference rot, not relative-path bugs).

## BUCKET B: Pre-Existing Rot by Pattern

| Source File                                             | Broken Link Count | Pattern                                                                               | Recommended Ticket Scope            |
| ------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- | ----------------------------------- |
| `docs/CHANGELOG.md`                                     | 12                | links to deleted/archived active_plans files                                          | Archive links audit + clarification |
| `docs/CHANGELOG-2026-05c.md`                            | 2                 | same pattern as CHANGELOG.md                                                          | Archive links audit + clarification |
| `docs/TODO.md`                                          | 2                 | links to non-existent 96_well_enumeration files                                       | Backlog cleanup                     |
| `docs/USAGE.md`                                         | 2                 | links to material spec files no longer in expected location                           | Docs reorganization                 |
| `docs/CODE_ARCHITECTURE.md`                             | 3                 | links to `export_single_file.sh` (doesn't exist)                                      | Script inventory                    |
| `docs/FILE_STRUCTURE.md`                                | 3                 | same as CODE_ARCHITECTURE.md                                                          | Script inventory                    |
| `docs/TYPESCRIPT_STYLE.md`                              | 1                 | off-repo link to REPO_STYLE (bad path)                                                | Internal reference cleanup          |
| `docs/active_plans/audits/no_crop_svg_viewbox_audit.md` | 3                 | untracked test-results files                                                          | External tracking or link removal   |
| `docs/active_plans/new*.md` (older active plans)        | ~180              | links between sibling active_plans, many targets no longer exist                      | Historical cleanup (low priority)   |
| `docs/active_plans/workstreams/*.md`                    | ~35               | cross-references to root-level active_plans files, depth-path issues                  | Workstream structure audit          |
| `docs/archive/`                                         | ~180              | links to moved files, external experiments, deleted specs, missing CHANGELOG archives | Archive structure audit             |
| `experiments/css_native_layout/`                        | ~30               | links to non-existent docs/ resources and archive files                               | Experiment cleanup                  |

## Recommendations (ticket severity tiers)

### Tier 1: High Impact (blocking docs navigation)

- **Archive links audit:** CHANGELOG and sibling files contain 14+ broken links to files that were moved to `docs/active_plans/archive/` during earlier migrations. Audit linkage pattern and clarify whether these links should point to archive locations.

### Tier 2: Medium Impact (stale workstream references)

- **Workstream cross-reference repair:** ~35 broken links in `docs/active_plans/workstreams/` that reference sibling `docs/active_plans/` files using wrong depth or renamed targets. Pattern is consistent (sibling files renamed or moved), so a bulk fix is feasible.

### Tier 3: Low Impact (orphaned or experimental)

- **Experiment cleanup:** `experiments/css_native_layout/` contains ~30 links to deleted or moved resources. Decide whether to clean up links or archive the entire experiment folder.
- **New-plan historical cleanup:** ~180 links in `docs/active_plans/new0_*.md`, `docs/active_plans/new1_*.md`, `docs/active_plans/new2_*.md` cross-reference each other with many dead targets. Low priority; files are historical records.

## Files NOT requiring changes (out of scope)

Per task boundary, the following files were NOT edited (BUCKET B pre-existing rot):

- All `docs/CHANGELOG*.md` files
- All `docs/archive/**/*.md` files
- `docs/TODO.md`
- `docs/USAGE.md`
- `docs/CODE_ARCHITECTURE.md`
- `docs/FILE_STRUCTURE.md`
- `docs/TYPESCRIPT_STYLE.md`
- `docs/active_plans/new*.md` (new0*, new1*, new2\_ prefixed)
- `experiments/**/*.md`

## Recovery path forward

1. **Verify Round 3 fixes** (done): 26 links fixed, architecture file now clean, audit file has 3 untracked external references (not a relative-path bug).
2. **Decide on untracked test-results links:** Either track the test-results files in git or document that these links are intentionally external references and remove them from the error report scope.
3. **Create Tier 1 ticket:** Archive links audit (14+ CHANGELOG entries).
4. **Create Tier 2 ticket:** Workstream cross-reference repair (~35 links).
5. **Create Tier 3 ticket:** Experiment cleanup (optional; archive or ignore).

## Summary metrics

| Metric                                         | Value               |
| ---------------------------------------------- | ------------------- |
| Initial broken links (before Round 3 fixes)    | 534                 |
| After Round 3 relative-path fixes              | 498                 |
| Links fixed by Round 3 work                    | 36                  |
| Remaining pre-existing (BUCKET B)              | 498                 |
| Round 3 files affected                         | 2                   |
| Round 3 files now clean (relative-path errors) | 1 (architecture)    |
| Round 3 files with untracked-link remainder    | 1 (audit, 3 errors) |
