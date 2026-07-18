import { scheduler } from "./task_scheduler.js";
import assert from "node:assert";

async function test_task_scheduler() {
  let executed = false;
  
  scheduler.schedule({
    id: "test1",
    timeoutMs: 10,
    action: async () => {
      executed = true;
    }
  });

  await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(executed, true);

  scheduler.cancel("test1");
  console.log("task_scheduler tests passed.");
}

test_task_scheduler().catch(console.error);
