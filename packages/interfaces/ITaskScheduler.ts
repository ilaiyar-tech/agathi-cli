export interface ITaskScheduler {
  /** Schedule a one‑off task */
  scheduleOnce(delayMs: number, task: () => Promise<void>): void;
  /** Schedule a recurring task */
  scheduleRecurring(cronExpression: string, task: () => Promise<void>, maxRuns?: number): void;
  /** Cancel a scheduled task by identifier */
  cancel(taskId: string): void;
}
