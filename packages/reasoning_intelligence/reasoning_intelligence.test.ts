import assert from "node:assert";
import { ril } from "./reasoning_intelligence.js";

async function test_goal_validation() {
  const sessionId = await ril.createReasoningSession("prompt-1", "planner-1", "exec-1", "ksess-1", "workspace-1");
  
  const val1 = await ril.validateGoal(sessionId, "impossible infinite loop");
  assert.strictEqual(val1.complete, false);
  assert.ok(val1.issues.length > 0);

  const val2 = await ril.validateGoal(sessionId, "Please search the workspace files for configuration files.");
  assert.strictEqual(val2.complete, true);
  assert.strictEqual(val2.issues.length, 0);

  console.log("  test_goal_validation passed.");
}

async function test_alternatives_generation() {
  const sessionId = await ril.createReasoningSession("prompt-alt", "planner-alt", "exec-alt", "ksess-alt", "workspace-alt");
  
  const alternatives = await ril.generateAlternatives(sessionId, "file_analysis");
  assert.strictEqual(alternatives.length, 2);
  assert.ok(alternatives[0].rankScore > alternatives[1].rankScore);

  console.log("  test_alternatives_generation passed.");
}

async function test_risk_and_cost() {
  const risk1 = await ril.evaluateRisk("rm -rf node_modules");
  assert.strictEqual(risk1, 0.8);

  const risk2 = await ril.evaluateRisk("check version number");
  assert.strictEqual(risk2, 0.1);

  const cost = await ril.estimateCost("npm install packages");
  assert.strictEqual(cost.executionTimeMs, 5000);

  console.log("  test_risk_and_cost passed.");
}

async function test_decision_making() {
  const sessionId = await ril.createReasoningSession("prompt-dec", "planner-dec", "exec-dec", "ksess-dec", "workspace-dec");
  
  const dec = await ril.makeDecision(
    sessionId,
    "Use ripgrep index search",
    ["Scan all directories linearly"],
    "Search optimized using ripgrep utility.",
    0.95
  );

  assert.strictEqual(dec.recommendedStrategy, "Use ripgrep index search");
  assert.strictEqual(dec.confidenceScore, 0.95);

  console.log("  test_decision_making passed.");
}

async function test_reflection_and_critique() {
  const sessionId = await ril.createReasoningSession("prompt-ref", "planner-ref", "exec-ref", "ksess-ref", "workspace-ref");
  
  await ril.reflect(sessionId, "execution failed", ["Check index constraints"]);
  const critiques = await ril.critique(sessionId);
  
  assert.ok(critiques.length > 0);
  assert.ok(critiques[0].includes("failure"));

  console.log("  test_reflection_and_critique passed.");
}

async function test_stress_performance() {
  const sessionId = await ril.createReasoningSession("prompt-stress", "planner-stress", "exec-stress", "ksess-stress", "workspace-stress");
  
  // Test fast calculations for confidence
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    ril.calculateConfidence(true, 0.5, 2000);
  }
  const duration = Date.now() - start;
  assert.ok(duration < 50, `Confidence calculation loops took ${duration}ms, must be under 50ms`);

  console.log("  test_stress_performance passed.");
}

async function runAll() {
  console.log("Running Reasoning Intelligence Layer tests...");
  await test_goal_validation();
  await test_alternatives_generation();
  await test_risk_and_cost();
  await test_decision_making();
  await test_reflection_and_critique();
  await test_stress_performance();
  console.log("reasoning_intelligence tests passed.");
}

runAll().catch(console.error);
