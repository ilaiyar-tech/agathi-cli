import { sessions } from "./session_manager.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_session_manager() {
  // Clear any existing sessions from database to isolate test
  memory.database.prepare("delete from sessions").run();

  const session1 = sessions.create_session({ name: "Session 1" });
  
  assert.ok(session1.id);
  assert.strictEqual(session1.metadata.name, "Session 1");

  // Wait 1.2s to cross second resolution boundary for SQLite datetime sorting
  await new Promise(r => setTimeout(r, 1200));

  const session2 = sessions.create_session({ name: "Session 2" });
  
  const allSessions = sessions.list_sessions();
  assert.strictEqual(allSessions.length, 2);
  
  // They should be sorted by started_at desc, so session2 first
  assert.strictEqual(allSessions[0].id, session2.id);

  const fetched = sessions.get_session(session1.id);
  assert.strictEqual(fetched?.metadata.name, "Session 1");

  sessions.update_metadata(session1.id, { active: true });
  assert.strictEqual(sessions.get_session(session1.id)?.metadata.active, true);
  assert.strictEqual(sessions.get_session(session1.id)?.metadata.name, "Session 1");

  sessions.delete_session(session2.id);
  assert.strictEqual(sessions.get_session(session2.id), undefined);
  assert.strictEqual(sessions.list_sessions().length, 1);

  console.log("session_manager tests passed.");
}

test_session_manager().catch(console.error);
