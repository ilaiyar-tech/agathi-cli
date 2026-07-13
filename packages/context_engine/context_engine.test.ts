import { context } from "./context_engine.js";
import assert from "node:assert";
import { write_file, delete_file } from "../filesystem/index.js";
import path from "path";

async function test_context_engine() {
  const testFile = path.join(process.cwd(), "test_context.txt");
  
  await write_file(testFile, "Hello World from Context");
  
  context.add_file(testFile);

  const builtContext = await context.build_context("test_session");
  
  assert.strictEqual(builtContext.length, 1);
  assert.ok(builtContext[0].includes("Hello World from Context"));
  assert.ok(builtContext[0].includes("test_context.txt"));

  context.remove_file(testFile);
  const builtContext2 = await context.build_context("test_session");
  assert.strictEqual(builtContext2.length, 0);

  // Clean up
  await delete_file(testFile);
  console.log("context_engine tests passed.");
}

test_context_engine().catch(console.error);
