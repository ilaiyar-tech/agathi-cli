import { terminals } from "./terminal_manager.js";
import assert from "node:assert";

async function test_terminal_manager() {
  const id = terminals.start("echo 'hello terminal'");
  assert.ok(id);

  // Give it a moment to capture output
  await new Promise(r => setTimeout(r, 500));

  const output = terminals.get_output(id);
  assert.ok(output?.includes("hello terminal"));

  const list = terminals.list();
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0], id);

  const killed = await terminals.kill(id);
  assert.strictEqual(killed, true);
  
  const listAfter = terminals.list();
  assert.strictEqual(listAfter.length, 0);

  console.log("terminal_manager tests passed.");
}

test_terminal_manager().catch(console.error);
