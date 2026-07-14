import { reasoningEngine } from "./reasoning_engine.js";
import assert from "node:assert";

async function test_reasoning_engine() {
  const contextId = "ctx-test";
  const sessionId = "sess-test";
  const goal = "Build a web server and handle requests";

  const result = reasoningEngine.reason(contextId, sessionId, goal, "compiled successfully");

  // Verify Structured Observations
  assert.strictEqual(result.observation.contextId, contextId);
  assert.strictEqual(result.observation.sessionId, sessionId);
  assert.strictEqual(result.observation.goal, goal);
  assert.strictEqual(result.observation.lastToolOutput, "compiled successfully");

  // Verify Analysis Report
  assert.ok(result.analysis.risks.includes("potential_code_syntax_errors"));
  assert.ok(result.analysis.constraints.includes("port_binding_permissions"));
  assert.ok(result.analysis.confidenceScore < 1.0);

  // Verify Hypotheses
  assert.ok(result.hypotheses.length >= 2);
  const selected = result.selectedHypothesis;
  assert.strictEqual(selected.id, "hyp-express-node");

  // Verify Intent serialization
  assert.strictEqual(result.executionIntent.strategy, "hyp-express-node");
  assert.ok(result.executionIntent.steps.length > 0);
  assert.ok(result.verificationIntent.assertions.includes("package.json contains express"));

  // Verify Metrics
  assert.ok(result.reasoningTimeMs >= 0);
  assert.strictEqual(result.confidence, selected.confidence);

  console.log("reasoning_engine tests passed.");
}

test_reasoning_engine().catch(console.error);
