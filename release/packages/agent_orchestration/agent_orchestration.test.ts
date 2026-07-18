import assert from "node:assert";
import { aol } from "./agent_orchestration.js";

async function test_agent_registry_and_discovery() {
  const agentId = "agent-coder-1";
  await aol.registerAgent(agentId, "Code Assistant", "workspace", ["Coding", "Debugging"]);

  const discovered = await aol.discoverAgents(["Coding"]);
  assert.ok(discovered.length > 0);
  const coder = discovered.find(d => d.id === agentId);
  assert.ok(coder);
  assert.strictEqual(coder.name, "Code Assistant");

  await aol.unregisterAgent(agentId);
  const discoveredAfter = await aol.discoverAgents(["Coding"]);
  assert.strictEqual(discoveredAfter.find(d => d.id === agentId), undefined);

  console.log("  test_agent_registry_and_discovery passed.");
}

async function test_task_delegation() {
  const agentId = "agent-deleg-1";
  await aol.registerAgent(agentId, "Documentation Assistant", "workspace", ["Documentation"]);

  const sessionId = await aol.createAgentSession(agentId, "wf-1", "workspace-1", "exec-1", "user-1");
  const taskId = await aol.delegateTask(sessionId, agentId, "Generate API documentation reference");
  
  assert.ok(taskId);

  console.log("  test_task_delegation passed.");
}

async function test_communication() {
  const senderId = "agent-sender";
  const receiverId = "agent-receiver";

  await aol.registerAgent(senderId, "Sender Agent", "workspace", []);
  await aol.registerAgent(receiverId, "Receiver Agent", "workspace", []);

  const sessionId = await aol.createAgentSession(senderId, "wf-comm", "work-comm", "exec-comm", "user-comm");

  await aol.sendMessage(sessionId, senderId, receiverId, "Hello Agent Coder!");
  await aol.broadcast(sessionId, senderId, "Broadcast message to all agents");

  console.log("  test_communication passed.");
}

async function test_shared_memory_and_context() {
  const workspaceId = "work-shared";
  const key = "git_hash_value";
  const val = "hash-987213abc";

  await aol.shareMemory(workspaceId, key, val);
  const res = await aol.getSharedMemory(workspaceId, key);
  assert.strictEqual(res, val);

  console.log("  test_shared_memory_and_context passed.");
}

async function test_coordination_and_conflict() {
  await aol.registerAgent("agent-coord", "Coordinator Agent", "workspace", []);
  const sessionId = await aol.createAgentSession("agent-coord", "wf-coord", "work-coord", "exec-coord", "user-coord");

  await aol.synchronize(sessionId, "BuildBarrier");

  const proposalResult = await aol.negotiate(sessionId, "Update tsconfig to target ES2022");
  assert.strictEqual(proposalResult, "Accepted proposal: Update tsconfig to target ES2022");

  const conflictResult = await aol.resolveConflict(sessionId, "PortCollision");
  assert.strictEqual(conflictResult, "Conflict resolved: PortCollision");

  console.log("  test_coordination_and_conflict passed.");
}

async function test_result_aggregation() {
  await aol.registerAgent("agent-agg", "Aggregator Agent", "workspace", []);
  const sessionId = await aol.createAgentSession("agent-agg", "wf-agg", "work-agg", "exec-agg", "user-agg");
  const results = ["Code Compiled", "Tests Passed", "Artifacts Generated"];

  const aggregated = await aol.aggregateResults(sessionId, results);
  assert.strictEqual(aggregated, "Code Compiled | Tests Passed | Artifacts Generated");

  console.log("  test_result_aggregation passed.");
}

async function test_stress_performance() {
  // Discover 1000 times
  const start = Date.now();
  for (let i = 0; i < 1000; i++) {
    await aol.discoverAgents(["Coding"]);
  }
  const duration = Date.now() - start;
  assert.ok(duration < 50, `1000 discovery iterations took ${duration}ms, must be under 50ms`);

  console.log("  test_stress_performance passed.");
}

async function runAll() {
  console.log("Running Agent Orchestration Layer tests...");
  await test_agent_registry_and_discovery();
  await test_task_delegation();
  await test_communication();
  await test_shared_memory_and_context();
  await test_coordination_and_conflict();
  await test_result_aggregation();
  await test_stress_performance();
  console.log("agent_orchestration tests passed.");
}

runAll().catch(console.error);
