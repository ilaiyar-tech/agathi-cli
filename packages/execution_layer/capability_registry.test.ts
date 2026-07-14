import { capabilityRegistry } from "./capability_registry.js";
import assert from "node:assert";

async function test_capability_registry() {
  capabilityRegistry.clear();

  capabilityRegistry.registerCapability({
    name: "GitConnector",
    category: "vcs",
    version: "1.0.0",
    securityLevel: "restricted",
    permissions: ["repo:write"],
    inputs: { path: "string" },
    outputs: { commitSha: "string" },
    cost: 0.05,
    timeout: 30000,
    concurrencyLimit: 2,
    healthStatus: "healthy",
    dependencies: [],
    provider: "github",
    available: true,
    estimatedResources: { cpu: 1, memoryMb: 128, network: true },
    supportsRollback: true
  });

  const git = capabilityRegistry.getCapability("GitConnector");
  assert.ok(git);
  assert.strictEqual(git.securityLevel, "restricted");
  assert.strictEqual(git.supportsRollback, true);
  assert.strictEqual(git.estimatedResources?.memoryMb, 128);

  const search = capabilityRegistry.searchCapabilities("vcs");
  assert.strictEqual(search.length, 1);
  assert.strictEqual(search[0].name, "GitConnector");

  assert.throws(() => {
    capabilityRegistry.registerCapability({
      name: "GitConnector",
      category: "vcs",
      version: "1.0.0",
      securityLevel: "safe",
      permissions: [],
      inputs: {},
      outputs: {},
      cost: 0,
      timeout: 1000,
      concurrencyLimit: 1,
      healthStatus: "healthy",
      dependencies: [],
      provider: "local",
      available: true,
      supportsRollback: false
    });
  }, /already registered/);

  capabilityRegistry.updateHealth("GitConnector", "unhealthy");
  assert.strictEqual(capabilityRegistry.checkHealth("GitConnector"), "unhealthy");

  console.log("capability_registry tests passed.");
}

test_capability_registry().catch(console.error);
