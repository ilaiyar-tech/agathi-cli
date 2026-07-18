import assert from "node:assert";
import { eil, DependencyResolver, TaskScheduler } from "./execution_intelligence.js";

async function test_dependency_resolver() {
  const tasks = [
    { id: "A", executionId: "1", priority: 1, status: "waiting" as const, action: "A", timeout: 1000, retries: 0, maxRetries: 3 },
    { id: "B", executionId: "1", priority: 1, status: "waiting" as const, action: "B", timeout: 1000, retries: 0, maxRetries: 3 },
    { id: "C", executionId: "1", priority: 1, status: "waiting" as const, action: "C", timeout: 1000, retries: 0, maxRetries: 3 }
  ];

  // No cycle
  const deps1 = [
    { taskId: "B", dependsOnTaskId: "A" },
    { taskId: "C", dependsOnTaskId: "B" }
  ];
  assert.strictEqual(DependencyResolver.hasCycle(tasks, deps1), false);

  // Cycle
  const deps2 = [
    { taskId: "B", dependsOnTaskId: "A" },
    { taskId: "C", dependsOnTaskId: "B" },
    { taskId: "A", dependsOnTaskId: "C" }
  ];
  assert.strictEqual(DependencyResolver.hasCycle(tasks, deps2), true);
  console.log("  test_dependency_resolver passed.");
}

async function test_task_scheduler() {
  const executionId = await eil.createExecution("plan-1", "prompt-1", "workspace-1", "session-1");
  
  await eil.addTask({ id: "task-A", executionId, priority: 10, action: "Do A", timeout: 2000, maxRetries: 3 });
  await eil.addTask({ id: "task-B", executionId, priority: 5, action: "Do B", timeout: 2000, maxRetries: 3 });
  await eil.addTask({ id: "task-C", executionId, priority: 1, action: "Do C", timeout: 2000, maxRetries: 3 });

  await eil.addDependency("task-B", "task-A"); // B depends on A
  await eil.addDependency("task-C", "task-B"); // C depends on B

  // Start execution triggers scheduler
  await eil.startExecution(executionId);

  const finalTasks = await eil.getTasks(executionId);
  const taskA = finalTasks.find(t => t.id === "task-A")!;
  const taskB = finalTasks.find(t => t.id === "task-B")!;
  const taskC = finalTasks.find(t => t.id === "task-C")!;

  assert.strictEqual(taskA.status, "completed");
  assert.strictEqual(taskB.status, "completed");
  assert.strictEqual(taskC.status, "completed");

  console.log("  test_task_scheduler passed.");
}

async function test_parallel_execution() {
  const executionId = await eil.createExecution("plan-parallel", "prompt-parallel", "workspace-parallel", "session-parallel");

  // A and B can run in parallel, C depends on both
  await eil.addTask({ id: "task-P1", executionId, priority: 5, action: "Parallel 1", timeout: 2000, maxRetries: 3 });
  await eil.addTask({ id: "task-P2", executionId, priority: 5, action: "Parallel 2", timeout: 2000, maxRetries: 3 });
  await eil.addTask({ id: "task-P3", executionId, priority: 1, action: "Final Merge", timeout: 2000, maxRetries: 3 });

  await eil.addDependency("task-P3", "task-P1");
  await eil.addDependency("task-P3", "task-P2");

  await eil.startExecution(executionId);

  const tasks = await eil.getTasks(executionId);
  assert.ok(tasks.every(t => t.status === "completed"));

  const metrics = await eil.getMetrics(executionId);
  assert.ok(metrics);
  assert.ok(metrics.duration > 0);

  console.log("  test_parallel_execution passed.");
}

async function test_checkpoint_restore() {
  const executionId = await eil.createExecution("plan-chk", "prompt-chk", "workspace-chk", "session-chk");
  await eil.addTask({ id: "task-chk-1", executionId, priority: 5, action: "Checkpoint task", timeout: 2000, maxRetries: 3 });

  const checkpointId = await eil.createCheckpoint(executionId, "InitialState");
  assert.ok(checkpointId.startsWith("chk-"));

  // Change task status manually
  const tasksBefore = await eil.getTasks(executionId);
  assert.strictEqual(tasksBefore[0].status, "waiting");

  tasksBefore[0].status = "completed";
  await eil.createCheckpoint(executionId, "AfterExecution");

  // Restore checkpoint
  await eil.restoreCheckpoint(checkpointId);
  const tasksAfter = await eil.getTasks(executionId);
  assert.strictEqual(tasksAfter[0].status, "waiting");

  console.log("  test_checkpoint_restore passed.");
}

async function test_retry_recovery() {
  const executionId = await eil.createExecution("plan-fail", "prompt-fail", "workspace-fail", "session-fail");
  
  // This task is designated to fail in startExecution handler if action contains "fail"
  await eil.addTask({ id: "task-fail-1", executionId, priority: 5, action: "Intended to fail", timeout: 2000, maxRetries: 3 });
  
  await eil.startExecution(executionId);
  const tasks = await eil.getTasks(executionId);
  assert.strictEqual(tasks[0].status, "failed");

  // Test recovery with strategy "skip"
  await eil.recoverExecution(executionId, "skip");
  const tasksAfterSkip = await eil.getTasks(executionId);
  assert.strictEqual(tasksAfterSkip[0].status, "completed");

  console.log("  test_retry_recovery passed.");
}

async function test_stress_performance() {
  const executionId = await eil.createExecution("plan-stress", "prompt-stress", "workspace-stress", "session-stress");
  
  // Schedule 50 tasks with linear dependency chain
  for (let i = 0; i < 50; i++) {
    await eil.addTask({
      id: `task-stress-${i}`,
      executionId,
      priority: 1,
      action: `Stress task ${i}`,
      timeout: 1000,
      maxRetries: 1
    });
    if (i > 0) {
      await eil.addDependency(`task-stress-${i}`, `task-stress-${i - 1}`);
    }
  }

  // Fast cycle detection check
  const tasks = await eil.getTasks(executionId);
  const deps = await eil.getDependencies(executionId);
  const start = Date.now();
  const cycleDetected = DependencyResolver.hasCycle(tasks, deps);
  const duration = Date.now() - start;
  
  assert.strictEqual(cycleDetected, false);
  assert.ok(duration < 50, `DAG sorting must be extremely fast: took ${duration}ms`);

  console.log("  test_stress_performance passed.");
}

async function runAll() {
  console.log("Running Execution Intelligence Layer tests...");
  await test_dependency_resolver();
  await test_task_scheduler();
  await test_parallel_execution();
  await test_checkpoint_restore();
  await test_retry_recovery();
  await test_stress_performance();
  console.log("execution_intelligence tests passed.");
}

runAll().catch(console.error);
