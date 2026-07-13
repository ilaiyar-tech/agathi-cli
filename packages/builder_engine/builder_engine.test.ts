import { builder } from "./builder_engine.js";
import assert from "node:assert";
import path from "path";
import fs from "fs-extra";

async function test_builder_engine() {
  const testDir = path.join(process.cwd(), "test_builder_dir");
  await fs.ensureDir(testDir);
  
  await fs.writeJson(path.join(testDir, "package.json"), {
    name: "test-pkg",
    scripts: {
      build: "echo 'build success'"
    }
  });

  const res = await builder.buildNode(testDir, "npm run build");
  assert.strictEqual(res.success, true);
  assert.ok(res.output.includes("build success"));

  const failRes = await builder.buildNode(testDir, "npm run not_found");
  assert.strictEqual(failRes.success, false);

  await fs.remove(testDir);
  console.log("builder_engine tests passed.");
}

test_builder_engine().catch(console.error);
