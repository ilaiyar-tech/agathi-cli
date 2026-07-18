import { workflowEngine } from "./autonomous_workflow_engine.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_workflow_engine() {
  // Clear tables
  memory.database.prepare("delete from workflow_history").run();
  memory.database.prepare("delete from workflow_events").run();
  memory.database.prepare("delete from goals").run();

  const prompt = "Build an HTTP connection component in packages/core/net.ts and run verify tests";
  const wf = workflowEngine.startWorkflow("goal-wf-1", prompt);

  // Validate E2E execution results
  assert.strictEqual(wf.state, "Completed");
  assert.strictEqual(wf.goalId, "goal-wf-1");

  // Validate Events registered
  const events = workflowEngine.getWorkflowHistory(wf.id);
  assert.ok(events.length >= 7);
  assert.strictEqual(events[0].event_type, "WorkflowStarted");
  assert.strictEqual(events[events.length - 1].event_type, "WorkflowCompleted");

  // Test Pause / Resume / Cancel
  const id2 = "wf-manual-test";
  workflowEngine.pauseWorkflow(wf.id);
  const paused = workflowEngine.getWorkflow(wf.id);
  assert.strictEqual(paused?.state, "Idle");

  workflowEngine.resumeWorkflow(wf.id);
  const resumed = workflowEngine.getWorkflow(wf.id);
  assert.strictEqual(resumed?.state, "Executing");

  workflowEngine.cancelWorkflow(wf.id);
  const cancelled = workflowEngine.getWorkflow(wf.id);
  assert.strictEqual(cancelled?.state, "Cancelled");

  console.log("autonomous_workflow_engine tests passed.");
}

test_workflow_engine().catch(console.error);
