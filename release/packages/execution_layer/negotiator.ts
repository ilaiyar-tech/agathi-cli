import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";
import { capabilityRegistry } from "./capability_registry.js";
import { resourceManager } from "./resource_manager.js";

export interface CapabilityPlan {
  requiredCapabilities: string[];
  optionalCapabilities: string[];
  executionOrder: string[];
  resourceRequirements: Record<string, any>;
  connectorRequirements: string[];
  permissionRequirements: string[];
  riskAssessment: {
    riskLevel: "low" | "medium" | "high";
    reason: string;
  };
  fallbackPlans: string[][];
}

export class CapabilityNegotiator {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists capability_negotiation_history (
        negotiation_id text primary key,
        goal_id text,
        plan text,
        timestamp text
      );

      create table if not exists capability_negotiation_statistics (
        metric_name text primary key,
        value real
      );
    `);
  }

  analyzeRequirements(goalText: string): { required: string[]; optional: string[] } {
    const lower = goalText.toLowerCase();
    const required: string[] = [];
    const optional: string[] = [];

    if (lower.includes("git") || lower.includes("commit") || lower.includes("repo")) {
      required.push("GitConnector");
    }
    if (lower.includes("docker") || lower.includes("container")) {
      required.push("DockerConnector");
    }
    if (lower.includes("db") || lower.includes("sql") || lower.includes("sqlite")) {
      required.push("SQLiteConnector");
    }

    return { required, optional };
  }

  resolveDependencies(required: string[]): string[] {
    const resolved: string[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visiting.has(name)) {
        eventBus.publish({
          type: "Custom",
          contextId: "negotiator",
          sessionId: "negotiator",
          executionId: name,
          metadata: { event: "CapabilityConflictDetected", conflict: `Circular dependency detected on capability '${name}'` }
        });
        throw new Error(`Circular dependency detected in capabilities: ${name}`);
      }

      if (!visited.has(name)) {
        visiting.add(name);
        const cap = capabilityRegistry.getCapability(name);
        if (cap) {
          for (const dep of cap.dependencies) {
            visit(dep);
          }
        }
        visiting.delete(name);
        visited.add(name);
        resolved.push(name);
      }
    };

    for (const name of required) {
      visit(name);
    }

    return resolved;
  }

  validateCapabilities(capabilities: string[]): void {
    for (const name of capabilities) {
      const cap = capabilityRegistry.getCapability(name);
      if (!cap || !cap.available) {
        throw new Error(`Required capability '${name}' is unavailable`);
      }
      if (cap.healthStatus === "unhealthy") {
        throw new Error(`Required capability '${name}' is unhealthy`);
      }
    }
  }

  validateResources(capabilities: string[]): void {
    const totalRequired = { cpu: 0, memoryMb: 0 };
    for (const name of capabilities) {
      const cap = capabilityRegistry.getCapability(name);
      if (cap && cap.estimatedResources) {
        totalRequired.cpu += cap.estimatedResources.cpu || 0;
        totalRequired.memoryMb += cap.estimatedResources.memoryMb || 0;
      }
    }
    resourceManager.validateResources(totalRequired);
  }

  validateConnectors(capabilities: string[]): string[] {
    const connectors: string[] = [];
    for (const name of capabilities) {
      const cap = capabilityRegistry.getCapability(name);
      if (cap && cap.category === "cloud") {
        connectors.push(`${name}Connector`);
      }
    }
    return connectors;
  }

  generateFallbackPlans(required: string[]): string[][] {
    const fallbacks: string[][] = [];
    // If docker is required, fallback could be running directly on localhost bash
    if (required.includes("DockerConnector")) {
      fallbacks.push(required.filter(c => c !== "DockerConnector").concat(["BashConnector"]));
    }
    return fallbacks;
  }

  buildCapabilityPlan(goalText: string, required: string[], optional: string[]): CapabilityPlan {
    const resolved = this.resolveDependencies(required);
    this.validateCapabilities(resolved);
    this.validateResources(resolved);
    const connectors = this.validateConnectors(resolved);

    // Permission compilation
    const permissions: string[] = [];
    for (const name of resolved) {
      const cap = capabilityRegistry.getCapability(name);
      if (cap) {
        permissions.push(...cap.permissions);
      }
    }

    const hasPrivileged = resolved.some(
      name => capabilityRegistry.getCapability(name)?.securityLevel === "privileged"
    );

    const plan: CapabilityPlan = {
      requiredCapabilities: resolved,
      optionalCapabilities: optional,
      executionOrder: resolved,
      resourceRequirements: resolved.map(c => ({
        capability: c,
        resources: capabilityRegistry.getCapability(c)?.estimatedResources || {}
      })),
      connectorRequirements: connectors,
      permissionRequirements: Array.from(new Set(permissions)),
      riskAssessment: {
        riskLevel: hasPrivileged ? "high" : "low",
        reason: hasPrivileged ? "Requires privileged capabilities" : "Standard low-risk workspace operations"
      },
      fallbackPlans: this.generateFallbackPlans(resolved)
    };

    return plan;
  }

  negotiate(goalId: string, goalText: string): CapabilityPlan {
    const negotiationId = `neg-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    eventBus.publish({
      type: "Custom",
      contextId: goalId,
      sessionId: "negotiator",
      executionId: negotiationId,
      metadata: { event: "NegotiationStarted", goalId }
    });

    const { required, optional } = this.analyzeRequirements(goalText);
    const plan = this.buildCapabilityPlan(goalText, required, optional);

    memory.database.prepare(`
      insert into capability_negotiation_history (negotiation_id, goal_id, plan, timestamp)
      values (?, ?, ?, ?)
    `).run(negotiationId, goalId, JSON.stringify(plan), timestamp);

    eventBus.publish({
      type: "Custom",
      contextId: goalId,
      sessionId: "negotiator",
      executionId: negotiationId,
      metadata: { event: "CapabilityPlanCreated", plan }
    });

    eventBus.publish({
      type: "Custom",
      contextId: goalId,
      sessionId: "negotiator",
      executionId: negotiationId,
      metadata: { event: "NegotiationCompleted", goalId }
    });

    return plan;
  }
}

export const capabilityNegotiator = new CapabilityNegotiator();
