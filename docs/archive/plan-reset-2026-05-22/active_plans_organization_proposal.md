# Active plans organization proposal (Phase 1)

Proposal-only. No file moves, no `git mv`, no edits to
REPO_STYLE.md in this phase. Phase 2 (if approved)
applies moves and adds the REPO_STYLE.md section verbatim from section 6 below.

Surveyed at HEAD `8795d25`.

## 1. Current state summary

Top-level of `docs/active_plans/` (depth 1):

- 11 Markdown files at root
- 1 HTML and 1 PDF render of one status report (root-level)
- 2 asset sibling-folders at root
  (`current_css_native_layout_manager_status_report_assets/`,
  `new3_layout_stress_reliability_assets/`)
- 1 subdirectory `workstreams/` holding 14 Markdown artifacts (forward-only
  convention introduced mid-session)

Total tracked files surveyed: 52
(13 root-level entries + 24 asset PNGs + 14 workstream Markdown files; 1
root-level Markdown is the existing M1 inventory `active_plans_cleanup_inventory.md`).

Categorization of root-level Markdown files by purpose:

| File                                                      | Category                            |
| --------------------------------------------------------- | ----------------------------------- |
| `clean_up_active_plans.md`                                | active plan (this cleanup effort)   |
| `active_plans_cleanup_inventory.md`                       | audit (M1 artifact of cleanup plan) |
| `new0_new1_layout_rebuild_progress_report.md`             | status report                       |
| `new1_5_layout_hardening_results.md`                      | status report (results)             |
| `new1_well_plate_96_zoom_spike_result.md`                 | status report (spike)               |
| `new2_css_native_production_blocker_plan.md`              | active plan                         |
| `current_css_native_layout_manager_status_report.md`      | status report (current)             |
| `no_crop_round3_architecture_vocabulary_clarification.md` | meta / clarification                |
| `scene_runtime_activation_on_hold.md`                     | decision record (on-hold)           |

Workstream artifacts under `workstreams/` (14 files) are uniformly named with
a topic-tag prefix (`new2_`, `no_crop_`, `96_well_`, `round3_`) and fall into
two purposes:

- Audit/finding (`*_audit.md`, `*_shape_finding.md`, `*_render_sanity.md`,
  `*_test_matrix.md`, `*_regression_audit.md`)
- Brief/plan/proposal (`*_plan.md`, `*_proposal.md`, `*_repair_brief.md`,
  `*_repair_report.md`, `*_test_strategy.md`)

Asset folders sit beside the report they belong to, named
`<report_basename>_assets/`. This pairing is consistent and readable.

Overlap and stale signals:

- `new1_5_` (numeric-with-underscore) vs `new0_new1_` vs `new2_` vs `new3_`:
  the `NEW{N}` topic-tag is informally used as a cohort label; format is
  inconsistent (`new1_5_` reads ambiguously as "new 1.5" or "new 1 5").
- The "M1 inventory" file (`active_plans_cleanup_inventory.md`) lives at the
  root, but it is an audit artifact of `clean_up_active_plans.md`; under the
  proposed scheme it would live beside other workstream artifacts.
- `no_crop_round3_architecture_vocabulary_clarification.md` (root) and
  `workstreams/no_crop_round3_plan.md` are companion files separated by the
  forward-only policy.
- The HTML+PDF renders of one status report and the two `*_assets/` folders at
  root inflate the root-level entry count; pairing convention is fine, but a
  consistent home for "rendered report bundle" would make scanning cleaner.

## 2. Proposed organization scheme

Recommended: **hybrid (subdir-per-category + topic-tag naming inside each)**.

Layout:

```
docs/active_plans/
  active/                  # in-flight plans (one per active effort)
  audits/                  # audit and inventory artifacts (one-shot evidence)
  reports/                 # status reports, results, spikes (point-in-time)
  decisions/               # decision records, on-hold notices, clarifications
  workstreams/             # agent workstream artifacts (existing convention)
  <report_basename>_assets/  # paired asset folders sit beside their report inside reports/
```

Files keep their existing topic-tag prefixes (`new2_`, `no_crop_`, `96_well_`,
`round3_`) inside each subdir; the prefix carries the cohort, the subdir
carries the purpose.

Justification:

- Five small purpose-named subdirs separate "what is still being worked on"
  (`active/`, `workstreams/`) from "what was produced and is now reference"
  (`audits/`, `reports/`, `decisions/`). That separation answers the question
  "which files do I need to read to know the current state?" at folder
  granularity instead of filename-prefix scanning.
