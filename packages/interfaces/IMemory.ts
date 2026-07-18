export interface IMemory {
  /** Add a memory entry */
  add(sessionId: string, role: string, content: string): void;
  /** Retrieve recent memory for a session */
  history(sessionId: string, limit?: number): any[];
  /** Clear memory for a session */
  clear(sessionId: string): void;
  /** List all sessions with metadata */
  sessions(): any[];
}
