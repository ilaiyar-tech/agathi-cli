import { memory } from "./memory_engine.js";
import { Session, WorkflowState, StateTransition } from "../context/context_types.js";

export class SessionMemory {
  createContext(id: string, ownerId?: string): void {
    memory.database.prepare(`
      insert or ignore into contexts (id, owner_id) values (?, ?)
    `).run(id, ownerId || null);
  }

  createSession(id: string, contextId: string, agentId?: string, metadata: Record<string, any> = {}): Session {
    this.createContext(contextId, agentId);
    
    const session: Session = {
      id,
      contextId,
      agentId,
      currentState: "Task",
      metadata,
      startedAt: Date.now()
    };

    memory.database.prepare(`
      insert or replace into sessions (id, context_id, agent_id, current_state, metadata, started_at)
      values (?, ?, ?, ?, ?, datetime(?, 'unixepoch'))
    `).run(
      session.id,
      session.contextId,
      session.agentId || null,
      session.currentState,
      JSON.stringify(session.metadata),
      Math.floor(session.startedAt / 1000)
    );

    return session;
  }

  getSession(id: string): Session | undefined {
    const row: any = memory.database.prepare(`
      select id, context_id as contextId, agent_id as agentId, current_state as currentState, metadata, started_at as startedAt, ended_at as endedAt
      from sessions where id = ?
    `).get(id);

    if (!row) return undefined;

    return {
      id: row.id,
      contextId: row.contextId,
      agentId: row.agentId || undefined,
      currentState: row.currentState as WorkflowState,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      startedAt: new Date(row.startedAt).getTime(),
      endedAt: row.endedAt ? new Date(row.endedAt).getTime() : undefined
    };
  }

  updateSessionState(id: string, state: WorkflowState): void {
    memory.database.prepare(`
      update sessions set current_state = ? where id = ?
    `).run(state, id);
  }

  logStateTransition(transition: Omit<StateTransition, "timestamp">): void {
    memory.database.prepare(`
      insert into state_history (session_id, execution_id, agent_id, previous_state, current_state, transition_reason)
      values (?, ?, ?, ?, ?, ?)
    `).run(
      transition.sessionId,
      transition.executionId || null,
      transition.agentId || null,
      transition.previousState,
      transition.currentState,
      transition.transitionReason || null
    );
  }

  listSessions(contextId?: string): Session[] {
    const query = contextId
      ? `select id, context_id as contextId, agent_id as agentId, current_state as currentState, metadata, started_at as startedAt, ended_at as endedAt
         from sessions where context_id = ? order by started_at desc`
      : `select id, context_id as contextId, agent_id as agentId, current_state as currentState, metadata, started_at as startedAt, ended_at as endedAt
         from sessions order by started_at desc`;

    const rows: any[] = contextId 
      ? memory.database.prepare(query).all(contextId) 
      : memory.database.prepare(query).all();

    return rows.map(row => ({
      id: row.id,
      contextId: row.contextId,
      agentId: row.agentId || undefined,
      currentState: row.currentState as WorkflowState,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      startedAt: new Date(row.startedAt).getTime(),
      endedAt: row.endedAt ? new Date(row.endedAt).getTime() : undefined
    }));
  }

  getStateHistory(sessionId: string): StateTransition[] {
    const rows: any[] = memory.database.prepare(`
      select id, session_id as sessionId, execution_id as executionId, agent_id as agentId, previous_state as previousState, current_state as currentState, transition_reason as transitionReason, timestamp
      from state_history where session_id = ? order by id asc
    `).all(sessionId);

    return rows.map(row => ({
      id: row.id,
      sessionId: row.sessionId,
      executionId: row.executionId || undefined,
      agentId: row.agentId || undefined,
      previousState: row.previousState as WorkflowState | null,
      currentState: row.currentState as WorkflowState,
      transitionReason: row.transitionReason || undefined,
      timestamp: new Date(row.timestamp).getTime()
    }));
  }

  deleteSession(id: string): void {
    memory.database.prepare(`
      delete from sessions where id = ?
    `).run(id);
  }
}

export const sessionMemory = new SessionMemory();
