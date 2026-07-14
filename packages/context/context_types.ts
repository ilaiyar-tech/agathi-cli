export type WorkflowState =
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

export interface Session {
  id: string;
  contextId: string;
  agentId?: string;
  currentState: WorkflowState;
  metadata: Record<string, any>;
  startedAt: number;
  endedAt?: number;
}

export interface StateTransition {
  id?: number;
  sessionId: string;
  executionId?: string;
  agentId?: string;
  previousState: WorkflowState | null;
  currentState: WorkflowState;
  transitionReason?: string;
  timestamp: number;
}
