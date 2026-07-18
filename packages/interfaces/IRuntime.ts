import { IEngine } from "./IEngine";
import { EngineHealth, EngineMetric } from "./EngineHealth";

/** @since 1.0.0 */
export interface IRuntime extends IEngine {
  /** Initialize the full system – loads configuration, runs migrations, starts engines */
  initialize(): Promise<void>;
}
