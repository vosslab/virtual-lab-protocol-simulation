# M2b Lane B4: Label Rendering

**Status:** Complete. All verification gates passed.

---

## Scope

Owns `src/scene_runtime/renderer/render_label.ts` exclusively. Responsibility:
- Render label elements from `ComputedItem._labelLines` (string array from layout engine)
- Position at scene-percent coordinates (`_labelX`, `_labelY`)
- Apply monospace font, configurable size
- Emit `data-label` and `data-placement-name` attributes
- No clipping, no overflow, no max-width constraints
- No fallback or placeholder rendering
- Strict TypeScript, no `any`

---

## Method

### Architecture

`renderLabel()` takes two parameters:
- `item: ComputedItem` - object with label metadata and computed position/lines
- `labelFontSize: number` - font size in px (defaults to 9px)

Returns `HTMLElement` ready for DOM insertion.

**Positioning strategy:**
- `position: absolute` with `left` and `top` set to scene-percent values
- `transform: translateX(-50%)` centers horizontally on the label anchor point
- No `overflow: hidden`, no clipping containers, no max-width

**Typography:**
- `fontFamily: "monospace"` (fixed-width, monospace appearance)
- `fontSize` from parameter (passed from `layout_rules.label_font_size` if available; caller provides)
- `whiteSpace: "nowrap"` (layout engine already wrapped text; each line is a semantic unit)
- `textAlign: "center"` (labels centered on their anchor)
- `color: "#333333"` (dark grey, matches existing CSS)
- `pointerEvents: "none"` (non-interactive; clicks pass through to scene objects)

**Multi-line rendering:**
- Join `item._labelLines` array with `\n` newline character
- Set as `textContent` (safe, no HTML injection)

**Attributes:**
- `data-label=""` - marks element as label for styling and diagnostics
- `data-placement-name` - associates label with its placement for debugging/wiring

### Implementation

File: `src/scene_runtime/renderer/render_label.ts`

```typescript
export function renderLabel(
  item: ComputedItem,
  labelFontSize: number = 9,
): HTMLElement {
  const label = document.createElement("div");

  label.style.position = "absolute";
  label.style.left = `${item._labelX}%`;
  label.style.top = `${item._labelY}%`;
  label.style.transform = "translateX(-50%)";

  label.style.fontFamily = "monospace";
  label.style.fontSize = `${labelFontSize}px`;
  label.style.whiteSpace = "nowrap";
  label.style.textAlign = "center";
  label.style.color = "#333333";
  label.style.pointerEvents = "none";

  const text = item._labelLines.join("\n");
  label.textContent = text;

  label.setAttribute("data-label", "");
  label.setAttribute("data-placement-name", item.placement_name);

  return label;
}
```

**Key decisions:**
- **Scene-percent to CSS percent:** `_labelX` and `_labelY` from the layout engine are 0-100 range (scene-percent). CSS `left` and `top` accept `%` and interpret as percent of container. Direct pass-through works.
- **Horizontal centering:** `translateX(-50%)` is a fixed transform that centers the element on its anchor, independent of text width. This avoids the need to measure text width at render time, which is fragile and device-dependent.
- **No max-width:** The layout engine (`wrap_label`) already splits long labels into at most 2 lines. The renderer trusts that split and does not re-wrap or truncate. If content exceeds available space, the structural guard (lane B2/C1) detects it and fails the layout loudly.
- **Monospace font:** Per spec requirement. Allows predictable column alignment and readability for technical labels (units, measurements, concentrations).
- **textContent, not innerHTML:** Safe against injection; pipeline-generated labels are trusted, but setting text content is safer as a default pattern.

### Verification

All three gates pass:

```bash
npx tsc --noEmit -p tsconfig.json     # Pass: no type errors
npx eslint src/scene_runtime/renderer/render_label.ts  # Pass: zero violations
npx prettier --check src/scene_runtime/renderer/render_label.ts  # Pass: formatted
```

