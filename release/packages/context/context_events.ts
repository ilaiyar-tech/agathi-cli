export interface EventMetadata {
  event_id: string;
  parent_event_id?: string;
  context_id: string;
  session_id: string;
  execution_id: string;
  timestamp: number;
}

export type ContextEvent =
  | { type: "SessionCreated"; metadata: EventMetadata; payload: { agentId?: string } }
  | { type: "WorkspaceIndexed"; metadata: EventMetadata; payload: { path: string; fileType: string } }
  | { type: "ToolExecuted"; metadata: EventMetadata; payload: { toolName: string; success: boolean; durationMs: number } }
  | { type: "PromptBuilt"; metadata: EventMetadata; payload: { usedTokens: number; remainingTokens: number } }
  | { type: "StateTransitioned"; metadata: EventMetadata; payload: { from: string; to: string; reason?: string } }
  | { type: "ExecutionCompleted"; metadata: EventMetadata; payload: { success: boolean } }
  | { type: "VerificationFailed"; metadata: EventMetadata; payload: { error: string } }
  | { type: "RecoveryTriggered"; metadata: EventMetadata; payload: { issue: string } };
