# NEW2 demo backlog (Lane S2)

Ranked backlog of 20 candidate demos for the NEW2 evidence package. Composite
priority is `visual + usefulness - risk`. S/M/L effort acts as a tiebreaker
(smaller wins on ties). This is a planning artifact only; no implementation
code is included.

## Scoring legend

- Visual impact: 1 (dull) to 5 (striking).
- Technical risk: 1 (trivial) to 5 (uncertain). Lower is better.
- Usefulness for NEW2: 1 (tangential) to 5 (load-bearing evidence).
- Effort: S (under a day), M (1-3 days), L (multi-day).
- Composite: `visual + usefulness - risk`. Range -4 to +9.
- Dependencies: W1 = Workstream 1 blockers, W2 = Workstream 2 blockers, none = independent.
- Prior art: lane number from existing concept demos (S0, S1, S3, etc.), or "-".

## 20-demo ranked backlog

| Rank | Title                                   | Description                                                                                                                       | Vis | Risk | Use | Eff | Comp | Deps     | Prior |
| ---- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --- | ---- | --- | --- | ---- | -------- | ----- |
| 1    | Selected well highlight                 | Show single well selected within a 96-well plate, with halo and tooltip. Anchors the click-target evidence story for NEW2.        | 4   | 1    | 5   | S   | 8    | none     | S1    |
| 2    | Pipette-to-well interaction             | Pipette tip docks onto a target well; tip alignment is the visible proof of layout correctness end-to-end.                        | 5   | 2    | 5   | M   | 8    | W1       | S0    |
| 3    | Label hover/reveal                      | Hover on object surfaces lab labels (name, contents, volume). Cheap, high signal for material vocabulary review.                  | 4   | 1    | 4   | S   | 7    | none     | S1    |
| 4    | Before/after diagnostic overlay         | Side-by-side scene snapshot before and after a step, with diff annotations on changed objects.                                    | 5   | 2    | 4   | M   | 7    | W2       | -     |
| 5    | Wrong-target demo                       | Student clicks an incorrect target; visible "miss" feedback and recovery. Direct evidence the validator is honest.                | 4   | 2    | 5   | S   | 7    | none     | S3    |
| 6    | Interactive scorecard panel             | Live per-scene metric panel (alignment delta, click hit rate, scene class). Steers reviewers to the right cell quickly.           | 4   | 2    | 5   | M   | 7    | W2       | -     |
| 7    | Dense teaching/assessment toggle        | One control flips a scene between teaching mode (labels, hints) and assessment mode (bare). Doubles per-scene evidence value.     | 4   | 2    | 4   | S   | 6    | none     | -     |
| 8    | Object clipping demo                    | Deliberate overflow case to show layout engine's clipping policy and the failure mode authors must avoid.                         | 3   | 1    | 4   | S   | 6    | none     | S1    |
| 9    | Run-the-protocol-end-to-end walkthrough | Full mini-protocol completed via visible UI, screenshots at each step. The reference proof for contract item 4.                   | 5   | 3    | 5   | L   | 7    | W1, W2   | -     |
| 10   | Drug dilution workspace                 | Serial dilution layout with source/dest wells, volumes, and ratios visible. High didactic value for the cell-culture cluster.     | 5   | 3    | 4   | M   | 6    | W1       | -     |
| 11   | Electrophoresis setup                   | Gel box, lanes, loading wells; layout-only proof that long-asset scenes work under the same engine as plates.                     | 4   | 3    | 3   | M   | 4    | W1       | -     |
| 12   | Reagent grouping                        | Visually group reagents by class (buffers, dyes, media) on the bench. Tests grouping layout primitive without inventing one.      | 3   | 2    | 3   | S   | 4    | none     | -     |
| 13   | Viewport policy comparison              | Same scene rendered under two viewport policies side by side; isolates the policy variable for review.                            | 3   | 2    | 4   | M   | 5    | W1       | S2    |
| 14   | Instrument focus mode                   | Click instrument, scene zooms to instrument display; demonstrates SceneChange semantics without leaving the lab.                  | 4   | 2    | 3   | M   | 5    | none     | -     |
| 15   | Scorecard regression explorer           | Browse historical scorecards over commits; surfaces drift in alignment metrics over time.                                         | 3   | 3    | 4   | M   | 4    | W2       | -     |
| 16   | Report PDF generator demo               | One-click PDF of the current scene + scorecard + notes. Useful for the consolidator's final artifact.                             | 3   | 2    | 4   | S   | 5    | none     | -     |
| 17   | Multi-step pipette workflow             | Chained pipette interactions across several wells with state accumulation; harder than rank 2, more representative.               | 4   | 4    | 4   | L   | 4    | W1       | -     |
| 18   | Timer/incubation visualization          | Visible countdown overlay for a timed step (e.g. 5 min incubation), with TimedWait scene operation evidence.                      | 3   | 3    | 3   | M   | 3    | W1       | -     |
| 19   | Waste-disposal state demo               | Tip ejected to waste, waste container fill state increments visibly. Tests material-convention waste fields.                     | 3   | 2    | 3   | S   | 4    | none     | -     |
| 20   | Inventory/registry browser              | Read-only HTML index of every declared scene object and asset, with thumbnails. Useful for spec review; low visual drama.         | 2   | 1    | 4   | S   | 5    | none     | -     |

Ties resolved by effort (S before M before L). Rank 9 sits below ranks 5-8
despite the same composite because of L effort.

## Top 5 recommended next

1. **Selected well highlight (rank 1).** Cheapest path to a defensible
   single-cell layout evidence card. Already partially demonstrated in S1, so
   risk is genuinely low and the visual is unambiguous. Build first because
   every downstream pipette demo assumes this works.

2. **Pipette-to-well interaction (rank 2).** This is the centerpiece NEW2
   needs: visible proof that the layout engine, the object registry, and the
   pipette tool agree on a target's pixel-space location. Worth the M effort
   because every other interaction demo inherits from it.

3. **Label hover/reveal (rank 3).** Small surface, high information density.
   Surfaces material-convention fields (`material_name`, `material_volume`)
   on real objects, which doubles as cheap material-spec evidence. No W1 or
   W2 dependency, so it can land in parallel.

4. **Wrong-target demo (rank 5).** The validator and the visible-UI contract
   only mean something if a miss is honestly shown. This demo answers the
   "is the walker cheating" question in one screenshot.

5. **Before/after diagnostic overlay (rank 4).** Doubles the evidence value
   of every other scene by adding a free comparison view. Worth the W2
   dependency because the same diff renderer feeds the scorecard panel
   (rank 6) later.

## Anti-pattern demos

- **Custom geometry showcase.** Tempting because authoring SVG is fun, but
  it violates the contract: custom geometry is only allowed for subparts
  inside structured scientific objects. A "look how flexible our geometry
  is" demo would advertise the wrong story.
- **Per-scene-class threshold tuning panel.** Sounds rigorous, but tuning
  thresholds per scene class invites scorecard hacking and hides drift.
  Keep thresholds global; if a scene needs a different bar, fix the scene.
- **Ascii-only diagram renderer.** Useful in docs but not as a demo. It
  competes for reviewer attention with the actual visual evidence and adds
  no information the markdown tables in NEW2 do not already carry.

## File metadata

- File: `/Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/docs/active_plans/new2_demo_backlog.md`
- Lane: S2 (demo backlog)
- Status: planning only, no code, no scene authoring
