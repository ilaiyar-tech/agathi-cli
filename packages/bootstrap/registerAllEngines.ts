// packages/bootstrap/registerAllEngines.ts

/**
 * Centralised registration of every engine with the ServiceContainer.
 * Each engine provides a static manifest (e.g., MemoryManifest) that lists its
 * ID, version, dependencies and capabilities. The container registers the class
 * together with the list of dependency IDs. Runtime will later resolve those
 * dependencies based on the container's resolution graph.
 *
 * New engines simply need to import their class and manifest and call
 * `container.register(id, EngineClass, manifest.dependencies)`.
 */

import { ServiceContainer } from "../core/ServiceContainer.js";

// --- Engine imports -------------------------------------------------------
// Infrastructure / foundational engines (to be implemented later)
// import { ConfigurationEngine } from "../config/ConfigurationEngine.js";
// import { DatabaseEngine } from "../database/DatabaseEngine.js";

// Data layer engines
import { MemoryEngine } from "../memory/memory_engine.js";
import { MemoryManifest } from "../memory/MemoryManifest.js";
// TODO: import other manifests when they are created, e.g.:
// import { KnowledgeEngine } from "../knowledge_intelligence/knowledge_intelligence.js";
// import { KnowledgeManifest } from "../knowledge_intelligence/KnowledgeManifest.js";

// AI layer engines (place‑holders for now)
// import { ProviderEngine } from "../provider_manager/provider_manager.js";
// import { ProviderManifest } from "../provider_manager/ProviderManifest.js";
// import { ModelEngine } from "../model_manager/model_manager.js";
// import { ModelManifest } from "../model_manager/ModelManifest.js";
// import { StreamingEngine } from "../streaming/streaming_engine.js";
// import { StreamingManifest } from "../streaming/StreamingManifest.js";
// import { RouterEngine } from "../router/router_engine.js";
// import { RouterManifest } from "../router/RouterManifest.js";

// Execution layer engines (place‑holders)
// import { ToolRegistry } from "../tools/tool_registry.js";
// import { ToolRegistryManifest } from "../tools/ToolRegistryManifest.js";
// import { ExecutionEngine } from "../execution_intelligence/execution_intelligence.js";
// import { ExecutionManifest } from "../execution_intelligence/ExecutionManifest.js";
// import { PlannerEngine } from "../cognitive_engine/intelligent_execution_planner.js";
// import { PlannerManifest } from "../cognitive_engine/PlannerManifest.js";
// import { SchedulerEngine } from "../task_scheduler/task_scheduler.js";
// import { SchedulerManifest } from "../task_scheduler/SchedulerManifest.js";

// Application layer engines
// import { WorkspaceEngine } from "../workspace_terminal/workspace_engine.js";
// import { WorkspaceManifest } from "../workspace_terminal/WorkspaceManifest.js";
// import { ConversationEngine } from "../conversation_engine/conversation_engine.js";
// import { ConversationManifest } from "../conversation_engine/ConversationManifest.js";
// import { ValidationEngine } from "../validation_engine/validation_engine.js";
// import { ValidationManifest } from "../validation_engine/ValidationManifest.js";
// import { AgentEngine } from "../agent_orchestration/agent_intelligence.js";
// import { AgentManifest } from "../agent_orchestration/AgentManifest.js";

// Runtime – registered as a factory because it needs the container itself.
import { createRuntime } from "../runtime/unified_runtime.js";

export async function registerAllEngines(container: ServiceContainer): Promise<void> {
  // Infrastructure (commented out until implementations exist)
  // container.register("configuration", ConfigurationEngine, []);
  // container.register("database", DatabaseEngine, []);

  // Data layer
  container.register(MemoryManifest.id, MemoryEngine, MemoryManifest.dependencies);
  // TODO: register other data engines when ready
  // container.register(KnowledgeManifest.id, KnowledgeEngine, KnowledgeManifest.dependencies);

  // AI layer (placeholder registrations – uncomment when implementations exist)
  // container.register(ProviderManifest.id, ProviderEngine, ProviderManifest.dependencies);
  // container.register(ModelManifest.id, ModelEngine, ModelManifest.dependencies);
  // container.register(StreamingManifest.id, StreamingEngine, StreamingManifest.dependencies);
  // container.register(RouterManifest.id, RouterEngine, RouterManifest.dependencies);

  // Execution layer (place‑holders)
  // container.register(ToolRegistryManifest.id, ToolRegistry, ToolRegistryManifest.dependencies);
  // container.register(ExecutionManifest.id, ExecutionEngine, ExecutionManifest.dependencies);
  // container.register(PlannerManifest.id, PlannerEngine, PlannerManifest.dependencies);
  // container.register(SchedulerManifest.id, SchedulerEngine, SchedulerManifest.dependencies);

  // Application layer (place‑holders)
  // container.register(WorkspaceManifest.id, WorkspaceEngine, WorkspaceManifest.dependencies);
  // container.register(ConversationManifest.id, ConversationEngine, ConversationManifest.dependencies);
  // container.register(ValidationManifest.id, ValidationEngine, ValidationManifest.dependencies);
  // container.register(AgentManifest.id, AgentEngine, AgentManifest.dependencies);

  // Runtime – factory registration (uses the same container for dependency resolution)
  container.factory("runtime", () => createRuntime(container));
}
