# Git Incident 4e2c709 - Recovery Options Memo (S3)

Date: 2026-05-21
Status: NEEDS_CONTEXT

## CORRECTION: commit 4e2c709 IS NOT PUSHED

S3 agent originally assumed commit was pushed. Direct verification:

- HEAD: 4e2c709ac1b6cd62e7b32dc6e0e83614d28fe689
- origin/main: 4d03b4ba5265bd8118ea15f915aba214bf61f376
- git log origin/main..HEAD --oneline: shows only 4e2c709

Commit is LOCAL ONLY. No force-push required for options 1 (soft reset) or 4 (branch rescue). Risk profile for those options drops accordingly.

## Critical context

- Commit 4e2c709 is the current HEAD of local main but NOT on origin/main.
- Stat: 224 files, 20,424 insertions, 163 deletions.
- Stated scope: ~2 CSS files. Overshoot ratio ~100x.
- Parent commit 4d03b4b ("I have no idea") - also broad/unreviewed-looking.
- 3 CSS files (bench, hood, instrument) appear modified post-commit in git status.

## Option 1: soft reset

Command: git reset --soft HEAD~1

Effect: branch pointer back one commit (removes 4e2c709). All 224 files remain staged. Working tree unchanged. Commit reachable via reflog for 90 days.

| Dimension            | Detail                                |
| -------------------- | ------------------------------------- |
| History changes      | Yes - 4e2c709 removed from branch tip |
| Working tree changes | No                                    |
| Staging area changes | Yes - 224 files staged                |
| Risk level           | LOW (commit not pushed)               |
| Force push needed    | No                                    |
| Evidence preserved   | Reflog 90 days                        |
| What is lost         | 4e2c709 as named commit               |

Appropriate when:

- Commit NOT pushed (confirmed yes here)
- User wants to keep changes staged for selective recommit
- Linear history preferred

Wrong when:

- Want to preserve original commit intact for forensic review while cleaning main (use option 4)

## Option 2: revert commit

Command: git revert HEAD

Effect: new commit inverse of 4e2c709. History gains commit. Working tree rolls back to 4d03b4b state.

| Dimension            | Detail                                                     |
| -------------------- | ---------------------------------------------------------- |
| History changes      | Additive                                                   |
| Working tree changes | Yes - rolls back 224 files                                 |
| Staging area changes | No (clean after)                                           |
| Risk level           | LOW                                                        |
| Force push needed    | No                                                         |
| Evidence preserved   | 4e2c709 stays in history; revert commit documents rollback |
| What is lost         | Working tree state from 4e2c709 unless separately branched |

Appropriate when:

- Commit pushed (NOT the case here)
- History rewriting forbidden
- Additive auditable record preferred

Wrong when:

- Most of 4e2c709 is acceptable; full revert throws away all 224 files
- Content must not appear in history at all

## Option 3: leave commit, follow with cleanup

Command: none.

Effect: 4e2c709 remains. User reviews 224 files and authors targeted cleanup commits.

| Dimension            | Detail                                                   |
| -------------------- | -------------------------------------------------------- |
| History changes      | No                                                       |
| Working tree changes | Yes (incremental edits)                                  |
| Staging area changes | Per cleanup commit                                       |
| Risk level           | LOW                                                      |
| Force push needed    | No                                                       |
| Evidence preserved   | 4e2c709 intact; all cleanup explicit                     |
| What is lost         | Nothing immediately; unreviewed content stays in history |

Appropriate when:

- Most of 224 files acceptable
- Unwanted portion small and identifiable
- Time to triage file list

Wrong when:

- Scope overshoot severe; legitimate CSS buried in noise
- Large binaries (PNGs, PDFs) inflate history permanently

## Option 4: branch rescue + per-file recovery

Step 1 (read-only): git branch rescue/4e2c709-original 4e2c709

Step 2 (DESTRUCTIVE - requires explicit user approval): git reset --hard HEAD~1

Step 3: git checkout rescue/4e2c709-original -- experiments/css_native_layout/styles/bench.css (per-file recovery)

Step 4: commit scoped set. Since commit NOT pushed, regular push works (no force).

| Dimension            | Detail                                                            |
| -------------------- | ----------------------------------------------------------------- |
| History changes      | Yes (rewrites main tip; rescue branch preserves original)         |
| Working tree changes | Yes (hard-reset then selective)                                   |
| Staging area changes | Per selected file                                                 |
| Risk level           | MEDIUM (commit not pushed, but hard-reset is destructive locally) |
| Force push needed    | No                                                                |
| Evidence preserved   | rescue/4e2c709-original branch holds original                     |
| What is lost         | Non-selected 4e2c709 changes removed from main (still on rescue)  |

Appropriate when:

- Want only legitimate scoped CSS on main
- Forensic preservation matters
- User explicitly approves destructive hard reset

Wrong when:

- User hasn't explicitly approved hard reset
- Mixed scope where partial retention via cleanup is preferable

## Option 5: manual patch extraction

Command: git format-patch -1 4e2c709

Effect: produces .patch file. History untouched. Working tree unchanged. Selective apply with git apply --include=path.

| Dimension            | Detail               |
| -------------------- | -------------------- |
| History changes      | No                   |
| Working tree changes | No                   |
| Staging area changes | No                   |
| Risk level           | LOW                  |
| Force push needed    | No                   |
| Evidence preserved   | Full forensic record |
| What is lost         | Nothing (read-only)  |

Appropriate when:

- Want complete forensic record before deciding
- Manual hunk review needed
- First step before any of options 1-4

Wrong when:

- Immediate cleanup required (committed secrets/large binaries)

## Comparison

| Option            | History           | Working tree         | Staging    | Risk   | Force-push | Reversibility           |
| ----------------- | ----------------- | -------------------- | ---------- | ------ | ---------- | ----------------------- |
| 1 soft reset      | rewrites          | unchanged            | 224 staged | LOW    | NO         | High via reflog 90 days |
| 2 revert          | additive          | rolled back          | clean      | LOW    | NO         | Yes via another revert  |
| 3 leave + cleanup | unchanged         | incremental          | per commit | LOW    | NO         | No impact               |
| 4 branch rescue   | rewrites + rescue | hard-reset+selective | selected   | MEDIUM | NO         | Medium (rescue branch)  |
| 5 patch extract   | unchanged         | unchanged            | unchanged  | LOW    | NO         | n/a                     |

## Key questions before deciding

1. Are any of the 224 files legitimate additions that should land on main?
2. Does the commit contain sensitive data or large binaries problematic for history?
3. What is the parent commit (4d03b4b "I have no idea") scope? Does it also need review?
4. Spike status of src/scene_runtime/\* files - approved NEW1 outputs or unauthorized?

## Recommendation stance

No specific option recommended. Three observations:

- Option 5 (patch extract) carries zero risk; should run first regardless of which recovery path chosen.
- Option 1 (soft reset) is lowest-loss given commit NOT pushed. Preserves all changes for selective recommit.
- Option 4 requires explicit user approval for destructive hard-reset step.

## Handoff

Status: NEEDS_CONTEXT
Option count: 5
Lowest-risk options: 5 (patch extract, read-only) and 1 (soft reset, no force-push needed since commit local-only)
Blocker: Commit 4e2c709 NOT pushed. All 5 options viable without force-push concerns. Decision now hinges on (a) how much of 224-file scope is wanted, (b) src/scene_runtime/\* approval status, (c) user preference for history-rewrite vs additive vs leave.
