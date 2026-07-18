import { goalManager } from "./goal_manager.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_goal_manager() {
  // Clear goals for isolated unit testing
  memory.database.prepare("delete from goals").run();
  memory.database.prepare("delete from goal_dependencies").run();

  const g1 = goalManager.createGoal({
    id: "g1",
    contextId: "ctx-1",
    sessionId: "sess-1",
    executionId: "exec-1",
    title: "Write database driver",
    description: "Implement driver connections",
    priority: "high",
    status: "Created",
    category: "Coding",
    successCriteria: ["Driver compiles", "Driver connects"],
    constraints: ["Use connection pooling"],
    metadata: {}
  });

  assert.strictEqual(g1.id, "g1");
  assert.strictEqual(g1.status, "Created");

  const g2 = goalManager.createGoal({
    id: "g2",
    contextId: "ctx-1",
    sessionId: "sess-1",
    executionId: "exec-1",
    parentGoalId: "g1",
    title: "Verify connections",
    description: "Write connection integration tests",
    priority: "medium",
    status: "Created",
    category: "Bug Fix",
    successCriteria: ["Tests pass"],
    constraints: [],
    metadata: {}
  });

  // Test Dependency & Circular Check
  goalManager.addDependency({ goalId: "g2", dependencyGoalId: "g1", type: "blocking" });

  assert.throws(() => {
    goalManager.addDependency({ goalId: "g1", dependencyGoalId: "g2", type: "blocking" });
  }, /Circular dependency/);

  // Test Tree Traversal
  const tree = goalManager.getGoalTree("g1");
  assert.strictEqual(tree.length, 2);
  assert.strictEqual(tree[0].id, "g1");
  assert.strictEqual(tree[1].id, "g2");

  // Test Lifecycle & Success Validation
  assert.strictEqual(goalManager.evaluateSuccess("g2"), false);

  goalManager.completeGoal("g1");
  goalManager.completeGoal("g2");

  assert.strictEqual(goalManager.getGoal("g1")?.status, "Completed");
  assert.strictEqual(goalManager.evaluateSuccess("g2"), true);

  console.log("goal_manager tests passed.");
}

test_goal_manager().catch(console.error);
