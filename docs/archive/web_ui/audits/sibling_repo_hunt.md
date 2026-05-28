# Sibling repo hunt for runtime

Date: 2026-05-27
Mission: search ~/nsh/ for any sibling repo containing the missing
protocol runtime source (mountRuntime / loadAndMountByProtocolName /
window.gameState producers).

## Conclusion

No runtime source found in any sibling repo. The runtime was deleted from
THIS repo on 2026-05-22 (commit 635f827) and is recoverable from git
history (see `git_archaeology_runtime.md`). It does not live in a sibling.

## Search roots and method

Root: `/Users/vosslab/nsh/TYPESCRIPT/`

Method: per-repo `git ls-files | xargs grep -l "mountRuntime"`, same for
`loadAndMountByProtocolName`, `window.gameState`, `runtime.bundle.js`.
Six TypeScript sibling repos enumerated.

## Candidates checked

| Sibling | Has runtime symbols? |
| --- | --- |
| hantavirus-outbreak-game | no |
| human-chemo-drug-simulation | no |
| ncaa-school-find-game | no |
| sports-life-game (223 TS/JS files) | no |
| stem-lesson-quiz-game | no |
| virtual-lab-protocol-simulation (this repo) | only in pipeline scripts and tests; producer source deleted |

Zero matches across all six for any of the four runtime symbols.

## Cross-reference with git_archaeology_runtime.md

The runtime is not missing from a sibling. It existed in this repo from
2026-05-17 (commit ff8c664) to 2026-05-22 (commit 635f827, "we need a
fresh start" cleanup). Source recovered to /tmp/recovered_runtime/.

## Recommendation

Sibling-port option B from `runtime_seam_plan.md` is closed -- no
sibling carries the source. The runtime-seam plan's options reduce to:

1. Cherry-pick / revert deletion commit 635f827.
2. Recover from branch `agent/batch4-corpus-manifest` (earlier 817-line
   state).
3. Redesign using /tmp/recovered_runtime/entry.ts as reference.

## Status

- Status label: DONE.
- Sibling-hunt verdict: NONE_FOUND.
- Plan implication: runtime-seam plan workstream B (sibling port) can be
  dropped; only A (revert) and C (redesign) remain.
