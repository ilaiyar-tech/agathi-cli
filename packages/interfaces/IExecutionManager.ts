export interface IExecutionManager {
  /** Execute a prepared task graph */
  execute(graph: any, queue: any): Promise<void>;
}
