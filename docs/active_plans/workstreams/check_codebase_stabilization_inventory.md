# Stabilization workstream L: check_codebase.sh restoration

## Context

Round 3 checkpoint quality gate: restore check_codebase.sh to passing. Typecheck fails only in tests/test_layout_integration.ts. NARROW SCOPE.

## Current failure list (line-by-line)

| Line | Error Code | Failure                                          | Likely Cause                                              | Pre-existing                    | Proposed Minimal Fix                                   |
| ---- | ---------- | ------------------------------------------------ | --------------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| 27   | TS6133     | `'ObjectId' declared but never read`             | Import pulled in but not used in code                     | New (likely from test refactor) | Remove unused import                                   |
| 81   | TS2322     | `string \| undefined not assignable to string`   | Fallback assignment from Object.keys may return undefined | New                             | Add non-null assertion or early guard `?? ''`          |
| 120  | TS18048    | `'scene' possibly undefined` (first occurrence)  | Object access without guard on world.scenes[sceneId]      | New                             | Add guard check or non-null assertion after assignment |
| 120  | TS18048    | `'scene' possibly undefined` (second occurrence) | Same variable, second use                                 | New                             | Same guard/assertion                                   |
| 175  | TS2591     | `Cannot find name 'process'`                     | process.exit() call, missing Node.js types                | New                             | Add file-scoped type declaration for process           |
| 182  | TS2591     | `Cannot find name 'process'`                     | process.exit() call in catch block                        | New                             | Same declaration above covers both                     |

## Note on broader failures

The full typecheck output shows ~180 errors across generated files and src/ files. This inventory focuses ONLY on tests/test_layout_integration.ts per the task scope (6 distinct errors in this file). Other failures are pre-existing and out of scope.

## Fix strategy

1. Remove unused `ObjectId` import (line 27)
2. Add guard at line 81: ensure `protocolName` is not empty string or use Object.keys(...)?.[0] with fallback
3. Add guard at line 119 after scene assignment with non-null assertion or type-safe access
4. Add file-scoped `process` type declaration at top (declare const process: { exit(code: number): never; })

This keeps changes to the test file only, preserves test logic, and does NOT modify tsconfig.json or package.json.