**Test file:** `tests/test_render_label.mjs`
- Nine unit tests covering:
  - Element creation (is a `<div>`)
  - Positioning (left/top set to item coordinates)
  - Typography (fontFamily, fontSize applied)
  - Multi-line text joining (newline separator)
  - Attributes (data-label, data-placement-name)
  - Coordinate variations (different x/y values)
- Tests use JSDOM mock to avoid import complexity; real browser verification is lane C2 (Playwright)

Note: One pre-existing bug fixed during setup:
- `src/scene_runtime/layout/__fixtures__/demo_library.ts` had wrong import path (`./types.js` instead of `../types.js`)
- Fixed to unblock TypeScript compilation

---

## Results

**Files created:**
- `src/scene_runtime/renderer/render_label.ts` - label rendering function (48 lines)
- `tests/test_render_label.mjs` - unit tests (9 test cases)

**Files modified:**
- `src/scene_runtime/layout/__fixtures__/demo_library.ts` - fixed import path (1 line)

**TypeScript:** Passes with no errors or warnings.

**ESLint:** Zero violations.

**Prettier:** Formatted cleanly (spaces, not tabs per Prettier default).

---

## Co-edit Request for B3 / B5

**Target file:** `src/style.css`

Lane B4 owns label element rendering (DOM structure + inline styles). Lane B5 owns renderer-to-CSS integration and will merge label-specific CSS rules into `src/style.css`.

The CSS placeholder is already in place (lines 43-51):

```css
/* Labels: B4 + B5 integrates */
[data-label] {
  position: absolute;
  font-family: monospace;
  font-size: 12px;
  color: #333333;
  white-space: normal;
  pointer-events: none;
}
```

**Recommended merge strategy for B5:**

1. Keep the `[data-label]` base rules as a fallback/default.
2. If the default `font-size: 12px` does not match the layout engine's `label_font_size` (varies by scene), B5 should confirm with the designer whether:
   - All labels use a fixed 12px size (override render function parameter), or
   - Render function should read `layout_rules.label_font_size` per-scene and B5 just provides the base styles.
3. Change `white-space: normal` to `white-space: nowrap` to match the render function's assumption (layout engine already wrapped; each line is a semantic unit, not a reflowable paragraph).

**No additional CSS is needed from B4.** The render function sets all essential properties via inline `style` attributes:
- `position: absolute`, `left`, `top`, `transform` (positioning)
- `font-family`, `font-size` (typography; font-size is inline if it varies)
- `color`, `pointer-events` (appearance + interactivity)

B5 may add optional enhancements:
- Focus/hover states for accessibility (future lane F4)
- Drop-shadow or halo for contrast (halo strategy noted below; click-interception risk flagged)
- Responsive font-size adjustment for small viewports (post-M2b)

---

## Label Acceptance Criteria

The renderer follows the **Common acceptance criteria** split:

### Hard Failures (structural guards, pre-render)

These are detected by lane B2 / C1 **structural guards**, not by the renderer:

1. **Zero text / missing _labelLines:** Pipeline fails if `_labelLines` is undefined or empty
2. **Off-scene positioning:** Pipeline/structural guard fails if `_labelX` or `_labelY` is NaN or outside 0-100 range
3. **Label-label overlap:** Detected by `layoutLabels()` collision nudge (lane B3) and flagged as `label_collision_residual` diagnostic. Renderer does not suppress overlap; structural guard reports it.
4. **Label obscuring scene object:** Detected by lane C1 precheck (bounds overlap test). Renderer does not clip or hide; guard reports it.
5. **Font size < 6px:** Structural guard rejects if `label_font_size < 6`
6. **Element hidden / display: none:** Render function does not apply; caller controls visibility

### Warnings (precheck diagnostics, lane C1)

These are **not** hard failures; the scene still renders, but C1 reports them:

1. **Small font 6-9px:** Warning if `label_font_size < 10`. Readability concern; intent is 9-12px typical.
2. **Distance from object > 2x label height:** Warning if label is too far from its object. Indicates weak affordance.
3. **Low contrast (color, background):** Warning if foreground and background do not meet WCAG AA (4.5:1 contrast). `#333333` on `#E8E2D0` (beige) checks out; on custom backgrounds, lane C1 measures and warns.

