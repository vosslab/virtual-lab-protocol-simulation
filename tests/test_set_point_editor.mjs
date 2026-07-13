import { test, describe } from "node:test";
import assert from "node:assert";

import { parse_set_point_draft } from "../src/shell/hud/set_point_editor.tsx";

describe("set-point draft parsing", () => {
  test("preserves valid finite numbers, including zero", () => {
    assert.strictEqual(parse_set_point_draft("0"), 0);
    assert.strictEqual(parse_set_point_draft(" 3.5 "), 3.5);
    assert.strictEqual(parse_set_point_draft("-2"), -2);
  });

  test("rejects blank, malformed, and non-finite values instead of coercing to zero", () => {
    assert.strictEqual(parse_set_point_draft(""), null);
    assert.strictEqual(parse_set_point_draft("   "), null);
    assert.strictEqual(parse_set_point_draft("not-a-number"), null);
    assert.strictEqual(parse_set_point_draft("Infinity"), null);
  });
});
