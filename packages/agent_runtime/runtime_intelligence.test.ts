import assert from "node:assert";
import { intentEngine } from "../prompt_intelligence/intent_engine.js";
import { executionManager } from "../execution_layer/execution_manager.js";
import { RuntimeTelemetry } from "./runtime_telemetry.js";
import { runtime } from "./agent_runtime.js";

// Test suite for Runtime Intelligence Milestone
export async function runTests() {
  console.log("Running Runtime Intelligence Layer tests...");

  // 1. Test Intent Engine Classification
  console.log("  Testing IntentEngine...");
  
  const conversationMatch = intentEngine.classify("machan enna da pandra saptiya");
  assert.strictEqual(conversationMatch.intent, "Conversation");
  assert.ok(conversationMatch.confidence >= 0.9);

  const codeMatch = intentEngine.classify("write a python script to parse a csv file");
  assert.strictEqual(codeMatch.intent, "Python");
  assert.ok(codeMatch.requiredCapabilities.includes("command_execution"));
  assert.ok(codeMatch.requiredTools.includes("run_command"));

  const websiteMatch = intentEngine.classify("create one website like whatsapp chat simulation");
  assert.strictEqual(websiteMatch.intent, "Website Generation");
  assert.ok(websiteMatch.requiredTools.includes("write_file"));

  const imageMatch = intentEngine.classify("generate image of a dog chasing a ball");
  assert.strictEqual(imageMatch.intent, "Image Generation");
  assert.ok(imageMatch.requiredTools.includes("generate_image"));

  console.log("  ✔ IntentEngine tests passed.");

  // 2. Test Execution Manager Lifecycle
  console.log("  Testing ExecutionManager...");
  
  const testSessionId = "exec-test-12345";
  const session = executionManager.startSession(testSessionId);
  assert.strictEqual(session.state, "Pending");
  assert.strictEqual(session.id, testSessionId);

  executionManager.transition(testSessionId, "Planning");
  assert.strictEqual(executionManager.getSession(testSessionId)?.state, "Planning");

  executionManager.transition(testSessionId, "Executing");
  executionManager.recordTool(testSessionId, "write_file");
  assert.strictEqual(executionManager.getSession(testSessionId)?.toolsExecuted.length, 1);
  assert.strictEqual(executionManager.getSession(testSessionId)?.toolsExecuted[0], "write_file");

  executionManager.recordRetry(testSessionId);
  assert.strictEqual(executionManager.getSession(testSessionId)?.retries, 1);

  executionManager.transition(testSessionId, "Completed");
  assert.strictEqual(executionManager.getSession(testSessionId)?.state, "Completed");
  assert.ok(executionManager.getSession(testSessionId)?.endTime !== undefined);

  console.log("  ✔ ExecutionManager tests passed.");

  // 3. Test Telemetry Storage
  console.log("  Testing RuntimeTelemetry...");
  
  RuntimeTelemetry.record({
    sessionId: "sess-1",
    intent: "Coding",
    executionDurationMs: 1500,
    plannerDurationMs: 300,
    toolDurationMs: 1000,
    verificationDurationMs: 200,
    failures: 0,
    retries: 0,
    cancellations: 0,
    timeouts: 0,
    success: true
  });

  RuntimeTelemetry.record({
    sessionId: "sess-2",
    intent: "Coding",
    executionDurationMs: 2500,
    plannerDurationMs: 500,
    toolDurationMs: 1800,
    verificationDurationMs: 200,
    failures: 1,
    retries: 1,
    cancellations: 0,
    timeouts: 0,
    success: true
  });

  const records = RuntimeTelemetry.getRecords();
  assert.ok(records.length >= 2);
  
  const avg = RuntimeTelemetry.getAverageDuration("Coding");
  assert.strictEqual(avg, 2000); // (1500 + 2500) / 2 = 2000

  console.log("  ✔ RuntimeTelemetry tests passed.");

  console.log("All Runtime Intelligence tests passed successfully!");
}

// Execute tests if run directly
if (import.meta.url.endsWith(process.argv[1])) {
  runTests().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
