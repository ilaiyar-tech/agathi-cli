import { 
  capabilityExecutor, 
  UniversalCapability, 
  ExecutionRequest, 
  ExecutionContext, 
  PermissionDenied, 
  InvalidArguments 
} from "./universal_interface.js";
import assert from "node:assert";

class MockCapability implements UniversalCapability {
  manifest = {
    name: "MockCap",
    category: "custom" as const,
    version: "1.0.0",
    securityLevel: "safe" as const,
    permissions: ["test:write"],
    inputs: { value: "string" },
    outputs: { result: "string" },
    cost: 0,
    timeout: 5000,
    concurrencyLimit: 1,
    healthStatus: "healthy" as const,
    dependencies: [],
    provider: "test",
    available: true,
    supportsRollback: true
  };

  async initialize() {}
  async healthCheck() { return "healthy" as const; }
  async validateRequest(req: ExecutionRequest) {
    if (!req.arguments.value) {
      throw new InvalidArguments("Missing required argument 'value'");
    }
  }
  async execute(ctx: ExecutionContext, req: ExecutionRequest) {
    return {
      success: true,
      status: "Completed" as const,
      outputs: { result: `Echo: ${req.arguments.value}` },
      artifacts: [],
      logs: ["Execution ran successfully"],
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

async function test_universal_interface() {
  const mockCap = new MockCapability();
  capabilityExecutor.registerCapability("MockCap", mockCap);

  const req: ExecutionRequest = {
    requestId: "req1",
    contextId: "ctx1",
    sessionId: "sess1",
    executionId: "exec1",
    capabilityId: "MockCap",
    operation: "echo",
    arguments: { value: "Hello Universal Layer!" },
    timeout: 5000,
    permissions: ["test:write"]
  };

  // 1. Permission Denied Test
  const ctxNoPerms: ExecutionContext = {
    contextId: "ctx1",
    executionId: "exec1",
    permissionsGranted: [],
    maxMemoryMb: 128,
    timeoutMs: 5000
  };

  await assert.rejects(async () => {
    await capabilityExecutor.executeCapability("MockCap", req, ctxNoPerms);
  }, PermissionDenied);

  // 2. Successful Execution Test
  const ctxWithPerms: ExecutionContext = {
    contextId: "ctx1",
    executionId: "exec1",
    permissionsGranted: ["test:write"],
    maxMemoryMb: 128,
    timeoutMs: 5000
  };

  const res = await capabilityExecutor.executeCapability("MockCap", req, ctxWithPerms);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.status, "Completed");
  assert.strictEqual(res.outputs.result, "Echo: Hello Universal Layer!");

  // 3. Arguments Validation Test
  const invalidReq = { ...req, arguments: {} };
  await assert.rejects(async () => {
    await capabilityExecutor.executeCapability("MockCap", invalidReq, ctxWithPerms);
  }, InvalidArguments);

  console.log("universal_interface tests passed.");
}

test_universal_interface().catch(console.error);
