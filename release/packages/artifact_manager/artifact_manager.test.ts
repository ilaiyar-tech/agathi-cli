import { artifact_manager } from "./artifact_manager.js";
import assert from "node:assert";
import path from "path";
import fs from "fs-extra";

async function test_artifact_manager() {
  const testDir = path.join(process.cwd(), "test_artifacts_dir");
  const am = new artifact_manager(testDir);

  const art1 = await am.save("session1", "code", "console.log('hello')");
  assert.ok(art1.id);

  const art2 = await am.save("session2", "json", "{}");
  
  const fetched = await am.get(art1.id);
  assert.strictEqual(fetched?.content, "console.log('hello')");

  const listAll = await am.list();
  assert.strictEqual(listAll.length, 2);

  const listSession1 = await am.list("session1");
  assert.strictEqual(listSession1.length, 1);
  assert.strictEqual(listSession1[0].id, art1.id);

  await fs.remove(testDir);
  console.log("artifact_manager tests passed.");
}

test_artifact_manager().catch(console.error);
