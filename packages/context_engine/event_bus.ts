import { WorkflowState } from "../context/context_types.js";

export type WorkflowStateEx =
  | "ContextCreated"
  | "SessionStarted"
  | "Task"
  | "Investigation"
  | "Planning"
  | "Execution"
  | "ToolExecution"
  | "Verification"
  | "Summary"
  | "Completed"
  | "Cancelled"
  | "Failed"
  | "Recovered";

export interface EventMetadata {
  event_id: string;
  parent_event_id?: string;
  context_id: string;
  session_id: string;
  execution_id: string;
  timestamp: number;
}

export type ContextEvent =
  | { type: "ExecutionStarted"; metadata: EventMetadata; payload: {} }
  | { type: "StateChanged"; metadata: EventMetadata; payload: { from: WorkflowStateEx; to: WorkflowStateEx; reason?: string } }
  | { type: "ExecutionPaused"; metadata: EventMetadata; payload: {} }
  | { type: "ExecutionResumed"; metadata: EventMetadata; payload: {} }
  | { type: "ExecutionCompleted"; metadata: EventMetadata; payload: { success: boolean } }
  | { type: "ExecutionCancelled"; metadata: EventMetadata; payload: { reason?: string } }
  | { type: "ExecutionFailed"; metadata: EventMetadata; payload: { error: string } }
  | { type: "RecoveryStarted"; metadata: EventMetadata; payload: { issue: string } }
  | { type: "RecoveryCompleted"; metadata: EventMetadata; payload: { recoveredState: WorkflowStateEx } }
  | { type: "SessionCreated"; metadata: EventMetadata; payload: { agentId?: string } }
  | { type: "WorkspaceIndexed"; metadata: EventMetadata; payload: { path: string; fileType: string } }
  | { type: "ToolExecuted"; metadata: EventMetadata; payload: { toolName: string; success: boolean; durationMs: number } }
  | { type: "PromptBuilt"; metadata: EventMetadata; payload: { usedTokens: number; remainingTokens: number } }
  | { type: "StateTransitioned"; metadata: EventMetadata; payload: { from: string; to: string; reason?: string } }
  | { type: "VerificationFailed"; metadata: EventMetadata; payload: { error: string } }
  | { type: "RecoveryTriggered"; metadata: EventMetadata; payload: { issue: string } };

export class EventBus {
  private listeners: Map<string, Array<(event: any) => void>> = new Map();

  publish(event: ContextEvent): void {
    const list = this.listeners.get(event.type) || [];
    for (const listener of list) {
      try {
        listener(event);
      } catch (e) {
        // Suppress observer errors to keep State Machine robust
      }
    }
  }

  subscribe<T extends ContextEvent["type"]>(
    type: T,
    listener: (event: Extract<ContextEvent, { type: T }>) => void
  ): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  clearListeners(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
