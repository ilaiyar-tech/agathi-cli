import { capabilityNegotiator } from "./negotiator.js";
import { capabilityRegistry } from "./capability_registry.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_negotiator() {
  // Clear tables
  memory.database.prepare("delete from capability_negotiation_history").run();
  memory.database.prepare("delete from capability_negotiation_statistics").run();
  capabilityRegistry.clear();

  // Register capabilities
  capabilityRegistry.registerCapability({
    name: "GitConnector",
    category: "vcs",
    version: "1.0.0",
    securityLevel: "restricted",
    permissions: ["repo:write"],
    inputs: {},
    outputs: {},
    cost: 0.01,
    timeout: 5000,
    concurrencyLimit: 2,
    healthStatus: "healthy",
    dependencies: [],
    provider: "github",
    available: true,
    estimatedResources: { cpu: 1, memoryMb: 128 },
    supportsRollback: false
  });

  capabilityRegistry.registerCapability({
    name: "DockerConnector",
    category: "container",
    version: "1.0.0",
    securityLevel: "privileged",
    permissions: ["docker:run"],
    inputs: {},
    outputs: {},
    cost: 0.05,
    timeout: 10000,
    concurrencyLimit: 1,
    healthStatus: "healthy",
    dependencies: [],
    provider: "docker",
    available: true,
    estimatedResources: { cpu: 2, memoryMb: 512 },
    supportsRollback: true
  });

  // 1. Standard requirement negotiation
  const plan = capabilityNegotiator.negotiate("goal-1", "Deploy Docker image and push to Git repository");
  assert.ok(plan.requiredCapabilities.includes("GitConnector"));
  assert.ok(plan.requiredCapabilities.includes("DockerConnector"));
  assert.strictEqual(plan.riskAssessment.riskLevel, "high"); // Docker is privileged

  // 2. Dependency cycles checking test
  capabilityRegistry.registerCapability({
    name: "CyclicCapA",
    category: "custom",
    version: "1.0.0",
    securityLevel: "safe",
    permissions: [],
    inputs: {},
    outputs: {},
    cost: 0,
    timeout: 1000,
    concurrencyLimit: 1,
    healthStatus: "healthy",
    dependencies: ["CyclicCapB"],
    provider: "local",
    available: true,
    supportsRollback: false
  });

  capabilityRegistry.registerCapability({
    name: "CyclicCapB",
    category: "custom",
    version: "1.0.0",
    securityLevel: "safe",
    permissions: [],
    inputs: {},
    outputs: {},
    cost: 0,
    timeout: 1000,
    concurrencyLimit: 1,
    healthStatus: "healthy",
    dependencies: ["CyclicCapA"],
    provider: "local",
    available: true,
    supportsRollback: false
  });

  await assert.throws(() => {
    capabilityNegotiator.buildCapabilityPlan("Run CyclicCapA", ["CyclicCapA"], []);
  }, /Circular dependency/);

  console.log("negotiator tests passed.");
}

test_negotiator().catch(console.error);
