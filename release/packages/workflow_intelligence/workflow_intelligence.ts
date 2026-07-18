import crypto from "node:crypto";
import { eventBus } from "../context_engine/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { ContextOS } from "../context_engine/index.js";

export interface WorkflowSession {
  id: string;
  workspaceId: string;
  owner: string;
  version: string;
  status: "draft" | "validated" | "running" | "paused" | "waiting_approval" | "completed" | "cancelled" | "failed" | "archived";
  createdTime: number;
  updatedTime: number;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  nodeType: "sequential" | "parallel" | "conditional" | "loop" | "approval";
  action: string;
  status: "waiting" | "running" | "completed" | "failed" | "skipped";
}

export interface WorkflowEdge {
  workflowId: string;
  fromNodeId: string;
  toNodeId: string;
}

export interface WorkflowCheckpoint {
  id: string;
  workflowId: string;
  stateSnapshot: string;
  timestamp: number;
}

export interface WorkflowArtifact {
  id: string;
  workflowId: string;
  path: string;
  type: string;
  summary: string;
}

export interface WorkflowEvent {
  id?: string | number;
  workflowId: string;
  eventName: string;
  details: string;
  timestamp: number;
}

export interface WorkflowMetrics {
  workflowId: string;
  duration: number;
  successRate: number;
  averageCompletionTime: number;
  recoveryCount: number;
  approvalWaitTime: number;
  branchCount: number;
}

export class WorkflowCompiler {
  static compile(definition: {
    nodes: Array<{ id: string; type: string; action: string }>;
    edges: Array<{ from: string; to: string }>;
  }): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const nodes: WorkflowNode[] = definition.nodes.map(n => ({
      id: n.id,
      workflowId: "",
      nodeType: n.type as any,
      action: n.action,
      status: "waiting"
    }));

    const edges: WorkflowEdge[] = definition.edges.map(e => ({
      workflowId: "",
      fromNodeId: e.from,
      toNodeId: e.to
    }));

    return { nodes, edges };
  }
}

