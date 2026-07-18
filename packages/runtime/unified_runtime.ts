// packages/runtime/unified_runtime.ts

/**
 * UnifiedRuntime – the central orchestrator that implements the frozen IRuntime contract.
 * It is resolved from the ServiceContainer and manages the full engine graph.
 * All engines are registered in the ServiceContainer; their manifests declare
 * dependencies, capabilities, and version information.
 */

import { eventBus as coreEventBus, RuntimeEvent } from "../core/event_bus.js";
import { EngineHealth, EngineMetric, IEngine, CapabilityDescriptor } from "../interfaces/IEngine.js";
import { IRuntime } from "../interfaces/IRuntime.js";
import { ServiceContainer } from "../core/ServiceContainer.js";
import { ENGINE_MANIFESTS, EngineManifest } from "../engine_manifests/EngineManifests.js";

export class UnifiedRuntime implements IRuntime {
  // IEngine base members
  public readonly id = "runtime";
  public readonly name = "UnifiedRuntime";
  public readonly version = "1.0.0";

  private container: ServiceContainer;
  private engineInstances: Map<string, IEngine> = new Map();
  private initOrder: string[] = [];
  private healthSnapshots: EngineHealth[] = [];

  constructor(container: ServiceContainer) {
    this.container = container;
    this.registerEventListeners();
  }

  /** -------------------- IEngine lifecycle -------------------- */
  async initialize(): Promise<void> {
    // 1️⃣ Load all manifests into a map for quick lookup.
    const manifestMap = new Map<string, EngineManifest>();
    for (const mf of ENGINE_MANIFESTS) {
      manifestMap.set(mf.id, mf);
    }

    // 2️⃣ Validate that every declared dependency exists.
    for (const mf of manifestMap.values()) {
      for (const dep of mf.dependencies) {
        if (!manifestMap.has(dep)) {
          throw new Error(`Engine "${mf.id}" depends on unknown engine "${dep}"`);
        }
      }
    }

    // 3️⃣ Topological sort – dependencies first, dependents later.
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (temp.has(id)) {
        throw new Error(`Circular dependency detected involving engine "${id}"`);
      }
      if (!visited.has(id)) {
        temp.add(id);
        const deps = manifestMap.get(id)!.dependencies;
        for (const d of deps) visit(d);
        temp.delete(id);
        visited.add(id);
        order.push(id);
      }
    };

    for (const id of manifestMap.keys()) visit(id);
    this.initOrder = order; // runtime itself will appear last (if declared)

    // 4️⃣ Resolve each engine via the container (skip self – we already have an instance).
    for (const id of this.initOrder) {
      if (id === this.id) continue;
      const engine = this.container.resolve<IEngine>(id);
      this.engineInstances.set(id, engine);
    }
  }

  async start(): Promise<void> {
    // Start engines in dependency‑aware order.
    for (const id of this.initOrder) {
      if (id === this.id) continue;
      const engine = this.engineInstances.get(id)!;
      await engine.initialize();
      await engine.start();
      this.healthSnapshots.push({ name: engine.name, status: "ok" });
    }
    // Finally, mark runtime itself as started.
    this.healthSnapshots.push({ name: this.name, status: "ok" });
  }

  async stop(): Promise<void> {
    // Stop in reverse order.
    for (const id of [...this.initOrder].reverse()) {
      if (id === this.id) continue;
      const engine = this.engineInstances.get(id);
      if (engine) await engine.stop();
    }
  }

  async dispose(): Promise<void> {
    // Dispose engines in reverse order, then the container.
    for (const id of [...this.initOrder].reverse()) {
      if (id === this.id) continue;
      const engine = this.engineInstances.get(id);
      if (engine && typeof engine.dispose === "function") {
        await engine.dispose();
      }
    }
    await this.container.dispose();
  }

  /** -------------------- IEngine telemetry -------------------- */
  getHealth(): EngineHealth {
    const failing = this.healthSnapshots.find((h) => h.status !== "ok");
    return {
      name: this.name,
      status: failing ? failing.status : "ok",
      details: { engines: this.healthSnapshots },
    };
  }

  getMetrics(): EngineMetric[] {
    const metrics: EngineMetric[] = [];
    for (const engine of this.engineInstances.values()) {
      if (typeof (engine as any).getMetrics === "function") {
        metrics.push(...(engine as any).getMetrics());
      }
    }
    return metrics;
  }

  getCapabilities(): CapabilityDescriptor[] {
    const caps: CapabilityDescriptor[] = [];
    for (const mf of ENGINE_MANIFESTS) {
      for (const cap of (mf as any).capabilities || []) {
        caps.push({ engine: mf.id, capability: cap });
      }
    }
    return caps;
  }

  async reset(): Promise<void> {
    for (const engine of this.engineInstances.values()) {
      if (typeof (engine as any).reset === "function") {
        await (engine as any).reset();
      }
    }
  }

  /** -------------------- Internal helpers -------------------- */
  private registerEventListeners(): void {
    coreEventBus.subscribe("*", (event: RuntimeEvent) => {
      console.debug(`[UnifiedRuntime] Event ${event.type}`, event.payload);
    });
  }
}

/**
 * Factory for the ServiceContainer to create the runtime.
 * The container passes itself so the runtime can resolve other engines.
 */
export const createRuntime = (container: ServiceContainer) => new UnifiedRuntime(container);
