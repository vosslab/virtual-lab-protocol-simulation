# NEW3 Batch 4 Workstream AB - Static HTML Pipeline Footprint Audit

Date: 2026-05-21
Status: DONE_WITH_CONCERNS
Use "workstream" not "lane".

## Generator pipeline map

generate_stress_scenes.py

- source: internal Python pools (BOTTLES, CONTAINERS, HANDHELD, etc.)
- does NOT read: regions/bench.yaml, regions/hood.yaml, regions/instrument.yaml
- emits to stress*scenes/generated/stress*<class>\_NNN.yaml
- placements: object_name + zone only; no kind, no footprint

render_stress_to_html.py

- reads: generated YAML
- does NOT read: regions/\*.yaml
- uses: FOOTPRINT_KEYWORDS constant (lines 27-44)
- emits to stress*scenes/rendered/stress*<class>\_NNN.html
- class="object-graphic footprint--<category>"

Neither generator reads any regions/\*.yaml file at any point.

## Question 1: Where is the kind-to-footprint mapping?

FOOTPRINT_KEYWORDS constant, render_stress_to_html.py lines 27-44. Python list of (category, [keywords]) tuples. Resolution via classify_footprint() lines 58-66, called from build_placement_html() line 93. Class emitted at line 105.

## Question 2: Does render_stress_to_html.py read regions/\*.yaml?

No. Imports: os, sys, argparse, yaml (lines 13-16). Only opens input scene YAMLs (line 207). Never reads any file under experiments/css_native_layout/regions/.

## Question 3: Separate hardcoded map - what does it say for bottle?

Yes. FOOTPRINT_KEYWORDS entirely hardcoded. Container tuple at line 37:

```python
('container', ['bottle', 'flask', 'carboy', 'cylinder', 'beaker', 'erlenmeyer',
    'plate', 'cassette', 'tank', 'tray', 'kimwipe_pad', 'waste_container']),
```

'bottle' is first keyword in container list. handheld tuple at line 40 covers only 'pipette' and 'micropipette'. container evaluated before handheld. All bottle objects receive footprint--container.

## Question 4: Are equipment_small / equipment_large from YAML consumed?

No. Static-render path has parallel keyword lists (large-equipment at lines 29-30, instrument at lines 32-33). Independent from equipment_large + equipment_small lists in three region YAMLs. No synchronization mechanism.

## Question 5: Why do bottles get footprint--container?

Two causes:

1. regions/bench.yaml never read. bottle: handheld (bench.yaml line 71) invisible to renderer.
2. 'bottle' placed inside container keyword tuple at line 37, directly contradicting YAML vocabulary which assigns bottle: handheld in all three region files (bench.yaml line 71, hood.yaml line 71, instrument.yaml line 71).

Confirmed in rendered HTML: every one of 16 bottle placements in stress_many_bottles_scene_001.html carries class="object-graphic footprint--container".

## Question 6: Deliberate or accidental?

ACCIDENTAL. Evidence:

- Comment lines 36-37 reads "# Containers (bottles, flasks, plates, large glassware)" - author conceptually grouped bottles with containers without consulting region YAML.
- All three YAML files agree: bottle: handheld. No YAML file assigns bottle to container.
- No comment in render_stress_to_html.py declares divergence intentional.
- generate_stress_scenes.py has HANDHELD pool (lines 41-43) including ethanol_bottle, dmso_bottle, pbs_bottle, drug_vial with comment "# Handheld" - generator author treats bottles as handheld. Renderer author did not.

## Bottle case study: exact trace

| Step            | File                               | Line  | Value                                            |
| --------------- | ---------------------------------- | ----- | ------------------------------------------------ |
| YAML vocabulary | regions/bench.yaml                 | 71    | bottle: handheld                                 |
| Generator pool  | generate_stress_scenes.py          | 68-73 | BOTTLES pool, routed to rear_shelf               |
| YAML emission   | generate_stress_scenes.py          | 349   | zone only; no footprint field written            |
| Renderer call   | render_stress_to_html.py           | 93    | classify_footprint('sodium_hydroxide_bottle')    |
| Keyword match   | render_stress_to_html.py           | 37    | 'bottle' in container tuple -> 'container'       |
| HTML emission   | render_stress_to_html.py           | 105   | class="object-graphic footprint--container"      |
| Rendered output | stress_many_bottles_scene_001.html | 10    | footprint--container on all 16 bottle placements |

## Production runtime vs stress harness comparison

| Aspect                       | Production (dynamic)                     | Stress harness (static)                        |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------- |
| Kind-to-footprint source     | regions/bench.yaml kind_to_footprint map | FOOTPRINT_KEYWORDS in render_stress_to_html.py |
| Reads region YAML            | Yes (css_native_adapter.ts)              | No                                             |
| bottle -> footprint          | handheld                                 | container (DIVERGES)                           |
| flask -> footprint           | container                                | container (agrees)                             |
| pipette -> footprint         | small-tool                               | handheld (DIVERGES - secondary)                |
| equipment_large/small source | YAML                                     | Parallel hardcoded lists (no sync)             |

## Recommendation

NEEDS_USER_DECISION.

Arguments for DOCUMENT_DIVERGENCE:

- Harness under experiments/, not a production artifact.
- footprint--container (~220x240 min) larger than footprint--handheld (~90x110), so many_bottles scenes currently exercise harder rear_shelf packing than production. Valid stress condition.
- Aligning reduces stress value of those scenes and invalidates existing batch score comparisons.

Arguments for ALIGN:

- If stress results meant to predict production layout for bottles, current harness measures wrong footprint.
- regions/\*.yaml is canonical single source of truth per PRIMARY_CONTRACT.md.
- Independent copy in static harness creates undocumented split future audits will rediscover.

## Risk table

| Action                                                                | Risk                                                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ALIGN: move 'bottle' from container to handheld in FOOTPRINT_KEYWORDS | Stress scenes become less stressful for bottles. Existing batch scores cannot be directly compared to post-fix scores. |
| DOCUMENT_DIVERGENCE: add comment to FOOTPRINT_KEYWORDS line 37        | Divergence persists; future readers may misread bottle stress scores as production-representative.                     |
| No action                                                             | Silent divergence continues; next audit rediscovers this.                                                              |

## Secondary finding: pipette footprint also diverges

- YAML (regions/bench.yaml line 67): pipette: small-tool
- Static harness (FOOTPRINT_KEYWORDS line 40): pipette -> handheld

Second unannounced divergence. footprint--handheld and footprint--small-tool are different CSS classes with different dimensions. If pipette layout fidelity matters for stress results, handle under separate workstream.

## Handoff

Status: DONE_WITH_CONCERNS
Where bottle gets routed to container: render_stress_to_html.py line 37, keyword 'bottle' in container tuple of FOOTPRINT_KEYWORDS
Deliberate or accidental: ACCIDENTAL
Recommendation: NEEDS_USER_DECISION. Lean toward DOCUMENT_DIVERGENCE if stress amplification is the goal; ALIGN if production fidelity is the goal.
Blockers: None.
