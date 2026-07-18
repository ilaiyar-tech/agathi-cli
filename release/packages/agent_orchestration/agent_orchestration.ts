import crypto from "node:crypto";
import { eventBus } from "../context_engine/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { ContextOS } from "../context_engine/index.js";

export interface AgentSession {
  id: string;
  agentId: string;
  workflowId: string;
  workspaceId: string;
  executionId: string;
  owner: string;
  status: "created" | "ready" | "busy" | "waiting" | "paused" | "completed" | "failed" | "retired";
  timestamp: number;
}

export interface AgentInfo {
  id: string;
  name: string;
  type: "system" | "workspace" | "plugin" | "remote";
  status: string;
}

export interface AgentTask {
  id: string;
  sessionId: string;
  agentId: string;
  description: string;
  status: "waiting" | "running" | "completed" | "failed";
}

export interface AgentMessage {
  id: string;
  sessionId: string;
  senderId: string;
  receiverId: string; // empty string for broadcast
  content: string;
  timestamp: number;
}

export interface AgentHealthInfo {
  agentId: string;
  latency: number;
  successRate: number;
  load: number;
  availability: number;
}

export interface AgentEvent {
  id?: number;
  sessionId: string;
  eventName: string;
  details: string;
  timestamp: number;
}

export interface AgentMetrics {
  sessionId: string;
  delegationLatency: number;
  communicationLatency: number;
  collaborationEfficiency: number;
  agentUtilization: number;
  taskCompletionRate: number;
}

export class AgentOrchestrationLayer {
  constructor() {
    try {
      memory.database.exec(`
        create table if not exists agent_sessions (
          id text primary key,
          agent_id text not null,
          workflow_id text not null,
          workspace_id text not null,
          execution_id text not null,
          owner text not null,
          status text not null,
          timestamp integer not null
        );

        create table if not exists agent_registry (
          id text primary key,
          name text not null,
          type text not null,
          status text not null
        );

        create table if not exists agent_capabilities (
          agent_id text not null,
          capability text not null,
          primary key (agent_id, capability),
          foreign key(agent_id) references agent_registry(id) on delete cascade
        );

        create table if not exists agent_tasks (
          id text primary key,
          session_id text not null,
          agent_id text not null,
          description text not null,
          status text not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade,
          foreign key(agent_id) references agent_registry(id) on delete cascade
        );

        create table if not exists agent_messages (
          id text primary key,
          session_id text not null,
          sender_id text not null,
          receiver_id text not null,
          content text not null,
          timestamp integer not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_context (
          session_id text primary key,
          context_payload text not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_memory (
          workspace_id text not null,
          key text not null,
          value text not null,
          primary key (workspace_id, key)
        );

        create table if not exists agent_health (
          agent_id text primary key,
          latency integer not null,
          success_rate real not null,
          load real not null,
          availability integer not null,
          foreign key(agent_id) references agent_registry(id) on delete cascade
        );

        create table if not exists agent_events (
          id integer primary key autoincrement,
          session_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_metrics (
          session_id text primary key,
          delegation_latency integer not null,
          communication_latency integer not null,
          collaboration_efficiency real not null,
          agent_utilization real not null,
          task_completion_rate real not null,
          foreign key(session_id) references agent_sessions(id) on delete cascade
        );

        create table if not exists agent_cache (
          cache_key text primary key,
          value text not null,
          timestamp integer not null
        );
      `);
    } catch (e) {
      console.error("Failed to initialize AOL database tables", e);
    }
  }

