# M2b Lane B3: CSS content policy

**Date:** 2026-05-23

## Scope

Lane B3 owns:
- `src/style.css`: foundations for scene-root layout and placement sizing
- `tools/check_css_content_policy.py`: static lint enforcing no-clipping rules
- Integration into `check_codebase.sh` (single line added)

Scope: scene-content selectors only (`#scene-root`, `[data-zone]`, `[data-placement-name]`, `[data-label]`, and any ancestor between them up to `#scene-root`). Harmless UI selectors outside `#scene-root` are unaffected.

Per Core Invariant #1: **No clipping. No cropping. Period.** Content must be spaced, never cut.

## Method

### CSS foundations (`src/style.css`)

Built with positive rules supporting:

- `#scene-root { position: relative; width: 100vw; height: 100vh; }` - primary layout container, scrollable
- `[data-zone]` selector - grouping container with absolute positioning per pipeline `_x`, `_top`, `_visualWidth`, `_height` inline styles
- `[data-placement-name]` selector - individual scene object with absolute positioning
- Depth ordering via `[data-depth="back|mid|front"]` mapping to z-index 1, 2, 3
- SVG inline sizing with `object-fit: contain` - preserves aspect ratio without scaling transforms
- Label placeholder rules with monospace font for M2b (B4 + B5 will refine)

### Checker implementation (`tools/check_css_content_policy.py`)

Python 3 script with:

- Simple hand-written CSS parser (acceptable for M2b static `style.css`)
- Scene-content selector detection via pattern matching (conservative heuristic)
- Banned property enforcement per Core Invariant #1
- Exit code 0 on pass, non-zero with offending line numbers on failure
- Line-number reporting for each violation

**Banned properties for scene-content selectors:**

| Property | Banned values | Rationale |
| --- | --- | --- |
| `overflow` | `hidden`, `clip` | No clipping or cropping |
| `clip` | any | No clip-path masking |
| `clip-path` | any | No clip-path masking |
| `mask` | any | No SVG masking |
| `mask-image` | any | No SVG masking |
| `contain` | `paint`, `strict`, `content` | No paint-containment clipping |
| `object-fit` | `cover` | Must use `contain` (not `cover`) |
| `transform` | `scale(...)`, `translate(...)`, any | No transform-based clipping or offset |
| `max-height` | any | No height hiding |
| `max-width` | any | No width hiding |
| `margin-*` | negative values | No negative margin drag-out |

### Integration into check_codebase.sh

Added single line:
```bash
step_run css:policy python3 tools/check_css_content_policy.py
```

Placed between format:check and test:node steps. Invoked via `bash check_codebase.sh` before TypeScript tests run.

## Results

### Test 1: Clean CSS passes

```
$ python3 tools/check_css_content_policy.py
processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css
OK: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css passes content policy check
```

**Exit code: 0**

### Test 2: Violation detection

Inserted `overflow: hidden;` on `[data-placement-name]` selector (line 20).

```
$ python3 tools/check_css_content_policy.py
processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css
FAIL: 1 violation(s) found in /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css
  Line 21: selector '[data-placement-name]' has banned property: overflow: hidden
```

**Exit code: 1**

Checker correctly:
- Identified the scene-content selector
- Matched the banned `overflow: hidden` pattern
- Reported the exact line number
- Exited non-zero

### Test 3: Violation removed, clean state restored

```
$ python3 tools/check_css_content_policy.py
processing /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css
OK: /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css passes content policy check
```

**Exit code: 0**

## Banned properties the checker enforces

**11 properties with specific value patterns:**

1. `overflow: hidden`
2. `overflow: clip`
3. `clip` (any)
4. `clip-path` (any)
5. `mask` (any)
6. `mask-image` (any)
7. `contain: paint`
8. `contain: strict`
9. `contain: content`
10. `object-fit: cover`
11. `transform: scale(...)`
12. `transform: translate(...)`
13. `max-height` (any)
14. `max-width` (any)
15. Negative `margin*` values

Total: 15 banned patterns across 11 distinct properties.

## Sample violation + exact error message

**CSS violation inserted:**

```css
[data-placement-name] {
	position: absolute;
	overflow: hidden;
}
```

**Exact error output:**

```
FAIL: 1 violation(s) found in /Users/vosslab/nsh/TYPESCRIPT/virtual-lab-protocol-simulation/src/style.css
  Line 21: selector '[data-placement-name]' has banned property: overflow: hidden
```

The checker reports:
- Violation count
- File path
- Exact line number
- Selector that triggered the ban
- Property and value that violates

## Concerns and residual risks

### 1. Parser limitations (acceptable for M2b)

The CSS parser is hand-written and regex-based. It handles:
- Standard comment blocks `/* ... */`
- Single selectors with `{ ... }` blocks
- Multi-line rules

**Limitations** (acceptable for static `style.css`):
- No support for nested CSS or SCSS syntax
- No media queries parsed (but banned properties in media queries would still be caught by line-by-line parsing)
- Complex selectors with function notation (e.g., `:is(...)`) are handled conservatively

**Mitigation:** For M2b, `src/style.css` is intentionally simple and static. If complexity grows, upgrade to `tinycss2` library (Python `tinycss2` package).

### 2. Scene-content selector heuristic

Selector detection uses pattern matching for core patterns (`#scene-root`, `[data-zone]`, `[data-placement-name]`, `[data-label]`) plus any ancestor chain between them.

**Risk:** A selector containing the pattern as a substring (e.g. `#not-scene-root`) could be falsely flagged. **Mitigation:** this is intentional; erring on the side of caution for a no-crop lint is correct. False positives are preferable to false negatives (missing a real violation).

### 3. Negative margin detection

Negative margin ban checks for pattern `^-` on margin values. This catches `-8px`, `-1em`, etc.

**Edge case:** If a value is `0` or positive, it is not banned. Values like `margin: 0 -5px 0 0` (shorthand with mixed signs) are detected only if the regex matches; the shorthand is not normalized. **Mitigation:** Keep margin rules simple in `style.css`; avoid complex shorthand for scene-content.

### 4. Integration dependency

The checker runs as a step in `check_codebase.sh`. If other steps fail earlier (e.g., lint for missing TS files), the css:policy step may not be reached.

**Mitigation:** The checker is independent of TypeScript/Node state. For M2c, once B1 files exist, `check_codebase.sh` will run fully including css:policy. For now, `python3 tools/check_css_content_policy.py` can be run standalone.

## Next steps

1. **B4 label-rendering integration:** B4 will request label-specific CSS rules via a co-edit to `style.css`. B3 reviews and merges; B5 confirms the merged CSS still passes `check_css_content_policy.py`.

2. **B1 renderer implementation:** Once B1 generates `[data-placement-name]`, `[data-zone]`, `[data-label]` DOM elements, the CSS rules will apply. No changes to the static lint are required.

3. **Full check_codebase.sh pass:** Once all group-2 files (B1-B4) are in place, `bash check_codebase.sh` will run the css:policy step as part of the standard lint gate.

4. **M2c expansion:** Scene-content selectors remain the only ones governed by the no-crop policy. Any dev-panel or debug UI added outside `#scene-root` may use `overflow: hidden` and `max-width` freely.

---

**Lane B3 complete. CSS content policy foundations and static lint in place. Ready for B4 co-edit request and B1/B2 renderer integration.**
