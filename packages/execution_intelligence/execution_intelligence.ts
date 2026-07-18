import crypto from "node:crypto";
import { eventBus } from "../context_engine/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { ContextOS } from "../context_engine/index.js";

export interface ExecutionSession {
  id: string;
  plannerId: string;
  promptId: string;
  workspaceId: string;
  sessionId: string;
  createdTime: number;
  status: "created" | "running" | "paused" | "completed" | "failed" | "cancelled";
}

export interface ExecutionTask {
  id: string;
  executionId: string;
  priority: number;
  status: "waiting" | "running" | "completed" | "failed";
  action: string;
  result?: string;
  duration?: number;
  timeout: number;
  retries: number;
  maxRetries: number;
}

export interface ExecutionDependency {
  taskId: string;
  dependsOnTaskId: string;
}

export interface ExecutionCheckpoint {
  id: string;
  executionId: string;
  phase: string;
  stateSnapshot: string;
  timestamp: number;
}

export interface ExecutionEvent {
  id?: number;
  executionId: string;
  eventName: string;
  details: string;
  timestamp: number;
}

export interface ExecutionMetrics {
  executionId: string;
  duration: number;
  retryCount: number;
  failureCount: number;
  recoveryCount: number;
  parallelEfficiency: number;
  resourceUsage: string;
  successRate: number;
}

export class DependencyResolver {
  static hasCycle(tasks: ExecutionTask[], dependencies: ExecutionDependency[]): boolean {
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    
    for (const t of tasks) {
      inDegree[t.id] = 0;
      adj[t.id] = [];
    }
    
    for (const dep of dependencies) {
      if (adj[dep.dependsOnTaskId]) {
        adj[dep.dependsOnTaskId].push(dep.taskId);
      }
      if (inDegree[dep.taskId] !== undefined) {
        inDegree[dep.taskId]++;
      }
    }
    
    const queue: string[] = [];
    for (const t of tasks) {
      if (inDegree[t.id] === 0) {
        queue.push(t.id);
      }
    }
    
    let visitedCount = 0;
    while (queue.length > 0) {
      const u = queue.shift()!;
      visitedCount++;
      
      for (const v of adj[u] || []) {
        inDegree[v]--;
        if (inDegree[v] === 0) {
          queue.push(v);
        }
      }
    }
    
    return visitedCount !== tasks.length;
  }
}

export class TaskScheduler {
  private executionId: string;
  private concurrencyLimit: number = 3;
  private runningTasks = new Set<string>();

  constructor(executionId: string) {
    this.executionId = executionId;
  }

