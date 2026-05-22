# Round 3 scratch cleanup

Status: DONE  
Date: 2026-05-22  
Scope: cleanup of underscore-prefixed temp artifacts and scratch directories

## Deletions

### Temporary Playwright files

Audit of `tests/playwright/_temp_round3_*.mjs` files:

- `_temp_round3_protocol_smoke_expansion.mjs`: NOT referenced in any active_plans document. Underscore-prefixed, safe to delete. **DELETED**.
- `_temp_round3_interaction_smoke.mjs`: Referenced in `docs/active_plans/reports/round3_runtime_interaction_smoke.md` (line 23, 162). **PRESERVED**.
- `_temp_round3_event_trace.mjs`: Referenced in `docs/active_plans/reports/round3_protocol_advance_event_trace.md` (line 7, 36). **PRESERVED**.
- `_temp_round3_advance_repair_smoke.mjs`: Referenced in active_plans audit artifacts. **PRESERVED**.

### Scratch directory

- `tools_round3_a5/`: Directory containing two pure audit-scratch files (`walk.mjs`, `probe.ts`). Not under `src/`, `content/`, `pipeline/`, or `generated/`. Contents confirmed as Round 3 diagnostic-only. **DELETED** along with contents.

## Configuration change

### tsconfig.json

**Before:**
```json
  "exclude": ["OTHER_REPOS/**", "node_modules", "dist"]
```

**After:**
```json
  "exclude": ["OTHER_REPOS/**", "node_modules", "dist", "test-results"]
```

**Rationale:** Defense-in-depth. A prior stale `test-results/round3_svg_barrel_regen_audit/barrel_after_regen.ts` broke `npx tsc` walks; although that file is gone, excluding the entire `test-results/` directory prevents future Round 3 (or other temporary) artifacts from breaking the build.

## Verification

```
npx tsc --noEmit -p tsconfig.json
tsc check: SUCCESS (exit code 0)
```

No output; zero errors. TypeScript strict build passes.

## Files deleted (summary)

1. `tests/playwright/_temp_round3_protocol_smoke_expansion.mjs`
2. `tools_round3_a5/walk.mjs`
3. `tools_round3_a5/probe.ts`
4. `tools_round3_a5/` (directory)

Total: 4 artifacts removed.

## Files preserved (summary)

1. `tests/playwright/_temp_round3_interaction_smoke.mjs` (referenced in round3_runtime_interaction_smoke.md)
2. `tests/playwright/_temp_round3_event_trace.mjs` (referenced in round3_protocol_advance_event_trace.md)
3. `tests/playwright/_temp_round3_advance_repair_smoke.mjs` (referenced in active_plans)

Total: 3 artifacts preserved.

## Boundaries respected

- No edits under `src/`, `content/`, `pipeline/`, `generated/`, `docs/specs/`, `docs/PRIMARY_*`.
- No commits.
- Only deletions and one configuration line addition.
- `test-results/` exclude prevents future typescript regressions.
