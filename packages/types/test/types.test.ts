import assert from "node:assert/strict";
import test from "node:test";

import { currencyCode, skillTag, workMeshId } from "../src/index.js";

test("normalizes simple branded helper values", () => {
  assert.equal(workMeshId("worker-1"), "worker-1");
  assert.equal(currencyCode("usd"), "USD");
  assert.equal(skillTag("  TypeScript "), "typescript");
});
