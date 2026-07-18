export interface ScheduledTask {
  id: string;
  intervalMs?: number;
  timeoutMs?: number;
  action: () => Promise<void>;
  status: "idle" | "running" | "stopped";
}

export class task_scheduler {
  private tasks = new Map<string, ScheduledTask>();
  private timers = new Map<string, NodeJS.Timeout>();

  schedule(task: Omit<ScheduledTask, "status">): string {
    const fullTask: ScheduledTask = { ...task, status: "idle" };
    this.tasks.set(task.id, fullTask);

    if (task.intervalMs) {
      const timer = setInterval(() => this.run(task.id), task.intervalMs);
      this.timers.set(task.id, timer);
    } else if (task.timeoutMs) {
      const timer = setTimeout(() => {
        this.run(task.id);
        this.timers.delete(task.id);
      }, task.timeoutMs);
      this.timers.set(task.id, timer);
    } else {
      // Run immediately once
      setImmediate(() => this.run(task.id));
    }

    return task.id;
  }

  async run(id: string) {
    const task = this.tasks.get(id);
    if (!task) return;
    if (task.status === "running") return; // prevent overlap
    task.status = "running";
    try {
      await task.action();
    } catch (e) {
      // handle error
    } finally {
      if (this.tasks.has(id)) {
        task.status = "idle";
        // If it's not a recurring task, remove it after completion to prevent leaks
        if (!task.intervalMs) {
          this.tasks.delete(id);
        }
      }
    }
  }

  cancel(id: string) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(id);
    }
    this.tasks.delete(id);
  }
}

export const scheduler = new task_scheduler();
