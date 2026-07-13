import { router } from "./model_router.js";
import assert from "node:assert";

// Basic mocking for tests since it hits 127.0.0.1:8012 and model_registry which spins up servers
async function test_model_router() {
  // We won't test full execution to avoid network timeouts on missing llama.cpp servers in tests,
  // but we ensure the router object is structurally valid and exports the right keys.
  
  assert.ok(typeof router.planner === "function");
  assert.ok(typeof router.chat === "function");
  assert.ok(typeof router.coder_fast === "function");
  assert.ok(typeof router.coder === "function");
  assert.ok(typeof router.stream_coder === "function");
  assert.ok(typeof router.reasoner === "function");
  assert.ok(typeof router.vision === "function");

  console.log("model_router tests passed.");
}

test_model_router();
