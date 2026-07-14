import { ContextOS } from "../context_engine/index.js";
import { Session } from "../context/context_types.js";

export class session_manager {
  create_session(metadata: Record<string, any> = {}): Session {
    const id = `sess-${Math.random().toString(36).substr(2, 9)}`;
    const contextId = `ctx-${id}`;
    return ContextOS.sessions.createSession(id, contextId, undefined, metadata);
  }

  get_session(id: string): Session | undefined {
    return ContextOS.sessions.getSession(id);
  }

  list_sessions(): Session[] {
    return ContextOS.sessions.listSessions();
  }

  delete_session(id: string): boolean {
    try {
      ContextOS.sessions.deleteSession(id);
      return true;
    } catch (e) {
      return false;
    }
  }

  update_metadata(id: string, metadata: Record<string, any>): Session {
    const session = this.get_session(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    const updatedMeta = { ...session.metadata, ...metadata };
    return ContextOS.sessions.createSession(id, session.contextId, session.agentId, updatedMeta);
  }
}

export const sessions = new session_manager();
