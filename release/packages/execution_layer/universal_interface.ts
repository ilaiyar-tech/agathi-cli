import { CapabilityManifest } from "./capability_registry.js";

export type ExecutionStatus = "Pending" | "Running" | "Completed" | "Failed" | "Cancelled" | "TimedOut" | "RolledBack";

export interface ExecutionContext {
  contextId: string;
  executionId: string;
  permissionsGranted: string[];
  maxMemoryMb: number;
  timeoutMs: number;
}

export interface ExecutionRequest {
  requestId: string;
  contextId: string;
  sessionId: string;
  executionId: string;
  capabilityId: string;
  operation: string;
  arguments: Record<string, any>;
  timeout: number;
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  outputs: Record<string, any>;
  artifacts: string[];
  logs: string[];
  metrics: {
    durationMs: number;
    cpuPercentage?: number;
    memoryBytesUsed?: number;
  };
  duration: number;
  resourceUsage: Record<string, any>;
  rollbackAvailable: boolean;
  error?: string;
}

// UEL Standard Error Classes
export class PermissionDenied extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionDenied";
  }
}
export class CapabilityUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapabilityUnavailable";
  }
}
export class InvalidArguments extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidArguments";
  }
}
export class Timeout extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Timeout";
  }
}
export class ResourceLimitExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceLimitExceeded";
  }
}
export class ExecutionFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExecutionFailed";
  }
}
export class RollbackFailed extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RollbackFailed";
  }
}

export interface UniversalCapability {
  manifest: CapabilityManifest;
  initialize(): Promise<void>;
  healthCheck(): Promise<"healthy" | "unhealthy">;
  validateRequest(req: ExecutionRequest): Promise<void>;
  execute(ctx: ExecutionContext, req: ExecutionRequest): Promise<ExecutionResult>;
  rollback(req: ExecutionRequest): Promise<void>;
  cleanup(): Promise<void>;
  shutdown(): Promise<void>;
}

export class CapabilityExecutor {
  private capabilities = new Map<string, UniversalCapability>();

  registerCapability(name: string, cap: UniversalCapability) {
    this.capabilities.set(name, cap);
  }

  unregisterCapability(name: string) {
    this.capabilities.delete(name);
  }

  async executeCapability(name: string, request: ExecutionRequest, ctx: ExecutionContext): Promise<ExecutionResult> {
    const cap = this.capabilities.get(name);
    if (!cap) {
      throw new CapabilityUnavailable(`Capability '${name}' not registered`);
    }

    if (cap.manifest.healthStatus !== "healthy") {
      throw new CapabilityUnavailable(`Capability '${name}' is unhealthy`);
    }

    // Permissions check
    const hasPerms = cap.manifest.permissions.every(p => ctx.permissionsGranted.includes(p));
    if (!hasPerms) {
      throw new PermissionDenied(`Insufficient permissions granted for execution of '${name}'`);
    }

    // Input Validation
    await cap.validateRequest(request);

    const startTime = Date.now();
    try {
      const res = await cap.execute(ctx, request);
      const duration = Date.now() - startTime;
      return {
        ...res,
        duration,
        metrics: {
          ...res.metrics,
          durationMs: duration
        }
      };
    } catch (e) {
      throw new ExecutionFailed(e instanceof Error ? e.message : "Unknown execution error");
    }
  }

  async rollbackExecution(name: string, request: ExecutionRequest): Promise<void> {
    const cap = this.capabilities.get(name);
    if (!cap) throw new CapabilityUnavailable(`Capability '${name}' not registered`);
    try {
      await cap.rollback(request);
    } catch (e) {
      throw new RollbackFailed(e instanceof Error ? e.message : "Unknown rollback error");
    }
  }

  async shutdownCapability(name: string): Promise<void> {
    const cap = this.capabilities.get(name);
    if (cap) {
      await cap.shutdown();
    }
  }
}

export const capabilityExecutor = new CapabilityExecutor();
