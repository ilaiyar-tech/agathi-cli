import { aie, AgentVote } from "./agent_intelligence.js";
import { WidgetRegistry } from "../workspace_terminal/index.js";
import assert from "node:assert";

console.log("Running Agent Intelligence Engine tests...");

async function runTests() {
  const agentId = "intel-agent-1";
  
  // 1. Test Lifecycle Registration
  const agent = aie.registerAgent(agentId, "Deep Reasoning Agent");
  assert.strictEqual(agent.id, agentId);
  assert.strictEqual(agent.state, "Waiting");

  // Verify Widget is registered
  const widget = WidgetRegistry.getWidget(`agent_widget_${agentId}`);
  assert.ok(widget);

  // 2. Test Planning Engine
  const plan = aie.createPlan(agentId, "Analyze TS codebase and run automated tests");
  assert.ok(plan.goals.length > 0);
  assert.strictEqual(plan.nodes.length, 2);
  assert.strictEqual(plan.nodes[0].id, "task-code");
  assert.strictEqual(plan.nodes[1].dependencies[0], "task-code");

  // 3. Test Communication Bus
  let messageReceived = false;
  aie.subscribe(agentId, (msg) => {
    if (msg.type === "Request") {
      messageReceived = true;
    }
  });

  aie.sendMessage({
    type: "Request",
    senderId: "system",
    receiverId: agentId,
    payload: { action: "verify" }
  });

  assert.strictEqual(messageReceived, true);

  // 4. Test Reflection & Accuracy Integration
  const mockOutput = "tu2pu is a dynamic AI operating console built by Ilaiyar.";
  const mockContext = "tu2pu is a dynamic AI operating console built by Ilaiyar. It has 22 phases.";
  const report = aie.reflect(agentId, mockOutput, mockContext);
  
  assert.strictEqual(report.isValid, true);
  assert.ok(report.confidenceScore >= 80);
  assert.strictEqual(agent.state, "Completed");

  // 5. Test Consensus Engine
  const votes: AgentVote[] = [
    { agentId: "agent-a", proposal: "Use Ollama", confidence: 90, priority: 10 },
    { agentId: "agent-b", proposal: "Use vLLM", confidence: 80, priority: 5 },
    { agentId: "agent-c", proposal: "Use Ollama", confidence: 95, priority: 8 }
  ];

  const resolved = aie.resolveConsensus(votes);
  assert.strictEqual(resolved.consensus, "Use Ollama");
  assert.ok(resolved.confidence > 90);

  // 6. Test Failure Recovery & Telemetry
  let attempts = 0;
  const failingAction = async () => {
    attempts++;
    if (attempts < 2) {
      return "Incorrect response that fails verification checks.";
    }
    return "tu2pu is a dynamic AI operating console built by Ilaiyar."; // Correct response
  };

  const recoveryAgentId = "recovery-agent-1";
  aie.registerAgent(recoveryAgentId, "Recovering Agent");

  const recoveryOutput = await aie.executeWithRecovery(
    recoveryAgentId,
    failingAction,
    mockContext
  );

  assert.strictEqual(recoveryOutput, "tu2pu is a dynamic AI operating console built by Ilaiyar.");
  assert.strictEqual(attempts, 2); // Proves failure recovery retry worked!

  // Check Telemetry was logged
  const telemetry = aie.getTelemetry(recoveryAgentId);
  assert.ok(telemetry);
  assert.strictEqual(telemetry.retry_count, 1);

  // Cleanup
  aie.clean(agentId);
  aie.clean(recoveryAgentId);

  console.log("Agent Intelligence Engine tests passed.");
}

runTests().catch(err => {
  console.error("Agent Intelligence Engine tests failed:", err);
  process.exit(1);
});
