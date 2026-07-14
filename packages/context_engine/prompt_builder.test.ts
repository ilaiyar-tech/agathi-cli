import { promptBuilder, promptCache } from "./prompt_builder.js";
import { memory } from "../memory/memory_engine.js";
import { workspaceMemory } from "../memory/workspace_memory.js";
import { toolMemory } from "../memory/tool_memory.js";
import { stateMachine } from "./state_machine.js";
import assert from "node:assert";

async function test_prompt_builder() {
  // Use in-memory SQLite for testing to isolate from local storage
  const testDb = new (memory as any).constructor(":memory:");
  Object.defineProperty(memory, "database", { value: testDb.database });

  // Index some workspace files and tools to collect
  workspaceMemory.registerProject("ctx-789", "ws-456");
  workspaceMemory.indexFile("ctx-789", {
    path: "src/index.ts",
    content: "console.log('hello world');".repeat(500) // Large content to trigger compression
  });

  toolMemory.recordToolExecution({
    contextId: "ctx-789",
    executionId: "exec-111",
    sessionId: "sess-999",
    toolName: "run_command",
    args: { command: "npm test" },
    output: "test failed successfully".repeat(100), // Large tool output to trigger compression
    success: false,
    durationMs: 450
  });

  stateMachine.startExecution("ctx-789", "sess-999", "exec-111");

  // Build context first time (cache MISS)
  const context = await promptBuilder.build({
    contextId: "ctx-789",
    sessionId: "sess-999",
    executionId: "exec-111",
    userPrompt: "Fix testing script",
    tokenBudget: 4000
  });

  assert.strictEqual(context.metadata.cacheHit, false);
  assert.ok(context.usedTokens > 0);
  assert.ok(context.remainingTokens > 0);
  assert.ok(context.compressionStats.removedTokens > 0);

  // Build context second time (cache HIT)
  const cachedContext = await promptBuilder.build({
    contextId: "ctx-789",
    sessionId: "sess-999",
    executionId: "exec-111",
    userPrompt: "Fix testing script",
    tokenBudget: 4000
  });

  assert.strictEqual(cachedContext.metadata.cacheHit, true);

  // Test budget allocation trimming by forcing very low budget (100 tokens)
  const trimmedContext = await promptBuilder.build({
    contextId: "ctx-789",
    sessionId: "sess-999",
    executionId: "exec-111",
    userPrompt: "Fix testing script",
    tokenBudget: 150
  });

  // Verify that Priority 1 (execution) is never removed
  assert.ok(trimmedContext.execution.length > 0);
  // Verify that low priority items are dropped because of low budget
  assert.strictEqual(trimmedContext.workspace.length, 0);

  console.log("prompt_builder tests passed.");
}

test_prompt_builder().catch(console.error);
