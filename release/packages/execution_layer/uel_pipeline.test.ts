import { uelPipeline } from "./uel_pipeline.js";
import { capabilityRegistry } from "./capability_registry.js";
import { UniversalCapability, ExecutionRequest, ExecutionContext } from "./universal_interface.js";
import assert from "node:assert";

class MockIntegratedCapability implements UniversalCapability {
  manifest = {
    name: "SQLiteConnector",
    category: "db" as const,
    version: "1.0.0",
    securityLevel: "restricted" as const,
    permissions: ["db:write"],
    inputs: {},
    outputs: {},
    cost: 0.01,
    timeout: 5000,
    concurrencyLimit: 2,
    healthStatus: "healthy" as const,
    dependencies: [],
    provider: "sqlite",
    available: true,
    estimatedResources: { cpu: 1, memoryMb: 256 },
    supportsRollback: true
  };

  async initialize() {}
  async healthCheck() { return "healthy" as const; }
  async validateRequest() {}
  async execute() {
    return {
      success: true,
      status: "Completed" as const,
      outputs: { queried: true },
      artifacts: [],
      logs: ["SQLite execution query completed"],
      metrics: { durationMs: 0 },
      duration: 0,
      resourceUsage: {},
      rollbackAvailable: true
    };
  }
  async rollback() {}
  async cleanup() {}
  async shutdown() {}
}

async function test_uel_pipeline() {
  capabilityRegistry.clear();
  const cap = new MockIntegratedCapability();
  capabilityRegistry.registerCapability(cap.manifest);

  const req: ExecutionRequest = {
    requestId: "req-int-1",
    contextId: "ctx-int-1",
    sessionId: "session-int-1",
    executionId: "exec-int-1",
    capabilityId: "SQLiteConnector",
    operation: "query",
    arguments: {},
    timeout: 5000,
    permissions: ["db:write"]
  };

  const ctx: ExecutionContext = {
    contextId: "ctx-int-1",
    executionId: "exec-int-1",
    permissionsGranted: ["db:write"],
    maxMemoryMb: 512,
    timeoutMs: 5000
  };

  const policy = {
    policyType: "Privileged" as const,
    allowedWorkspacePaths: ["/tmp"],
    maxMemoryMb: 1024,
    networkAccess: true
  };

  const res = await uelPipeline.runUELPipeline(
    "goal-int-1",
    "Query data from SQLite database",
    cap,
    req,
    ctx,
    policy
  );

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status, "Completed");
  assert.strictEqual(res.outputs.queried, true);

  console.log("uel_pipeline tests passed.");
}

test_uel_pipeline().catch(console.error);
