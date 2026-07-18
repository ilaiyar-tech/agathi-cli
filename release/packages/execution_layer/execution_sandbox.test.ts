import { executionSandbox, SandboxPolicy } from "./execution_sandbox.js";
import { UniversalCapability, ExecutionRequest, ExecutionContext, PermissionDenied } from "./universal_interface.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

class PrivilegeMockCapability implements UniversalCapability {
  manifest = {
    name: "PrivilegedCap",
    category: "custom" as const,
    version: "1.0.0",
    securityLevel: "privileged" as const,
    permissions: ["sys:root"],
    inputs: {},
    outputs: {},
    cost: 0,
    timeout: 5000,
    concurrencyLimit: 1,
    healthStatus: "healthy" as const,
    dependencies: [],
    provider: "test",
    available: true,
    estimatedResources: { cpu: 1 },
    supportsRollback: true
  };

  async initialize() {}
  async healthCheck() { return "healthy" as const; }
  async validateRequest() {}
  async execute() {
    return {
      success: true,
      status: "Completed" as const,
      outputs: { ok: true },
      artifacts: [],
      logs: ["Executed"],
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

async function test_execution_sandbox() {
  // Clear tables
  memory.database.prepare("delete from sandbox_sessions").run();
  memory.database.prepare("delete from sandbox_audit").run();

  const policy: SandboxPolicy = {
    policyType: "ReadOnly",
    allowedWorkspacePaths: ["/tmp"],
    maxMemoryMb: 512,
    networkAccess: false
  };

  // 1. Create Sandbox
  const session = executionSandbox.createSandbox("session-1", policy);
  assert.strictEqual(session.policy.policyType, "ReadOnly");

  const cap = new PrivilegeMockCapability();
  const req: ExecutionRequest = {
    requestId: "req-1",
    contextId: "ctx-1",
    sessionId: "session-1",
    executionId: "exec-1",
    capabilityId: "PrivilegedCap",
    operation: "run",
    arguments: {},
    timeout: 1000,
    permissions: ["sys:root"]
  };

  const ctx: ExecutionContext = {
    contextId: "ctx-1",
    executionId: "exec-1",
    permissionsGranted: ["sys:root"],
    maxMemoryMb: 512,
    timeoutMs: 1000
  };

  // 2. Privileged capability should fail execution in ReadOnly policy
  await assert.rejects(async () => {
    await executionSandbox.execute("session-1", cap, req, ctx);
  }, PermissionDenied);

  // 3. Upgrade policy to Privileged and execute
  executionSandbox.destroySandbox("session-1");
  const privilegedPolicy: SandboxPolicy = {
    policyType: "Privileged",
    allowedWorkspacePaths: ["/tmp"],
    maxMemoryMb: 1024,
    networkAccess: true
  };
  executionSandbox.createSandbox("session-2", privilegedPolicy);

  const res = await executionSandbox.execute("session-2", cap, req, ctx);
  assert.strictEqual(res.success, true);

  // 4. Audit Log Check
  const audit = executionSandbox.getAuditLog("session-2");
  assert.ok(audit.length >= 3);
  assert.strictEqual(audit[0].action, "SandboxCreated");
  assert.strictEqual(audit[audit.length - 1].action, "SandboxExecutionCompleted");

  console.log("execution_sandbox tests passed.");
}

test_execution_sandbox().catch(console.error);
