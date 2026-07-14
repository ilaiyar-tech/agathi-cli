import { strategyEngine } from "./strategy_engine.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_strategy_engine() {
  // Clear tables
  memory.database.prepare("delete from strategy_history").run();
  memory.database.prepare("delete from strategy_statistics").run();

  const goal = "Refactor connection logic and optimize memory utilization in packages/core";
  const decision = strategyEngine.decide("goal-refactor", goal);

  // Validate Decision Attributes
  assert.strictEqual(decision.strategyId, "Code Refactor");
  assert.strictEqual(decision.riskLevel, "high");
  assert.strictEqual(decision.parallelism, false); // High risk does not allow parallel execution
  assert.strictEqual(decision.executionPolicy.maxRetries, 5);
  assert.strictEqual(decision.executionPolicy.verificationPolicy, "strict");

  // Validate History & Fallbacks
  assert.ok(decision.fallbackStrategies.includes("Bug Fix"));
  assert.strictEqual(decision.confidence, 1.0); // Default success rate

  // Test statistics recording
  strategyEngine.recordStrategyResult("goal-refactor", "Code Refactor", "failure", 3, 1500);
  const historyStats = strategyEngine.evaluateHistory("Code Refactor");
  assert.strictEqual(historyStats.successRate, 0.0);
  assert.strictEqual(historyStats.avgRetries, 3);

  // Next decision confidence should update based on history
  const decision2 = strategyEngine.decide("goal-refactor-2", goal);
  assert.strictEqual(decision2.confidence, 0.0);

  console.log("strategy_engine tests passed.");
}

test_strategy_engine().catch(console.error);
