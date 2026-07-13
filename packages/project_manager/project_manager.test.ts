import { projects } from "./project_manager.js";
import assert from "node:assert";
import path from "path";
import fs from "fs-extra";

async function test_project_manager() {
  const testDir = path.join(process.cwd(), "test_proj_dir");
  await fs.ensureDir(testDir);
  await fs.writeFile(path.join(testDir, "test.txt"), "hello");

  const project = await projects.initProject(testDir);
  assert.strictEqual(project.name, "test_proj_dir");
  assert.strictEqual(projects.getActiveProject()?.rootPath, testDir);

  const files = await projects.getProjectFiles();
  assert.strictEqual(files.length, 1);
  assert.ok(files[0].endsWith("test.txt"));

  await fs.remove(testDir);
  console.log("project_manager tests passed.");
}

test_project_manager().catch(console.error);
