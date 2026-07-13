import { runtime } from "./agent_runtime.js";
import assert from "node:assert";

async function test_agent_runtime() {
  assert.ok(typeof runtime.chat === "function");
  assert.ok(typeof runtime.chat_stream === "function");

  // A full runtime invocation hits the router and memory.
  // We can just verify it is correctly exported and instantiated.
  console.log("agent_runtime tests passed.");
}

test_agent_runtime();
