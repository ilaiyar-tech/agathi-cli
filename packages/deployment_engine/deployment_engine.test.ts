import { deployer } from "./deployment_engine.js";
import assert from "node:assert";

async function test_deployment_engine() {
  const cfRes = await deployer.deploy({ provider: "cloudflare", projectPath: "./" });
  assert.strictEqual(cfRes.success, true);
  assert.ok(cfRes.url?.includes("cloudflare"));

  const customRes = await deployer.deploy({ provider: "custom", projectPath: "./" });
  assert.strictEqual(customRes.success, false);
  assert.ok(customRes.error?.includes("Unsupported"));

  console.log("deployment_engine tests passed.");
}

test_deployment_engine().catch(console.error);
