# SVG normalizer: path to 90 percent

## Context

The v3 SVG ingestion gate currently normalizes 1757 of 3125 wild corpus files
(`OTHER_REPOS/`): 56.2% raw, or 57.6% of the supportable corpus once the 73
intentionally-unsupported `EMBEDDED_RASTER_UNSUPPORTED` files are removed from
the denominator. This document is the engineering roadmap to reach roughly 90%.

It focuses on the three largest reject buckets the user named:
`STYLE_GEOMETRY_UNSUPPORTED`, `TEXT_UNSUPPORTED`, and `DOCTYPE_OR_ENTITY`. All
counts come from the all-reasons census (`tools/svg_feature_census.py`) and a
joint-yield probe run on 2026-06-10.

Source data: [svg_feature_census.md](../active_plans/reports/svg_feature_census.md),
[svg_imagehash_similarity_3125.md](svg_imagehash_similarity_3125.md),
[normalize_svg_v3_findings.md](normalize_svg_v3_findings.md).

## The headline finding: blockers stack

Naively, the three buckets sum to 683 + 314 + 232 = 1229 file-presences, which
would suggest clearing them lifts the rate far past 90%. That is wrong. Files
carry multiple independent blockers, and the gate reports only the first. A
joint-yield probe (disable the three detectors, harden the parser for entities,
re-run the whole gate) measured the real ceiling:

| State | Normalized | Raw rate |
| --- | --- | --- |
| Today | 1757 | 56.2% |
| All three buckets fully handled | 2436 | 78.0% |

Clearing all three buckets yields +679 files, not +1229. The difference (550
files) is files where solving one bucket merely exposes the next blocker.
Clearing the three buckets also makes hidden blockers visible: between the two
states, `PARSER_ERROR` rises 7 -> 155, `UNSUPPORTED_TRANSFORM` 34 -> 99, and
`CLIPPATH_UNSUPPORTED_COMPLEX` 84 -> 104.

The all-reasons co-occurrence table quantifies the stacking per bucket:

| Bucket | Files with reason | Also blocked by another | Solvable by this bucket alone |
| --- | --- | --- | --- |
| STYLE_GEOMETRY_UNSUPPORTED | 683 | 201 | 482 |
| TEXT_UNSUPPORTED | 314 | 89 | 225 |
| DOCTYPE_OR_ENTITY | 232 | 179 | 53 |

`DOCTYPE_OR_ENTITY` is the starkest: 179 of 232 doctype files have a second
blocker, so fixing doctype handling alone normalizes only ~53 files. Doctype is
worth doing mostly because it unblocks the parse so the OTHER blockers in those
files can even be assessed.

Conclusion: reaching 90% is not "do these three." It is "do these three AND the
second-order blockers they expose." The three buckets are the necessary first
stage (56% -> 78%); a fourth stage on transforms, clips, and parser robustness
carries 78% -> 90%.

## Objectives

- Stage 1: raise the gate from 56% to ~78% by handling the three named buckets.
- Stage 2: raise 78% to ~90% by handling the second-order blockers those buckets
  expose (parser robustness, more transform flattening, more clip cases).
- Preserve the gate's core guarantee: every normalized file renders
  deterministically and is never cropped or aspect-distorted (contract item 3).
- Keep `EMBEDDED_RASTER_UNSUPPORTED` and other intentional rejects out of scope.

## Design philosophy

This roadmap trades the gate's current simplicity for coverage, but only where
the added machinery stays bounded and render-faithful. It rejects the tempting
shortcut of "preserve unsupported content and hope the browser renders it":
that breaks the determinism the gate exists to guarantee. Each bucket is scored
by render-faithfulness first and yield second, so a cheap fix that produces
plausibly-wrong output (for example, preserving `<text>` and letting the browser
pick a font) is rejected in favor of a more expensive fix that is correct
(convert text to paths from a known font). Where a faithful fix is impossible
for some inputs (custom display fonts with no available file), those inputs stay
rejected rather than silently degraded.

## Scope

In scope:

- A bounded class-only CSS cascade for `<style>` geometry rules (Bucket 1).
- DOCTYPE stripping and safe internal-entity expansion (Bucket 2).
- A `TEXT_TO_OBJECT` text-to-path pre-filter for common fonts (Bucket 3).
- Second-order follow-through: parser robustness, wider transform flattening,
  wider clip handling (Stage 2).

Out of scope (intentional permanent rejects):

