import { accuracyEngine } from "./accuracy_engine.js";
import assert from "node:assert";

console.log("Running Accuracy & Verification Engine tests...");

async function runTests() {
  // Test response verification heuristics
  const context = "tu2pu is a dynamic AI operating console built by Ilaiyar. It has 21 phases.";
  const responsePass = "tu2pu is a console built by Ilaiyar.";
  const responseFail = "Warp and Cursor are AI operating consoles built by Microsoft.";

  const verifyPass = accuracyEngine.verifyResponse(responsePass, context);
  assert.ok(verifyPass.accuracy >= 80);
  assert.strictEqual(verifyPass.verified, "YES");

  const verifyFail = accuracyEngine.verifyResponse(responseFail, context);
  assert.ok(verifyFail.accuracy < 50);
  assert.strictEqual(verifyFail.verified, "NO");

  // Test Telemetry Database Logging
  accuracyEngine.logTelemetry("chat", true, 95, 5, 120);
  accuracyEngine.logTelemetry("tool", true, 100, 0, 45);
  accuracyEngine.logTelemetry("routing", false, 0, 0, 15);

  const metrics = accuracyEngine.getMetrics();
  assert.strictEqual(metrics.answerAccuracy, 95);
  assert.strictEqual(metrics.toolSuccessRate, 100);
  assert.strictEqual(metrics.routingAccuracy, 0);

  console.log("Accuracy & Verification Engine tests passed.");
}

runTests().catch(err => {
  console.error("Accuracy Engine tests failed:", err);
  process.exit(1);
});
