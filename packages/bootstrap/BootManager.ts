// packages/bootstrap/BootManager.ts

import { ServiceContainer } from "../core/ServiceContainer.js";
import { IRuntime } from "../interfaces/IRuntime.js";
import { EngineError } from "../interfaces/errors.js";

/**
 * BootManager – the single entry point for the application.
 * It creates a local ServiceContainer, registers all engine implementations,
 * resolves the Runtime, and triggers the initialize/start lifecycle.
 *
 * No engine ordering logic lives here; Runtime determines the order based on
 * manifests and dependency graphs.
 */
export class BootManager {
  private container: ServiceContainer;

  constructor() {
    this.container = new ServiceContainer();
  }

  /** Register all concrete engine classes with the container. */
  private registerEngines() {
    // Engines are imported only for side‑effects (their registration with the container).
    // This list can be extended when new engines are added – no changes to BootManager.
    const engineModules = [
      // Core infrastructure
      import("../config/ConfigurationProvider.js"),
      import("../memory/migration_manager.js"),
      // Data layer
      import("../memory/memory_engine.js"),
      import("../knowledge_intelligence/knowledge_intelligence.js"),
      import("../conversation_engine/conversation_engine.js"),
      // AI stack
      import("../provider_manager/provider_manager.js"),
      import("../model_manager/model_manager.js"),
      import("../streaming/streaming_engine.js"),
      import("../router/router_engine.js"),
      // Execution stack
      import("../tools/tool_registry.js"),
      import("../execution_intelligence/execution_intelligence.js"),
      import("../cognitive_engine/intelligent_execution_planner.js"),
      import("../task_scheduler/task_scheduler.js"),
      // Application layer
      import("../workspace_terminal/workspace_engine.js"),
      import("../validation_engine/validation_engine.js"),
      import("../agent_orchestration/agent_intelligence.js"),
      // Runtime – must be last in registration so it can resolve others.
      import("../runtime/unified_runtime.js"),
    ];

    // Resolve the promises sequentially to ensure registration order does not matter.
    return Promise.all(engineModules);
  }

  /** Start the whole system. Returns an EngineResult<void>. */
  public async start(): Promise<void> {
    try {
      // Register all engine implementations.
      await this.registerEngines();

      // Resolve the runtime via its interface name.
      const runtime = this.container.resolve<IRuntime>("runtime");

      // Runtime is responsible for building the dependency graph and
      // initializing/starting all other engines.
      await runtime.initialize();
      await runtime.start();
    } catch (err) {
      // Wrap any unexpected error in a typed EngineError.
      throw new EngineError("BootManager failed to start", err as Error);
    }
  }

  /** Graceful shutdown – stop and dispose the runtime and container. */
  public async shutdown(): Promise<void> {
    try {
      const runtime = this.container.resolve<IRuntime>("runtime");
      await runtime.stop();
      await runtime.dispose();
      await this.container.dispose();
    } catch (err) {
      throw new EngineError("BootManager failed to shutdown", err as Error);
    }
  }
}