- Keeps the existing `workstreams/` convention untouched. New artifacts
  continue to land there forward-only.
- Topic-tag prefixes (`new2_`, `no_crop_`, etc.) remain the cohort grouping
  inside each subdir, so a reader following one effort still finds all its
  files by prefix-grep across the tree.
- Asset folders stay paired with their report (in `reports/`) under the
  established `<report_basename>_assets/` naming, preserving the readable
  pairing already used.

Rejected alternatives:

- **Flat with naming prefix only** (`active_*.md`, `audit_*.md`, `plan_*.md`).
  Rejected: doubles the prefix burden (purpose-prefix plus topic-tag prefix
  like `audit_new2_validator_preset_regression.md`), and the root-level entry
  count keeps growing without folder triage.
- **Status-based** (`active/`, `pending_review/`, `completed/`, `archived/`).
  Rejected: status churns; a doc moves between subdirs every time its state
  changes, fighting the forward-only norm and `git mv` policy. Lifecycle
  closure already triggers a move into `docs/archive/` (see section 5);
  in-tree status duplication is not worth the churn.
- **Subdir-per-category, no `workstreams/`** (fold workstream artifacts into
  `audits/` and `active/`). Rejected: workstream artifacts are a distinct
  social convention (agent-written, forward-only, do-not-edit) and benefit
  from their own home so policy is folder-scoped.

## 3. Forward-only or retroactive

Recommendation: **forward-only**, with one targeted exception requested below.

Rationale:

- The forward-only convention already governs `workstreams/`. Extending it to
  the new subdirs keeps history intact and avoids `git mv` churn on files
  cited by `docs/CHANGELOG.md` 2026-05-20 entries
  (`active_plans_cleanup_inventory.md` records every such citation).
- New files land in the correct subdir from day one; existing root-level
  files stay in place and are removed under the normal closure path (section 5) when their effort ends.

Targeted exception (request user decision in section 7):

- The current M1 cleanup effort
  ([clean_up_active_plans.md](clean_up_active_plans.md)) already plans a
  one-time sweep. If that sweep is approved, the cheapest moment to apply
  the subdir layout is during it, bundling category sorting with the cleanup
  moves rather than doing two sweeps. If the user prefers strictly
  forward-only here, no moves happen and the existing root-level files age
  out naturally.

If a retroactive sweep is approved, the required `git mv` commands are:

```
git mv docs/active_plans/clean_up_active_plans.md docs/active_plans/active/
git mv docs/active_plans/new2_css_native_production_blocker_plan.md docs/active_plans/active/

git mv docs/active_plans/active_plans_cleanup_inventory.md docs/active_plans/audits/

git mv docs/active_plans/new0_new1_layout_rebuild_progress_report.md docs/active_plans/reports/
git mv docs/active_plans/new1_5_layout_hardening_results.md docs/active_plans/reports/
git mv docs/active_plans/new1_well_plate_96_zoom_spike_result.md docs/active_plans/reports/
git mv docs/active_plans/current_css_native_layout_manager_status_report.md docs/active_plans/reports/
git mv docs/active_plans/current_css_native_layout_manager_status_report.html docs/active_plans/reports/
git mv docs/active_plans/current_css_native_layout_manager_status_report.pdf docs/active_plans/reports/
git mv docs/active_plans/current_css_native_layout_manager_status_report_assets docs/active_plans/reports/
git mv docs/active_plans/new3_layout_stress_reliability_assets docs/active_plans/reports/

git mv docs/active_plans/scene_runtime_activation_on_hold.md docs/active_plans/decisions/
git mv docs/active_plans/no_crop_round3_architecture_vocabulary_clarification.md docs/active_plans/decisions/
```

Inbound links from `docs/TODO.md`, `docs/CHANGELOG.md`, and any cross-file
references inside `docs/active_plans/` would need link rewrites in the same
commit. The inventory file already enumerates the inbound citation set.

## 4. Naming conventions

Filename casing:

- Markdown filenames inside `docs/active_plans/` use **snake_case**, not
  SCREAMING_SNAKE_CASE. `docs/REPO_STYLE.md` reserves SCREAMING_SNAKE_CASE
  for canonical repo-level docs (`docs/INSTALL.md`, `docs/USAGE.md`, etc.).
  Working-folder artifacts are short-lived per-effort files and follow the
  general "snake_case for most filenames" rule (REPO_STYLE.md "Naming").
  Current files already comply.
