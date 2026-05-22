# No-Agent-Commits Guardrail

Date: 2026-05-21
Reason: Unauthorized commit 4e2c709 swept 224 files into one commit. Humans own all commits going forward.

## Hard rules for agents

1. NO git commit (any form: regular, --amend, --no-verify)
2. NO git add -A or git add . (broad staging)
3. NO git push (any form: regular, force, force-with-lease)
4. NO git reset (any form: soft, mixed, hard)
5. NO git revert
6. NO git rebase
7. NO git cherry-pick
8. NO git stash (push, pop, clear, drop)
9. NO git clean (any form)
10. NO branch deletion via git branch -D
11. NO history rewrite operations of any kind

## What agents MAY do

- git status --porcelain=v1 (read-only)
- git log, git diff, git show (read-only)
- git ls-files (read-only)
- git rev-parse (read-only)
- git diff-tree (read-only)
- git remote -v (read-only)
- git reflog (read-only)
- git config --get (read-only)
- git branch (listing only, no -D)
- git format-patch (produces patch file, no history change)

## Staging exceptions

Agents may run `git add <specific-file-path>` ONLY when:

- User explicitly instructs "stage <specific file>" by path
- The staging is preparatory; user will commit afterward
- Agent confirms via SendMessage what was staged and stops

Agents may NEVER run `git add -A`, `git add .`, `git add -u`, `git add -p`, or any pattern that stages multiple files implicitly.

## Cleanup workstreams

If a workstream needs to clean up files (e.g., delete experimental scripts):

- Use rm with underscore-prefixed filenames (e.g., rm _temp_\*.py) per existing repo hook rules
- DO NOT use `git rm` unless user explicitly authorizes
- DO NOT remove via git tooling
- Untracked files: agent may delete with rm + report what was deleted
- Tracked files: defer to user

## Workstream brief template requirement

Every workstream dispatched to a subagent MUST include in its prompt:

```
Boundaries:
- NO git commit, push, reset, revert, rebase, cherry-pick, stash, clean, history rewrite
- NO git add -A or git add .
- Stage files only if explicitly named in this brief
- Human owns all commits
```

## Failure mode that triggered this rule

Workstream F (visual polish pilot) was tasked with 2 CSS tweaks. It produced the 2 tweaks but also ran (presumably) `git add -A` and `git commit`, sweeping 222 unrelated files (Batch 1-4 in-progress work + concurrent Batch 5 work + spike scaffolding + binary blobs) into a single commit on main.

Files included that should NOT have been: 3 src/scene_runtime/\* spike TypeScript files, 1 contract amendment draft, 111 binary blobs, 5 new pytest hygiene tests, 6 Playwright spike scripts.

Recovery: user chose to move forward and accept 4e2c709 as baseline rather than rewind. Forward-only mode declared.

## Cross-references

- docs/active_plans/git_incident_4e2c709_inventory.md
- docs/active_plans/git_incident_4e2c709_scope_audit.md
- docs/active_plans/git_incident_4e2c709_recovery_options.md
- docs/active_plans/post_commit_4e2c709_stabilization_checklist.md
- docs/CLAUDE_HOOK_USAGE_GUIDE.md (canonical hook rules, including `git commit` boundaries)
- docs/REPO_STYLE.md ("Only humans run `git commit`")

## Manager dispatch checklist

Before dispatching any workstream that may touch git or trigger commits:

- [ ] Brief includes the boundaries block above (or equivalent)
- [ ] Brief does NOT instruct the subagent to commit
- [ ] Brief specifies which exact files may be staged, if any
- [ ] Manager will run git status after subagent finishes to verify no surprise commit
- [ ] If subagent reports an unauthorized commit, manager pauses + audits + notifies user (does NOT auto-revert)
