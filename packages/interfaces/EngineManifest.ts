// packages/interfaces/EngineManifest.ts

import { EngineMetric } from "./EngineMetric.js";
import { EngineHealth } from "./EngineHealth.js";
import { CapabilityDescriptor } from "./CapabilityDescriptor.js";

/**
 * Engine manifest – static metadata describing a concrete engine.
 * All engines must export a constant of this shape.
 */
export interface EngineManifest {
  /** Unique identifier used for DI registration */
  id: string;
  /** Human‑readable name (used in docs, health reports, CLI) */
  name: string;
  /** Semantic version */
  version: string;
  /** Short description of the engine’s purpose */
  description: string;
  /** IDs of engines this one depends on */
  dependencies: string[];
  /** Declared capabilities – free‑form strings understood by consumers */
  capabilities: string[];
  /** Tags for grouping, discovery, CLI filtering, etc. */
  tags: string[];
}

/**
 * Helper type that aggregates the public contract pieces an engine may expose.
 * Engines that implement IEngine can additionally expose this metadata via a
 * static `manifest` property, but the container only needs the plain object.
 */
export type EngineInfo = EngineManifest & {
  health?: EngineHealth;
  metrics?: EngineMetric[];
  capabilities?: CapabilityDescriptor[];
};
