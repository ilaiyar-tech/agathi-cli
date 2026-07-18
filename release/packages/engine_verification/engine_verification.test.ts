import { verifier } from "./engine_verification.js";
import assert from "node:assert";

async function test_engine_verification() {
  const ready = await verifier.verifySystemReady();
  assert.strictEqual(ready, true);
  console.log("engine_verification tests passed.");
}

test_engine_verification().catch(console.error);
