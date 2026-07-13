import { memory_engine } from "./memory_engine.js";
import assert from "node:assert";

function test_memory_engine() {
  const mem = new memory_engine(":memory:");

  mem.add("sess_1", "user", "hello");
  mem.add("sess_1", "assistant", "hi there");
  mem.add("sess_2", "user", "other session");

  const hist1 = mem.history("sess_1");
  assert.strictEqual(hist1.length, 2);
  assert.strictEqual((hist1[0] as any).role, "assistant");
  assert.strictEqual((hist1[1] as any).role, "user");

  const sessions = mem.sessions();
  assert.strictEqual(sessions.length, 2);

  mem.clear("sess_1");
  const histAfter = mem.history("sess_1");
  assert.strictEqual(histAfter.length, 0);

  const hist2 = mem.history("sess_2");
  assert.strictEqual(hist2.length, 1);

  console.log("memory_engine tests passed.");
}

test_memory_engine();