- `EMBEDDED_RASTER_UNSUPPORTED` (SVG embedding a raster image).
- `SCRIPT_OR_HANDLER`, `ANIMATION_UNSUPPORTED`, `FOREIGNOBJECT_UNSUPPORTED`,
  `EXTERNAL_RESOURCE_UNSUPPORTED` (security / non-determinism).
- True stroke-clipping (the 57 genuine stroke-trim cases from the clip work).

## Bucket 1: STYLE_GEOMETRY_UNSUPPORTED (683 files, 482 solvable alone)

### What actually trips it

The gate rejects any `<style>` block whose CSS sets a geometry-affecting
property (`fill`, `stroke`, `stroke-width`, `display`, `opacity`, `clip-path`,
etc.), because v3 resolves geometry from inline `style=` only and has no CSS
cascade. A per-declaration probe shows the trigger is overwhelmingly one shape:

| Triggering property | Declarations |
| --- | --- |
| fill | 70966 |
| stroke-width | 1068 |
| stroke | 1015 |
| display | 458 |
| opacity | 141 |
| clip-path | 24 |
| fill-opacity | 23 |

| Triggering selector shape | Rules |
| --- | --- |
| single-class (`.cls-1`) | 73468 |
| class-list (`.a, .b`) | 223 |
| single-tag (`rect`) | 4 |

99.7% of triggering rules are single-class selectors setting `fill`. This is the
bioicons export pattern: `.cls-1 { fill: #008a50 }` plus `class="cls-1"` on
paths. The deliberately-avoided "CSS selector and specificity engine" is not
actually required; what is required is class-name matching.

### The fix

Add a bounded class-only cascade that runs before the geometry passes:

1. Parse each `<style>` block with tinycss2 (already a dependency).
2. Accept only simple selectors: single class (`.name`), comma-lists of single
   classes, and bare tag selectors. Anything else (descendant combinators, ids,
   attribute selectors, pseudo-classes, `!important`, at-rules other than
   `@font-face`) keeps the file rejected under a narrower reason.
3. For each accepted rule, resolve its declarations onto every element whose
   `class` / tag matches, writing the property into the element's inline
   `style=` ONLY when the element does not already set it inline (inline wins,
   matching CSS specificity for class-vs-inline).
4. For comma-lists, split into single-class rules. Order rules source-order so a
   later rule overrides an earlier one (class specificity is equal; source order
   decides), which matches browser behavior for equal-specificity rules.
5. After inlining, the `<style>` block no longer determines geometry; drop the
   now-redundant geometry declarations (or the whole block when it held only
   those), and the existing inline-cascade geometry passes take over unchanged.

### Complexity and risk

Bounded and low-risk. No descendant/specificity engine. The main correctness
concern is specificity between class rules and inline styles; the "inline wins,
later-class-over-earlier-class" rule covers the corpus. Risk: a file using an
unsupported selector shape must stay rejected, not silently mis-resolved; the
accept-list in step 2 enforces that. Render-verify with the imagehash harness
(before = browser-resolved CSS, after = inlined) must show near-zero phash.

### Yield

482 files solvable by this bucket alone; contributes the largest single share of
Stage 1.

## Bucket 2: DOCTYPE_OR_ENTITY (232 files, 53 solvable alone)

### What actually trips it

The gate scans the first 4 KB for `<!DOCTYPE` or `<!ENTITY` and rejects on sight
(parser/security complexity). The 232 files split into three sub-cases:

| Sub-case | Files | Handling |
| --- | --- | --- |
| Bare DOCTYPE, no entities | 85 | Strip the DOCTYPE prolog and parse. Safe and trivial. |
| Internal-subset `<!ENTITY>` defs | ~? of 149 | Expand internal entities only; never fetch external. |
| External DTD (`SYSTEM`/`PUBLIC` url) | ~? of 149 | Strip the external DTD reference; block all network. |

(The internal-vs-external split inside the 149 entity files needs a precise
count during implementation; the probe confirmed both shapes are present -- a
standard SVG 1.0/1.1 `PUBLIC` DTD url, and internal `<!ENTITY>` subsets.)

### The fix

Replace the blanket reject with a hardened, entity-aware parse:

1. Strip a DOCTYPE that only references an external DTD (`SYSTEM`/`PUBLIC` with no
   internal subset); there are no entities to expand and the DTD is irrelevant to
   geometry.
2. For an internal-subset DOCTYPE, parse with `resolve_entities=True`,
   `no_network=True`, `load_dtd=True`, `huge_tree=False`. This expands internal
   entities, blocks external fetches (XXE protection), and bounds billion-laughs
   expansion.
