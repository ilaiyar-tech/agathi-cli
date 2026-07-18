import { deployer } from "./deployment_engine.js";
import assert from "node:assert";

async function test_deployment_engine() {
  const cfRes = await deployer.deploy({ provider: "cloudflare", projectPath: "./" });
  // Wrangler deploy will naturally fail in a test environment without auth
  assert.strictEqual(cfRes.success, false);
  assert.ok(typeof cfRes.error === "string");

  const customRes = await deployer.deploy({ provider: "custom", projectPath: "./" });
  assert.strictEqual(customRes.success, false);
  assert.ok(customRes.error?.includes("Unsupported"));

  console.log("deployment_engine tests passed.");
}

test_deployment_engine().catch(console.error);
