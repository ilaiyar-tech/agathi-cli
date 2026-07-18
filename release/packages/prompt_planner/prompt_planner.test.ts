import { planner } from "./prompt_planner.js";
import assert from "node:assert";

function test_prompt_planner() {
  const result = planner.plan({
    system_prompt: "You are a helpful assistant",
    history: [{ role: "user", content: "Hello" }, { role: "assistant", content: "Hi" }],
    context: ["Context line 1", "Context line 2"],
    user_prompt: "Who are you?"
  });

  assert.strictEqual(result.length, 5, "Should have 5 messages (system, history*2, context, user)");
  
  assert.strictEqual(result[0].role, "system");
  assert.strictEqual(result[0].content, "You are a helpful assistant");

  assert.strictEqual(result[1].role, "user");
  assert.strictEqual(result[1].content, "Hello");

  assert.strictEqual(result[2].role, "assistant");
  assert.strictEqual(result[2].content, "Hi");

  assert.strictEqual(result[3].role, "user");
  assert.ok(result[3].content.includes("Context line 1"));
  assert.ok(result[3].content.includes("Context line 2"));

  assert.strictEqual(result[4].role, "user");
  assert.strictEqual(result[4].content, "Who are you?");

  console.log("prompt_planner tests passed.");
}

test_prompt_planner();