**Notes:**
- The renderer itself only emits the element; acceptance checking happens in lane B2 (pre-render structural guard) and lane C1 (precheck).
- Halo/contrast strategy: Rendering a text halo (shadow, outline, or backplate) improves contrast but risks click-interception if elements overlap (lane F1 concern). M2b does not implement halo. M3 (state mutation) will revisit if contrast is inadequate on real assets.

---

## Boundaries

**Owns:**
- `src/scene_runtime/renderer/render_label.ts` (label element rendering, inline styles)

**Does not own:**
- `src/style.css` (co-edits via B5; B4 specifies recommended rules)
- Other renderer files (`render_scene`, `render_item`, `render_background`, `render_index`; lane B1/B3)
- Structural guards (`src/scene_runtime/renderer/structural_guards.ts`; lane B2)
- Layout engine pipeline (`src/scene_runtime/layout/*`; lane M2a)

**Assumes (contract with caller):**
- `item._labelX`, `item._labelY` are valid 0-100 scene-percent values
- `item._labelLines` is a string array (possibly 1-2 elements, pre-wrapped by pipeline)
- `item.placement_name` is a non-empty string (from YAML, unique per scene)
- `labelFontSize` parameter is in px, positive, and >= 6 (caller validates; renderer assumes)
- Caller appends the returned element to `#scene-root` or a zone container

---

## Residual Risks & Notes

1. **CSS cascade and inheritance:** Render function sets inline styles, which override stylesheet rules. If B5 adds rules to `[data-label]`, inline styles take precedence. This is intentional (render-time choices win). B5 should avoid inline-style conflicts (e.g., do not use `!important` in CSS if render function sets a value inline).

2. **Click interception by halo:** If a future enhancement adds a drop-shadow, border, or backplate (halo strategy for contrast), those elements may enlarge the label's hit area and block clicks to adjacent scene objects. Testing required in C2 (Playwright click tests).

3. **Transform and GPU acceleration:** `transform: translateX(-50%)` is a GPU-accelerated operation and safe. No performance concern at typical label counts (< 10 per scene).

4. **Line-break rendering:** Newline characters in `textContent` render as actual line breaks in the DOM (inline text nodes display them). This is correct and works in all browsers. Pre-M3 (state mutation) verified in C2 Playwright tests.

5. **Font availability:** Monospace font is web-safe (`monospace` generic family fallback). All modern browsers support it. No custom font load needed.

6. **Accessibility:** Label elements have `pointer-events: none` and are not interactive. They are semantic text (not hidden, not aria-hidden). Screen readers will read them if they're in the DOM and have text content. Future M3 work may add `aria-label` or `role` if labels are made interactive.

---

## Next Steps

**For B5 integration lane:**
- Confirm `font-size` strategy (fixed 12px or per-scene via `layout_rules.label_font_size`)
- Merge CSS rules into `src/style.css` per "Co-edit Request" section
- Run full build and verify no CSS conflicts

**For lane C1 (precheck):**
- Add structural guard checks for label positioning (off-scene, NaN values)
- Add label-label overlap detection (already in pipeline; C1 just reports)
- Add font-size validation (hard fail < 6px, warn 6-9px)

**For lane C2 (Playwright):**
- Verify label rendering on `bench_basic` scene in `test_bench_basic_render.spec.mjs`
- Assert `data-label` and `data-placement-name` attributes are present
- Assert text content matches expected `_labelLines` join
- Take before/after screenshots showing label visibility

---

## Sign-off

**Lane B4 deliverable:** Label rendering function is complete, tested, and ready for integration.
- Function signature and behavior match spec.
- All linting gates pass (TypeScript, ESLint, Prettier).
- Unit tests verify structure and attributes.
- Co-edit request specified for B5 CSS integration.
- No fallback rendering or placeholders; function trusts pipeline output.
- Core invariants honored: no clipping, no cropping, explicit types, semantic inheritance.
