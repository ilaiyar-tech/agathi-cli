import { cloudflare } from "./cloudflare_manager.js";
import assert from "node:assert";
import path from "path";
import fs from "fs-extra";

async function test_cloudflare_manager() {
  const testDir = path.join(process.cwd(), "test_cf_dir");
  await fs.ensureDir(testDir);
  await fs.ensureDir(path.join(testDir, "dist"));
  
  // This will fail because wrangler is not logged in / missing
  // We just ensure it runs and returns failure correctly without throwing UnhandledRejection
  const res = await cloudflare.deploy(testDir, "test-cf-project");
  
  assert.strictEqual(res.success, false);
  assert.ok(res.output.length > 0);

  await fs.remove(testDir);
  console.log("cloudflare_manager tests passed.");
}

test_cloudflare_manager().catch(console.error);