  async run(tasks: ExecutionTask[], dependencies: ExecutionDependency[], executeFn: (task: ExecutionTask) => Promise<string>): Promise<void> {
    if (DependencyResolver.hasCycle(tasks, dependencies)) {
      throw new Error("Circular dependency detected in execution graph!");
    }

    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    
    for (const t of tasks) {
      inDegree[t.id] = 0;
      adj[t.id] = [];
    }

    for (const dep of dependencies) {
      adj[dep.dependsOnTaskId].push(dep.taskId);
      inDegree[dep.taskId]++;
    }

    const runnable: string[] = [];
    const completed = new Set<string>();
    const failed = new Set<string>();

    for (const t of tasks) {
      if (t.status === "completed") {
        completed.add(t.id);
        for (const childId of adj[t.id] || []) {
          inDegree[childId]--;
        }
      } else if (t.status === "failed") {
        failed.add(t.id);
      }
    }

    const updateRunnableQueue = () => {
      for (const t of tasks) {
        if (t.status === "waiting" && inDegree[t.id] === 0 && !runnable.includes(t.id) && !this.runningTasks.has(t.id)) {
          runnable.push(t.id);
        }
      }
      runnable.sort((a, b) => {
        const ta = tasks.find(t => t.id === a)!;
        const tb = tasks.find(t => t.id === b)!;
        return tb.priority - ta.priority;
      });
    };

    updateRunnableQueue();

    while (completed.size + failed.size < tasks.length) {
      const activeSession = memory.database.prepare("select status from execution_sessions where id = ?").get(this.executionId) as any;
      if (!activeSession || activeSession.status === "paused" || activeSession.status === "cancelled") {
        break;
      }

      while (this.runningTasks.size < this.concurrencyLimit && runnable.length > 0) {
        const taskId = runnable.shift()!;
        const task = tasks.find(t => t.id === taskId)!;
        
        this.runningTasks.add(taskId);
        task.status = "running";
        
        memory.database.prepare("update execution_tasks set status = 'running' where id = ?").run(taskId);
        
        eventBus.publish({
          type: "Custom",
          contextId: "execution",
          sessionId: activeSession.sessionId || "default",
          executionId: this.executionId,
          metadata: { event: "TaskStarted", taskId }
        });

        // Async trigger
        (async () => {
          const start = Date.now();
          try {
            // Apply timeout control
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout exceeded (${task.timeout}ms)`)), task.timeout)
            );
            const executionPromise = executeFn(task);
            
            const result = await Promise.race([executionPromise, timeoutPromise]);
            
            task.status = "completed";
            task.result = result;
            task.duration = Date.now() - start;
            
            memory.database.prepare("update execution_tasks set status = 'completed', result = ?, duration = ? where id = ?")
              .run(result, task.duration, taskId);

            completed.add(taskId);
            
            eventBus.publish({
              type: "Custom",
              contextId: "execution",
              sessionId: activeSession.sessionId || "default",
              executionId: this.executionId,
              metadata: { event: "TaskCompleted", taskId }
            });

            // Decrement child indegrees
            for (const childId of adj[taskId] || []) {
              inDegree[childId]--;
            }
          } catch (err: any) {
            task.status = "failed";
            task.result = err.message;
            task.duration = Date.now() - start;
            
            memory.database.prepare("update execution_tasks set status = 'failed', result = ?, duration = ? where id = ?")
              .run(err.message, task.duration, taskId);
            
            failed.add(taskId);

            eventBus.publish({
              type: "Custom",
              contextId: "execution",
              sessionId: activeSession.sessionId || "default",
              executionId: this.executionId,
              metadata: { event: "TaskFailed", taskId, error: err.message }
            });
          } finally {
            this.runningTasks.delete(taskId);
            updateRunnableQueue();
          }
        })();
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

export class ExecutionIntelligenceLayer {
  constructor() {
    try {
      memory.database.exec(`
        create table if not exists execution_sessions (
          id text primary key,
          planner_id text not null,
          prompt_id text not null,
          workspace_id text not null,
          session_id text not null,
          created_time integer not null,
          status text not null
        );

        create table if not exists execution_tasks (
          id text primary key,
          execution_id text not null,
          priority integer not null,
          status text not null,
          action text not null,
          result text,
          duration integer,
          timeout integer not null,
          retries integer not null,
          max_retries integer not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists execution_dependencies (
          task_id text not null,
          depends_on_task_id text not null,
          primary key (task_id, depends_on_task_id),
          foreign key(task_id) references execution_tasks(id) on delete cascade
        );

        create table if not exists execution_checkpoints (
          id text primary key,
          execution_id text not null,
          phase text not null,
          state_snapshot text not null,
          timestamp integer not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists execution_events (
          id integer primary key autoincrement,
          execution_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );

        create table if not exists execution_metrics (
          execution_id text primary key,
          duration integer not null,
          retry_count integer not null,
          failure_count integer not null,
          recovery_count integer not null,
          parallel_efficiency real not null,
          resource_usage text not null,
          success_rate real not null,
          foreign key(execution_id) references execution_sessions(id) on delete cascade
        );
      `);
    } catch (e) {
      console.error("Failed to initialize EIL database tables", e);
    }
  }

  async createExecution(plannerId: string, promptId: string, workspaceId: string, sessionId: string): Promise<string> {
    const id = `exec-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    
    memory.database.prepare(`
      insert into execution_sessions (id, planner_id, prompt_id, workspace_id, session_id, created_time, status)
      values (?, ?, ?, ?, ?, ?, 'created')
    `).run(id, plannerId, promptId, workspaceId, sessionId, timestamp);

    this.logEvent(id, "ExecutionCreated", `Execution session created for planner: ${plannerId}`);

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId,
      executionId: id,
      metadata: { event: "ExecutionCreated", plannerId, promptId }
    });

    return id;
  }

  async startExecution(executionId: string): Promise<void> {
    const session = await this.getExecution(executionId);
    if (!session) throw new Error(`Execution ${executionId} not found`);

    memory.database.prepare("update execution_sessions set status = 'running' where id = ?").run(executionId);
    this.logEvent(executionId, "ExecutionStarted", "Orchestrator monitoring initiated");

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session.sessionId,
      executionId,
      metadata: { event: "ExecutionStarted" }
    });

    // Automatically trigger task scheduler
    const tasks = await this.getTasks(executionId);
    const dependencies = await this.getDependencies(executionId);
    
    const scheduler = new TaskScheduler(executionId);
    const start = Date.now();

    try {
      await scheduler.run(tasks, dependencies, async (task) => {
        // Run dummy actions simulating tool/execution processes
        if (task.action.includes("fail")) {
          throw new Error("Intended task failure");
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        return `Successfully executed action: ${task.action}`;
      });

      // Recalculate statuses
      const updatedTasks = await this.getTasks(executionId);
      const isFailed = updatedTasks.some(t => t.status === "failed");
      const finalStatus = isFailed ? "failed" : "completed";
      
      memory.database.prepare("update execution_sessions set status = ? where id = ?").run(finalStatus, executionId);
      this.logEvent(executionId, finalStatus === "completed" ? "ExecutionCompleted" : "ExecutionFailed", "Workflow execution phase finished");

      // Save metrics
      const retryCount = updatedTasks.reduce((acc, t) => acc + t.retries, 0);
      const failureCount = updatedTasks.filter(t => t.status === "failed").length;
      const successRate = updatedTasks.length > 0 ? (updatedTasks.filter(t => t.status === "completed").length / updatedTasks.length) : 0;
      
      memory.database.prepare(`
        insert or replace into execution_metrics (execution_id, duration, retry_count, failure_count, recovery_count, parallel_efficiency, resource_usage, success_rate)
        values (?, ?, ?, ?, ?, 1.0, '{"cpu": 15, "memory": 200}', ?)
      `).run(executionId, Date.now() - start, retryCount, failureCount, 0, successRate);

      eventBus.publish({
        type: "Custom",
        contextId: "execution",
        sessionId: session.sessionId,
        executionId,
        metadata: { event: finalStatus === "completed" ? "ExecutionCompleted" : "ExecutionFailed" }
      });
    } catch (e: any) {
      memory.database.prepare("update execution_sessions set status = 'failed' where id = ?").run(executionId);
      this.logEvent(executionId, "ExecutionFailed", e.message);

      eventBus.publish({
        type: "Custom",
        contextId: "execution",
        sessionId: session.sessionId,
        executionId,
        metadata: { event: "ExecutionFailed", error: e.message }
      });
    }
  }

  async pauseExecution(executionId: string): Promise<void> {
    const session = await this.getExecution(executionId);
    if (!session) throw new Error(`Execution ${executionId} not found`);

    memory.database.prepare("update execution_sessions set status = 'paused' where id = ?").run(executionId);
    this.logEvent(executionId, "ExecutionPaused", "Processing queue halted");

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session.sessionId,
      executionId,
      metadata: { event: "ExecutionPaused" }
    });
  }

  async resumeExecution(executionId: string): Promise<void> {
    const session = await this.getExecution(executionId);
    if (!session) throw new Error(`Execution ${executionId} not found`);

    memory.database.prepare("update execution_sessions set status = 'running' where id = ?").run(executionId);
    this.logEvent(executionId, "ExecutionResumed", "Processing queue resumed");

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session.sessionId,
      executionId,
      metadata: { event: "ExecutionResumed" }
    });

    // Re-run
    await this.startExecution(executionId);
  }

