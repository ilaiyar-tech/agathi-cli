import { planner, DependencyResolver, TaskGraph } from "./execution_planner.js";
import assert from "node:assert";

async function test_execution_planner() {
  const goal = "Build a web server in src/server.ts, test it with npm test, and verify results";
  const { graph, queue } = planner.plan("goal-1", goal);

  // Verify structure
  assert.strictEqual(graph.goalId, "goal-1");
  assert.ok(graph.nodes.has("investigate_task"));
  assert.ok(graph.nodes.has("execute_task"));
  assert.ok(graph.nodes.has("verify_task"));
  assert.ok(graph.nodes.has("summarize_task"));

  // Check topological resolver queue transitions
  assert.strictEqual(queue.isFinished(), false);
  
  const t1 = queue.getNextRunnableTask();
  assert.strictEqual(t1?.id, "investigate_task");
  
  queue.startTask("investigate_task");
  queue.completeTask("investigate_task");

  const t2 = queue.getNextRunnableTask();
  assert.strictEqual(t2?.id, "execute_task");
  queue.startTask("execute_task");
  queue.completeTask("execute_task");

  const t3 = queue.getNextRunnableTask();
  assert.strictEqual(t3?.id, "verify_task");
  queue.startTask("verify_task");
  queue.completeTask("verify_task");

  const t4 = queue.getNextRunnableTask();
  assert.strictEqual(t4?.id, "summarize_task");
  queue.startTask("summarize_task");
  queue.completeTask("summarize_task");

  assert.strictEqual(queue.isFinished(), true);

  // Deadlock Cycle Detection Test
  const resolver = new DependencyResolver();
  const cycleNodes = new Map();
  cycleNodes.set("task_a", { id: "task_a", description: "a", status: "pending", dependsOn: ["task_b"], actionType: "execute" });
  cycleNodes.set("task_b", { id: "task_b", description: "b", status: "pending", dependsOn: ["task_a"], actionType: "execute" });
  const cycleGraph: TaskGraph = { goalId: "goal-cycle", nodes: cycleNodes };

  assert.throws(() => {
    resolver.resolve(cycleGraph);
  }, /Cycle detected/);

  console.log("execution_planner tests passed.");
}

test_execution_planner().catch(console.error);
