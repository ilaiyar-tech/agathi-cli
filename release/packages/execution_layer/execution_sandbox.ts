import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";
import { 
  UniversalCapability, 
  ExecutionContext, 
  ExecutionRequest, 
  ExecutionResult,
  PermissionDenied
} from "./universal_interface.js";
import { resourceManager } from "./resource_manager.js";

export type SandboxPolicyType = "ReadOnly" | "ReadWrite" | "Filesystem" | "Network" | "Process" | "Privileged" | "Custom";

export interface SandboxPolicy {
  policyType: SandboxPolicyType;
  allowedWorkspacePaths: string[];
  maxMemoryMb: number;
  networkAccess: boolean;
}

export interface SandboxSession {
  sessionId: string;
  policy: SandboxPolicy;
  createdAt: string;
  active: boolean;
}

export class ExecutionSandbox {
  private activeSessions = new Map<string, SandboxSession>();

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists sandbox_sessions (
        session_id text primary key,
        policy text,
        created_at text,
        active text
      );

      create table if not exists sandbox_audit (
        id text primary key,
        session_id text,
        action text,
        details text,
        timestamp text
      );

      create table if not exists sandbox_statistics (
        metric_name text primary key,
        value real
      );
    `);
  }

  createSandbox(sessionId: string, policy: SandboxPolicy): SandboxSession {
    const session: SandboxSession = {
      sessionId,
      policy,
      createdAt: new Date().toISOString(),
      active: true
    };
    this.activeSessions.set(sessionId, session);

    memory.database.prepare(`
      insert or replace into sandbox_sessions (session_id, policy, created_at, active)
      values (?, ?, ?, ?)
    `).run(sessionId, JSON.stringify(policy), session.createdAt, "true");

    this.logAudit(sessionId, "SandboxCreated", `Created sandbox session with policy ${policy.policyType}`);

    eventBus.publish({
      type: "Custom",
      contextId: "sandbox",
      sessionId,
      executionId: sessionId,
      metadata: { event: "SandboxCreated", sessionId }
    });

    return session;
  }

  destroySandbox(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.active = false;
      this.activeSessions.delete(sessionId);

      memory.database.prepare(`
        update sandbox_sessions set active = ? where session_id = ?
      `).run("false", sessionId);

      this.logAudit(sessionId, "SandboxDestroyed", "Destroyed sandbox session");

      eventBus.publish({
        type: "Custom",
        contextId: "sandbox",
        sessionId,
        executionId: sessionId,
        metadata: { event: "SandboxDestroyed", sessionId }
      });
    }
  }

  validatePermissions(sessionId: string, cap: UniversalCapability, req: ExecutionRequest): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Sandbox session '${sessionId}' is not active`);

    const hasPerms = cap.manifest.permissions.every(p => req.permissions.includes(p));
    if (!hasPerms) {
      this.logAudit(sessionId, "PermissionFailed", `Missing required permissions for capability ${cap.manifest.name}`);
      throw new PermissionDenied(`Sandbox: Missing required permissions for ${cap.manifest.name}`);
    }

    if (cap.manifest.securityLevel === "privileged" && session.policy.policyType !== "Privileged") {
      this.logAudit(sessionId, "PermissionFailed", `Privileged capability ${cap.manifest.name} blocked by sandbox policy`);
      throw new PermissionDenied(`Sandbox Policy restricts execution of privileged capabilities`);
    }

    this.logAudit(sessionId, "PermissionCheckPassed", `Validated permissions for capability ${cap.manifest.name}`);
  }

  validateResources(sessionId: string, cap: UniversalCapability): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Sandbox session '${sessionId}' is not active`);

    const requested = cap.manifest.estimatedResources || {};
    resourceManager.validateResources(requested);

    this.logAudit(sessionId, "ResourceCheckPassed", `Validated resources for capability ${cap.manifest.name}`);
  }

  async execute(
    sessionId: string,
    cap: UniversalCapability,
    req: ExecutionRequest,
    ctx: ExecutionContext
  ): Promise<ExecutionResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.active) {
      throw new Error(`Sandbox session '${sessionId}' is not active`);
    }

    this.validatePermissions(sessionId, cap, req);
    this.validateResources(sessionId, cap);

    // Reserve resources
    const reservation = resourceManager.reserveResources(ctx.contextId, cap.manifest.estimatedResources || {});

    this.logAudit(sessionId, "SandboxExecutionStarted", `Executing capability ${cap.manifest.name}`);
    eventBus.publish({
      type: "Custom",
      contextId: ctx.contextId,
      sessionId,
      executionId: req.executionId,
      metadata: { event: "SandboxExecutionStarted", sessionId, capabilityName: cap.manifest.name }
    });

    const startTime = Date.now();
    try {
      // Enforce timeout via race
      const result = await this.enforceTimeout(
        cap.execute(ctx, req),
        ctx.timeoutMs,
        `Capability execution timed out after ${ctx.timeoutMs}ms`
      );

      const duration = Date.now() - startTime;
      resourceManager.releaseResources(reservation.id);

      this.logAudit(sessionId, "SandboxExecutionCompleted", `Completed execution of ${cap.manifest.name}`);
      eventBus.publish({
        type: "Custom",
        contextId: ctx.contextId,
        sessionId,
        executionId: req.executionId,
        metadata: { event: "SandboxExecutionCompleted", sessionId, capabilityName: cap.manifest.name }
      });

      return {
        ...result,
        duration,
        metrics: {
          ...result.metrics,
          durationMs: duration
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      resourceManager.releaseResources(reservation.id);

      this.logAudit(sessionId, "SandboxExecutionFailed", `Failed executing capability: ${error instanceof Error ? error.message : "Unknown error"}`);
      eventBus.publish({
        type: "Custom",
        contextId: ctx.contextId,
        sessionId,
        executionId: req.executionId,
        metadata: { event: "SandboxExecutionFailed", sessionId, error: error instanceof Error ? error.message : "Unknown error" }
      });

      return {
        success: false,
        status: "Failed",
        outputs: {},
        artifacts: [],
        logs: [error instanceof Error ? error.message : "Unknown execution error"],
        metrics: { durationMs: duration },
        duration,
        resourceUsage: {},
        rollbackAvailable: cap.manifest.supportsRollback,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  async rollback(sessionId: string, cap: UniversalCapability, req: ExecutionRequest): Promise<void> {
    this.logAudit(sessionId, "SandboxRollbackStarted", `Starting rollback for ${cap.manifest.name}`);
    eventBus.publish({
      type: "Custom",
      contextId: "sandbox",
      sessionId,
      executionId: req.executionId,
      metadata: { event: "SandboxRollbackStarted", sessionId }
    });

    try {
      await cap.rollback(req);
      this.logAudit(sessionId, "SandboxRollbackCompleted", `Completed rollback for ${cap.manifest.name}`);
      eventBus.publish({
        type: "Custom",
        contextId: "sandbox",
        sessionId,
        executionId: req.executionId,
        metadata: { event: "SandboxRollbackCompleted", sessionId }
      });
    } catch (e) {
      this.logAudit(sessionId, "SandboxRollbackFailed", `Failed rollback for ${cap.manifest.name}: ${e instanceof Error ? e.message : "Unknown error"}`);
      throw e;
    }
  }

  async cleanup(sessionId: string, cap: UniversalCapability): Promise<void> {
    try {
      await cap.cleanup();
      this.logAudit(sessionId, "SandboxCleanupCompleted", `Cleaned up resources for ${cap.manifest.name}`);
      eventBus.publish({
        type: "Custom",
        contextId: "sandbox",
        sessionId,
        executionId: sessionId,
        metadata: { event: "SandboxCleanupCompleted", sessionId }
      });
    } catch (e) {
      this.logAudit(sessionId, "SandboxCleanupFailed", `Failed cleanup for ${cap.manifest.name}`);
    }
  }

  async enforceTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timeoutId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(message));
      }, ms);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
    });
  }

  private logAudit(sessionId: string, action: string, details: string) {
    const id = `aud-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    memory.database.prepare(`
      insert into sandbox_audit (id, session_id, action, details, timestamp)
      values (?, ?, ?, ?, ?)
    `).run(id, sessionId, action, details, timestamp);
  }

  getAuditLog(sessionId: string): any[] {
    return memory.database.prepare(`
      select * from sandbox_audit where session_id = ? order by timestamp asc
    `).all(sessionId);
  }
}

export const executionSandbox = new ExecutionSandbox();
