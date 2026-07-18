export interface IPlanner {
  /** Build a task graph from a textual goal */
  plan(goalId: string, goal: string): Promise<{ graph: any; queue: any }>;
}
