import { reflectionEngine } from "./reflection_engine.js";
import { cognitiveMemory } from "./cognitive_memory.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_reflection_engine() {
  // Clear tables
  memory.database.prepare("delete from cognitive_memories").run();
  memory.database.prepare("delete from memory_tags").run();

  const ctx: any = {
    goalId: "goal-test-1",
    contextId: "ctx-test-1",
    executionId: "exec-test-1",
    goalTitle: "Build a database API server in packages/api",
    success: false,
    toolOutputs: ["exit code: 1", "syntax error line 42"],
    verificationIssues: ["Port 8080 busy", "Failed testing validations"],
    workspaceDiff: "some modifications to packages/api/server.ts"
  };

  const result = reflectionEngine.reflect(ctx);

  // Verify Reflection Outputs
  assert.strictEqual(result.success, false);
  assert.ok(result.rootCauses.includes("Verification Failures"));
  assert.ok(result.rootCauses.includes("Execution Errors"));

  // Check generated lessons
  assert.ok(result.lessons.length > 0);
  assert.ok(result.lessons[0].includes("Goal 'Build a database API server in packages/api' failed"));

  // Check detected pattern matches
  assert.ok(result.patterns.includes("Architecture Patterns (Port Bindings)"));
  assert.ok(result.patterns.includes("Coding Patterns (Data Layer Connection)"));

  // Check recommendations list
  assert.ok(result.memoryCandidates.length > 0);
  assert.strictEqual(result.memoryCandidates[0].contextId, "ctx-test-1");

  // Check database integration
  const stats = cognitiveMemory.getStatistics();
  assert.ok(stats.totalRecords > 0);

  console.log("reflection_engine tests passed.");
}

test_reflection_engine().catch(console.error);
