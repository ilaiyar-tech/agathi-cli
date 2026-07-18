import { eventBus } from "../core/event_bus.js";
import { logger } from "../logger/index.js";

export type ExecutionState =
  | "Pending"
  | "Planning"
  | "Executing"
  | "Verifying"
  | "Completed"
  | "Failed"
  | "Cancelled";

export interface ExecutionSession {
  id: string;
  state: ExecutionState;
  startTime: number;
  endTime?: number;
  toolsExecuted: string[];
  retries: number;
  timeouts: number;
}

export class ExecutionManager {
  private static sessions = new Map<string, ExecutionSession>();

  static startSession(id: string): ExecutionSession {
    const session: ExecutionSession = {
      id,
      state: "Pending",
      startTime: Date.now(),
      toolsExecuted: [],
      retries: 0,
      timeouts: 0
    };
    this.sessions.set(id, session);
    this.transition(id, "Pending");
    return session;
  }

  static getSession(id: string): ExecutionSession | undefined {
    return this.sessions.get(id);
  }

  static transition(id: string, state: ExecutionState) {
    const session = this.sessions.get(id);
    if (session) {
      session.state = state;
      if (state === "Completed" || state === "Failed" || state === "Cancelled") {
        session.endTime = Date.now();
      }
      logger.info({ sessionId: id, state }, `Execution session transitioned to ${state}`);
      eventBus.emitEvent("STATUS_UPDATE", { session });
    }
  }

  static recordTool(id: string, toolName: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.toolsExecuted.push(toolName);
    }
  }

  static recordRetry(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.retries++;
    }
  }

  static recordTimeout(id: string) {
    const session = this.sessions.get(id);
    if (session) {
      session.timeouts++;
    }
  }
}
export const executionManager = ExecutionManager;