- Asset PNGs and HTML/PDF renders stay snake_case.

Date prefixes: **no.**

- Date prefixes encode point-in-time and quickly mislead when a file is
  updated. The topic-tag prefix already carries cohort identity; the file's
  git history carries the date.

Topic-tag prefixes: **yes, retained.**

- The existing `new2_`, `no_crop_`, `96_well_`, `round3_`, `new1_`, `new3_`
  prefixes group related artifacts by effort. They remain the primary
  in-folder sort key inside each subdir.
- Cohort labels should use a single underscore between tag and topic.
  Discourage compound numeric forms like `new1_5_`; prefer `new1_5_` only
  when the underlying cohort is genuinely named that way and document the
  rationale in the file's opening paragraph.

Asset folders:

- Continue using `<report_basename>_assets/` placed beside the report file
  (inside `reports/` under the proposed layout).

## 5. Lifecycle

Closure criteria for a file in `docs/active_plans/`:

- Its controlling effort is closed (plan landed, audit consumed, report
  superseded, decision applied).
- Its findings are reflected in canonical docs (`docs/specs/`, `docs/TODO.md`,
  `docs/ROADMAP.md`, or a follow-on plan) or in `docs/CHANGELOG.md`.

When a file leaves `docs/active_plans/`:

- It moves to `docs/archive/` (existing folder; `docs/ROADMAP.md` already
  cites it per the M1 inventory).
- The move uses `git mv` so history is preserved.
- Inbound links are updated in the same commit.

Archive trigger:

- A plan moves to archive when marked closed in its own header and no longer
  referenced by `docs/TODO.md` or `docs/ROADMAP.md`.
- An audit/report moves to archive when its conclusions are landed in
  canonical docs and its controlling plan is closed.
- A decision record moves to archive when the decision is reversed,
  superseded, or its scope is folded into canonical docs.
- Workstream artifacts move to archive as a bundle when the controlling
  effort closes (preserves cohort grouping).

`docs/active_plans/` is bounded: it should hold only currently-relevant
working files. Everything else lives in `docs/archive/` or in canonical
`docs/` files.

## 6. Draft REPO_STYLE.md entry

Suggested insertion point: after the existing "Documentation" section
(line 143 of REPO_STYLE.md) and before
"### Recommended common docs" (line 155), as a new subsection. This places
the working-folder rule next to the docs/-folder rules it depends on.

Verbatim section to add (29 lines):

```markdown
### Active plans working folder

`docs/active_plans/` is the working area for current planning, audit, and
agent-workstream artifacts. Files here are bounded-lifetime: they exist while
an effort is in flight and move to `docs/archive/` (via `git mv`) when the
effort closes.

Layout (subdir-per-category):

- `docs/active_plans/active/`: in-flight plans (one per active effort).
- `docs/active_plans/audits/`: audit and inventory artifacts.
- `docs/active_plans/reports/`: status reports, results, spikes, and their
  paired `<report_basename>_assets/` folders.
- `docs/active_plans/decisions/`: decision records, on-hold notices,
  vocabulary clarifications.
- `docs/active_plans/workstreams/`: agent-written workstream artifacts.
  Forward-only: do not move or edit existing files here.

Naming:

- snake_case filenames; do not use SCREAMING_SNAKE_CASE here.
- Keep cohort topic-tag prefixes (for example `new2_`, `no_crop_`, `96_well_`)
  so related artifacts sort together inside each subdir.
- No date prefixes; git history carries the date.
- Asset folders use `<report_basename>_assets/` and sit beside their report.

Lifecycle: a file leaves `docs/active_plans/` for `docs/archive/` when its
controlling effort closes and its findings are reflected in canonical docs or
`docs/CHANGELOG.md`. Inbound links are rewritten in the same commit.
```

## 7. Open questions for user

1. Approve the **hybrid subdir-per-category** scheme (section 2) or prefer
   one of the rejected alternatives?
2. Apply moves **forward-only** (default) or bundle a **one-time retroactive
   sweep** with the in-flight `clean_up_active_plans.md` effort (section 3)?
3. Confirm the **insertion point** for the REPO_STYLE.md entry (after
   "Documentation", before "### Recommended common docs"). Or prefer it as a
   top-level section of its own?
4. Is `docs/archive/` the agreed destination for closure moves (section 5),
   or should `docs/active_plans/` carry its own `archived/` subdir?
