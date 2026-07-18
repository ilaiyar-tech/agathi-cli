import { WorkflowState } from "../context/context_types.js";
import { eventBus as coreEventBus, RuntimeEvent } from "../core/event_bus.js";

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
  | { type: "RecoveryTriggered"; metadata: EventMetadata; payload: { issue: string } }
  | { type: "Custom"; contextId: string; sessionId: string; executionId: string; metadata: { event: string; [key: string]: any } };

export class EventBus {
  publish(event: ContextEvent): void {
    // Map ContextEvent structure to RuntimeEvent structure for core compatibility
    const runtimeEvent: RuntimeEvent = {
      type: event.type,
      timestamp: new Date().toISOString(),
      payload: "payload" in event ? event.payload : {},
      id: "metadata" in event ? event.metadata.event_id : undefined,
      parentId: "metadata" in event ? event.metadata.parent_event_id : undefined,
      metadata: event
    };
    coreEventBus.publish(runtimeEvent);
  }

  subscribe<T extends ContextEvent["type"]>(
    type: T,
    listener: (event: Extract<ContextEvent, { type: T }>) => void
  ): void {
    // Adapter wrapper to map Core RuntimeEvent back to ContextEvent
    coreEventBus.on(type, (coreEvent: RuntimeEvent) => {
      if (coreEvent.metadata) {
        listener(coreEvent.metadata as any);
      } else {
        // Fallback reconstruction
        const contextEvent = {
          type: coreEvent.type,
          payload: coreEvent.payload,
          metadata: {
            event_id: coreEvent.id,
            parent_event_id: coreEvent.parentId,
            timestamp: new Date(coreEvent.timestamp).getTime()
          }
        };
        listener(contextEvent as any);
      }
    });
  }

  clearListeners(): void {
    // Clear Core Event Bus listeners matching ContextEvent type strings
    coreEventBus.clearHistory();
  }
}

export const eventBus = new EventBus();
