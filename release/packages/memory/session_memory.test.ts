import { sessionMemory } from "./session_memory.js";
import { memory } from "./memory_engine.js";
import assert from "node:assert";

async function test_session_memory() {
  // Use in-memory SQLite for testing to isolate from local storage
  const testDb = new (memory as any).constructor(":memory:");
  Object.defineProperty(memory, "database", { value: testDb.database });

  // Test Context creation
  sessionMemory.createContext("ctx-123", "agent-x");
  
  // Test Session creation
  const session = sessionMemory.createSession("sess-456", "ctx-123", "agent-x", { debug: true });
  assert.strictEqual(session.id, "sess-456");
  assert.strictEqual(session.contextId, "ctx-123");
  assert.strictEqual(session.currentState, "Task");
  assert.strictEqual(session.metadata.debug, true);

  // Test getSession
  const fetched = sessionMemory.getSession("sess-456");
  assert.ok(fetched);
  assert.strictEqual(fetched.id, "sess-456");
  assert.strictEqual(fetched.currentState, "Task");

  // Test updateSessionState
  sessionMemory.updateSessionState("sess-456", "Investigation");
  const fetchedAfterUpdate = sessionMemory.getSession("sess-456");
  assert.strictEqual(fetchedAfterUpdate?.currentState, "Investigation");

  // Test logStateTransition
  sessionMemory.logStateTransition({
    sessionId: "sess-456",
    executionId: "exec-789",
    agentId: "agent-x",
    previousState: "Task",
    currentState: "Investigation",
    transitionReason: "Triggered search pipeline"
  });

  const history = sessionMemory.getStateHistory("sess-456");
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].currentState, "Investigation");
  assert.strictEqual(history[0].executionId, "exec-789");
  assert.strictEqual(history[0].transitionReason, "Triggered search pipeline");

  // Test listSessions
  const allSessions = sessionMemory.listSessions();
  assert.strictEqual(allSessions.length, 1);
  assert.strictEqual(allSessions[0].id, "sess-456");

  // Test deleteSession
  sessionMemory.deleteSession("sess-456");
  const fetchedAfterDelete = sessionMemory.getSession("sess-456");
  assert.strictEqual(fetchedAfterDelete, undefined);

  console.log("session_memory tests passed.");
}

test_session_memory().catch(console.error);