3. After expansion the DOCTYPE is gone from the tree; serialize without it.

### The XXE and billion-laughs caveat

This is the one bucket with a security dimension. The hardened-parser flags
(`no_network`, bounded expansion) are mandatory, not optional. A naive
`resolve_entities=True` without `no_network` is a classic XXE. The probe already
hit and correctly blocked an external-DTD fetch, confirming the guard is needed.

### The catch: doctype is mostly an unblock-the-parse step

179 of 232 doctype files have a second blocker. Fixing doctype alone normalizes
only ~53 files. Its larger value is that it lets the parser reach the rest of
the document so the OTHER passes (text, style, transform) can assess it. This is
why the joint probe saw `PARSER_ERROR` climb to 155 when entities were expanded:
some entity files are malformed past the DOCTYPE, or expand into content that
trips a later blocker. Doctype handling is necessary for Stage 1's 78% but does
not, by itself, move the rate much.

### Complexity and risk

Low implementation complexity, moderate review burden (security review of the
parser flags is required). Yield-per-effort is low in isolation but it is a
prerequisite for assessing 179 stacked files.

## Bucket 3: TEXT_UNSUPPORTED (314 files, 225 solvable alone)

This is the hardest bucket and the one the user asked about directly: does a
`TEXT_TO_OBJECT` filter make sense?

### Answer: yes, a TEXT_TO_OBJECT pre-filter is the right architecture

A pre-filter that converts `<text>`/`<tspan>` into `<path>` geometry BEFORE the
file reaches the gate is the correct design, for three reasons:

- It preserves the gate's invariant. v3's "no text" rule exists because text
  rendering depends on font availability in the browser, which breaks
  determinism. Converting text to paths upstream means text never reaches the
  gate as text; the invariant stays intact and the gate stays simple.
- It matches the existing layering. The gate already documents an authoring rule
  ("convert text to paths before ingestion"). `TEXT_TO_OBJECT` automates that
  authoring step rather than teaching the gate to render fonts. It is a separate
  pass/tool, not a new gate detector.
- It is render-faithful when the font is available. A glyph outline is exact
  geometry; once converted, the result renders identically everywhere.

### What it requires

- A font-to-outline engine. `fonttools` (already familiar in the Python
  ecosystem) plus a shaping/positioning step, or freetype/harfbuzz bindings, to
  turn `(font, size, text, position)` into absolute path geometry.
- The actual font files. This is the hard constraint. The corpus font
  distribution:

| Font family | Files |
| --- | --- |
| Arial | 144 |
| (none declared -> default sans) | 46 |
| Virgil / Excalifont (Excalidraw) | 30 |
| sans-serif | 20 |
| Maven Pro | 7 |
| other custom (Kunstler Script, MyriadPro, Tw Cen MT, ...) | ~67 |

- Font substitution policy. Arial/Helvetica are not redistributable; substitute
  the metric-compatible Liberation Sans. Generic `sans-serif` and undeclared map
  to DejaVu Sans or Liberation Sans. With substitution, roughly 210 of 314 files
  (Arial 144 + none 46 + sans-serif 20) convert with visually-faithful, metric-
  compatible glyphs.
- The irreducible remainder: ~85 files use custom display fonts (Excalifont,
  Kunstler Script, Maven Pro, etc.) whose outlines cannot be reproduced without
  the specific font file. These stay rejected; the author must convert text to
  paths in the editor that has the font. This is correct behavior, not a gap.

### Render-faithfulness caveat

Substituting Liberation Sans for Arial is metric-compatible but not glyph-
identical. The imagehash harness will show small but non-zero phash on text-
heavy files. This is acceptable (the alternative -- preserving text and letting
the browser substitute -- is strictly worse and non-deterministic), but it must
be documented: `TEXT_TO_OBJECT` guarantees deterministic rendering, not byte-
identical glyphs, for substituted fonts.

### Complexity and risk

Highest of the three. New dependency (font engine + bundled metric-compatible
fonts), text shaping (kerning, `text-anchor`, `tspan` positioning, `dx`/`dy`,
`textLength`), and a substitution table. Risk of mis-positioned glyphs on
complex multi-`tspan` layouts. Scope it to single-line and simple multi-`tspan`
text first; reject exotic text layout (`textPath`, `writing-mode`, bidi) and let
those stay author-converted.

### Yield

225 files solvable alone; ~210 realistically convertible with substitution; ~85
custom-font files remain rejected by design.

