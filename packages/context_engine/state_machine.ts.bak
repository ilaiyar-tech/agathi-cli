import crypto from "node:crypto";
import { WorkflowState } from "../context/context_types.js";
import { sessionMemory } from "../memory/session_memory.js";
import { eventBus, EventMetadata } from "./event_bus.js";

export class TransitionError extends Error {
  constructor(public from: WorkflowState, public to: WorkflowState, message: string) {
    super(`TransitionError: Cannot transition from ${from} to ${to}. Reason: ${message}`);
    this.name = "TransitionError";
  }
}

export class ExecutionStateMachine {
  private contextId!: string;
  private sessionId!: string;
  private executionId!: string;
  private previousState: WorkflowState | null = null;
  private currentState: WorkflowState = "ContextCreated";
  private isPaused: boolean = false;

  private validTransitions: Record<WorkflowState, Set<WorkflowState>> = {
    ContextCreated: new Set(["SessionStarted", "Cancelled", "Failed"]),
    SessionStarted: new Set(["Task", "Cancelled", "Failed"]),
    Task: new Set(["Investigation", "Planning", "Execution", "Cancelled", "Failed"]),
    Investigation: new Set(["Planning", "Execution", "Verification", "Summary", "Cancelled", "Failed"]),
    Planning: new Set(["Execution", "Cancelled", "Failed"]),
    Execution: new Set(["ToolExecution", "Verification", "Summary", "Failed", "Cancelled"]),
    ToolExecution: new Set(["Execution", "Verification", "Failed", "Cancelled"]),
    Verification: new Set(["Summary", "Failed", "Execution", "Cancelled"]),
    Summary: new Set(["Completed", "Failed", "Cancelled"]),
    Completed: new Set([]), // Terminal
    Cancelled: new Set([]), // Terminal
    Failed: new Set(["Recovered", "Cancelled"]), // Failed can go to Recovered or Cancelled
    Recovered: new Set(["Investigation", "Planning", "Execution", "Verification", "Summary", "Cancelled", "Failed"])
  };

  startExecution(contextId: string, sessionId: string, executionId: string): void {
    this.contextId = contextId;
    this.sessionId = sessionId;
    this.executionId = executionId;
    this.currentState = "ContextCreated";
    this.previousState = null;
    this.isPaused = false;

    // Register Context and Session
    sessionMemory.createContext(contextId);
    sessionMemory.createSession(sessionId, contextId);

    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "ExecutionStarted",
      metadata,
      payload: {}
    });

    this.transition("SessionStarted", "Starting session lifecycle");
    this.transition("Task", "Assigning initial execution task");
  }

  canTransition(from: WorkflowState, to: WorkflowState): boolean {
    // Standard validation: terminal states have no outgoing transitions, unless special rollback
    const allowed = this.validTransitions[from];
    return allowed ? allowed.has(to) : false;
  }

  transition(nextState: WorkflowState, reason?: string): void {
    if (this.isPaused) {
      throw new Error(`StateMachine: Cannot transition while execution is paused.`);
    }

    if (!this.canTransition(this.currentState, nextState)) {
      throw new TransitionError(this.currentState, nextState, "Invalid transition path defined in state machine rules.");
    }

    const fromState = this.currentState;
    this.previousState = fromState;
    this.currentState = nextState;

    // Update active database session status
    sessionMemory.updateSessionState(this.sessionId, nextState);
    sessionMemory.logStateTransition({
      sessionId: this.sessionId,
      executionId: this.executionId,
      previousState: fromState,
      currentState: nextState,
      transitionReason: reason
    });

    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "StateChanged",
      metadata,
      payload: { from: fromState, to: nextState, reason }
    });
  }

  getCurrentState(): WorkflowState {
    return this.currentState;
  }

  getPreviousState(): WorkflowState | null {
    return this.previousState;
  }

  getHistory(): any[] {
    return sessionMemory.getStateHistory(this.sessionId);
  }

  rollback(): void {
    if (!this.previousState) {
      throw new Error("StateMachine: No previous state to rollback to.");
    }
    const target = this.previousState;
    this.currentState = target;
    sessionMemory.updateSessionState(this.sessionId, target);
    sessionMemory.logStateTransition({
      sessionId: this.sessionId,
      executionId: this.executionId,
      previousState: this.currentState,
      currentState: target,
      transitionReason: "Manual rollback triggered"
    });
  }

  recover(targetState: WorkflowState, reason: string): void {
    if (this.currentState !== "Failed") {
      throw new Error(`StateMachine: Recovery can only be triggered from 'Failed' state.`);
    }

    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "RecoveryStarted",
      metadata,
      payload: { issue: reason }
    });

    // Manually push transition to Recovered
    this.currentState = "Recovered";
    sessionMemory.updateSessionState(this.sessionId, "Recovered");
    sessionMemory.logStateTransition({
      sessionId: this.sessionId,
      executionId: this.executionId,
      previousState: "Failed",
      currentState: "Recovered",
      transitionReason: `Recovery active: ${reason}`
    });

    // Then transition from Recovered to the target state
    this.transition(targetState, `Recovery completed. Re-entering pipeline.`);

    eventBus.publish({
      type: "RecoveryCompleted",
      metadata,
      payload: { recoveredState: targetState }
    });
  }

  cancel(reason?: string): void {
    this.transition("Cancelled", reason || "Execution cancelled by operator");
    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "ExecutionCancelled",
      metadata,
      payload: { reason }
    });
  }

  complete(): void {
    this.transition("Completed", "Task execution finished successfully");
    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "ExecutionCompleted",
      metadata,
      payload: { success: true }
    });
  }

  fail(error: string): void {
    this.transition("Failed", `Task execution encountered fatal failure: ${error}`);
    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "ExecutionFailed",
      metadata,
      payload: { error }
    });
  }

  pause(): void {
    this.isPaused = true;
    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "ExecutionPaused",
      metadata,
      payload: {}
    });
  }

  resume(): void {
    this.isPaused = false;
    const metadata = this.createEventMetadata();
    eventBus.publish({
      type: "ExecutionResumed",
      metadata,
      payload: {}
    });
  }

  private createEventMetadata(): EventMetadata {
    return {
      event_id: crypto.randomUUID(),
      context_id: this.contextId,
      session_id: this.sessionId,
      execution_id: this.executionId,
      timestamp: Date.now()
    };
  }
}

export const stateMachine = new ExecutionStateMachine();