export class WorkflowValidator {
  static validate(nodes: WorkflowNode[], edges: WorkflowEdge[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Cycle detection check using Kahn's topological sort
    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};

    for (const n of nodes) {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    }

    for (const edge of edges) {
      if (adj[edge.fromNodeId] === undefined || adj[edge.toNodeId] === undefined) {
        errors.push(`Invalid edge references node not defined: ${edge.fromNodeId} -> ${edge.toNodeId}`);
        continue;
      }
      adj[edge.fromNodeId].push(edge.toNodeId);
      inDegree[edge.toNodeId]++;
    }

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const queue: string[] = [];
    for (const n of nodes) {
      if (inDegree[n.id] === 0) {
        queue.push(n.id);
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

    if (visitedCount !== nodes.length) {
      errors.push("Circular dependencies detected in workflow definition graph!");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export class WorkflowIntelligenceLayer {
  constructor() {
    try {
      memory.database.exec(`
        create table if not exists workflow_sessions (
          id text primary key,
          workspace_id text not null,
          owner text not null,
          version text not null,
          status text not null,
          created_time integer not null,
          updated_time integer not null
        );

        create table if not exists workflow_definitions (
          id text primary key,
          name text not null,
          definition_payload text not null
        );

        create table if not exists workflow_versions (
          id text primary key,
          workflow_id text not null,
          version text not null,
          definition_payload text not null,
          timestamp integer not null,
          foreign key(workflow_id) references workflow_sessions(id) on delete cascade
        );

        create table if not exists workflow_nodes (
          id text not null,
          workflow_id text not null,
          node_type text not null,
          action text not null,
          status text not null,
          primary key (id, workflow_id),
          foreign key(workflow_id) references workflow_sessions(id) on delete cascade
        );

        create table if not exists workflow_edges (
          workflow_id text not null,
          from_node_id text not null,
          to_node_id text not null,
          primary key (workflow_id, from_node_id, to_node_id),
          foreign key(workflow_id) references workflow_sessions(id) on delete cascade
        );

        create table if not exists workflow_checkpoints (
          id text primary key,
          workflow_id text not null,
          state_snapshot text not null,
          timestamp integer not null,
          foreign key(workflow_id) references workflow_sessions(id) on delete cascade
        );

        create table if not exists workflow_artifacts (
          id text primary key,
          workflow_id text not null,
          path text not null,
          type text not null,
          summary text not null,
          foreign key(workflow_id) references workflow_sessions(id) on delete cascade
        );

        create table if not exists workflow_events (
          id text primary key,
          workflow_id text,
          event_type text,
          state text,
          timestamp text,
          details text
        );

        create table if not exists workflow_metrics (
          workflow_id text primary key,
          duration integer not null,
          success_rate real not null,
          average_completion_time integer not null,
          recovery_count integer not null,
          approval_wait_time integer not null,
          branch_count integer not null,
          foreign key(workflow_id) references workflow_sessions(id) on delete cascade
        );

        create table if not exists workflow_cache (
          cache_key text primary key,
          value text not null,
          timestamp integer not null
        );
      `);
    } catch (e) {
      console.error("Failed to initialize WIL database tables", e);
    }
  }

  async createWorkflow(workspaceId: string, owner: string, version: string): Promise<string> {
    const id = `wf-${crypto.randomUUID()}`;
    const timestamp = Date.now();

    memory.database.prepare(`
      insert into workflow_sessions (id, workspace_id, owner, version, status, created_time, updated_time)
      values (?, ?, ?, ?, 'draft', ?, ?)
    `).run(id, workspaceId, owner, version, timestamp, timestamp);

    this.logEvent(id, "WorkflowCreated", `Workflow created for owner: ${owner}`);

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: id,
      executionId: id,
      metadata: { event: "WorkflowCreated", owner, version }
    });

    return id;
  }

  async compileWorkflow(workflowId: string, definition: {
    nodes: Array<{ id: string; type: string; action: string }>;
    edges: Array<{ from: string; to: string }>;
  }): Promise<void> {
    const { nodes, edges } = WorkflowCompiler.compile(definition);

    memory.database.transaction(() => {
      // Save compiled node definitions
      for (const node of nodes) {
        memory.database.prepare(`
          insert or replace into workflow_nodes (id, workflow_id, node_type, action, status)
          values (?, ?, ?, ?, ?)
        `).run(node.id, workflowId, node.nodeType, node.action, node.status);
      }

      // Save compiled edge definitions
      for (const edge of edges) {
        memory.database.prepare(`
          insert or replace into workflow_edges (workflow_id, from_node_id, to_node_id)
          values (?, ?, ?)
        `).run(workflowId, edge.fromNodeId, edge.toNodeId);
      }
    })();

    this.logEvent(workflowId, "WorkflowCompiled", `Compiled definition with ${nodes.length} nodes`);
  }

  async validateWorkflow(workflowId: string): Promise<{ valid: boolean; errors: string[] }> {
    const nodes = await this.getNodes(workflowId);
    const edges = await this.getEdges(workflowId);

    const validation = WorkflowValidator.validate(nodes, edges);

    if (validation.valid) {
      memory.database.prepare("update workflow_sessions set status = 'validated' where id = ?").run(workflowId);
      this.logEvent(workflowId, "WorkflowValidated", "Validation checks passed cleanly");
    } else {
      this.logEvent(workflowId, "WorkflowValidationFailed", `Validation failed: ${validation.errors.join(", ")}`);
    }

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowValidated", valid: validation.valid }
    });

    return validation;
  }

  async startWorkflow(workflowId: string): Promise<void> {
    const session = await this.getWorkflow(workflowId);
    if (!session) throw new Error(`Workflow ${workflowId} not found`);

    memory.database.prepare("update workflow_sessions set status = 'running', updated_time = ? where id = ?")
      .run(Date.now(), workflowId);

    this.logEvent(workflowId, "WorkflowStarted", "Execution thread started");

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowStarted" }
    });

