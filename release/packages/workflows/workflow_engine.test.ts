import { workflow_engine } from "./workflow_engine.js";
import assert from "node:assert";

async function test_workflow_engine() {
  const we = new workflow_engine();

  let task1Run = false;
  let task2Run = false;

  we.register({
    id: "task1",
    action: async (ctx) => {
      task1Run = true;
      return "result1";
    }
  });

  we.register({
    id: "task2",
    dependsOn: ["task1"],
    action: async (ctx) => {
      assert.strictEqual(ctx.task1, "result1");
      task2Run = true;
      return "result2";
    }
  });

  const finalCtx = await we.execute({ initial: true });

  assert.strictEqual(task1Run, true);
  assert.strictEqual(task2Run, true);
  assert.strictEqual(finalCtx.initial, true);
  assert.strictEqual(finalCtx.task1, "result1");
  assert.strictEqual(finalCtx.task2, "result2");

  console.log("workflow_engine tests passed.");
}

test_workflow_engine().catch(console.error);