## Stage 2: the second-order blockers (78% -> 90%)

Reaching 78% exposes the blockers that were hidden behind the three buckets.
From the joint probe's post-handling reject distribution, the largest remaining
solvable groups are:

| Remaining reason (post Stage 1) | Files | Disposition |
| --- | --- | --- |
| PARSER_ERROR | 155 | Robustness: tighter entity handling, encoding fallbacks, targeted recovery for known-safe malformations. Some are genuinely broken (stay rejected). |
| CLIPPATH_UNSUPPORTED_COMPLEX | 104 | The remaining real clips: `<g>` clip targets (companion to the shipped no-op work) and multi-shape clip union. |
| UNSUPPORTED_TRANSFORM | 99 | Wider transform support: the non-uniform-stroke and shared-paint cases currently rejected. |
| USE_OR_SYMBOL_UNSUPPORTED | 50 | `<use>`/`<symbol>` expansion (inline the referenced geometry). |
| FILTER_UNSUPPORTED | 47 | Mostly stays rejected (filters alter pixels beyond geometry); a drop-shadow-only subset could be removed like floor shadows. |

To move from 78% (2436) to 90% (2813) requires +377 files. That is reachable
from PARSER_ERROR robustness (155) + clip remainder (104) + transform (99) +
use/symbol (50), without touching the intentional rejects (raster, script,
foreignObject, external). This is why Stage 2 is mandatory for 90% and why the
three buckets alone (78%) are not sufficient.

## Milestone plan

| Stage | Work | Start rate | End rate (est) |
| --- | --- | --- | --- |
| 1a | Bucket 1: class-only CSS cascade | 56.2% | ~71% |
| 1b | Bucket 2: DOCTYPE strip + safe entity expand | ~71% | ~73% |
| 1c | Bucket 3: TEXT_TO_OBJECT pre-filter (common fonts) | ~73% | ~78% |
| 2a | use/symbol expansion + `<g>`/multi-shape clip | ~78% | ~84% |
| 2b | wider transform flattening | ~84% | ~87% |
| 2c | parser robustness | ~87% | ~90% |

Per-stage end-rates are estimates; the stacking means each stage's true yield
must be re-measured with the all-reasons census after the prior stage lands, not
predicted additively. The census is the instrument for this and already reports
the multiplicity histogram and co-occurrence needed to re-rank after each stage.

## Effort and risk register

| Bucket / stage | Effort | Risk | Render-faithful | Notes |
| --- | --- | --- | --- | --- |
| Bucket 1 (CSS class cascade) | medium | low | yes (near-zero phash) | 99.7% single-class; no selector engine |
| Bucket 2 (DOCTYPE/entity) | low-medium | medium (XXE) | yes | hardened parser flags mandatory; low solo yield |
| Bucket 3 (TEXT_TO_OBJECT) | high | medium | yes for available fonts; substituted fonts metric-compatible only | new font dependency; ~85 irreducible |
| Stage 2a (use/clip) | medium | low | yes | extends shipped clip work |
| Stage 2b (transform) | medium-high | medium | yes | the rejected non-uniform cases |
| Stage 2c (parser) | medium | low-medium | n/a | some inputs genuinely broken |

## Recommendation

1. Do Bucket 1 first. Highest yield-per-effort, lowest risk, render-faithful, no
   new dependency. ~56% -> ~71%.
2. Do Bucket 2 second. Cheap, unblocks the parse for 179 stacked files so their
   real blockers become measurable, but expect low solo yield and a parser-
   robustness tail.
3. Do Bucket 3 (TEXT_TO_OBJECT) as a separate pre-filter tool, not a gate change.
   It is the right architecture, carries the most effort and the only new heavy
   dependency, and leaves ~85 custom-font files correctly rejected.
4. Treat 90% as Stage 1 (three buckets, ~78%) plus Stage 2 (use/clip/transform/
   parser, ~90%). Re-measure with the all-reasons census after every stage; do
   not trust additive estimates, because blockers stack.

## Open decisions

- Bucket 3 font set: which metric-compatible fonts to bundle (Liberation Sans,
  DejaVu Sans) and the exact substitution table. License-clean fonts only.
- Bucket 2: confirm the internal-vs-external entity split within the 149 entity
  files to size the safe-expand vs strip-only work precisely.
- Stage 2 scope: how far to push `<use>`/`<symbol>` expansion and whether a
  drop-shadow-only `filter` removal (like floor shadows) is worth a sub-task.