    // Run scheduler thread
    const start = Date.now();
    try {
      await this.runScheduler(workflowId);
      
      const nodes = await this.getNodes(workflowId);
      const isFailed = nodes.some(n => n.status === "failed");
      const isWaitingApproval = nodes.some(n => n.status === "running" && n.nodeType === "approval");
      
      let finalStatus: typeof session.status = "completed";
      if (isFailed) {
        finalStatus = "failed";
      } else if (isWaitingApproval) {
        finalStatus = "waiting_approval";
      }

      memory.database.prepare("update workflow_sessions set status = ?, updated_time = ? where id = ?")
        .run(finalStatus, Date.now(), workflowId);

      this.logEvent(workflowId, finalStatus === "completed" ? "WorkflowCompleted" : finalStatus === "failed" ? "WorkflowFailed" : "WorkflowPaused", "Completed execution schedule");

      // Save metrics
      memory.database.prepare(`
        insert or replace into workflow_metrics (workflow_id, duration, success_rate, average_completion_time, recovery_count, approval_wait_time, branch_count)
        values (?, ?, ?, ?, 0, 0, 1)
      `).run(workflowId, Date.now() - start, isFailed ? 0.0 : 1.0, Date.now() - start);

      eventBus.publish({
        type: "Custom",
        contextId: "workflow",
        sessionId: workflowId,
        executionId: workflowId,
        metadata: { event: finalStatus === "completed" ? "WorkflowCompleted" : finalStatus === "failed" ? "WorkflowFailed" : "WorkflowPaused" }
      });
    } catch (e: any) {
      memory.database.prepare("update workflow_sessions set status = 'failed', updated_time = ? where id = ?")
        .run(Date.now(), workflowId);
      this.logEvent(workflowId, "WorkflowFailed", e.message);

      eventBus.publish({
        type: "Custom",
        contextId: "workflow",
        sessionId: workflowId,
        executionId: workflowId,
        metadata: { event: "WorkflowFailed", error: e.message }
      });
    }
  }

  async pauseWorkflow(workflowId: string): Promise<void> {
    memory.database.prepare("update workflow_sessions set status = 'paused', updated_time = ? where id = ?")
      .run(Date.now(), workflowId);
    this.logEvent(workflowId, "WorkflowPaused", "Scheduler execution halted");

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowPaused" }
    });
  }

  async resumeWorkflow(workflowId: string): Promise<void> {
    memory.database.prepare("update workflow_sessions set status = 'running', updated_time = ? where id = ?")
      .run(Date.now(), workflowId);
    this.logEvent(workflowId, "WorkflowResumed", "Scheduler execution resumed");

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowResumed" }
    });

    await this.startWorkflow(workflowId);
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    memory.database.prepare("update workflow_sessions set status = 'cancelled', updated_time = ? where id = ?")
      .run(Date.now(), workflowId);
    this.logEvent(workflowId, "WorkflowCancelled", "Execution thread cancelled");

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowCancelled" }
    });
  }

  async restartWorkflow(workflowId: string): Promise<void> {
    this.logEvent(workflowId, "WorkflowRestarted", "Resetting nodes status and restarting");

    // Reset status of all nodes to waiting
    memory.database.prepare("update workflow_nodes set status = 'waiting' where workflow_id = ?")
      .run(workflowId);

    await this.startWorkflow(workflowId);
  }

  async branchWorkflow(workflowId: string, branchName: string): Promise<string> {
    const branchId = `wf-branch-${crypto.randomUUID()}`;
    const timestamp = Date.now();

    // Create session for branch
    memory.database.prepare(`
      insert into workflow_sessions (id, workspace_id, owner, version, status, created_time, updated_time)
      values (?, 'workspace-branch', ?, 'branch', 'draft', ?, ?)
    `).run(branchId, branchName, timestamp, timestamp);

    this.logEvent(workflowId, "WorkflowBranchCreated", `Branch ${branchName} instantiated with ID: ${branchId}`);

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowBranchCreated", branchId, branchName }
    });

    return branchId;
  }

  async mergeWorkflow(workflowId: string, branchId: string): Promise<void> {
    this.logEvent(workflowId, "WorkflowMerged", `Merging changes from branch ID: ${branchId}`);

    // Merge node statuses or attributes back to main branch
    const branchNodes = await this.getNodes(branchId);
    memory.database.transaction(() => {
      for (const node of branchNodes) {
        memory.database.prepare(`
          insert or replace into workflow_nodes (id, workflow_id, node_type, action, status)
          values (?, ?, ?, ?, ?)
        `).run(node.id, workflowId, node.nodeType, node.action, node.status);
      }
    })();

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowMerged", branchId }
    });
  }

  async approveWorkflow(workflowId: string, approvalNodeId: string): Promise<void> {
    memory.database.prepare("update workflow_nodes set status = 'completed' where id = ? and workflow_id = ?")
      .run(approvalNodeId, workflowId);

    this.logEvent(workflowId, "WorkflowApproved", `Approval node ${approvalNodeId} approved`);

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowApproved", nodeId: approvalNodeId }
    });

    // Automatically resume workflow execution loop
    await this.resumeWorkflow(workflowId);
  }

  async rejectWorkflow(workflowId: string, approvalNodeId: string): Promise<void> {
    memory.database.prepare("update workflow_nodes set status = 'failed' where id = ? and workflow_id = ?")
      .run(approvalNodeId, workflowId);

    this.logEvent(workflowId, "WorkflowRejected", `Approval node ${approvalNodeId} rejected`);

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowRejected", nodeId: approvalNodeId }
    });

    await this.pauseWorkflow(workflowId);
  }

  async createCheckpoint(workflowId: string): Promise<string> {
    const id = `wf-chk-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    const nodes = await this.getNodes(workflowId);
    const snapshot = JSON.stringify(nodes);

    memory.database.prepare(`
      insert into workflow_checkpoints (id, workflow_id, state_snapshot, timestamp)
      values (?, ?, ?, ?)
    `).run(id, workflowId, snapshot, timestamp);

    this.logEvent(workflowId, "WorkflowCheckpointCreated", `Checkpoint ${id} created`);

    eventBus.publish({
      type: "Custom",
      contextId: "workflow",
      sessionId: workflowId,
      executionId: workflowId,
      metadata: { event: "WorkflowCheckpointCreated", checkpointId: id }
    });

    return id;
  }

  async restoreCheckpoint(checkpointId: string): Promise<void> {
    const row: any = memory.database.prepare("select workflow_id, state_snapshot from workflow_checkpoints where id = ?").get(checkpointId);
    if (!row) throw new Error(`Checkpoint ${checkpointId} not found`);

    const nodes: WorkflowNode[] = JSON.parse(row.state_snapshot);
    memory.database.transaction(() => {
      for (const node of nodes) {
        memory.database.prepare("update workflow_nodes set status = ? where id = ? and workflow_id = ?")
          .run(node.status, node.id, row.workflow_id);
      }
    })();

    this.logEvent(row.workflow_id, "WorkflowCheckpointRestored", `Restored state to checkpoint: ${checkpointId}`);
  }

  async getWorkflow(workflowId: string): Promise<WorkflowSession | undefined> {
    const r: any = memory.database.prepare(`
      select id, workspace_id as workspaceId, owner, version, status, created_time as createdTime, updated_time as updatedTime
      from workflow_sessions where id = ?
    `).get(workflowId);

    if (!r) return undefined;
    return {
      id: r.id,
      workspaceId: r.workspaceId,
      owner: r.owner,
      version: r.version,
      status: r.status,
      createdTime: r.createdTime,
      updatedTime: r.updatedTime
    };
  }

  async listWorkflows(): Promise<WorkflowSession[]> {
    const rows: any[] = memory.database.prepare(`
      select id, workspace_id as workspaceId, owner, version, status, created_time as createdTime, updated_time as updatedTime
      from workflow_sessions order by created_time desc
    `).all();

    return rows.map(r => ({
      id: r.id,
      workspaceId: r.workspaceId,
      owner: r.owner,
      version: r.version,
      status: r.status,
      createdTime: r.createdTime,
      updatedTime: r.updatedTime
    }));
  }

  async getTimeline(workflowId: string): Promise<WorkflowEvent[]> {
    const rows: any[] = memory.database.prepare(`
      select id, workflow_id as workflowId, event_type as eventName, details, timestamp
      from workflow_events where workflow_id = ? order by timestamp asc
    `).all(workflowId);

    return rows.map(r => ({
      id: r.id,
      workflowId: r.workflowId,
      eventName: r.eventName,
      details: r.details,
      timestamp: Number(r.timestamp)
    }));
  }

  async getMetrics(workflowId: string): Promise<WorkflowMetrics | undefined> {
    const r: any = memory.database.prepare(`
      select workflow_id as workflowId, duration, success_rate as successRate, average_completion_time as averageCompletionTime, recovery_count as recoveryCount, approval_wait_time as approvalWaitTime, branch_count as branchCount
      from workflow_metrics where workflow_id = ?
    `).get(workflowId);

    if (!r) return undefined;
    return {
      workflowId: r.workflowId,
      duration: r.duration,
      successRate: r.successRate,
      averageCompletionTime: r.averageCompletionTime,
      recoveryCount: r.recoveryCount,
      approvalWaitTime: r.approvalWaitTime,
      branchCount: r.branchCount
    };
  }

  // Helper nodes/edges methods
  async getNodes(workflowId: string): Promise<WorkflowNode[]> {
    const rows: any[] = memory.database.prepare(`
      select id, workflow_id as workflowId, node_type as nodeType, action, status
      from workflow_nodes where workflow_id = ?
    `).all(workflowId);

    return rows.map(r => ({
      id: r.id,
      workflowId: r.workflowId,
      nodeType: r.nodeType,
      action: r.action,
      status: r.status
    }));
  }

  async getEdges(workflowId: string): Promise<WorkflowEdge[]> {
    const rows: any[] = memory.database.prepare(`
      select workflow_id as workflowId, from_node_id as fromNodeId, to_node_id as toNodeId
      from workflow_edges where workflow_id = ?
    `).all(workflowId);

    return rows.map(r => ({
      workflowId: r.workflowId,
      fromNodeId: r.fromNodeId,
      toNodeId: r.toNodeId
    }));
  }

  private async runScheduler(workflowId: string): Promise<void> {
    const nodes = await this.getNodes(workflowId);
    const edges = await this.getEdges(workflowId);

    const inDegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};

    for (const n of nodes) {
      inDegree[n.id] = 0;
      adj[n.id] = [];
    }

    for (const edge of edges) {
      adj[edge.fromNodeId].push(edge.toNodeId);
      inDegree[edge.toNodeId]++;
    }

    // Account for completed nodes
    for (const n of nodes) {
      if (n.status === "completed" || n.status === "skipped") {
        for (const childId of adj[n.id] || []) {
          inDegree[childId]--;
        }
      }
    }

    const runnable: string[] = [];
    const completed = new Set<string>();
    const failed = new Set<string>();

    const updateRunnableQueue = () => {
      for (const n of nodes) {
        if (n.status === "waiting" && inDegree[n.id] === 0 && !runnable.includes(n.id)) {
          runnable.push(n.id);
        }
      }
    };

    updateRunnableQueue();

    const nodeStatusUpdates: Array<{ id: string; status: string }> = [];
    const eventLogs: Array<{ name: string; details: string }> = [];

    while (completed.size + failed.size < nodes.length) {
      const activeSession = memory.database.prepare("select status from workflow_sessions where id = ?").get(workflowId) as any;
      if (!activeSession || activeSession.status === "paused" || activeSession.status === "cancelled" || activeSession.status === "waiting_approval") {
        break;
      }

      if (runnable.length === 0 && completed.size + failed.size < nodes.length) {
        // Check if there is any running node, or we are waiting for human approval
        const hasApprovalNodeWaiting = nodes.some(n => n.status === "running" && n.nodeType === "approval");
        if (hasApprovalNodeWaiting) {
          memory.database.prepare("update workflow_sessions set status = 'waiting_approval' where id = ?").run(workflowId);
          eventBus.publish({
            type: "Custom",
            contextId: "workflow",
            sessionId: workflowId,
            executionId: workflowId,
            metadata: { event: "WorkflowApprovalRequested" }
          });
        }
        break;
      }

      const nodeId = runnable.shift()!;
      const node = nodes.find(n => n.id === nodeId)!;

      node.status = "running";
      nodeStatusUpdates.push({ id: nodeId, status: "running" });
      eventLogs.push({ name: "WorkflowNodeStarted", details: `Node ${nodeId} processing` });

      if (node.nodeType === "approval") {
        break;
      }

      // Simulate execution
      if (node.action.includes("fail")) {
        node.status = "failed";
        nodeStatusUpdates.push({ id: nodeId, status: "failed" });
        failed.add(nodeId);
        eventLogs.push({ name: "WorkflowNodeFailed", details: `Node ${nodeId} execution failed` });
      } else {
        node.status = "completed";
        nodeStatusUpdates.push({ id: nodeId, status: "completed" });
        completed.add(nodeId);
        eventLogs.push({ name: "WorkflowNodeCompleted", details: `Node ${nodeId} completed successfully` });

        for (const childId of adj[nodeId] || []) {
          inDegree[childId]--;
        }
      }

      updateRunnableQueue();
    }

    // Perform database updates inside a transaction
    memory.database.transaction(() => {
      for (const update of nodeStatusUpdates) {
        memory.database.prepare("update workflow_nodes set status = ? where id = ? and workflow_id = ?")
          .run(update.status, update.id, workflowId);
      }
      for (const log of eventLogs) {
        const id = `wfev-${crypto.randomUUID()}`;
        memory.database.prepare(`
          insert into workflow_events (id, workflow_id, event_type, state, timestamp, details)
          values (?, ?, ?, ?, ?, ?)
        `).run(id, workflowId, log.name, "running", Date.now().toString(), log.details);
      }
    })();
  }

  private logEvent(workflowId: string, eventName: string, details: string): void {
    const id = `wfev-${crypto.randomUUID()}`;
    memory.database.prepare(`
      insert into workflow_events (id, workflow_id, event_type, state, timestamp, details)
      values (?, ?, ?, ?, ?, ?)
    `).run(id, workflowId, eventName, "running", Date.now().toString(), details);
  }
}

export const wil = new WorkflowIntelligenceLayer();
