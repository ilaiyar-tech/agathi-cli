import { EngineHealth } from "./EngineHealth.js";
import { EngineMetric } from "./EngineMetric.js";
import { CapabilityDescriptor } from "./CapabilityDescriptor.js";

export interface IEngine {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /** Initialize resources */
  initialize(): Promise<void>;

  /** Start processing */
  start(): Promise<void>;

  /** Stop processing */
  stop(): Promise<void>;

  /** Dispose and cleanup */
  dispose(): Promise<void>;

  /** Current health status */
  getHealth(): EngineHealth;

  /** Engine metrics */
  getMetrics(): EngineMetric[];

  /** Declared capabilities */
  getCapabilities(): CapabilityDescriptor[];

  /** Reset to initial state */
  reset(): Promise<void>;
}

/** Engine lifecycle states */
export enum EngineLifecycleState {
  Created = "Created",
  Initializing = "Initializing",
  Ready = "Ready",
  Running = "Running",
  Degraded = "Degraded",
  Recovering = "Recovering",
  Stopping = "Stopping",
  Stopped = "Stopped",
  Failed = "Failed",
  Disposed = "Disposed",
}
