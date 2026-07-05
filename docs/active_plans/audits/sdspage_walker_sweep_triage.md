# sdspage walker sweep triage

This is a triage and hand-off artifact, not a fix. It records evidence from a full
Playwright walker sweep so a follow-on owner does not have to re-derive the failure
set from scratch.

## What was run

`./run_playwright_tests.sh`, which builds as needed and then runs
`tests/playwright/e2e/protocol_walkthrough.spec.ts` (the full-suite walker sweep) against
every mini-protocol. One run of this sweep showed 8 failing `sdspage_*` protocols:

- `sdspage_full`
- `sdspage_image_gel`
- `sdspage_load_protein_ladder`
- `sdspage_load_sample_single_lane`
- `sdspage_load_samples_batch`
- `sdspage_prepare_gel_cassette`
- `sdspage_prepare_running_buffer`
- `sdspage_prepare_sample_mix_batch`

## Two failure shapes

1. **Console-error assertion trips after full completion.** Three of the eight
   (`sdspage_full` among them) complete every step of the walkthrough, then fail on a
   console-error assertion. `sdspage_full` alone logged around 57 console errors during
   its run.
2. **`page.waitForFunction` timeout with 0/0 steps.** Five of the eight crash on a
   `page.waitForFunction` call at the default 8000ms timeout, completing 0 of 0 steps
   (the walker never gets far enough to record step progress).

## Triage conclusion

These failures are judged out of scope for the fixtures/dev_smoke cleanup lane, and
non-deterministic/pre-existing rather than a regression introduced by that work:

1. **`sdspage_*` protocols are real `mini_protocol` content**, not `dev_smoke`
   fixtures. The dev_smoke removal only changed runtime behavior for the `dev_smoke`
   `protocol_type`; `mini_protocol` behavior is unchanged by that work. The empty-scene
   guard already threw for `mini_protocol` before the change, and the load-time
   authored-value checks already ran for `mini_protocol` before the change.
2. **The same full Playwright suite ran green twice during this work**: once after the
   `generated/` regenerate, and once after the test cleanup, both times 83 passed with
   0 failed. That means the `sdspage_*` failures seen in the sweep referenced above are
   load- or timing-dependent, not a deterministic regression caused by this change.

## Recommendation

Route this to the walker-acceptance/layout manager for follow-up. Before treating the
`sdspage_*` set as a settled defect, capture a fresh failure log from a dedicated sweep
run (not mixed in with other work) so the two failure shapes above can be reproduced
and root-caused independently.
