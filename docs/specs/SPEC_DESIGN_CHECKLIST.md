# Spec smell checklist -- anti-drift sweep brief

This is the brief for the independent sweep agent that audits canonical
spec docs for underspecified concepts and junk-drawer escape hatches.

## Core detector

Identify every place where the spec allows authors to invent new meaning
without editing the vocabulary itself.

The strongest pattern across prior reviews was not "wrong implementation"
but "underspecified escape hatches." The agent hunts for any concept that
silently expands the vocabulary surface.

## Scope

Sweep tier 1 (highest priority -- canonical vocabulary and schema):

- `../PRIMARY_CONTRACT.md`
- `../PRIMARY_DESIGN.md`
- `../PRIMARY_SPEC.md`
- `PROTOCOL_VOCABULARY.md`
- `PROTOCOL_YAML_FORMAT.md`
- `PROTOCOL_STEPS.md`
- `PROTOCOL_AUTHORING_GUIDE.md`
- `SCENE_VOCABULARY.md`
- `SCENE_YAML_FORMAT.md`
- `SCENE_ARCHITECTURE.md`
- `OBJECT_VOCABULARY.md`
- `OBJECT_YAML_FORMAT.md`

Sweep tier 2 (supporting subsystems with their own vocabulary):

- `LAYOUT_ENGINE.md`
- `LIQUID_CONVENTION.md`
- `SVG_PIPELINE.md`
- `SCALING_MODEL.md`
- `WALKTHROUGH_GUIDE.md`
- `../THIRD_PARTY_ASSETS.md`

Sweep tier 3 (architecture and structure -- lower vocabulary risk, higher
shadow-term risk):

- `../CODE_ARCHITECTURE.md`
- `../FILE_STRUCTURE.md`
- `TARGET_FILE_STRUCTURE.md`

Sweep tier 4 (external-format docs -- check for schema escape hatches and
shadow vocabularies that bleed into authoring):

- `QTI_v3_SPEC.md`

Exclude entirely (not vocabulary docs):

- `docs/CHANGELOG.md`, `docs/CHANGELOG-*.md` (chronological log).
- `docs/ROADMAP.md`, `docs/TODO.md` (intent, not authoring rule).
- `docs/INSTALL.md`, `docs/USAGE.md`, `docs/AUTHORS.md` (operational).
- `docs/REPO_STYLE.md`, `docs/PYTHON_STYLE.md`, `docs/PYTEST_STYLE.md`,
  `docs/TYPESCRIPT_STYLE.md`, `docs/MARKDOWN_STYLE.md`,
  `docs/E2E_TESTS.md`, `docs/PLAYWRIGHT_USAGE.md`,
  `docs/CLAUDE_HOOK_USAGE_GUIDE.md` (style/process, not authoring vocab).
- `docs/Miraculin_Protocol_2026.md`, `docs/SDS-PAGE_Protocol_2026.md`,
  `docs/OVCAR8_*.md`, `docs/VOSS_DILUTIONS_GUIDE.md` (specific protocol
  content, not vocabulary).
- `docs/active_plans/*_inventory.md` (counts belong there).
- `docs/active_plans/*` general (active design surface, not canonical).
- `docs/archive/*` (historical).

## Severity labels

Tag every finding:

- `blocker` -- permits uncontrolled vocabulary growth.
- `warning` -- ambiguous but bounded.
- `note` -- wording or aging risk.

## Section-context tag

Every finding also carries a section-context tag:

- `target-state` -- canonical authoring rule. Findings here describe
  required behavior.
- `current-code` -- descriptive prose of what exists today; flag but
  ensure the wording does not silently bleed into canonical vocab.
- `migration/history` -- transitional or archive context. Flag only if
  the wording risks bleeding back into canonical vocab.

False-positive rule: words like `metadata`, `config`, `properties` may
legitimately appear in current-code or migration/history sections. Flag
anyway, but tag the context so the human can triage by impact.

## Sweep targets and rules

### 0. Schema escape hatch (top category)

The unifying smell. Any field that lets authors invent new structure,
meaning, or behavior without a vocabulary edit.

Includes:

- Open-key objects (`additionalProperties: true`).
- "Pass-through" fields forwarded to runtime without schema.
- Author-defined keys inside a "metadata" or "extras" container.
- Inline expression or formula text evaluated by the runtime.
- Type unions that accept "or any object".
- "Plugin" / "module" / "adapter" registration shapes that accept
  arbitrary author payloads.

Rule:

