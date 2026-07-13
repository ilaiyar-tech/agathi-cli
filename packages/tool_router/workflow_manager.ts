export type WorkflowState = "Task" | "Investigation" | "Execution" | "Verification" | "Summary";

export interface WorkflowAction {
  id: string;
  type: string;
  status: "pending" | "running" | "success" | "failed";
  retries: number;
  dependencies: string[];
}

export class WorkflowManager {
  state: WorkflowState = "Task";
  actions: Map<string, WorkflowAction> = new Map();

  constructor() {}

  transition(nextState: WorkflowState) {
    this.state = nextState;
  }

  addAction(action: WorkflowAction) {
    this.actions.set(action.id, action);
  }

  updateAction(id: string, status: WorkflowAction["status"]) {
    const action = this.actions.get(id);
    if (action) {
      action.status = status;
    }
  }

  shouldRetry(id: string, maxRetries: number = 3): boolean {
    const action = this.actions.get(id);
    if (!action) return false;
    if (action.retries < maxRetries) {
      action.retries++;
      action.status = "pending";
      return true;
    }
    return false;
  }

  getPendingActions(): WorkflowAction[] {
    return Array.from(this.actions.values()).filter(a => a.status === "pending");
  }

  getCurrentState(): WorkflowState {
    return this.state;
  }

  getSystemPromptExtension(): string {
    return `
CRITICAL WORKFLOW PIPELINE INSTRUCTIONS:
You are currently operating in the following state: ${this.state}

Valid States: Task -> Investigation -> Execution -> Verification -> Summary

STATE RULES:
- If State is NOT "Summary": YOU MUST INVOKE A TOOL. Do NOT output only conversational text. You MUST use a tool to investigate, execute, or verify. If you do not invoke a tool, the pipeline will break.
- If State IS "Summary": You may output conversational text to summarize your findings to the user. Do NOT invoke tools.

Current State is ${this.state}.
${this.state !== "Summary" ? "REQUIRED: Output a tool call immediately." : "REQUIRED: Output a user-facing summary."}
`;
  }
}

export const workflow = new WorkflowManager();
