import { git_manager } from "./git_manager.js";
import assert from "node:assert";
import path from "path";
import fs from "fs-extra";
import { execa } from "execa";

async function test_git_manager() {
  const testDir = path.join(process.cwd(), "test_git_dir");
  await fs.ensureDir(testDir);
  
  const gm = new git_manager(testDir);
  assert.strictEqual(await gm.is_repo(), false);
  
  await gm.init();
  assert.strictEqual(await gm.is_repo(), true);
  
  await fs.writeFile(path.join(testDir, "test.txt"), "hello git");
  
  let status = await gm.status();
  assert.ok(status.includes("test.txt"));
  
  await gm.add(["."]);
  
  // Need git config for commit
  await execa("git", ["config", "user.email", "test@test.com"], { cwd: testDir });
  await execa("git", ["config", "user.name", "Test User"], { cwd: testDir });
  
  await gm.commit("Initial commit");
  
  status = await gm.status();
  assert.strictEqual(status.trim(), ""); // Should be clean
  
  const log = await gm.log();
  assert.ok(log.includes("Initial commit"));
  
  await fs.remove(testDir);
  console.log("git_manager tests passed.");
}

test_git_manager().catch(console.error);
