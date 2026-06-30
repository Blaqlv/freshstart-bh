// tests/block-spacing.mjs
import assert from "node:assert";
import {
  spacingPxMap,
  spacingLabelMap,
  spacingToPx,
  resolveBlockSpacing,
} from "../src/lib/cms/spacing.ts";

const keys = ["none", "xs", "sm", "md", "lg", "xl", "xxl"];
assert.deepStrictEqual(Object.keys(spacingPxMap), keys, "px map keys");
assert.deepStrictEqual(Object.keys(spacingLabelMap), keys, "label map keys");
assert.strictEqual(spacingPxMap.md, 32, "md px");
assert.strictEqual(spacingToPx("lg"), 56, "lg px");
assert.strictEqual(spacingToPx(undefined), 0, "undefined -> 0");
assert.strictEqual(spacingToPx("none"), 0, "none -> 0");

// plain, unset -> legacy render (no wrapper, not flush)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "richText" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "plain unset",
);

// plain, both set -> flush + wrapper px
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "richText", spaceAbove: "lg", spaceBelow: "sm" }),
  { managed: true, flush: true, paddingTop: 56, paddingBottom: 16 },
  "plain both set",
);

// plain, half-set -> unset side falls back to legacy 48 (py-12)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "richText", spaceAbove: "xl" }),
  { managed: true, flush: true, paddingTop: 80, paddingBottom: 48 },
  "plain half set",
);

// columnLayout legacy is 32 (py-8)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "columnLayout", spaceBelow: "md" }),
  { managed: true, flush: true, paddingTop: 32, paddingBottom: 32 },
  "columnLayout legacy 32",
);

// banded -> never flush; wrapper only external gap
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "testimonialCarousel" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "banded unset",
);
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "hero", spaceAbove: "xxl" }),
  { managed: false, flush: false, paddingTop: 120, paddingBottom: 0 },
  "banded set",
);

// spacer/divider -> ignore wrapper spacing entirely (no double-spacing)
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "verticalSpacer", spaceAbove: "xl", spaceBelow: "xl" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "spacer ignores wrapper",
);
assert.deepStrictEqual(
  resolveBlockSpacing({ type: "horizontalDivider", spaceAbove: "lg" }),
  { managed: false, flush: false, paddingTop: 0, paddingBottom: 0 },
  "divider ignores wrapper",
);

console.log("block-spacing test PASSED");