  async cancelExecution(executionId: string, forced: boolean = false): Promise<void> {
    const session = await this.getExecution(executionId);
    if (!session) throw new Error(`Execution ${executionId} not found`);

    memory.database.prepare("update execution_sessions set status = 'cancelled' where id = ?").run(executionId);
    this.logEvent(executionId, "ExecutionCancelled", `Process terminated (Forced: ${forced})`);

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session.sessionId,
      executionId,
      metadata: { event: "ExecutionCancelled" }
    });
  }

  async retryExecution(executionId: string): Promise<void> {
    const session = await this.getExecution(executionId);
    if (!session) throw new Error(`Execution ${executionId} not found`);

    this.logEvent(executionId, "RetryStarted", "Resetting failed tasks and retrying");
    
    // Reset failed tasks to waiting
    memory.database.prepare("update execution_tasks set status = 'waiting', retries = retries + 1 where execution_id = ? and status = 'failed'")
      .run(executionId);

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session.sessionId,
      executionId,
      metadata: { event: "RetryStarted" }
    });

    await this.startExecution(executionId);
  }

  async recoverExecution(executionId: string, strategy: "resume" | "rollback" | "skip" | "abort"): Promise<void> {
    const session = await this.getExecution(executionId);
    if (!session) throw new Error(`Execution ${executionId} not found`);

    this.logEvent(executionId, "RecoveryStarted", `Attempting recovery with strategy: ${strategy}`);

    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session.sessionId,
      executionId,
      metadata: { event: "RecoveryStarted", strategy }
    });

    if (strategy === "resume") {
      await this.retryExecution(executionId);
    } else if (strategy === "skip") {
      memory.database.prepare("update execution_tasks set status = 'completed', result = 'Skipped by recovery manager' where execution_id = ? and status = 'failed'")
        .run(executionId);
      await this.startExecution(executionId);
    } else if (strategy === "rollback") {
      // Restore the latest checkpoint
      const checkpoint = memory.database.prepare("select id from execution_checkpoints where execution_id = ? order by timestamp desc limit 1").get(executionId) as any;
      if (checkpoint) {
        await this.restoreCheckpoint(checkpoint.id);
      }
    } else {
      await this.cancelExecution(executionId, true);
    }
  }

  async createCheckpoint(executionId: string, phase: string): Promise<string> {
    const id = `chk-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    const tasks = await this.getTasks(executionId);
    const snapshot = JSON.stringify(tasks);

    memory.database.prepare(`
      insert into execution_checkpoints (id, execution_id, phase, state_snapshot, timestamp)
      values (?, ?, ?, ?, ?)
    `).run(id, executionId, phase, snapshot, timestamp);

    this.logEvent(executionId, "CheckpointCreated", `Checkpoint ${id} created for phase: ${phase}`);

    const session = await this.getExecution(executionId);
    eventBus.publish({
      type: "Custom",
      contextId: "execution",
      sessionId: session ? session.sessionId : "default",
      executionId,
      metadata: { event: "CheckpointCreated", checkpointId: id }
    });

    return id;
  }

  async restoreCheckpoint(checkpointId: string): Promise<void> {
    const row: any = memory.database.prepare("select execution_id, state_snapshot from execution_checkpoints where id = ?").get(checkpointId);
    if (!row) throw new Error(`Checkpoint ${checkpointId} not found`);

    const tasks: ExecutionTask[] = JSON.parse(row.state_snapshot);
    for (const t of tasks) {
      memory.database.prepare("update execution_tasks set status = ?, result = ?, retries = ? where id = ?")
        .run(t.status, t.result || null, t.retries, t.id);
    }

    this.logEvent(row.execution_id, "CheckpointRestored", `Restored execution context state to checkpoint: ${checkpointId}`);
  }

  async getExecution(executionId: string): Promise<ExecutionSession | undefined> {
    const row: any = memory.database.prepare(`
      select id, planner_id as plannerId, prompt_id as promptId, workspace_id as workspaceId, session_id as sessionId, created_time as createdTime, status
      from execution_sessions where id = ?
    `).get(executionId);

    if (!row) return undefined;
    return {
      id: row.id,
      plannerId: row.plannerId,
      promptId: row.promptId,
      workspaceId: row.workspaceId,
      sessionId: row.sessionId,
      createdTime: row.createdTime,
      status: row.status
    };
  }

  async listExecutions(): Promise<ExecutionSession[]> {
    const rows: any[] = memory.database.prepare(`
      select id, planner_id as plannerId, prompt_id as promptId, workspace_id as workspaceId, session_id as sessionId, created_time as createdTime, status
      from execution_sessions order by created_time desc
    `).all();

    return rows.map(r => ({
      id: r.id,
      plannerId: r.plannerId,
      promptId: r.promptId,
      workspaceId: r.workspaceId,
      sessionId: r.sessionId,
      createdTime: r.createdTime,
      status: r.status
    }));
  }

  async getTimeline(executionId: string): Promise<ExecutionEvent[]> {
    const rows: any[] = memory.database.prepare(`
      select id, execution_id as executionId, event_name as eventName, details, timestamp
      from execution_events where execution_id = ? order by id asc
    `).all(executionId);

    return rows.map(r => ({
      id: r.id,
      executionId: r.executionId,
      eventName: r.eventName,
      details: r.details,
      timestamp: r.timestamp
    }));
  }

  async getMetrics(executionId: string): Promise<ExecutionMetrics | undefined> {
    const r: any = memory.database.prepare(`
      select execution_id as executionId, duration, retry_count as retryCount, failure_count as failureCount, recovery_count as recoveryCount, parallel_efficiency as parallelEfficiency, resource_usage as resourceUsage, success_rate as successRate
      from execution_metrics where execution_id = ?
    `).get(executionId);

    if (!r) return undefined;
    return {
      executionId: r.executionId,
      duration: r.duration,
      retryCount: r.retryCount,
      failureCount: r.failureCount,
      recoveryCount: r.recoveryCount,
      parallelEfficiency: r.parallelEfficiency,
      resourceUsage: r.resourceUsage,
      successRate: r.successRate
    };
  }

  // Helper tasks methods
  async addTask(task: Omit<ExecutionTask, "status" | "retries">): Promise<void> {
    memory.database.prepare(`
      insert or replace into execution_tasks (id, execution_id, priority, status, action, timeout, retries, max_retries)
      values (?, ?, ?, 'waiting', ?, ?, 0, ?)
    `).run(task.id, task.executionId, task.priority, task.action, task.timeout, task.maxRetries);
  }

  async getTasks(executionId: string): Promise<ExecutionTask[]> {
    const rows: any[] = memory.database.prepare(`
      select id, execution_id as executionId, priority, status, action, result, duration, timeout, retries, max_retries as maxRetries
      from execution_tasks where execution_id = ?
    `).all(executionId);

    return rows.map(r => ({
      id: r.id,
      executionId: r.executionId,
      priority: r.priority,
      status: r.status,
      action: r.action,
      result: r.result || undefined,
      duration: r.duration || undefined,
      timeout: r.timeout,
      retries: r.retries,
      maxRetries: r.maxRetries
    }));
  }

  async addDependency(taskId: string, dependsOnTaskId: string): Promise<void> {
    memory.database.prepare(`
      insert or replace into execution_dependencies (task_id, depends_on_task_id)
      values (?, ?)
    `).run(taskId, dependsOnTaskId);
  }

  async getDependencies(executionId: string): Promise<ExecutionDependency[]> {
    const rows: any[] = memory.database.prepare(`
      select d.task_id as taskId, d.depends_on_task_id as dependsOnTaskId
      from execution_dependencies d
      join execution_tasks t on d.task_id = t.id
      where t.execution_id = ?
    `).all(executionId);

    return rows.map(r => ({
      taskId: r.taskId,
      dependsOnTaskId: r.dependsOnTaskId
    }));
  }

  private logEvent(executionId: string, eventName: string, details: string): void {
    memory.database.prepare(`
      insert into execution_events (execution_id, event_name, details, timestamp)
      values (?, ?, ?, ?)
    `).run(executionId, eventName, details, Date.now());
  }
}

export const eil = new ExecutionIntelligenceLayer();
