export interface WorkflowTask {
  id: string;
  action: (context: Record<string, any>) => Promise<any>;
  dependsOn?: string[];
}

export class workflow_engine {
  private tasks = new Map<string, WorkflowTask>();

  register(task: WorkflowTask) {
    this.tasks.set(task.id, task);
  }

  async execute(initialContext: Record<string, any> = {}): Promise<Record<string, any>> {
    const context = { ...initialContext };
    const completed = new Set<string>();
    const pending = new Set(this.tasks.keys());

    while (pending.size > 0) {
      const runnableTasks: WorkflowTask[] = [];
      for (const taskId of pending) {
        const task = this.tasks.get(taskId)!;
        const dependenciesMet = !task.dependsOn || task.dependsOn.every(dep => completed.has(dep));
        if (dependenciesMet) {
          runnableTasks.push(task);
        }
      }

      if (runnableTasks.length === 0) {
        throw new Error(`Deadlock or missing dependencies in workflow. Pending: ${Array.from(pending).join(", ")}`);
      }

      // Execute all runnable tasks in parallel
      await Promise.all(
        runnableTasks.map(async (task) => {
          const result = await task.action(context);
          if (result !== undefined) {
            context[task.id] = result;
          }
          completed.add(task.id);
          pending.delete(task.id);
        })
      );
    }

    return context;
  }
}

export const workflows = new workflow_engine();
