export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type TaskAction = "investigate" | "execute" | "verify" | "summarize";

export interface TaskNode {
  id: string;
  description: string;
  status: TaskStatus;
  dependsOn: string[];
  actionType: TaskAction;
  metadata?: Record<string, any>;
}

export interface TaskGraph {
  goalId: string;
  nodes: Map<string, TaskNode>;
}

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

    // Match file paths (e.g. src/index.ts or packages/...)
    const pathRegex = /[a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+/g;
    let match;
    while ((match = pathRegex.exec(goal)) !== null) {
      targets.push(match[0]);
    }

    return { actionTypes, targets };
  }
}

export class DependencyResolver {
  resolve(graph: TaskGraph): string[] {
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    const allIds = Array.from(graph.nodes.keys());

    // Initialize map structures
    for (const id of allIds) {
      inDegree.set(id, 0);
      adjList.set(id, []);
    }

    // Build dependency edges
    for (const [id, node] of graph.nodes.entries()) {
      for (const dep of node.dependsOn) {
        if (!graph.nodes.has(dep)) {
          throw new Error(`DependencyResolver: Task '${id}' depends on missing task '${dep}'`);
        }
        // dep must execute before id, so dep -> id
        adjList.get(dep)!.push(id);
        inDegree.set(id, inDegree.get(id)! + 1);
      }
    }

    // Kahn's algorithm for topological sorting
    const queue: string[] = [];
    for (const id of allIds) {
      if (inDegree.get(id) === 0) {
        queue.push(id);
      }
    }

    const order: string[] = [];
    while (queue.length > 0) {
      const u = queue.shift()!;
      order.push(u);

      const neighbors = adjList.get(u) || [];
      for (const v of neighbors) {
        inDegree.set(v, inDegree.get(v)! - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      }
    }

    if (order.length !== allIds.length) {
      throw new Error("DependencyResolver: Cycle detected in task graph. Deadlock prevented.");
    }

    return order;
  }
}

export class ExecutionQueue {
  private queue: TaskNode[] = [];
  private order: string[] = [];
  private currentIndex: number = 0;

  constructor(private graph: TaskGraph, order: string[]) {
    this.order = order;
    this.queue = order.map(id => graph.nodes.get(id)!);
  }

  getNextRunnableTask(): TaskNode | null {
    if (this.currentIndex >= this.queue.length) return null;
    
    const next = this.queue[this.currentIndex];
    // Verify dependencies are completed
    const dependenciesMet = next.dependsOn.every(depId => {
      const depNode = this.graph.nodes.get(depId);
      return depNode && depNode.status === "completed";
    });

    if (dependenciesMet && next.status === "pending") {
      return next;
    }
    
    return null;
  }

  startTask(id: string): void {
    const node = this.graph.nodes.get(id);
    if (node) {
      node.status = "running";
    }
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
    if (node) {
      node.status = "failed";
    }
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

export class ExecutionPlanner {
  private analyzer = new GoalAnalyzer();
  private resolver = new DependencyResolver();

  plan(goalId: string, goal: string): { graph: TaskGraph; queue: ExecutionQueue } {
    const analysis = this.analyzer.analyze(goal);
    const nodes = new Map<string, TaskNode>();

    // Sequential blueprint parsing (Investigate -> Execute -> Verify -> Summarize)
    let previousId: string | null = null;
    for (const action of analysis.actionTypes) {
      const id = `${action}_task`;
      const dependsOn = previousId ? [previousId] : [];
      nodes.set(id, {
        id,
        description: `Perform ${action} action on targets: ${analysis.targets.join(", ") || "all"}`,
        status: "pending",
        dependsOn,
        actionType: action,
        metadata: { targets: analysis.targets }
      });
      previousId = id;
    }

    const graph: TaskGraph = { goalId, nodes };
    const order = this.resolver.resolve(graph);
    const queue = new ExecutionQueue(graph, order);

    return { graph, queue };
  }
}

export const planner = new ExecutionPlanner();
