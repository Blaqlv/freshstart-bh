// tests/blocks-image-only.mjs
import assert from "node:assert";
import { blockRegistry, parseBlocks, blockPreview } from "../src/lib/cms/blocks.ts";

const meta = blockRegistry.find((m) => m.type === "imageOnly");
assert.ok(meta, "imageOnly is registered");
assert.strictEqual(meta.category, "images", "imageOnly category is images");

const created = meta.create();
assert.strictEqual(created.type, "imageOnly", "create() type");
assert.deepStrictEqual(created.image, { url: "", alt: "" }, "create() image default");

// parseBlocks keeps imageOnly and tolerates spaceAbove/spaceBelow
const parsed = parseBlocks([
  { type: "imageOnly", image: { url: "/x.jpg", alt: "X" }, spaceAbove: "lg" },
]);
assert.strictEqual(parsed.length, 1, "parsed length");
assert.strictEqual(parsed[0].spaceAbove, "lg", "spaceAbove preserved");

// preview falls back to alt text
assert.strictEqual(
  blockPreview({ type: "imageOnly", image: { url: "/x.jpg", alt: "Sunset" } }),
  "Sunset",
  "preview uses alt",
);

console.log("blocks-image-only test PASSED");
