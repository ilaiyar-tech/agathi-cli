// packages/engine_manifests/EngineManifests.ts

/**
 * Central registry of all engine manifests.
 * Each engine must export a const named <EngineName>Manifest.
 * The Runtime will import this file and use the collection to build the
 * dependency graph and verify that every declared dependency is present.
 */

// Import manifests from individual engines (add new imports when a new engine is added)
import { MemoryManifest } from "../memory/MemoryManifest.js";
// TODO: import other manifests as they are created, e.g.:
// import { KnowledgeManifest } from "../knowledge/KnowledgeManifest.js";
// import { PlannerManifest } from "../planner/PlannerManifest.js";

export const ENGINE_MANIFESTS = [
  MemoryManifest,
  // KnowledgeManifest,
  // PlannerManifest,
  // ... add remaining manifests here
] as const;

export type EngineManifest = typeof ENGINE_MANIFESTS[number];
