// Intelligent Execution Planner – replaces the legacy procedural planner.
// This file introduces a richer TaskGraph, heuristic metadata, and telemetry emission.
// It is deliberately separate from the original `execution_planner.ts` to preserve
// backward compatibility while providing the new intelligent capabilities.

import { CoreEventBus, RuntimeEvent } from "../core/event_bus.js";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type TaskAction = "investigate" | "execute" | "verify" | "summarize";

export interface TaskNode {
  id: string;
  description: string;
  status: TaskStatus;
  dependsOn: string[];
  actionType: TaskAction;
  // Heuristic metadata for intelligent execution
  estimatedDurationMs?: number; // Approximate runtime in ms
  confidence?: number; // 0‑1 confidence that the task will succeed
  retries?: number; // Number of attempts already made
  maxRetries?: number; // Upper bound for retries
  timeoutMs?: number; // Hard timeout for the task
  metadata?: Record<string, any>;
}

export interface TaskGraph {
  goalId: string;
  nodes: Map<string, TaskNode>;
}

/** GoalAnalyzer – extracts a coarse sequence of actions from a textual goal. */
export class GoalAnalyzer {
  analyze(goal: string): { actionTypes: TaskAction[]; targets: string[] } {
    const actionTypes: TaskAction[] = ["investigate"];
    const targets: string[] = [];
    const lower = goal.toLowerCase();
    if (lower.includes("build") || lower.includes("create") || lower.includes("write") || lower.includes("make")) {
      actionTypes.push("execute");
    }
    if (lower.includes("verify") || lower.includes("test") || lower.includes("lint") || lower.includes("check")) {
      actionTypes.push("verify");
    }
    actionTypes.push("summarize");
    const pathRegex = /[a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+/g;
    let match: RegExpExecArray | null;
    while ((match = pathRegex.exec(goal)) !== null) {
      targets.push(match[0]);
    }
    return { actionTypes, targets };
  }
}

/** DependencyResolver – topological sort using Kahn's algorithm. */
export class DependencyResolver {
  resolve(graph: TaskGraph): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    const allIds = Array.from(graph.nodes.keys());
    for (const id of allIds) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }
    for (const [id, node] of graph.nodes.entries()) {
      for (const dep of node.dependsOn) {
        if (!graph.nodes.has(dep)) {
          throw new Error(`DependencyResolver: Task '${id}' depends on missing task '${dep}'`);
        }
        adjList.get(dep)!.push(id);
        inDegree.set(id, inDegree.get(id)! + 1);
      }
    }
    const queue: string[] = [];
    for (const id of allIds) {
      if (inDegree.get(id) === 0) queue.push(id);
    }
    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);
      const neighbors = adjList.get(u) || [];
      for (const v of neighbors) {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) queue.push(v);
      }
    }
    if (order.length !== allIds.length) {
      throw new Error("DependencyResolver: Cycle detected in task graph. Deadlock prevented.");
    }
    return order;
  }
}

/** ExecutionQueue – maintains ordering; actual execution is delegated to ExecutionManager. */
export class ExecutionQueue {
  private queue: TaskNode[] = [];
  private order: string[] = [];
  private currentIndex = 0;

  constructor(private graph: TaskGraph, order: string[]) {
    this.order = order;
    this.queue = order.map(id => graph.nodes.get(id)!);
  }

  /** Returns the next runnable task respecting dependencies, or null. */
  getNextRunnableTask(): TaskNode | null {
    if (this.currentIndex >= this.queue.length) return null;
    const next = this.queue[this.currentIndex];
    const depsMet = next.dependsOn.every(depId => {
      const dep = this.graph.nodes.get(depId);
      return dep?.status === "completed";
    });
    return depsMet && next.status === "pending" ? next : null;
  }

  startTask(id: string): void {
    const node = this.graph.nodes.get(id);
    if (node) node.status = "running";
  }

  completeTask(id: string): void {
    const node = this.graph.nodes.get(id);
    if (node) {
      node.status = "completed";
      this.currentIndex++;
    }
  }

  failTask(id: string): void {
    const node = this.graph.nodes.get(id);
    if (node) node.status = "failed";
  }

  skipTask(id: string): void {
    const node = this.graph.nodes.get(id);
    if (node) {
      node.status = "skipped";
      this.currentIndex++;
    }
  }

  isFinished(): boolean {
    return this.queue.every(n => n.status === "completed" || n.status === "failed" || n.status === "skipped");
  }
}

/** ExecutionPlanner – builds the TaskGraph, enriches nodes with heuristic metadata, and publishes telemetry. */
export class ExecutionPlanner {
  private analyzer = new GoalAnalyzer();
  private resolver = new DependencyResolver();
  private eventBus: CoreEventBus = (globalThis as any).eventBus || new CoreEventBus();

  plan(goalId: string, goal: string): { graph: TaskGraph; queue: ExecutionQueue } {
    const analysis = this.analyzer.analyze(goal);
    const nodes = new Map<string, TaskNode>();
    let prevId: string | null = null;
    for (const action of analysis.actionTypes) {
      const id = `${action}_task`;
      const dependsOn = prevId ? [prevId] : [];
      const estimatedDurationMs = 1000 + Math.random() * 2000; // 1‑3 s heuristic
      const confidence = 0.85 + Math.random() * 0.1; // 0.85‑0.95 heuristic
      nodes.set(id, {
        id,
        description: `Perform ${action} action on targets: ${analysis.targets.join(", ") || "all"}`,
        status: "pending",
        dependsOn,
        actionType: action,
        metadata: { targets: analysis.targets },
        estimatedDurationMs,
        confidence,
        retries: 0,
        maxRetries: 2,
        timeoutMs: 8000
      });
      prevId = id;
    }
    const graph: TaskGraph = { goalId, nodes };
    const order = this.resolver.resolve(graph);
    const queue = new ExecutionQueue(graph, order);
    // Emit telemetry for graph creation
    const telemetry: RuntimeEvent = {
      type: "TaskGraphCreated",
      timestamp: new Date().toISOString(),
      payload: { goalId, nodeCount: nodes.size, order }
    };
    this.eventBus.publish(telemetry);
    return { graph, queue };
  }
}

export const intelligentPlanner = new ExecutionPlanner();
