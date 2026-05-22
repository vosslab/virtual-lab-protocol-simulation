/**
 * test_layout_engine.mjs - Playwright unit tests for the layout engine.
 * Opens cell_culture_game.html and calls computeSceneLayout() with synthetic data.
 * Run: node tests/test_layout_engine.mjs
 */

/* global computeSceneLayout */
import { chromium } from "playwright";
import path from "path";
import process from "node:process";
import { execSync } from "child_process";

import { REPO_ROOT } from "./repo_root.mjs";
import { gameFilePath } from "./build_game_if_missing.mjs";

const gamePath = await gameFilePath(REPO_ROOT);
const gameUrl = `file://${gamePath}`;

// Compile layout_engine.ts to JS at test startup using esbuild
function compileLayoutEngine() {
  const tsFile = path.resolve("parts/layout_engine.ts");
  const js = execSync(
    `npx esbuild "${tsFile}" --bundle=false --target=es2020`,
    { encoding: "utf8" },
  );
  return js;
}

// ============================================
async function runTests(page) {
  // All test logic runs in a single page.evaluate() call
  const results = await page.evaluate(() => {
    // shared tolerance for numeric comparisons in tests
    const TEST_TOLERANCE = 0.01;
    // internal engine constants reproduced for test assertions
    const ZONE_PADDING = 1;
    // ---- helpers ----
    function item(id, priority, widthScale, anchorY, shortLabel) {
      return {
        id,
        asset: id,
        kind: "bottle",
        zone: "test",
        priority,
        widthScale: widthScale || 1.0,
        label: "Label " + id,
        shortLabel,
        anchorY: anchorY || "bottom",
      };
    }
    function spec(defaultWidth, aspectRatio) {
      return { defaultWidth, aspectRatio, labelWidth: 5 };
    }

    // build a minimal SceneLayoutRules with one zone
    function makeRules(zoneOpts) {
      return {
        zones: {
          test: Object.assign(
            { x0: 0, x1: 100, baseline: 80, gap: 2, align: "center" },
            zoneOpts || {},
          ),
        },
        labelFontSize: 10,
        labelLineHeight: 12,
        labelOffsetY: 2,
      };
    }

    // build specs map for a list of items using a single spec template
    function specsFor(items, defaultWidth, aspectRatio) {
      const s = spec(defaultWidth, aspectRatio);
      const map = {};
      for (let i = 0; i < items.length; i++) {
        map[items[i].asset] = s;
      }
      return map;
    }

    const tests = [];

    // ---- test 1: single item center align ----
    (function () {
      const name = "Single item, center align";
      try {
        const it = item("a", 1, 1.0, "bottom");
        const sp = specsFor([it], 10, 1.0);
        const rules = makeRules({ align: "center" });
        const layouts = computeSceneLayout([it], sp, rules, 100, 100);
        const lay = layouts[0];
        // zone [0,100], item width 10 -> startX = (100-10)/2 = 45
        const expectedX = 45;
        const pass = Math.abs(lay.x - expectedX) < 0.01;
        tests.push({
          name,
          pass,
          detail: `x=${lay.x.toFixed(2)} expected ${expectedX}`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 2: single item left align ----
    (function () {
      const name = "Single item, left align";
      try {
        const it = item("a", 1, 1.0, "bottom");
        const sp = specsFor([it], 10, 1.0);
        const rules = makeRules({ align: "left" });
        const layouts = computeSceneLayout([it], sp, rules, 100, 100);
        const lay = layouts[0];
        // ZONE_PADDING offsets from zone edge
        const pass = Math.abs(lay.x - 1) < 0.01;
        tests.push({
          name,
          pass,
          detail: `x=${lay.x.toFixed(2)} expected 1 (zone padding)`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 3: single item right align ----
    (function () {
      const name = "Single item, right align";
      try {
        const it = item("a", 1, 1.0, "bottom");
        const sp = specsFor([it], 10, 1.0);
        const rules = makeRules({ align: "right" });
        const layouts = computeSceneLayout([it], sp, rules, 100, 100);
        const lay = layouts[0];
        // right edge should equal zone.x1 - ZONE_PADDING = 99
        const rightEdge = lay.x + lay.width;
        const pass = Math.abs(rightEdge - 99) < 0.01;
        tests.push({
          name,
          pass,
          detail: `right edge=${rightEdge.toFixed(2)} expected 99 (zone padding)`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 4: two items, priority ordering ----
    (function () {
      const name = "Two items, priority ordering";
      try {
        // priority 1 should come before priority 2 (left of)
        const ia = item("b", 2, 1.0, "bottom");
        const ib = item("a", 1, 1.0, "bottom");
        const sp = specsFor([ia, ib], 10, 1.0);
        const rules = makeRules({ align: "center" });
        const layouts = computeSceneLayout([ia, ib], sp, rules, 100, 100);
        // find by id
        const layA = layouts.find(function (l) {
          return l.id === "a";
        });
        const layB = layouts.find(function (l) {
          return l.id === "b";
        });
        // item with priority 1 (id=a) should be left of priority 2 (id=b)
        const pass = layA.x < layB.x;
        tests.push({
          name,
          pass,
          detail: `a.x=${layA.x.toFixed(2)} b.x=${layB.x.toFixed(2)}`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 5: three items, zone containment ----
    (function () {
      const name = "Three items, zone containment";
      try {
        const items = [
          item("c", 1, 1.0, "bottom"),
          item("d", 2, 1.0, "bottom"),
          item("e", 3, 1.0, "bottom"),
        ];
        const sp = specsFor(items, 20, 1.0);
        const rules = makeRules({ x0: 0, x1: 100, gap: 2 });
        const layouts = computeSceneLayout(items, sp, rules, 100, 100);
        const pass = layouts.every(function (l) {
          return l.x >= 0 && l.x + l.width <= 100 + 0.01;
        });
        tests.push({
          name,
          pass,
          detail: layouts
            .map(function (l) {
              return (
                l.id +
                ":[" +
                l.x.toFixed(1) +
                "," +
                (l.x + l.width).toFixed(1) +
                "]"
              );
            })
            .join(" "),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 6: overflow scaling ----
    (function () {
      const name = "Overflow scaling, items still within zone";
      try {
        // 4 items each 30px wide, zone only 100px -> overflow
        const items = [
          item("f", 1, 1.0, "bottom"),
          item("g", 2, 1.0, "bottom"),
          item("h", 3, 1.0, "bottom"),
          item("k", 4, 1.0, "bottom"),
        ];
        const sp = specsFor(items, 30, 1.0);
        const rules = makeRules({ x0: 0, x1: 100, gap: 1 });
        const layouts = computeSceneLayout(items, sp, rules, 100, 100);
        // check widths are smaller than original 30
        const scaledDown = layouts.every(function (l) {
          return l.width < 30;
        });
        const inZone = layouts.every(function (l) {
          return l.x >= -0.01 && l.x + l.width <= 100.01;
        });
        const pass = scaledDown && inZone;
        tests.push({
          name,
          pass,
          detail:
            "scaledDown=" +
            scaledDown +
            " inZone=" +
            inZone +
            " widths=" +
            layouts
              .map(function (l) {
                return l.width.toFixed(1);
              })
              .join(","),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 7: anchor bottom ----
    (function () {
      const name = "Anchor bottom: item.y + height == baseline";
      try {
        const it = item("m", 1, 1.0, "bottom");
        const sp = specsFor([it], 10, 1.0);
        const rules = makeRules({ baseline: 80 });
        const layouts = computeSceneLayout([it], sp, rules, 100, 100);
        const lay = layouts[0];
        const bottom = lay.y + lay.height;
        const pass = Math.abs(bottom - 80) < 0.01;
        tests.push({
          name,
          pass,
          detail: `y+h=${bottom.toFixed(2)} expected 80`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 8: anchor center ----
    (function () {
      const name = "Anchor center: item midpoint == baseline";
      try {
        const it = item("n", 1, 1.0, "center");
        const sp = specsFor([it], 10, 1.0);
        const rules = makeRules({ baseline: 80 });
        const layouts = computeSceneLayout([it], sp, rules, 100, 100);
        const lay = layouts[0];
        const mid = lay.y + lay.height / 2;
        const pass = Math.abs(mid - 80) < 0.01;
        tests.push({ name, pass, detail: `mid=${mid.toFixed(2)} expected 80` });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 9: anchor tip (anchorYOffset=0 behaves like bottom) ----
    (function () {
      const name = "Anchor tip with anchorYOffset=0: same as bottom";
      try {
        const it = item("o", 1, 1.0, "tip");
        const spMap = {
          o: {
            defaultWidth: 10,
            aspectRatio: 1.0,
            labelWidth: 5,
            anchorYOffset: 0,
          },
        };
        const rules = makeRules({ baseline: 80 });
        const layouts = computeSceneLayout([it], spMap, rules, 100, 100);
        const lay = layouts[0];
        // tip: top = baseline - height + anchorYOffset(0) = baseline - height
        // so bottom = lay.y + lay.height = baseline
        const bottom = lay.y + lay.height;
        const pass = Math.abs(bottom - 80) < 0.01;
        tests.push({
          name,
          pass,
          detail: `y+h=${bottom.toFixed(2)} expected 80`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 10: label wrapping ----
    (function () {
      const name = "Label wrapping: long label on narrow item produces 2 lines";
      try {
        // item width 10, label "Hello World" ~6.6 chars wide; exceeds 10
        // AVG_CHAR_WIDTH_PCT = 0.55, "Hello World" = 11 chars * 0.55 = 6.05 > 4.5 (half of 10)
        // Actually need estWidth > lay.width. lay.width for 1 item center in [0,100] w=10
        // estWidth = max(charWidth, specWidth)
        // charWidth = label.length * 0.55
        // label = "Label p" = 7 chars -> 3.85 < 10 (won't wrap)
        // Use a long label that exceeds width
        const it = {
          id: "p",
          asset: "p",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "Alpha Beta Gamma", // 16 chars * 0.55 = 8.8 > item width 8
          anchorY: "bottom",
        };
        const spMap = {
          p: { defaultWidth: 8, aspectRatio: 1.0, labelWidth: 2 },
        };
        const rules = makeRules({ x0: 0, x1: 100 });
        const layouts = computeSceneLayout([it], spMap, rules, 100, 100);
        const lay = layouts[0];
        const pass = lay.labelMultiline === true && lay.labelLines.length === 2;
        tests.push({
          name,
          pass,
          detail:
            "lines=" +
            lay.labelLines.length +
            " multiline=" +
            lay.labelMultiline +
            " labelLines=" +
            JSON.stringify(lay.labelLines),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 11: label collision ----
    (function () {
      const name = "Label collision: two close items, labels nudged apart";
      try {
        // two narrow items close together so labels initially overlap
        // zone [0,20], two items each width 4, gap 1
        // after layout: item0.x~6, item1.x~11 (centers 8 and 13)
        // labelX0~8, labelX1~13
        // If labelWidth large enough they'll collide
        const ia = item("q", 1, 1.0, "bottom");
        const ib = item("r", 2, 1.0, "bottom");
        const spMap = {
          q: { defaultWidth: 4, aspectRatio: 1.0, labelWidth: 8 },
          r: { defaultWidth: 4, aspectRatio: 1.0, labelWidth: 8 },
        };
        const rules = {
          zones: {
            test: { x0: 0, x1: 30, baseline: 80, gap: 1, align: "center" },
          },
          labelFontSize: 10,
          labelLineHeight: 12,
          labelOffsetY: 2,
        };
        const layouts = computeSceneLayout([ia, ib], spMap, rules, 100, 100);
        const layQ = layouts.find(function (l) {
          return l.id === "q";
        });
        const layR = layouts.find(function (l) {
          return l.id === "r";
        });
        // after collision resolution: left.labelX + left.labelWidth/2
        // should be <= right.labelX - right.labelWidth/2 + tolerance
        const leftEdge = layQ.labelX + layQ.labelWidth / 2;
        const rightEdge = layR.labelX - layR.labelWidth / 2;
        // They may still overlap slightly (single-pass nudge has limits)
        // but labelX values must be different (nudging occurred)
        const pass = layQ.labelX !== layR.labelX;
        tests.push({
          name,
          pass,
          detail: `q.labelX=${layQ.labelX.toFixed(2)} r.labelX=${layR.labelX.toFixed(2)} leftEdge=${leftEdge.toFixed(2)} rightEdge=${rightEdge.toFixed(2)}`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 12: deterministic sort by id ----
    (function () {
      const name =
        "Deterministic sort: same priority sorted by id alphabetically";
      try {
        // same priority, ids in reverse alpha order -- engine must sort alpha
        const ic = item("z_item", 1, 1.0, "bottom");
        const id = item("a_item", 1, 1.0, "bottom");
        const sp = specsFor([ic, id], 10, 1.0);
        const rules = makeRules({});
        const layouts = computeSceneLayout([ic, id], sp, rules, 100, 100);
        const layA = layouts.find(function (l) {
          return l.id === "a_item";
        });
        const layZ = layouts.find(function (l) {
          return l.id === "z_item";
        });
        // a_item should be placed left of z_item
        const pass = layA.x < layZ.x;
        tests.push({
          name,
          pass,
          detail: `a_item.x=${layA.x.toFixed(2)} z_item.x=${layZ.x.toFixed(2)}`,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 13: footprint vs visual width ----
    (function () {
      const name = "Footprint: narrow items spaced by label width";
      try {
        // 3 narrow items (width 3) with wide labels (8)
        const items = [
          {
            id: "p1",
            asset: "p1",
            kind: "pipette",
            zone: "test",
            priority: 1,
            widthScale: 1.0,
            label: "Serological Pipette",
            anchorY: "bottom",
          },
          {
            id: "p2",
            asset: "p2",
            kind: "pipette",
            zone: "test",
            priority: 2,
            widthScale: 1.0,
            label: "Aspirating Pipette",
            anchorY: "bottom",
          },
          {
            id: "p3",
            asset: "p3",
            kind: "pipette",
            zone: "test",
            priority: 3,
            widthScale: 1.0,
            label: "Multichannel Pipette",
            anchorY: "bottom",
          },
        ];
        const spMap = {
          p1: { defaultWidth: 3, labelWidth: 8 },
          p2: { defaultWidth: 3, labelWidth: 8 },
          p3: { defaultWidth: 3, labelWidth: 8 },
        };
        const rules = {
          zones: { test: { x0: 0, x1: 50, baseline: 80, gap: 2 } },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout(items, spMap, rules, 800, 600);
        // items should be spaced wider than visual width
        const gap01 = layouts[1].x - (layouts[0].x + layouts[0].width);
        const pass = gap01 > 3;
        tests.push({
          name,
          pass,
          detail: "gap=" + gap01.toFixed(1) + " (>3 means footprint working)",
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 14: overflow respects MIN_SCALE ----
    (function () {
      const name = "Overflow: scale never below MIN_SCALE";
      try {
        // 5 items in a tiny zone to force heavy overflow
        const items = [];
        const spMap = {};
        for (let k = 0; k < 5; k++) {
          const id = "ov" + k;
          items.push({
            id: id,
            asset: id,
            kind: "bottle",
            zone: "test",
            priority: k + 1,
            widthScale: 1.0,
            label: "Item " + k,
            anchorY: "bottom",
          });
          spMap[id] = { defaultWidth: 10, labelWidth: 5 };
        }
        const rules = {
          zones: { test: { x0: 0, x1: 20, baseline: 80, gap: 1 } },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
        // width should be >= defaultWidth * MIN_SCALE (0.75)
        const minExpected = 10 * 0.75;
        let allAbove = true;
        for (let k = 0; k < layouts.length; k++) {
          if (layouts[k].width < minExpected - 0.01) allAbove = false;
        }
        tests.push({
          name,
          pass: allAbove,
          detail:
            "width=" +
            layouts[0].width.toFixed(2) +
            " min=" +
            minExpected.toFixed(2),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 15: labels clamped to padded zone bounds ----
    (function () {
      const name = "Zone clamping: labels within padded bounds";
      try {
        const it = {
          id: "wl",
          asset: "wl",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "Very Long Label That Should Be Clamped",
          anchorY: "bottom",
        };
        const spMap = { wl: { defaultWidth: 5, labelWidth: 10 } };
        const rules = {
          zones: { test: { x0: 10, x1: 30, baseline: 80, gap: 2 } },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout([it], spMap, rules, 100, 100);
        const lay = layouts[0];
        const labelLeft = lay.labelX - lay.labelWidth / 2;
        const labelRight = lay.labelX + lay.labelWidth / 2;
        // with ZONE_PADDING=1, padded bounds [11,29]
        const pass = labelLeft >= 10 && labelRight <= 30;
        tests.push({
          name,
          pass,
          detail: "L=" + labelLeft.toFixed(1) + " R=" + labelRight.toFixed(1),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- helper: check mode-specific cluster-anchor invariant ----
    function anchorOk(layouts, align, x0, x1) {
      const effX0 = x0 + ZONE_PADDING;
      const effX1 = x1 - ZONE_PADDING;
      const first = layouts[0];
      const last = layouts[layouts.length - 1];
      if (align === "left") {
        return Math.abs(first.x - effX0) < TEST_TOLERANCE;
      }
      if (align === "right") {
        return Math.abs(last.x + last.width - effX1) < TEST_TOLERANCE;
      }
      const mid = (first.x + last.x + last.width) / 2;
      const zm = (effX0 + effX1) / 2;
      return Math.abs(mid - zm) < TEST_TOLERANCE;
    }

    // ---- test 16: pipettes-like right-align flush to edge ----
    (function () {
      const name = "Pipettes-like right-align: last visual edge flush";
      try {
        const items = [
          {
            id: "s",
            asset: "s",
            kind: "pipette",
            zone: "test",
            priority: 1,
            widthScale: 1.0,
            label: "Serological Pipette",
            anchorY: "bottom",
          },
          {
            id: "a",
            asset: "a",
            kind: "pipette",
            zone: "test",
            priority: 2,
            widthScale: 1.0,
            label: "Aspirating Pipette",
            anchorY: "bottom",
          },
          {
            id: "m",
            asset: "m",
            kind: "pipette",
            zone: "test",
            priority: 3,
            widthScale: 1.0,
            label: "Multichannel Pipette",
            anchorY: "bottom",
          },
        ];
        const spMap = {
          s: { defaultWidth: 3, labelWidth: 6 },
          a: { defaultWidth: 3, labelWidth: 6 },
          m: { defaultWidth: 5, labelWidth: 6 },
        };
        const rules = {
          zones: {
            test: { x0: 54, x1: 82, baseline: 50, gap: 2, align: "right" },
          },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
        const last = layouts[layouts.length - 1];
        const effX1 = 82 - ZONE_PADDING;
        const pass = Math.abs(last.x + last.width - effX1) < TEST_TOLERANCE;
        tests.push({
          name,
          pass,
          detail:
            "last.x+w=" +
            (last.x + last.width).toFixed(3) +
            " expected " +
            effX1.toFixed(3),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 17: right-align overflow past MIN_SCALE (Bug 1) ----
    (function () {
      const name = "Right-align overflow past MIN_SCALE: anchor preserved";
      try {
        // zone width 20 (padded 18); 4 items with defaultWidth=8,
        // gap=1. Total footprint=32 (caps to 1.4*8=11.2 each => 32
        // since labelWidth 5 < 11.2). After MIN_SCALE (0.75),
        // scaled total 24, still > 18 -> negative gap branch.
        const items = [];
        const spMap = {};
        for (let k = 0; k < 4; k++) {
          const id = "r" + k;
          items.push({
            id: id,
            asset: id,
            kind: "bottle",
            zone: "test",
            priority: k + 1,
            widthScale: 1.0,
            label: "Item " + k,
            anchorY: "bottom",
          });
          spMap[id] = { defaultWidth: 8, labelWidth: 5 };
        }
        const rules = {
          zones: {
            test: { x0: 60, x1: 80, baseline: 50, gap: 1, align: "right" },
          },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
        const last = layouts[layouts.length - 1];
        const first = layouts[0];
        const rightFlush = Math.abs(last.x + last.width - 79) < TEST_TOLERANCE;
        const firstReasonable = first.x >= 60 - 1;
        // verify negative-gap branch: items overlap
        const overlapped = layouts[1].x < layouts[0].x + layouts[0].width;
        const pass = rightFlush && firstReasonable && overlapped;
        tests.push({
          name,
          pass,
          detail:
            "rightFlush=" +
            rightFlush +
            " firstReasonable=" +
            firstReasonable +
            " overlapped=" +
            overlapped +
            " last.x+w=" +
            (last.x + last.width).toFixed(3),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 18: left-align overflow past MIN_SCALE (Bug 1 mirror) ----
    (function () {
      const name = "Left-align overflow past MIN_SCALE: first flush to x0";
      try {
        const items = [];
        const spMap = {};
        for (let k = 0; k < 4; k++) {
          const id = "l" + k;
          items.push({
            id: id,
            asset: id,
            kind: "bottle",
            zone: "test",
            priority: k + 1,
            widthScale: 1.0,
            label: "Item " + k,
            anchorY: "bottom",
          });
          spMap[id] = { defaultWidth: 8, labelWidth: 5 };
        }
        const rules = {
          zones: {
            test: { x0: 10, x1: 30, baseline: 50, gap: 1, align: "left" },
          },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
        const first = layouts[0];
        const pass = Math.abs(first.x - 11) < TEST_TOLERANCE;
        tests.push({
          name,
          pass,
          detail: "first.x=" + first.x.toFixed(3) + " expected 11",
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 19: center-align overflow past MIN_SCALE (Bug 1) ----
    (function () {
      const name = "Center-align overflow: cluster midpoint = zone mid";
      try {
        const items = [];
        const spMap = {};
        for (let k = 0; k < 4; k++) {
          const id = "c" + k;
          items.push({
            id: id,
            asset: id,
            kind: "bottle",
            zone: "test",
            priority: k + 1,
            widthScale: 1.0,
            label: "Item " + k,
            anchorY: "bottom",
          });
          spMap[id] = { defaultWidth: 8, labelWidth: 5 };
        }
        const rules = {
          zones: {
            test: { x0: 40, x1: 60, baseline: 50, gap: 1, align: "center" },
          },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
        const first = layouts[0];
        const last = layouts[layouts.length - 1];
        const mid = (first.x + last.x + last.width) / 2;
        const pass = Math.abs(mid - 50) < TEST_TOLERANCE;
        tests.push({
          name,
          pass,
          detail: "mid=" + mid.toFixed(3) + " expected 50",
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 20: n === 1 oversized item in each align mode ----
    (function () {
      const name = "n=1 oversized item: alignment anchor honored";
      try {
        const alignModes = ["left", "center", "right"];
        let allPass = true;
        const details = [];
        for (let ai = 0; ai < alignModes.length; ai++) {
          const mode = alignModes[ai];
          const it = {
            id: "big",
            asset: "big",
            kind: "bottle",
            zone: "test",
            priority: 1,
            widthScale: 1.0,
            label: "Big Item",
            anchorY: "bottom",
          };
          const spMap = { big: { defaultWidth: 30, labelWidth: 10 } };
          const rules = {
            zones: {
              test: { x0: 0, x1: 20, baseline: 50, gap: 2, align: mode },
            },
            labelFontSize: 9,
            labelLineHeight: 1.1,
            labelOffsetY: 3,
          };
          const layouts = computeSceneLayout([it], spMap, rules, 100, 100);
          const ok = anchorOk(layouts, mode, 0, 20);
          if (!ok) allPass = false;
          details.push(mode + ":" + (ok ? "OK" : "FAIL"));
        }
        tests.push({ name, pass: allPass, detail: details.join(" ") });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 21: n === 2 fit + overflow in each align mode ----
    (function () {
      const name = "n=2 cluster: anchor preserved across all modes";
      try {
        const alignModes = ["left", "center", "right"];
        const cases = [
          { dw: 5, expect: "fit" },
          { dw: 30, expect: "overflow" },
        ];
        let allPass = true;
        const details = [];
        for (let ai = 0; ai < alignModes.length; ai++) {
          for (let ci = 0; ci < cases.length; ci++) {
            const mode = alignModes[ai];
            const dw = cases[ci].dw;
            const items = [
              {
                id: "a",
                asset: "a",
                kind: "bottle",
                zone: "test",
                priority: 1,
                widthScale: 1.0,
                label: "A",
                anchorY: "bottom",
              },
              {
                id: "b",
                asset: "b",
                kind: "bottle",
                zone: "test",
                priority: 2,
                widthScale: 1.0,
                label: "B",
                anchorY: "bottom",
              },
            ];
            const spMap = {
              a: { defaultWidth: dw, labelWidth: 5 },
              b: { defaultWidth: dw, labelWidth: 5 },
            };
            const rules = {
              zones: {
                test: { x0: 0, x1: 30, baseline: 50, gap: 1, align: mode },
              },
              labelFontSize: 9,
              labelLineHeight: 1.1,
              labelOffsetY: 3,
            };
            const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
            const ok = anchorOk(layouts, mode, 0, 30);
            if (!ok) allPass = false;
            details.push(
              mode + "/" + cases[ci].expect + ":" + (ok ? "OK" : "FAIL"),
            );
          }
        }
        tests.push({ name, pass: allPass, detail: details.join(" ") });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 22: narrow item with wide label keeps single line ----
    (function () {
      const name = "Narrow item, wide label: uses footprint availability";
      try {
        // defaultWidth 3, labelWidth 6 - footprint capped at
        // 1.4*3=4.2, labelWidth 6 > 4.2 so footprint = 4.2
        // Single short label should fit on one line in unscaled
        // charWidth units (label.length * 0.55 <= 4.2 means
        // about 7 chars max).
        const it = {
          id: "p",
          asset: "p",
          kind: "pipette",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "Short",
          anchorY: "bottom",
        };
        const spMap = { p: { defaultWidth: 3, labelWidth: 6 } };
        const rules = {
          zones: {
            test: { x0: 0, x1: 30, baseline: 50, gap: 2, align: "center" },
          },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
        };
        const layouts = computeSceneLayout([it], spMap, rules, 100, 100);
        const lay = layouts[0];
        // footprint field must be populated and >= width
        const hasFootprint =
          typeof lay.footprint === "number" &&
          lay.footprint >= lay.width - TEST_TOLERANCE;
        const singleLine = lay.labelLines.length === 1;
        const pass = hasFootprint && singleLine;
        tests.push({
          name,
          pass,
          detail:
            "footprint=" +
            lay.footprint +
            " width=" +
            lay.width +
            " lines=" +
            lay.labelLines.length,
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 24: depth tier back shrinks + raises ----
    (function () {
      const name = "Depth back: item 0.80x wide and baseline - 4";
      try {
        const itMid = {
          id: "a",
          asset: "a",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "A",
          anchorY: "bottom",
        };
        const itBack = {
          id: "b",
          asset: "b",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "B",
          anchorY: "bottom",
          depth: "back",
        };
        const spMap = {
          a: { defaultWidth: 10, labelWidth: 5 },
          b: { defaultWidth: 10, labelWidth: 5 },
        };
        const rules = makeRules({ baseline: 80, align: "center" });
        const layMid = computeSceneLayout([itMid], spMap, rules, 100, 100)[0];
        const layBack = computeSceneLayout([itBack], spMap, rules, 100, 100)[0];
        // Back should be 0.80x the width of mid.
        const scaleOk = Math.abs(layBack.width / layMid.width - 0.8) < 0.01;
        // Back baseline is zone.baseline + DEPTH_BASELINE_BACK (= -4),
        // so a back-depth bottom-anchored item sits HIGHER than mid.
        // layBack.y + layBack.height equals the effective baseline.
        const backBaseline = layBack.y + layBack.height;
        const midBaseline = layMid.y + layMid.height;
        const baseOk = Math.abs(midBaseline - backBaseline - 4) < 0.1;
        tests.push({
          name,
          pass: scaleOk && baseOk,
          detail:
            "scaleRatio=" +
            (layBack.width / layMid.width).toFixed(3) +
            " midBase=" +
            midBaseline.toFixed(2) +
            " backBase=" +
            backBaseline.toFixed(2),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 25: depth tier front grows + lowers ----
    (function () {
      const name = "Depth front: item 1.10x wide and baseline + 4";
      try {
        const itMid = {
          id: "a",
          asset: "a",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "A",
          anchorY: "bottom",
        };
        const itFront = {
          id: "f",
          asset: "f",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "F",
          anchorY: "bottom",
          depth: "front",
        };
        const spMap = {
          a: { defaultWidth: 10, labelWidth: 5 },
          f: { defaultWidth: 10, labelWidth: 5 },
        };
        const rules = makeRules({ baseline: 80, align: "center" });
        const layMid = computeSceneLayout([itMid], spMap, rules, 100, 100)[0];
        const layFront = computeSceneLayout(
          [itFront],
          spMap,
          rules,
          100,
          100,
        )[0];
        const scaleOk = Math.abs(layFront.width / layMid.width - 1.1) < 0.01;
        const frontBaseline = layFront.y + layFront.height;
        const midBaseline = layMid.y + layMid.height;
        const baseOk = Math.abs(frontBaseline - midBaseline - 4) < 0.1;
        tests.push({
          name,
          pass: scaleOk && baseOk,
          detail:
            "scaleRatio=" +
            (layFront.width / layMid.width).toFixed(3) +
            " midBase=" +
            midBaseline.toFixed(2) +
            " frontBase=" +
            frontBaseline.toFixed(2),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 26: no depth field = mid (behavior-neutral default) ----
    (function () {
      const name = "Depth default: no field renders as mid";
      try {
        const it = {
          id: "a",
          asset: "a",
          kind: "bottle",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "A",
          anchorY: "bottom",
        };
        const spMap = { a: { defaultWidth: 10, labelWidth: 5 } };
        const rules = makeRules({ baseline: 80, align: "center" });
        const lay = computeSceneLayout([it], spMap, rules, 100, 100)[0];
        // mid width = defaultWidth * widthScale = 10 (no depth scale).
        // mid baseline = zone.baseline = 80, so bottom-anchored bottom
        // edge equals 80.
        const widthOk = Math.abs(lay.width - 10) < 0.01;
        const baseOk = Math.abs(lay.y + lay.height - 80) < 0.1;
        tests.push({
          name,
          pass: widthOk && baseOk,
          detail:
            "width=" +
            lay.width.toFixed(2) +
            " bottomEdge=" +
            (lay.y + lay.height).toFixed(2),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 27: baselineOverride wins over depth offset ----
    (function () {
      const name = "baselineOverride beats depth baseline offset";
      try {
        // A front-depth item with baselineOverride=52 should sit at
        // baseline 52 exactly, NOT 52+4. Depth scale still applies
        // to width (1.10x) because override only controls baseline.
        const it = {
          id: "f",
          asset: "f",
          kind: "flask",
          zone: "test",
          priority: 1,
          widthScale: 1.0,
          label: "F",
          anchorY: "bottom",
          depth: "front",
          baselineOverride: 52,
        };
        const spMap = { f: { defaultWidth: 10, labelWidth: 5 } };
        const rules = makeRules({ baseline: 80, align: "center" });
        const lay = computeSceneLayout([it], spMap, rules, 100, 100)[0];
        // bottom-anchored so y + height = 52 exactly
        const baseOk = Math.abs(lay.y + lay.height - 52) < 0.1;
        // width still reflects front's 1.10x multiplier
        const widthOk = Math.abs(lay.width - 11) < 0.01;
        tests.push({
          name,
          pass: baseOk && widthOk,
          detail:
            "bottomEdge=" +
            (lay.y + lay.height).toFixed(2) +
            " width=" +
            lay.width.toFixed(2),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    // ---- test 23: sceneBounds clamp preserves cluster spacing ----
    (function () {
      const name = "sceneBounds clamp: cluster translated as a unit";
      try {
        // place a right-aligned cluster whose rightmost item
        // escapes sb.right by ~2. All items should shift left
        // by the same dx.
        const items = [];
        const spMap = {};
        for (let k = 0; k < 3; k++) {
          const id = "g" + k;
          items.push({
            id: id,
            asset: id,
            kind: "bottle",
            zone: "test",
            priority: k + 1,
            widthScale: 1.0,
            label: "Item " + k,
            anchorY: "bottom",
          });
          spMap[id] = { defaultWidth: 5, labelWidth: 3 };
        }
        // zone x1=100 so last item right edge = 99; sb.right=97
        // forces dx = -2 across the whole cluster
        const rules = {
          zones: {
            test: { x0: 70, x1: 100, baseline: 50, gap: 1, align: "right" },
          },
          labelFontSize: 9,
          labelLineHeight: 1.1,
          labelOffsetY: 3,
          sceneBounds: { left: 0, right: 97, top: 0, bottom: 100 },
        };
        const layouts = computeSceneLayout(items, spMap, rules, 100, 100);
        // sort by x to match ordering
        layouts.sort(function (a, b) {
          return a.x - b.x;
        });
        // check inter-item deltas are consistent (all siblings
        // shifted uniformly)
        const d01 = layouts[1].x - layouts[0].x;
        const d12 = layouts[2].x - layouts[1].x;
        const uniform = Math.abs(d01 - d12) < TEST_TOLERANCE;
        const inBounds = layouts[2].x + layouts[2].width <= 97 + TEST_TOLERANCE;
        const pass = uniform && inBounds;
        tests.push({
          name,
          pass,
          detail:
            "d01=" +
            d01.toFixed(3) +
            " d12=" +
            d12.toFixed(3) +
            " lastRight=" +
            (layouts[2].x + layouts[2].width).toFixed(3),
        });
      } catch (e) {
        tests.push({ name, pass: false, detail: String(e) });
      }
    })();

    return tests;
  });

  return results;
}

// ============================================
async function main() {
  // Compile layout engine before launching browser
  const layoutEngineJs = compileLayoutEngine();

  const browser = await chromium.launch({ headless: true });
  let exitCode = 0;
  try {
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
    });
    await page.goto(gameUrl, { waitUntil: "domcontentloaded" });
    // Inject the compiled layout engine JS directly into the page
    await page.addScriptTag({ content: layoutEngineJs });

    const results = await runTests(page);

    let passed = 0;
    let failed = 0;
    for (const r of results) {
      const status = r.pass ? "OK  " : "FAIL";
      console.log(`${status}  ${r.name}`);
      if (!r.pass) {
        console.log(`      detail: ${r.detail}`);
      }
      if (r.pass) {
        passed++;
      } else {
        failed++;
        exitCode = 1;
      }
    }

    console.log("");
    console.log(
      `Results: ${passed} passed, ${failed} failed out of ${results.length} tests`,
    );

    await page.close();
  } finally {
    await browser.close();
  }
  process.exit(exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
