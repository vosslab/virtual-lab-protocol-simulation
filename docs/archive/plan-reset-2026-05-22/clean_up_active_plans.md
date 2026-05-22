# Plan: docs/active_plans/ cleanup, folder split, and lifecycle policy

## Context

`docs/active_plans/` has grown to 130 files (~35M) with 7 asset directories. Inventory shows it has become a write-only graveyard: only a handful of files are referenced by current work (`docs/TODO.md`, `docs/ROADMAP.md`, the latest two `docs/CHANGELOG.md` day blocks). The remainder are finished diagnostic reports, batch closeouts (NEW0/NEW1/NEW1.5/NEW2/NEW3 series), incident postmortems (`git_incident_4e2c709_*`, `post_commit_4e2c709_*`), and one-shot evidence dumps with regeneratable HTML/PDF/`*_assets/` siblings consuming most of the disk footprint.

Approved scoping decisions (from initial scoping plus the manager-revision pass):

1. **Active = open work only.** A file stays in `docs/active_plans/` only if referenced by `docs/TODO.md`, `docs/ROADMAP.md`, the two newest `docs/CHANGELOG.md` day blocks, or names live in-flight work (no closeout/completion language). Everything else archives.
2. **Archive grouped by cluster** under `docs/archive/<cluster>/`. Existing flat `docs/archive/*.md` files are untouched.
3. **Drop generated artifacts.** HTML, PDF, and `*_assets/` siblings are deleted; the source `.md` archives alone. Every `DELETE:generated` row must record a regeneration recipe or an explicit "intentionally dropped" reason.
4. **Two-tier active plans folder.** Full multi-workstream plans live at `docs/active_plans/`. Focused single-workstream and diagnostic plans live under `docs/active_plans/workstreams/`. Existing KEEPs predate the policy and carry no `plan_type:` frontmatter; route them by heuristic during the sweep (filename contains `workstream`, `lane`, `audit`, `finding`, `diagnostic`, or `summary` -> `workstreams/`; OR file under 200 lines AND not declared a manager/full plan -> `workstreams/`; otherwise top-level). A subagent adds `plan_type: full | focused | diagnostic` frontmatter during the `git mv`. Going forward the lifecycle policy requires the frontmatter on new plans; it is not enforced retroactively against pre-policy KEEPs beyond the one-time heuristic route in this sweep.
5. **Lifecycle policy doc** at `docs/active_plans/README.md` defines entry, exit, naming, folder routing, and size limits.
6. **Inventory approval gate.** No `git mv`, no delete, no archive move until the inventory artifact is reviewed and approved by the user.
7. **One manager-owned `docs/CHANGELOG.md` rollup entry** for the entire sweep. No per-workstream changelog edits.
8. **Cluster README files in scope now.** Each new `docs/archive/<cluster>/` gets a 5-10 line `README.md` describing contents, date range, archive reason, and where active work moved.

The intended outcome: `docs/active_plans/` shrinks to a small set of full plans, `docs/active_plans/workstreams/` holds focused/diagnostic plans, archives preserve narrative grouped by theme, and a written policy gates future additions.

## Objectives

- Reduce `docs/active_plans/` (combined with the new `workstreams/` subdir) to only files referenced by live work signals, target 10-20 markdown files total.
- Split survivors between top-level (full multi-workstream plans) and `workstreams/` (focused / diagnostic) by frontmatter-declared `plan_type`.
- Group archived plans under `docs/archive/<cluster>/` with a per-cluster README so each closed initiative's narrative stays together and self-describing.
- Eliminate regeneratable artifacts from active plans, with every deletion backed by a recorded regeneration recipe or explicit drop reason.
- Publish a lifecycle policy at `docs/active_plans/README.md` defining the two-tier split and archive triggers.
- Update every inbound reference (TODO, ROADMAP, CHANGELOG, sibling plans, AGENTS.md if it names plan locations) to the new paths.

## Design philosophy

This plan leans on **long-term over short-term** and **fix the design, not the symptom** from `docs/REPO_STYLE.md`. A one-shot delete would cut bytes but not stop regrowth; pairing the sweep with a written lifecycle policy and a two-tier folder split rejects the next NEW4/NEW5 batch at authoring time. The two-tier split exists because today's flat layout mixes 800-line manager plans with 80-line single-file decision notes, making active scope unreadable; separating them by author-declared intent (frontmatter `plan_type`) gives readers an immediate signal without renaming files on archetype boundary changes. The rejected alternative is a date-bucketed archive (`docs/archive/YYYY-MM/`): simpler to automate but scatters each initiative's narrative across the month it happened to close, defeating archive value for future archaeologists who want "everything we learned about CSS-native layout" in one place.

## Scope