- Authors must NOT be able to expand the vocabulary surface by editing
  YAML alone. New meaning requires a vocabulary edit.
- Default severity for this category: `blocker`.

### 1. Open-ended primitive types

Flag: `string`, `any`, free-form maps, arbitrary nested objects, JSON
blobs, unnamed dictionaries, `metadata`, `properties`, `attributes`,
`config`.

Rule:

- If values come from a known set, use `enum`.
- If structure matters, define fields explicitly.
- Unknown keys must fail validation.

### 2. Junk-drawer nouns

Flag vague containers: `capabilities`, `constraints`, `settings`,
`options`, `flags`, `extras`, `custom`, `extensions`, `annotations`,
`data`, `params`.

Rule:

- Every container must either have a closed schema, OR be explicitly
  marked future/deferred and excluded from current authoring.

### 3. Arbitrary nesting

Flag: nested state writes, recursive structures, object trees without
depth limits, polymorphic payloads.

Rule:

- Prefer flat primitives.
- Composition through multiple named fields, not nested blobs.

### 4. Hidden semantic leakage (cross-layer)

Flag lower layers learning higher-layer meaning:

- Protocol naming SVG assets.
- Scene defining object behavior.
- Object defining protocol sequencing.
- Layout engine interpreting learning semantics.

Rule:

- Protocol = intent.
- Object = representation / state.
- Scene = placement / layout.

### 5. Future-proofing language that bypasses design

Flag dangerous phrases: "arbitrary", "custom", "user-defined",
"free-form", "extensible", "etc.", "other fields", "additional
properties", "plugin-defined".

Rule:

- Force explicit extension points.
- Unknown extension points become future RFCs, not implicit support.

### 6. Fixed-count assumptions

Flag: "7 scenes", "45 assets", "8 operations", any literal count in
canonical-doc prose.

Rule:

- Canonical docs describe structure, not inventory snapshots.
- Counts belong only in inventory artifacts or audits.

### 7. Shadow vocabularies

Flag the same concept named differently across docs:

- `object_ref` vs `object_id`
- `slot` vs `subpart`
- `state_map` vs `render_map`
- `item` vs `placement`
- `kind` vs `type` vs `category`

Rule:

- One canonical term per concept.
- Synonyms retired explicitly with pointer.

### 8. Layer ownership ambiguity

For every field, ask:

- Who owns this?
- Who mutates this?
- Who renders this?
- Who validates this?

If multiple answers appear, the boundary is drifting. Flag.

### 9. Validation gaps

Flag fields missing any of: type, allowed values/range, default
semantics, validation behavior, type coercion, units.

Rule:

- Every authored field must define type, allowed values/range, default
  semantics, validation behavior.

### 10. Render-mechanism leakage

Flag:

- SVG asset names in protocol examples.
- Renderer implementation details in object docs.
- Animation semantics in scene placement docs.

Rule:

- Specs describe meaning, not renderer internals.

### 11. Accidental mini-programming languages

Flag high-risk areas: formula syntax, conditional rendering, expression
evaluators, templating, embedded logic.

Rule:

- Closed token sets only.
- No prose-driven interpretation.
- Unknown tokens = build error.

### 12. Transitional wording that never dies

Flag: "for now", "temporary", "currently", "legacy", "eventually".

Rule:

- Transitional states belong in migration docs, not canonical vocab docs.

### 13. Negative fossil (retired-term hygiene)

Flag retired-term lists that include design-process scratch terms (terms
that were brainstormed but never shipped) instead of shipped terms only.

Rule:

- Retired-term lists name SHIPPED terms only -- terms that appeared in
  prior canonical docs, code, or YAML files.
- Scratch terms from design discussion belong in the design doc's
  "rejected alternatives" section, not the retired-terms list.
- Rationale: a retired-term list teaches readers what to stop using;
  including never-shipped terms confuses readers about what was real.

### 14. Overpowered setter

Flag setter primitives (e.g., `ObjectStateChange`) that can write
multiple unrelated fields without a schema rule, accept arbitrary
nested writes, or target undeclared fields.

Rule:

- Setter primitives may only write declared fields.
- Values must match the declared primitive type and metadata.
- Multi-field writes must be explicitly allowed by that primitive's
  spec, with the allowed shape declared.
- Validator rejects unknown fields and type-mismatched values.

### 15. Example becomes spec

Flag examples that introduce fields not defined in the schema tables.

Rule:

- Every field shown in an example must appear in a schema table earlier
  in the same doc (or in a linked schema doc).