  async registerAgent(id: string, name: string, type: "system" | "workspace" | "plugin" | "remote", capabilities: string[]): Promise<void> {
    memory.database.transaction(() => {
      memory.database.prepare(`
        insert or replace into agent_registry (id, name, type, status)
        values (?, ?, ?, 'ready')
      `).run(id, name, type);

      for (const cap of capabilities) {
        memory.database.prepare(`
          insert or replace into agent_capabilities (agent_id, capability)
          values (?, ?)
        `).run(id, cap);
      }

      memory.database.prepare(`
        insert or replace into agent_health (agent_id, latency, success_rate, load, availability)
        values (?, 50, 1.0, 0.0, 1)
      `).run(id);
    })();

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId: id,
      executionId: id,
      metadata: { event: "AgentRegistered", id, name }
    });
  }

  async unregisterAgent(id: string): Promise<void> {
    memory.database.prepare("delete from agent_registry where id = ?").run(id);
  }

  async discoverAgents(capabilities: string[]): Promise<AgentInfo[]> {
    if (capabilities.length === 0) {
      const rows = memory.database.prepare("select id, name, type, status from agent_registry").all() as any[];
      return rows.map(r => ({ id: r.id, name: r.name, type: r.type, status: r.status }));
    }

    const placeholders = capabilities.map(() => "?").join(",");
    const rows = memory.database.prepare(`
      select r.id, r.name, r.type, r.status
      from agent_registry r
      join agent_capabilities c on r.id = c.agent_id
      where c.capability in (${placeholders})
      group by r.id
      having count(distinct c.capability) = ?
    `).all(...capabilities, capabilities.length) as any[];

    const matched = rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as any,
      status: r.status
    }));

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId: "discovery",
      executionId: "discovery",
      metadata: { event: "AgentDiscovered", count: matched.length }
    });

    return matched;
  }

  async selectAgents(taskDescription: string, requiredCapabilities: string[]): Promise<AgentInfo[]> {
    const discovered = await this.discoverAgents(requiredCapabilities);

    const selection: AgentInfo[] = [];
    for (const agent of discovered) {
      const health = memory.database.prepare("select load, availability from agent_health where agent_id = ?").get(agent.id) as any;
      if (health && health.availability === 1 && health.load < 0.8) {
        selection.push(agent);
      }
    }

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId: "selection",
      executionId: "selection",
      metadata: { event: "AgentSelected", selectedCount: selection.length }
    });

    return selection;
  }

  async createAgentSession(agentId: string, workflowId: string, workspaceId: string, executionId: string, owner: string): Promise<string> {
    const id = `asess-${crypto.randomUUID()}`;
    const timestamp = Date.now();

    memory.database.prepare(`
      insert into agent_sessions (id, agent_id, workflow_id, workspace_id, execution_id, owner, status, timestamp)
      values (?, ?, ?, ?, ?, ?, 'created', ?)
    `).run(id, agentId, workflowId, workspaceId, executionId, owner, timestamp);

    this.logEvent(id, "AgentSessionCreated", `Session established for agent: ${agentId}`);

    return id;
  }

  async delegateTask(sessionId: string, agentId: string, description: string): Promise<string> {
    const id = `atask-${crypto.randomUUID()}`;
    
    memory.database.prepare(`
      insert into agent_tasks (id, session_id, agent_id, description, status)
      values (?, ?, ?, ?, 'waiting')
    `).run(id, sessionId, agentId, description);

    this.logEvent(sessionId, "TaskDelegated", `Task delegated to agent ${agentId}: ${description}`);

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId,
      executionId: sessionId,
      metadata: { event: "TaskDelegated", taskId: id, agentId }
    });

    return id;
  }

  async broadcast(sessionId: string, senderId: string, content: string): Promise<void> {
    const id = `amsg-${crypto.randomUUID()}`;
    const timestamp = Date.now();

    memory.database.prepare(`
      insert into agent_messages (id, session_id, sender_id, receiver_id, content, timestamp)
      values (?, ?, ?, '', ?, ?)
    `).run(id, sessionId, senderId, content, timestamp);

    this.logEvent(sessionId, "BroadcastSent", `Broadcast message from sender: ${senderId}`);
  }

  async sendMessage(sessionId: string, senderId: string, receiverId: string, content: string): Promise<void> {
    const id = `amsg-${crypto.randomUUID()}`;
    const timestamp = Date.now();

    memory.database.prepare(`
      insert into agent_messages (id, session_id, sender_id, receiver_id, content, timestamp)
      values (?, ?, ?, ?, ?, ?)
    `).run(id, sessionId, senderId, receiverId, content, timestamp);

    this.logEvent(sessionId, "MessageSent", `Direct message sent from ${senderId} to ${receiverId}`);

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId,
      executionId: sessionId,
      metadata: { event: "MessageSent", senderId, receiverId }
    });
  }

  async shareContext(sessionId: string, contextPayload: Record<string, any>): Promise<void> {
    memory.database.prepare(`
      insert or replace into agent_context (session_id, context_payload)
      values (?, ?)
    `).run(sessionId, JSON.stringify(contextPayload));

    this.logEvent(sessionId, "ContextShared", "Context updated");

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId,
      executionId: sessionId,
      metadata: { event: "ContextShared" }
    });
  }

  async shareMemory(workspaceId: string, key: string, value: string): Promise<void> {
    memory.database.prepare(`
      insert or replace into agent_memory (workspace_id, key, value)
      values (?, ?, ?)
    `).run(workspaceId, key, value);

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId: workspaceId,
      executionId: workspaceId,
      metadata: { event: "MemoryShared", key }
    });
  }

  async getSharedMemory(workspaceId: string, key: string): Promise<string | null> {
    const row: any = memory.database.prepare("select value from agent_memory where workspace_id = ? and key = ?").get(workspaceId, key);
    return row ? row.value : null;
  }

  async synchronize(sessionId: string, barrierName: string): Promise<void> {
    this.logEvent(sessionId, "Synchronized", `Barrier sync reached: ${barrierName}`);
  }

  async negotiate(sessionId: string, proposal: string): Promise<string> {
    this.logEvent(sessionId, "NegotiationStarted", `Negotiating proposal: ${proposal}`);

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId,
      executionId: sessionId,
      metadata: { event: "NegotiationStarted", proposal }
    });

    return `Accepted proposal: ${proposal}`;
  }

  async resolveConflict(sessionId: string, conflictType: string): Promise<string> {
    this.logEvent(sessionId, "ConflictResolved", `Conflict resolved for: ${conflictType}`);

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId,
      executionId: sessionId,
      metadata: { event: "ConflictResolved", conflictType }
    });

    return `Conflict resolved: ${conflictType}`;
  }

  async aggregateResults(sessionId: string, results: string[]): Promise<string> {
    const merged = results.join(" | ");

    this.logEvent(sessionId, "AggregationCompleted", `Merged ${results.length} results`);

    eventBus.publish({
      type: "Custom",
      contextId: "agent",
      sessionId,
      executionId: sessionId,
      metadata: { event: "AggregationCompleted", count: results.length }
    });

    return merged;
  }

  async getAgent(sessionId: string): Promise<AgentSession | undefined> {
    const r: any = memory.database.prepare(`
      select id, agent_id as agentId, workflow_id as workflowId, workspace_id as workspaceId, execution_id as executionId, owner, status, timestamp
      from agent_sessions where id = ?
    `).get(sessionId);

    if (!r) return undefined;
    return {
      id: r.id,
      agentId: r.agentId,
      workflowId: r.workflowId,
      workspaceId: r.workspaceId,
      executionId: r.executionId,
      owner: r.owner,
      status: r.status,
      timestamp: r.timestamp
    };
  }

  async listAgents(): Promise<AgentSession[]> {
    const rows: any[] = memory.database.prepare(`
      select id, agent_id as agentId, workflow_id as workflowId, workspace_id as workspaceId, execution_id as executionId, owner, status, timestamp
      from agent_sessions order by timestamp desc
    `).all();

    return rows.map(r => ({
      id: r.id,
      agentId: r.agentId,
      workflowId: r.workflowId,
      workspaceId: r.workspaceId,
      executionId: r.executionId,
      owner: r.owner,
      status: r.status,
      timestamp: r.timestamp
    }));
  }

  async getTimeline(sessionId: string): Promise<AgentEvent[]> {
    const rows: any[] = memory.database.prepare(`
      select id, session_id as sessionId, event_name as eventName, details, timestamp
      from agent_events where session_id = ? order by id asc
    `).all(sessionId);

    return rows.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      eventName: r.eventName,
      details: r.details,
      timestamp: r.timestamp
    }));
  }

  async getMetrics(sessionId: string): Promise<AgentMetrics | undefined> {
    const r: any = memory.database.prepare(`
      select session_id as sessionId, delegation_latency as delegationLatency, communication_latency as communicationLatency, collaboration_efficiency as collaborationEfficiency, agent_utilization as agentUtilization, task_completion_rate as taskCompletionRate
      from agent_metrics where session_id = ?
    `).get(sessionId);

    if (!r) return undefined;
    return {
      sessionId: r.sessionId,
      delegationLatency: r.delegationLatency,
      communicationLatency: r.communicationLatency,
      collaborationEfficiency: r.collaborationEfficiency,
      agentUtilization: r.agentUtilization,
      taskCompletionRate: r.taskCompletionRate
    };
  }

  async saveMetrics(metrics: AgentMetrics): Promise<void> {
    memory.database.prepare(`
      insert or replace into agent_metrics (session_id, delegation_latency, communication_latency, collaboration_efficiency, agent_utilization, task_completion_rate)
      values (?, ?, ?, ?, ?, ?)
    `).run(metrics.sessionId, metrics.delegationLatency, metrics.communicationLatency, metrics.collaborationEfficiency, metrics.agentUtilization, metrics.taskCompletionRate);
  }

  private logEvent(sessionId: string, eventName: string, details: string): void {
    memory.database.prepare(`
      insert into agent_events (session_id, event_name, details, timestamp)
      values (?, ?, ?, ?)
    `).run(sessionId, eventName, details, Date.now());
  }
}

export const aol = new AgentOrchestrationLayer();
