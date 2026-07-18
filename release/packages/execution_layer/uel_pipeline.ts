import { capabilityNegotiator } from "./negotiator.js";
import { executionSandbox, SandboxPolicy } from "./execution_sandbox.js";
import { 
  UniversalCapability, 
  ExecutionContext, 
  ExecutionRequest, 
  ExecutionResult 
} from "./universal_interface.js";

export class UELPipeline {
  async runUELPipeline(
    goalId: string,
    goalText: string,
    cap: UniversalCapability,
    req: ExecutionRequest,
    ctx: ExecutionContext,
    policy: SandboxPolicy
  ): Promise<ExecutionResult> {
    // 1. Negotiate
    const plan = capabilityNegotiator.negotiate(goalId, goalText);
    if (!plan.requiredCapabilities.includes(cap.manifest.name)) {
      throw new Error(`UELPipeline: Capability '${cap.manifest.name}' is not in negotiated plan`);
    }

    // 2. Setup Sandbox session
    const sandboxSessionId = `sb-${req.sessionId}`;
    executionSandbox.createSandbox(sandboxSessionId, policy);

    try {
      // 3. Execute inside Sandbox (handles permission checks, resource validation, reservations and timeout)
      const res = await executionSandbox.execute(sandboxSessionId, cap, req, ctx);

      // 4. Rollback coordination if failed and supported
      if (!res.success && cap.manifest.supportsRollback) {
        await executionSandbox.rollback(sandboxSessionId, cap, req);
      }

      return res;
    } finally {
      // 5. Cleanup & destroy
      await executionSandbox.cleanup(sandboxSessionId, cap);
      executionSandbox.destroySandbox(sandboxSessionId);
    }
  }
}

export const uelPipeline = new UELPipeline();
