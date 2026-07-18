import { stateMachine, TransitionError } from "./state_machine.js";
import { memory } from "../memory/memory_engine.js";
import { eventBus } from "./event_bus.js";
import assert from "node:assert";

async function test_state_machine() {
  // Use in-memory SQLite for testing to isolate from local storage
  const testDb = new (memory as any).constructor(":memory:");
  Object.defineProperty(memory, "database", { value: testDb.database });

  // Event validation accumulator
  const eventsReceived: string[] = [];
  eventBus.subscribe("StateChanged", (e) => {
    eventsReceived.push(`${e.payload.from}->${e.payload.to}`);
  });

  // Test setup
  stateMachine.startExecution("ctx-abc", "sess-def", "exec-123");
  assert.strictEqual(stateMachine.getCurrentState(), "Task");
  assert.strictEqual(stateMachine.getPreviousState(), "SessionStarted");

  // Valid flow transitions
  stateMachine.transition("Investigation", "Starting search");
  stateMachine.transition("Execution", "Triggering command");
  stateMachine.transition("ToolExecution", "Running run_command");
  stateMachine.transition("Verification", "Files updated");
  stateMachine.transition("Summary", "Validation successful");
  stateMachine.complete();

  assert.strictEqual(stateMachine.getCurrentState(), "Completed");

  // Invalid transition test (must throw TransitionError)
  stateMachine.startExecution("ctx-abc", "sess-def-2", "exec-456");
  assert.throws(() => {
    // Cannot skip Verification straight to Summary
    stateMachine.transition("Summary");
  }, TransitionError);

  // Recovery test
  stateMachine.transition("Investigation");
  stateMachine.transition("Execution");
  stateMachine.fail("Simulated command failure");
  assert.strictEqual(stateMachine.getCurrentState(), "Failed");

  stateMachine.recover("Execution", "Re-running command from clean state");
  assert.strictEqual(stateMachine.getCurrentState(), "Execution");

  // Cancellation test
  stateMachine.cancel("User aborted pipeline");
  assert.strictEqual(stateMachine.getCurrentState(), "Cancelled");

  // Pause / Resume checks
  stateMachine.startExecution("ctx-abc", "sess-def-3", "exec-789");
  stateMachine.pause();
  assert.throws(() => {
    stateMachine.transition("Investigation");
  }, /paused/);
  stateMachine.resume();
  stateMachine.transition("Investigation");

  // Concurrency & stress check (rapid transitions)
  for (let i = 0; i < 50; i++) {
    const sm = new (stateMachine.constructor as any)();
    sm.startExecution(`ctx-${i}`, `sess-${i}`, `exec-${i}`);
    sm.transition("Investigation");
    sm.transition("Planning");
    sm.transition("Execution");
    sm.transition("Verification");
    sm.transition("Summary");
    sm.complete();
    assert.strictEqual(sm.getCurrentState(), "Completed");
  }

  console.log("state_machine tests passed.");
}

test_state_machine().catch(console.error);
