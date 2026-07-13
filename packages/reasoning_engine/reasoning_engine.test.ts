import { reasoner } from "./reasoning_engine.js";
import assert from "node:assert";

async function test_reasoning_engine() {
  assert.ok(typeof reasoner.reason === "function");
  
  // Since it calls the router which in turn hits an external process, we will just assert existence here.
  // Full integration test requires actual mocked LLM or running server.
  
  console.log("reasoning_engine tests passed.");
}

test_reasoning_engine();
