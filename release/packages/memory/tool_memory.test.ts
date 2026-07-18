import { toolMemory } from "./tool_memory.js";
import { sessionMemory } from "./session_memory.js";
import { memory } from "./memory_engine.js";
import assert from "node:assert";

async function test_tool_memory() {
  // Use in-memory SQLite for testing to isolate from local storage
  const testDb = new (memory as any).constructor(":memory:");
  Object.defineProperty(memory, "database", { value: testDb.database });

  // Create context first to satisfy foreign key constraint
  sessionMemory.createContext("ctx-456", "agent-1");

  const record = {
    contextId: "ctx-456",
    executionId: "exec-789",
    sessionId: "sess-123",
    parentToolCallId: "parent-1",
    agentId: "agent-1",
    toolName: "run_command",
    args: { command: "echo test" },
    output: "test",
    success: true,
    durationMs: 120,
    retryCount: 0,
    toolVersion: "1.0.0",
    cacheHit: false,
    executionCost: 0.002,
    tokenUsage: 150,
    artifactReferences: ["art-1"],
    producedFiles: [],
    modifiedFiles: []
  };

  // Test recording
  toolMemory.recordToolExecution(record);

  const history = toolMemory.getExecutionHistory("ctx-456");
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].toolName, "run_command");
  assert.strictEqual(history[0].args.command, "echo test");
  assert.strictEqual(history[0].durationMs, 120);
  assert.strictEqual(history[0].tokenUsage, 150);

  // Test search
  const results = toolMemory.searchToolHistory("ctx-456", "echo");
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].toolName, "run_command");

  // Test statistics
  const stats = toolMemory.getToolStatistics("ctx-456");
  assert.strictEqual(stats.count, 1);
  assert.strictEqual(stats.successRate, 100);
  assert.strictEqual(stats.avgDurationMs, 120);

  // Test comparison
  const recordB = { ...record, executionId: "exec-999", output: "test-different" };
  toolMemory.recordToolExecution(recordB);

  const comparison = toolMemory.compareExecutions("exec-789", "exec-999");
  assert.strictEqual(comparison.matches, false);
  assert.ok(comparison.diffs[0].includes("Outputs mismatch"));

  // Test replay
  const replayData = toolMemory.replayExecution("ctx-456", "exec-789");
  assert.strictEqual(replayData.length, 1);
  assert.strictEqual(replayData[0].toolName, "run_command");

  console.log("tool_memory tests passed.");
}

test_tool_memory().catch(console.error);
