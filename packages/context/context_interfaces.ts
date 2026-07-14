import { WorkflowState } from "./context_types.js";

export interface ConversationMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface MemoryChunk {
  id: string;
  type: string;
  content: string;
  timestamp: number;
}

export interface WorkspaceChunk {
  path: string;
  content: string;
  hash: string;
  mimeType?: string;
}

export interface ToolChunk {
  name: string;
  args: any;
  output: string;
  success: boolean;
  durationMs: number;
}

export interface ArtifactChunk {
  name: string;
  path: string;
  summary?: string;
}

export interface PromptContext {
  system: string[];
  runtimePolicies: string[];
  execution: string[];
  conversation: ConversationMessage[];
  workspace: WorkspaceChunk[];
  toolOutputs: ToolChunk[];
  memory: MemoryChunk[];
  artifacts: ArtifactChunk[];
  metadata: Record<string, any>;
  tokenBudget: number;
  usedTokens: number;
  remainingTokens: number;
  compressionStats: {
    collectedTokens: number;
    removedTokens: number;
    compressionRatio: number;
  };
  priorityStats: Record<number, number>;
}