- Inventory every entry in `docs/active_plans/` (tracked, untracked, directories, generated siblings, asset directories) and classify it as KEEP / ARCHIVE:<cluster> / DELETE:generated with the columns listed under Current state summary.
- Produce a dry-run move preview as part of the inventory: old path, new path or delete, reason, affected inbound links.
- Create the `docs/active_plans/workstreams/` subdirectory for focused/diagnostic plans.
- Move `.md` survivors-to-archive into `docs/archive/<cluster>/` via `git mv`.
- Delete `.html`, `.pdf`, and `*_assets/` directories that are regeneratable from the source `.md`, only after the inventory records a regeneration recipe or drop reason per row.
- Add a 5-10 line `README.md` to each new `docs/archive/<cluster>/` describing the cluster.
- Move KEEP files declared `plan_type: focused` or `plan_type: diagnostic` into `docs/active_plans/workstreams/`.
- Update inbound references (`docs/TODO.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, sibling plans, `docs/FILE_STRUCTURE.md`, and `AGENTS.md` if it names plan locations).
- Write `docs/active_plans/README.md` defining the lifecycle policy and the full/focused split.
- Write a single manager-owned `docs/CHANGELOG.md` rollup entry after the sweep is stable.

## Non-goals

- Do not delete any source markdown without archiving first; nothing destroyed beyond regeneratable artifacts with recorded recipes or drop reasons.
- Do not rewrite the bodies of archived plans for clarity, accuracy, or style; archive as-is.
- Do not flatten or rename existing `docs/archive/*.md` legacy contents; new cluster subdirs sit beside them.
- Do not touch the live CSS-native status report set (`current_css_native_layout_manager_status_report.{md,html,pdf}` plus assets) -- exempt for this sweep; the lifecycle policy declares the exemption expires when active user review ends.
- Do not touch `~/.claude/plans/` (agent scratch plans); this sweep is for the repo-tracked `docs/active_plans/` only.
- Do not let any non-manager workstream edit `docs/CHANGELOG.md` mid-sweep; the rollup is a single manager-owned patch.

## Current state summary

Inventory snapshot (taken via `ls docs/active_plans/` and `git status`, 130 entries, ~35M):

- **NEW\* series:** 60 files across NEW0 (stabilization), NEW1 + NEW1.5 (CSS-native spike), NEW2 (production blockers), NEW3 (batch 1-5 stress reliability). All four series closed per CHANGELOG 2026-05-20 and prior.
- **no_crop / no_cropped_svg cluster:** 16 files. Visual integrity rule diagnostics + round 2 acceptance reports.
- **git_incident_4e2c709 + post_commit_4e2c709:** 9 files. Postmortem and recovery scaffolding; commit `4e2c709` is now the accepted baseline per CHANGELOG.
- **Generated artifact clutter:** 12 HTML+PDF pairs, 7 `*_assets/` directories. Roughly 30M of the 35M footprint.
- **In-flight signals:**
  - `docs/TODO.md` references `scene_runtime_activation_on_hold.md` and `96_well_authoring_shape_finding.md`.
  - `docs/CHANGELOG.md` latest entry (2026-05-21) references `current_css_native_layout_manager_status_report.{md,html,pdf}` -- temporarily exempt; expires when active review ends.
  - Untracked working files per `git status`: `new_manager_no_crop_readin.md`, `no_crop_scope_reconciliation.md`. Default treatment: stage and archive with the no_crop cluster unless user reclassifies during M1 approval.
- **Other singletons:** ~20 odd files (layout audits, vocabulary plans, decision logs) -- per-file triage; default cluster `misc_2026_05`.

`docs/archive/` already holds 68 flat-named files going back to 2026-04. Extending it with cluster subdirs preserves that history without renaming.

### Required inventory artifact

The inventory is a single markdown file at `docs/active_plans/active_plans_cleanup_inventory.md`. It enumerates every entry in `docs/active_plans/` with these columns:

| Column               | Required content                                                                                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| path                 | Repo-relative path, including trailing `/` for directories                                                                                                                                                                                  |
| tracked              | `tracked` or `untracked` (from `git status` + `git ls-files`)                                                                                                                                                                               |
| size                 | `du -sh` output (one line per row)                                                                                                                                                                                                          |
| classification       | `KEEP`, `ARCHIVE:<cluster>`, or `DELETE:generated`                                                                                                                                                                                          |
| reason               | One sentence citing the live-work signal or the closeout evidence                                                                                                                                                                           |
| inbound references   | Files that link to this path (`git grep -l <path> docs/`)                                                                                                                                                                                   |
| regeneration recipe  | Only for `DELETE:generated`: one of (a) regeneration command (e.g., `node tools/html_to_pdf.mjs --input X.md`), (b) source markdown path, (c) `regenerable from test-results`, (d) `intentionally dropped, not required as source evidence` |
| proposed destination | Only for `ARCHIVE:<cluster>` and KEEP-with-move-to-`workstreams/`: target path                                                                                                                                                              |

The inventory must include tracked files, untracked files, directories, generated HTML/PDF siblings, and `*_assets/` directories. Sourcing only `git ls-files` would miss the two untracked working files plus directory entries; the inventory script must combine `git ls-files docs/active_plans/`, `find docs/active_plans -maxdepth 1`, and `git status --porcelain docs/active_plans/`.

The bottom of the inventory contains a **dry-run move preview** table mirroring the rows: `old path | new path or DELETE | reason | affected inbound links`. This is the artifact the user reviews and approves at the M1 gate.

## Architecture boundaries and ownership

Surfaces touched:

- **`docs/active_plans/`** -- shrinks to live full multi-workstream plans only. After sweep, no `NEW<N>_*` files, no batch closeouts, no `*_assets/` directories, no HTML/PDF (except the exempted CSS-native status report set, time-limited).
- **`docs/active_plans/workstreams/` (new)** -- holds KEEP files declared `plan_type: focused` or `plan_type: diagnostic`.
- **`docs/archive/`** -- gains cluster subdirectories (`css_native_layout/`, `git_incident_4e2c709/`, `no_crop_svg/`, `scene_runtime/`, `misc_2026_05/`), each with a `README.md`. Legacy flat contents untouched.
- **Reference graph** -- `docs/TODO.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/FILE_STRUCTURE.md`, `AGENTS.md` (if it names plan locations), and any sibling plan with relative links must be repointed. Owned by a single manager-workstream to avoid merge conflicts.

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream | Component                                                                                                         | Expected patches |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------- |
| M1 / WS-INVENTORY      | `docs/active_plans/active_plans_cleanup_inventory.md` (new)                                                       | 1                |
| M2 / WS-NEW-SERIES     | `docs/active_plans/new*` -> `docs/archive/css_native_layout/`                                                     | 1-2              |
| M2 / WS-NO-CROP        | `docs/active_plans/no_crop*`, `no_cropped*` -> `docs/archive/no_crop_svg/`                                        | 1                |
| M2 / WS-INCIDENT       | `docs/active_plans/git_incident*`, `post_commit*` -> `docs/archive/git_incident_4e2c709/`                         | 1                |
| M2 / WS-SCENE-RUNTIME  | `docs/active_plans/scene_runtime*`, `row_slot*`, related                                                          | 1                |
| M2 / WS-MISC           | residual singletons -> `docs/archive/misc_2026_05/`                                                               | 1                |
| M2 / WS-DELETE-GEN     | HTML, PDF, `*_assets/` deletes                                                                                    | 1                |
| M2 / WS-FOCUSED-MOVE   | KEEP files with `plan_type: focused` or `diagnostic` -> `docs/active_plans/workstreams/`                          | 1                |
| M2 / WS-CLUSTER-README | One `README.md` per new `docs/archive/<cluster>/`                                                                 | 1                |
| M3 / WS-REFS           | `docs/TODO.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/FILE_STRUCTURE.md`, `AGENTS.md`, sibling plan links | 1                |
| M4 / WS-POLICY         | `docs/active_plans/README.md` (new)                                                                               | 1                |
| M4 / WS-CHANGELOG      | `docs/CHANGELOG.md` rollup entry (manager-owned, single patch)                                                    | 1                |

## Milestone plan

### Milestone 1: Inventory and classification

- Depends on: none.
- Workstreams: WS-INVENTORY (single workstream; classification is the gating decision).
- Entry criteria: none.
- Exit criteria:
  - `docs/active_plans/active_plans_cleanup_inventory.md` exists with the eight required columns plus the dry-run move preview table.
  - Inventory includes tracked, untracked, directory, and asset-directory rows (not only `git ls-files` output).
  - Every NEW\*/no_crop/git_incident/post_commit row has a non-KEEP classification (CHANGELOG-confirmed closed).
  - Every file referenced by `docs/TODO.md`, `docs/ROADMAP.md`, or the latest two `docs/CHANGELOG.md` day blocks is classified KEEP.
  - Every KEEP row has a proposed destination: top-level `docs/active_plans/` (if `plan_type: full`) or `docs/active_plans/workstreams/` (if `plan_type: focused` or `diagnostic`); rows missing frontmatter default to top-level with a note.
  - Every `DELETE:generated` row has a regeneration recipe or explicit drop reason.
  - User has reviewed and approved the inventory (one-line approval in chat). No M2 work begins before this.
  - If final KEEP count exceeds 20, the inventory explains why each extra file is genuinely active.
- Parallel-plan ready: no -- classification is one indivisible decision pass that gates every later move; splitting it produces inconsistent cluster assignments.

### Milestone 2: Execute moves, deletions, and cluster READMEs

- Depends on: M1 (the approved inventory drives every move).
- Workstreams: WS-NEW-SERIES, WS-NO-CROP, WS-INCIDENT, WS-SCENE-RUNTIME, WS-MISC, WS-DELETE-GEN, WS-FOCUSED-MOVE, WS-CLUSTER-README. Eight workstreams touch disjoint paths.
- Entry criteria: M1 exit met; `docs/archive/<cluster>/` and `docs/active_plans/workstreams/` target directories created on first `git mv`.
- Exit criteria:
  - Every `ARCHIVE:<cluster>` file moved via `git mv` to `docs/archive/<cluster>/` (no `mv`, no `git rm` + `git add`).
  - Every `DELETE:generated` HTML, PDF, and `*_assets/` directory removed (asset dirs via `git rm -r`).
  - Every KEEP file with `plan_type: focused` or `diagnostic` lives under `docs/active_plans/workstreams/`.
  - Each new `docs/archive/<cluster>/` has a 5-10 line `README.md`: contents summary, date range, archive reason, where active work moved.
  - `ls docs/active_plans/` (top level) shows only KEEP full-plan files plus the exempted CSS-native status report set, plus the new `workstreams/` and `README.md` (the README lands in M4).
  - `du -sh docs/active_plans/` under 5M (down from 35M).
  - No broken relative links inside surviving `.md` files; `pytest tests/test_markdown_links.py` passes after M2.
  - **No workstream edits `docs/CHANGELOG.md` during M2.** The rollup is M4 work.
- Parallel-plan ready: yes -- max parallel doers: 8, one per workstream, each owning a disjoint path prefix.

### Milestone 3: Update inbound references

- Depends on: M2 (paths must be finalized before relinking).
- Workstreams: WS-REFS (single owner to avoid merge conflicts in `docs/TODO.md`, `docs/ROADMAP.md`, `docs/FILE_STRUCTURE.md`, `AGENTS.md`).
- Entry criteria: M2 exit met; `git ls-files docs/archive/` confirms all moves landed.
- Exit criteria:
  - Every link in `docs/TODO.md`, `docs/ROADMAP.md`, `docs/FILE_STRUCTURE.md`, `AGENTS.md`, surviving `docs/active_plans/*.md`, and surviving `docs/active_plans/workstreams/*.md` resolves (verified via `tests/test_markdown_links.py`).
  - `docs/FILE_STRUCTURE.md` documents the new `docs/active_plans/workstreams/` subdir and the `docs/archive/<cluster>/` layout.
  - `AGENTS.md` "Where to find things" cross-references the new lifecycle README.
- Parallel-plan ready: no -- one coder to avoid concurrent edits on the same handful of root docs.

### Milestone 4: Lifecycle policy and changelog rollup

- Depends on: M3 (policy reflects the final layout).
- Workstreams: WS-POLICY, WS-CHANGELOG. Disjoint files; run in parallel.
- Entry criteria: M3 exit met.
- Exit criteria:
  - `docs/active_plans/README.md` exists and defines:
    - entry criteria (open in-flight work signal),
    - exit/archive triggers (closeout commit, ROADMAP move-to-Delivered),
    - folder routing rule (`plan_type: full` -> top-level; `focused` / `diagnostic` -> `workstreams/`),
    - frontmatter requirement (`plan_type` field mandatory),
    - naming rules (ban `NEW<N>_*`, ban batch numbering, prefer `<topic>_<intent>.md`),
    - max active count (target 20 across both tiers; soft cap),
    - `*_assets/` ban (regenerable artifacts do not live in `active_plans/`),
    - generated-sibling exemption rule (allowed only during active user review; expires automatically when the source markdown is no longer cited in the latest two `docs/CHANGELOG.md` day blocks),
    - inventory artifact convention for future cleanups (use `docs/active_plans/active_plans_cleanup_inventory.md`).
  - `docs/CHANGELOG.md` carries a **single manager-owned rollup entry** for the sweep under today's date with only the non-empty subsection headings (Additions / Fixes / Removals / Decisions per REPO_STYLE rule "categories are not required when empty").
  - Final `ls docs/active_plans/` + `ls docs/active_plans/workstreams/` combined count is 10-20; recorded in the CHANGELOG entry.
- Parallel-plan ready: yes -- max parallel doers: 2.

## Workstream breakdown

### Workstream WS-INVENTORY: Classify every entry (full inventory + dry-run preview)

- Owner: `planner` (read-only, decision-grade).
- Interfaces:
  - Needs: `git ls-files docs/active_plans/`, `git status --porcelain docs/active_plans/`, `find docs/active_plans -maxdepth 1`, `du -sh` per entry, `git grep -l <path> docs/` per entry, latest two `docs/CHANGELOG.md` day blocks, `docs/TODO.md`, `docs/ROADMAP.md`, frontmatter probe for `plan_type`.
  - Provides: `docs/active_plans/active_plans_cleanup_inventory.md` with eight columns plus dry-run preview table.
- Expected patches: 1.

### Workstream WS-NEW-SERIES: Archive NEW0/NEW1/NEW1.5/NEW2/NEW3

- Owner: `maintainer`.
- Interfaces:
  - Needs: approved inventory.
  - Provides: `docs/archive/css_native_layout/<file>.md` for each NEW\* survivor.
- Expected patches: 1-2 (split if review queue stalls).

### Workstream WS-NO-CROP: Archive no_crop / no_cropped_svg

- Owner: `maintainer`.
- Interfaces: approved inventory in, archived `.md` under `docs/archive/no_crop_svg/` out.
- Expected patches: 1.

### Workstream WS-INCIDENT: Archive git_incident_4e2c709 + post_commit_4e2c709

- Owner: `maintainer`.
- Interfaces: approved inventory in, archived `.md` under `docs/archive/git_incident_4e2c709/` out.
- Expected patches: 1.

### Workstream WS-SCENE-RUNTIME: Archive scene_runtime, row_slot, related layout plans

- Owner: `maintainer`.
- Interfaces: approved inventory in (KEEP `scene_runtime_activation_on_hold.md` per TODO reference), archived `.md` under `docs/archive/scene_runtime/` out.
- Expected patches: 1.

### Workstream WS-MISC: Archive residual singletons

- Owner: `maintainer`.
- Interfaces: approved inventory in, archived `.md` under `docs/archive/misc_2026_05/` out.
- Expected patches: 1.

### Workstream WS-DELETE-GEN: Delete HTML / PDF / \*\_assets/

- Owner: `maintainer`.
- Interfaces: approved inventory in (each DELETE:generated row has regeneration recipe or drop reason), removal of regeneratable artifacts out.
- Expected patches: 1.

### Workstream WS-FOCUSED-MOVE: Move focused/diagnostic KEEPs into workstreams/

- Owner: `maintainer`.
- Interfaces: approved inventory in (rows tagged with `plan_type: focused` or `diagnostic` proposed-destination = `docs/active_plans/workstreams/`), `git mv` results out.
- Expected patches: 1.

### Workstream WS-CLUSTER-README: Write per-cluster archive READMEs

- Owner: `planner` or `maintainer` (low-skill prose).
- Interfaces:
  - Needs: M2 archive contents finalized for that cluster (read-only `ls docs/archive/<cluster>/`).
  - Provides: one `README.md` per new `docs/archive/<cluster>/` with contents, date range, archive reason, pointer to where active work moved.
- Expected patches: 1.

### Workstream WS-REFS: Repoint inbound links

- Owner: `maintainer`.
- Interfaces: M2 finalized paths in, passing `pytest tests/test_markdown_links.py` out.
- Expected patches: 1.

### Workstream WS-POLICY: Lifecycle policy doc

- Owner: `planner`.
- Interfaces: M3 final layout in, `docs/active_plans/README.md` out.
- Expected patches: 1.

### Workstream WS-CHANGELOG: Manager-owned rollup changelog entry

- Owner: `maintainer` (single owner, single patch -- no per-workstream changelog edits anywhere upstream).
- Interfaces: M3 finalized + WS-POLICY landed in, single `docs/CHANGELOG.md` entry out.
- Expected patches: 1.

## Work packages

### Work package WP-INV-1: Produce active_plans_cleanup_inventory.md

- Owner: `planner`.
- Touch points: `docs/active_plans/active_plans_cleanup_inventory.md` (new); read-only on `docs/TODO.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, every file in `docs/active_plans/`.
- Depends on: none.
- Acceptance criteria:
  - One row per current entry (tracked + untracked + directory + asset-dir + HTML/PDF), expected 130+ rows.
  - All eight columns populated.
  - Dry-run preview table at bottom: old path / new path or DELETE / reason / affected inbound links.
  - Final KEEP count between 10 and 20 (or inventory explains each extra above 20).
  - Every `DELETE:generated` row has regeneration recipe or explicit drop reason.
  - Every KEEP row has frontmatter-derived `plan_type` and a proposed destination.
  - User approves the inventory before any M2 work runs.
- Verification commands:
  - `git ls-files docs/active_plans/ | wc -l` plus `find docs/active_plans -maxdepth 1 ! -path docs/active_plans | wc -l` -- combined count matches inventory row count.
  - `grep -c '^| KEEP' docs/active_plans/active_plans_cleanup_inventory.md` returns 10-20.
  - `grep '^| DELETE:generated' docs/active_plans/active_plans_cleanup_inventory.md | grep -c -E 'regeneration|source markdown|test-results|intentionally dropped'` matches DELETE:generated row count.
- Obvious follow-ons: deliver inventory to user; wait for approval before kicking off M2.

### Work package WP-NEW-1: git mv NEW0/NEW1/NEW1.5 files to docs/archive/css_native_layout/

- Owner: `maintainer`.
- Touch points: `docs/active_plans/new0_*`, `new1_*`, `new1_5_*`.
- Depends on: WP-INV-1.
- Acceptance criteria:
  - Every `ARCHIVE:css_native_layout` row for these prefixes lands under `docs/archive/css_native_layout/`.
  - `git status --porcelain` shows only renames for these paths (no `D` + `A` pairs).
- Verification commands:
  - `git status --porcelain docs/archive/css_native_layout/ | grep -c '^R'` matches expected count.
- Obvious follow-ons: none mid-workstream; CHANGELOG is the M4 rollup, not per-workstream.

### Work package WP-NEW-2: git mv NEW2/NEW3 files to docs/archive/css_native_layout/

- Owner: `maintainer`.
- Touch points: `docs/active_plans/new2_*`, `new3_*`.
- Depends on: WP-INV-1.
- Acceptance: same shape as WP-NEW-1 for NEW2/NEW3 rows.
- Verification: same shape as WP-NEW-1.
- Obvious follow-ons: none mid-workstream.

### Work package WP-NOCROP-1: git mv no_crop / no_cropped_svg files

- Owner: `maintainer`.
- Touch points: `docs/active_plans/no_crop*`, `no_cropped_svg*`.
- Depends on: WP-INV-1.
- Acceptance: every ARCHIVE:no_crop_svg row lands under `docs/archive/no_crop_svg/`.
- Verification: `git status --porcelain docs/archive/no_crop_svg/ | grep -c '^R'` matches expected count.
- Obvious follow-ons: none mid-workstream.

### Work package WP-INC-1: git mv git_incident_4e2c709 + post_commit_4e2c709

- Owner: `maintainer`.
- Touch points: `docs/active_plans/git_incident_*`, `post_commit_4e2c709_*`.
- Depends on: WP-INV-1.
- Acceptance: every ARCHIVE:git_incident_4e2c709 row lands under `docs/archive/git_incident_4e2c709/`.
- Verification: `git status --porcelain docs/archive/git_incident_4e2c709/ | grep -c '^R'` matches expected count.
- Obvious follow-ons: none mid-workstream.

### Work package WP-SR-1: git mv scene_runtime + row_slot files

- Owner: `maintainer`.
- Touch points: `docs/active_plans/scene_runtime_*` (except KEEP-tagged on-hold doc), `row_slot_*`, related layout audits.
- Depends on: WP-INV-1.
- Acceptance: every ARCHIVE:scene_runtime row lands under `docs/archive/scene_runtime/`. KEEP-tagged `scene_runtime_activation_on_hold.md` stays in `docs/active_plans/` (or moves to `workstreams/` if frontmatter says `focused`).
- Verification: `git status --porcelain docs/archive/scene_runtime/ | grep -c '^R'` matches expected count.
- Obvious follow-ons: none mid-workstream.

### Work package WP-MISC-1: git mv residual singletons

- Owner: `maintainer`.
- Touch points: every ARCHIVE:misc_2026_05 file.
- Depends on: WP-INV-1.
- Acceptance: lands under `docs/archive/misc_2026_05/`.
- Verification: `git status --porcelain docs/archive/misc_2026_05/ | grep -c '^R'` matches expected count.
- Obvious follow-ons: none mid-workstream.

### Work package WP-DEL-1: Remove HTML, PDF, \*\_assets/

- Owner: `maintainer`.
- Touch points: every DELETE:generated row.
- Depends on: WP-INV-1.
- Acceptance criteria:
  - `git ls-files docs/active_plans/ | grep -E '\.(html|pdf)$'` returns only exempted CSS-native status report set.
  - `git ls-files docs/active_plans/ | grep '_assets/'` returns empty (or only the exempted CSS-native assets dir).
  - `du -sh docs/active_plans/` under 5M.
- Verification commands: as above.
- Obvious follow-ons: none mid-workstream.

### Work package WP-FOC-1: Move focused/diagnostic KEEPs into workstreams/

- Owner: `maintainer`.
- Touch points: every KEEP row whose frontmatter has `plan_type: focused` or `plan_type: diagnostic`, plus `docs/active_plans/workstreams/` directory creation on first `git mv`.
- Depends on: WP-INV-1.
- Acceptance criteria:
  - `docs/active_plans/workstreams/` exists with at least one file.
  - Every focused/diagnostic KEEP file lives under `workstreams/`.
  - Top-level `docs/active_plans/` holds only full-plan KEEPs plus the inventory artifact plus the exempted CSS-native status report set.
- Verification commands:
  - `git ls-files docs/active_plans/workstreams/ | wc -l` matches focused/diagnostic KEEP count from inventory.
- Obvious follow-ons: none mid-workstream.

### Work package WP-CLR-1: Write per-cluster archive READMEs

- Owner: `planner` or `maintainer`.
- Touch points: `docs/archive/<cluster>/README.md` for each new cluster (five new READMEs: css_native_layout, no_crop_svg, git_incident_4e2c709, scene_runtime, misc_2026_05).
- Depends on: WP-NEW-1, WP-NEW-2, WP-NOCROP-1, WP-INC-1, WP-SR-1, WP-MISC-1 (each cluster README needs its cluster's archive moves landed).
- Acceptance criteria:
  - Each README is 5-10 lines.
  - Each names: contents summary, date range (earliest to latest `## YYYY-MM-DD` referenced inside), archive reason, where active work moved.
- Verification commands:
  - `wc -l docs/archive/*/README.md` shows each between 5 and 15 lines.
  - `source source_me.sh && pytest tests/test_markdown_links.py` passes.
- Obvious follow-ons: none mid-workstream.

### Work package WP-REF-1: Repoint TODO / ROADMAP / sibling plans / FILE_STRUCTURE / AGENTS

- Owner: `maintainer`.
- Touch points: `docs/TODO.md`, `docs/ROADMAP.md`, `docs/FILE_STRUCTURE.md`, `AGENTS.md` (if it names plan locations), every `docs/active_plans/*.md`, `docs/active_plans/workstreams/*.md`, and `docs/archive/<cluster>/*.md` survivor with cross-links. **Does NOT touch `docs/CHANGELOG.md` (that is M4 rollup).**
- Depends on: WP-NEW-1, WP-NEW-2, WP-NOCROP-1, WP-INC-1, WP-SR-1, WP-MISC-1, WP-DEL-1, WP-FOC-1, WP-CLR-1.
- Acceptance criteria:
  - `source source_me.sh && pytest tests/test_markdown_links.py` passes.
  - `git grep -l 'docs/active_plans/' docs/` returns only KEEP-tagged paths (top-level or `workstreams/`).
  - `docs/FILE_STRUCTURE.md` documents both `docs/active_plans/workstreams/` and `docs/archive/<cluster>/` patterns.
- Verification commands:
  - `source source_me.sh && pytest tests/test_markdown_links.py`.
  - `git grep -c 'docs/active_plans/' docs/TODO.md docs/ROADMAP.md docs/FILE_STRUCTURE.md AGENTS.md`.
- Obvious follow-ons: none mid-workstream.

### Work package WP-POL-1: Write lifecycle policy README

- Owner: `planner`.
- Touch points: `docs/active_plans/README.md` (new); cross-link added to `AGENTS.md` only if a previous AGENTS edit did not already include it.
- Depends on: WP-REF-1.
- Acceptance criteria:
  - README defines all bullets listed in M4 exit criteria, including the full/focused/diagnostic frontmatter rule, the generated-sibling expiration rule, and the inventory artifact convention.
  - 30-150 lines.
- Verification commands:
  - `source source_me.sh && pytest tests/test_markdown_links.py` passes after addition.
  - `wc -l docs/active_plans/README.md` between 30 and 150.
- Obvious follow-ons: none mid-workstream.

### Work package WP-CL-1: Single manager-owned CHANGELOG rollup entry

- Owner: `maintainer`.
- Touch points: `docs/CHANGELOG.md`.
- Depends on: WP-REF-1, WP-POL-1.
- Acceptance criteria:
  - **One** dated entry under today's `## YYYY-MM-DD` heading covers entire sweep.
  - Only non-empty subsection headings appear (Additions / Fixes / Removals / Decisions per REPO_STYLE).
  - Records final `docs/active_plans/` + `docs/active_plans/workstreams/` combined file count.
  - Lists each archive cluster created.
  - References the lifecycle policy README.
- Verification commands:
  - `source source_me.sh && pytest tests/test_markdown_links.py` passes.
- Obvious follow-ons: none -- terminal work package.

## Acceptance criteria and gates

- **M1 manual approval gate**: user signs off on the inventory in chat before any M2 work begins. Hard gate; no M2 work package may run without it.
- Per-patch gate: each `git mv`-only patch shows zero content drift (`git diff --find-renames=100% docs/active_plans/ docs/archive/` yields rename-only delta for that patch's slice).
- Integration gate: at end of M3, `pytest tests/test_markdown_links.py` passes; no broken link in any doc touched.
- Single-changelog gate: at any point during M2 and M3, `git diff docs/CHANGELOG.md` is empty. Only WP-CL-1 writes to it.
- Final gate: combined `ls docs/active_plans/ docs/active_plans/workstreams/` shows 10-20 files; `du -sh docs/active_plans/` under 5M; `docs/active_plans/README.md` exists; every new `docs/archive/<cluster>/` has a README.

## Test and verification strategy

- **Mechanical**: `tests/test_markdown_links.py` is the load-bearing check. Run after M2 (full suite), end of M3, and again after M4.
- **Inventory completeness**: row count in `active_plans_cleanup_inventory.md` matches combined `git ls-files docs/active_plans/` + `find docs/active_plans -maxdepth 1` + `git status --porcelain docs/active_plans/` before any move.
- **Rename integrity**: `git status --porcelain` after each M2 work package shows rename-only entries (`R` lines), no `D` + `A` pairs.
- **Reference graph**: `git grep 'docs/active_plans/' docs/` after M3 returns only KEEP paths (top-level or `workstreams/`).
- **Disk footprint**: `du -sh docs/active_plans/` after M2 confirms target under 5M.
- **Changelog isolation**: `git log --since=<M2 start> -- docs/CHANGELOG.md` shows exactly one commit, from WP-CL-1.
- **Cluster README presence**: `ls docs/archive/*/README.md` shows one per new cluster.

## Migration and compatibility policy

- Additive rollout: archive subdirectories (`docs/archive/<cluster>/`) and `docs/active_plans/workstreams/` created on first `git mv`. Legacy flat `docs/archive/*.md` files untouched.
- Backward compatibility: every archived plan stays reachable at its new path; commit messages reference both old and new paths so `git log --follow` traces the rename.
- Deletion criteria for legacy paths: HTML, PDF, and `*_assets/` directories deleted permanently. Each deletion is backed by an inventory row recording one of (a) regeneration command, (b) source markdown path, (c) `regenerable from test-results`, (d) `intentionally dropped, not required as source evidence`.
- Generated-sibling exemption: the CSS-native status report set (`current_css_native_layout_manager_status_report.{md,html,pdf}` plus assets) is exempt for this sweep. The lifecycle policy declares the exemption auto-expires once the source markdown is no longer cited in the latest two `docs/CHANGELOG.md` day blocks; at that point, the next cleanup pass treats the generated siblings under the standard rule.
- Rollback strategy: every M2 patch is a pure `git mv` plus pure deletes; revert is one `git revert <sha>`. Inventory in M1 is read-only and produces a fresh artifact; reverting just deletes the artifact.

## Risk register

| Risk                                                        | Impact | Trigger                                       | Owner                      | Mitigation                                                                                                                                            |
| ----------------------------------------------------------- | ------ | --------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| In-flight file misclassified as ARCHIVE                     | medium | User flags missing file after move            | planner (WS-INVENTORY)     | M1 hard manual approval gate before any M2 work                                                                                                       |
| Generated artifact deleted without recipe captured          | medium | Future request to rebuild a PDF               | maintainer (WS-DELETE-GEN) | DELETE:generated rows must name regeneration tool, source markdown, or explicit drop reason; inventory column is mandatory                            |
| Concurrent M2 workstreams edit CHANGELOG and conflict       | medium | Two patches touch `docs/CHANGELOG.md`         | manager                    | Hard rule: only WP-CL-1 writes to CHANGELOG; M2 acceptance includes "no CHANGELOG diff" check                                                         |
| Untracked active_plans files missed by inventory            | medium | User notices file not classified              | planner (WS-INVENTORY)     | Inventory must combine `git ls-files`, `git status --porcelain`, and `find -maxdepth 1`; never rely on `git ls-files` alone                           |
| Frontmatter missing on a KEEP file (no `plan_type`)         | low    | WP-FOC-1 cannot route the file                | planner (WS-INVENTORY)     | Inventory rows for KEEPs without frontmatter default proposed destination to top-level `docs/active_plans/` with a note; user resolves at M1 approval |
| Concurrent M2 workstreams collide on a shared ref doc       | low    | `git status` shows two edits on same file     | manager                    | M3 (refs) is single-owner; M2 workstreams touch disjoint path prefixes; cluster READMEs land in WP-CLR-1, not in per-workstream patches               |
| Broken relative link inside an archived plan                | low    | `pytest tests/test_markdown_links.py` fails   | maintainer (WS-REFS)       | Run link test after each M2 patch and at M3 exit                                                                                                      |
| `git mv` fails with `.git/index.lock`                       | low    | Hook reports lock                             | maintainer                 | Follow REPO_STYLE locked-index protocol: stop, report, do not auto-delete                                                                             |
| Lifecycle policy too strict, blocks legitimate future plans | low    | User feedback after first new plan            | planner (WS-POLICY)        | Policy lists 20 as soft cap; user override allowed; folder split routes by `plan_type`, not by count                                                  |
| Cluster README drifts from cluster contents                 | low    | Future archive addition without README update | maintainer                 | Lifecycle policy requires touching cluster README on every future archive-add patch                                                                   |

## Rollout and release checklist

- [ ] M1: `docs/active_plans/active_plans_cleanup_inventory.md` published with eight columns and dry-run preview.
- [ ] M1: Inventory includes tracked, untracked, directory, and asset-dir rows.
- [ ] M1: User approves inventory in chat. (Hard gate -- no M2 begins without this.)
- [ ] M2: All eight M2 work packages landed.
- [ ] M2: `docs/active_plans/workstreams/` exists; focused/diagnostic KEEPs live there.
- [ ] M2: Each new `docs/archive/<cluster>/` has a `README.md`.
- [ ] M2: `du -sh docs/active_plans/` under 5M.
- [ ] M2: `git diff docs/CHANGELOG.md` empty (no per-workstream changelog edits).
- [ ] M3: `pytest tests/test_markdown_links.py` passes.
- [ ] M3: `git grep 'docs/active_plans/' docs/` returns only KEEP paths.
- [ ] M3: `docs/FILE_STRUCTURE.md` documents the workstreams/ subdir and archive cluster pattern.
- [ ] M4: `docs/active_plans/README.md` exists with full/focused split rule and generated-sibling expiration policy.
- [ ] M4: `docs/CHANGELOG.md` rollup entry under today's date (single manager-owned patch).
- [ ] Final: combined active_plans + workstreams count between 10 and 20; number recorded in CHANGELOG.

## Documentation close-out requirements

- Active plan tracker: this plan itself (`~/.claude/plans/and-look-at-this-vivid-wozniak.md`) -- decision-needed whether it lands in repo (`docs/archive/misc_2026_05/active_plans_cleanup_2026_05_21.md`) or stays in agent scratch only.
- `docs/CHANGELOG.md`: single manager-owned rollup entry under M4 landing date, only non-empty subsection headings.
- `docs/FILE_STRUCTURE.md`: extend `docs/archive/` description to include cluster subdir pattern; add `docs/active_plans/workstreams/` to the file tree.
- `AGENTS.md`: cross-link the new lifecycle policy README from "Where to find things" if that section names plan locations.
- Archive close-out: each new `docs/archive/<cluster>/README.md` (in scope this sweep, not deferred).

## Patch plan and reporting format

- Patch 1: WS-INVENTORY -- add `docs/active_plans/active_plans_cleanup_inventory.md` with 8 columns + dry-run preview.
- **Approval gate (manual, user-driven).**
- Patch 2: WS-NEW-SERIES first half -- `git mv` NEW0/NEW1/NEW1.5 to `docs/archive/css_native_layout/`.
- Patch 3: WS-NEW-SERIES second half -- `git mv` NEW2/NEW3 to `docs/archive/css_native_layout/`.
- Patch 4: WS-NO-CROP -- `git mv` no_crop / no_cropped_svg.
- Patch 5: WS-INCIDENT -- `git mv` git_incident_4e2c709 + post_commit_4e2c709.
- Patch 6: WS-SCENE-RUNTIME -- `git mv` scene_runtime, row_slot, related.
- Patch 7: WS-MISC -- `git mv` residual singletons.
- Patch 8: WS-DELETE-GEN -- delete HTML, PDF, `*_assets/`.
- Patch 9: WS-FOCUSED-MOVE -- `git mv` focused/diagnostic KEEPs to `docs/active_plans/workstreams/`.
- Patch 10: WS-CLUSTER-README -- add five new `docs/archive/<cluster>/README.md` files.
- Patch 11: WS-REFS -- repoint TODO / ROADMAP / sibling plans / FILE_STRUCTURE / AGENTS.
- Patch 12: WS-POLICY -- add `docs/active_plans/README.md`.
- Patch 13: WS-CHANGELOG -- single manager-owned rollup CHANGELOG entry.

Cadence: 1 patch per work package; M2 patches (2-10) run in parallel after the M1 approval gate; M3 (11) is serial single-owner; M4 patches (12-13) run in parallel after M3. Total: 13 reviewable patches, inside `CAPACITY_AND_SIZING.md` "1 to 2 patches per coder per week" for an 8-coder team executing in one milestone window.

## Open questions and decisions needed

- Where does this plan itself live after close-out? -- decision owner: user. Default: archive under `docs/archive/misc_2026_05/active_plans_cleanup_2026_05_21.md`. Alternative: stays in `~/.claude/plans/` only, not tracked in-repo.
- Is the CSS-native status report set's exemption window already closing, or still active? -- decision owner: user. Default in this plan: exempt for the sweep; policy declares auto-expiration when source markdown is no longer cited in the latest two CHANGELOG day blocks.
- Should the two untracked working files (`new_manager_no_crop_readin.md`, `no_crop_scope_reconciliation.md`) be staged and archived with the no_crop cluster, or staged and kept as KEEP? -- decision owner: user, resolved during M1 inventory approval.
- Should `AGENTS.md` "Where to find things" section be edited to cross-link the new lifecycle README, or left to the next AGENTS.md sweep? -- decision owner: planner during WP-REF-1; default: edit during this sweep.
