import crypto from "node:crypto";
import { memory } from "../memory/index.js";
import { context } from "../context_engine/index.js";

export interface Session {
  id: string;
  created_at: number;
  metadata: Record<string, any>;
}

export class session_manager {
  private sessions = new Map<string, Session>();

  create_session(metadata: Record<string, any> = {}): Session {
    const session: Session = {
      id: crypto.randomUUID(),
      created_at: Date.now(),
      metadata
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get_session(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  list_sessions(): Session[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.created_at - a.created_at);
  }

  delete_session(id: string): boolean {
    memory.clear(id);
    return this.sessions.delete(id);
  }

  update_metadata(id: string, metadata: Record<string, any>): Session {
    const session = this.get_session(id);
    if (!session) {
      throw new Error(`Session ${id} not found`);
    }
    session.metadata = { ...session.metadata, ...metadata };
    return session;
  }
}

export const sessions = new session_manager();
