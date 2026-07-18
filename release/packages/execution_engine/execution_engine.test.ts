import { engine } from "./execution_engine.js";
import assert from "node:assert";

async function test_execution_engine() {
  engine.register("echo", (args) => {
    return `Echo: ${args.text}`;
  });

  engine.register("fail", () => {
    throw new Error("Deliberate failure");
  });

  const successResult = await engine.execute({
    tool: "echo",
    args: { text: "hello" }
  });

  assert.strictEqual(successResult.success, true);
  assert.strictEqual(successResult.output, "Echo: hello");

  const failResult = await engine.execute({
    tool: "fail",
    args: {}
  });

  assert.strictEqual(failResult.success, false);
  assert.strictEqual(failResult.output, "Deliberate failure");

  const notFoundResult = await engine.execute({
    tool: "nonexistent",
    args: {}
  });

  assert.strictEqual(notFoundResult.success, false);
  assert.strictEqual(notFoundResult.output, 'Tool "nonexistent" not found.');

  const allResults = await engine.executeAll([
    { tool: "echo", args: { text: "first" } },
    { tool: "echo", args: { text: "second" } }
  ]);

  assert.strictEqual(allResults.length, 2);
  assert.strictEqual(allResults[0].output, "Echo: first");
  assert.strictEqual(allResults[1].output, "Echo: second");

  console.log("execution_engine tests passed.");
}

test_execution_engine().catch(console.error);