- If an example needs a new field, add the field to the schema first.
- Examples illustrate the schema; they do not extend it.

### 16. Primitive names appearance instead of semantic state

Flag protocol-level primitives whose name describes a visual outcome
(Display, Show, Render, Color, Swap, Animate, Highlight, Move-pixels)
instead of a state change. Ask: does this primitive change semantic
simulation state, or does it merely describe how that state appears?
If it merely describes appearance, move it to object/render.

Detector keywords in primitive names: `Display`, `Show`, `Render`,
`Color`, `Swap`, `Animate`, `Highlight`, `Move-pixels`, `Visual`,
`Paint`. Detector phrases in primitive reason text: "show a
spinner", "draw under cursor", "render a progress bar", "tint",
"fill height", "asset swap", "display result".

Rule:

- Before adding any new protocol-level primitive, test whether it changes
  semantic simulation state or merely describes appearance.
- Protocol primitives change semantic simulation state -- what the
  simulation IS (declared state, held material, active scene,
  placement, equipment timed phase).
- Object/render layer mechanisms describe how the state appears -- how
  the simulation LOOKS (asset id, color, fill height, tint, numeric
  overlay, spinner, progress bar, cursor-follow visual).
- A primitive whose name or one-line meaning describes appearance is
  not a protocol primitive; it is a render-layer mechanism.
- Default severity for this category: `blocker` in canonical vocabulary
  docs.

## Smell-class quick reference

| Class | Detector keyword set | Rule |
| --- | --- | --- |
| Schema escape hatch | open-key objects, pass-through, plugin payloads | vocabulary edit required for new meaning |
| Open type | `string`, `any`, free-form | enum or explicit fields |
| Junk noun | `metadata`, `extras`, `custom`, `params` | closed schema or deferred |
| Nesting | nested writes, recursion | flat primitives |
| Layer leak | render in protocol, layout in object | strict three-layer ownership |
| Future-proofing | `arbitrary`, `extensible`, `etc.` | explicit RFC instead |
| Fixed count | numerals in prose | inventory artifact only |
| Shadow term | two names, one concept | retire one |
| Ownership | "who owns / mutates / renders / validates" answers diverge | single owner |
| Validation gap | type/range/default/behavior missing | full field spec |
| Render leak | SVG names, animation in spec | semantics only |
| Mini-language | formula, expression, template | closed token set |
| Transitional | "for now", "currently" | migration doc only |
| Negative fossil | scratch term in retired list | shipped terms only |
| Overpowered setter | multi-field or nested writes without schema | declared fields + primitive types only |
| Example as spec | example field absent from schema | add to schema or remove from example |
| Primitive names appearance | Display/Show/Render/Color/Swap/Animate in primitive name; "spinner"/"progress bar"/"tint"/"fill height" in reason text | test: does this primitive change semantic simulation state, or merely describe appearance? If merely appearance, move to render layer |

## Sweep agent deliverable

Output one consolidated table plus per-doc tally:

```
<doc>:<line> <severity> <section-context> <smell-class> "<quoted phrase>" -- <why-it-rots> -- <suggested-fix>
```

- `severity`: `blocker` / `warning` / `note`.
- `section-context`: `target-state` / `current-code` / `migration/history`.
- Sort within each doc: target-state blockers first; current-code notes last.

- No silent rewrites. Flag everything for human ratification.
- Do NOT edit any spec doc -- read-only sweep.
- Group findings by smell-class within each doc; sort docs by finding
  count descending so worst offenders surface first.
- Include a "no findings" line for clean docs so coverage is visible.

## Operating rules for the sweep agent

- Read all canonical docs in scope before flagging anything; some smells
  are cross-doc (shadow vocabularies, ownership ambiguity).
- Cite the past-pitfall name when a finding matches a known pattern.
- Distinguish "current-code description" (acceptable: descriptive prose
  of what exists today) from "target-state authoring rule" (required
  behavior). Most smells live in canonical vocabulary sections.
- Do not propose new vocabulary. Only flag and suggest the closure rule.
- Do not commit. Do not touch CHANGELOG.

## Final instruction to the sweep agent

Focus on canonical vocabulary and schema docs first. The goal is not
style cleanup. The goal is to find every place the specs permit
uncontrolled meaning, hidden semantics, or cross-layer drift.

## Closure

The sweep ends when every flagged finding has either: an accepted
amendment (handed back to the manager for dispatch), or a documented
deferral with owner and resolve-by milestone. No silent acceptances.
