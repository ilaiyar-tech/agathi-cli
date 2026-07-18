import crypto from "node:crypto";
import { ContextOS } from "../context_engine/index.js";
import { memory } from "../memory/memory_engine.js";
import { WorkspaceChunk } from "../context/context_interfaces.js";

export interface PromptIdentity {
  id: string;
  sessionId: string;
  workspaceId: string;
  timestamp: number;
  executionState: string;
}

export interface RetryPolicy {
  max_retries: number;
  backoff_ms: number;
}

export interface PromptContract {
  id: string;
  goal: string;
  intent: string;
  priority: "low" | "medium" | "high";
  execution_mode: "interactive" | "autonomous" | "dry-run";
  required_tools: string[];
  required_models: string[];
  required_context: string[];
  required_memory: string[];
  expected_output: string;
  verification_required: boolean;
  save_memory: boolean;
  retry_policy: RetryPolicy;
}

export interface PromptGraphNode {
  promptId: string;
  parentPromptId?: string;
  childPromptIds: string[];
  relatedPromptIds: string[];
  executionChain: string[];
  decisionHistory: string[];
}

export interface CompressedHistory {
  activeDecisions: string[];
  completedDecisions: string[];
  pendingDecisions: string[];
  currentObjective: string;
}

export interface RuntimeContext {
  workspaceContext: string[];
  memory: string[];
  artifacts: string[];
  snapshots: string[];
  evidence: string[];
  plannerState: string;
  executionState: string;
  toolAvailability: string[];
}

export class PromptIdentityManager {
  createIdentity(sessionId?: string, workspaceId?: string, executionState?: string): PromptIdentity {
    return {
      id: `prompt-${crypto.randomUUID()}`,
      sessionId: sessionId || `sess-${crypto.randomUUID()}`,
      workspaceId: workspaceId || process.cwd(),
      timestamp: Date.now(),
      executionState: executionState || "Planning"
    };
  }
}

export class IntentAnalyzer {
  analyze(prompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes("git status") || p.includes("git commit") || p.includes("git diff") || p.includes("git log")) {
      return "git";
    }
    if (p.includes("run command") || p.includes("execute") || p.includes("npm run") || p.includes("npm install")) {
      return "terminal";
    }
    if (p.includes("check the files") || p.includes("search files") || p.includes("find in codebase") || p.includes("read file")) {
      return "file_analysis";
    }
    if (p.includes("why") || p.includes("how") || p.includes("trace") || p.includes("investigate") || p.includes("diagnose")) {
      return "investigation";
    }
    if (p.includes("deploy") || p.includes("publish") || p.includes("wrangler")) {
      return "deployment";
    }
    return "chat";
  }
}

export class GoalExtractor {
  extract(prompt: string): string {
    const match = prompt.match(/(?:goal|task|objective|to|should)\s+is\s+to\s+(.+)/i) || 
                  prompt.match(/(?:please|help me)\s+(.+)/i);
    return match ? match[1].trim() : prompt.trim();
  }
}

export class WorkspaceResolver {
  resolve(contextId: string, prompt: string): string[] {
    const keywords = prompt.split(/\s+/).filter(w => w.length > 3 && !["this", "that", "with", "from", "files", "find"].includes(w.toLowerCase()));
    const resolvedFiles: string[] = [];
    
    for (const kw of keywords) {
      try {
        const files = ContextOS.workspace.searchFiles(contextId, kw);
        for (const file of files) {
          if (!resolvedFiles.includes(file.path)) {
            resolvedFiles.push(file.path);
          }
        }
      } catch (e) {
        // Ignored
      }
    }
    return resolvedFiles;
  }
}

export class SessionResolver {
  resolve(sessionId: string, contextId: string): any {
    let session = ContextOS.sessions.getSession(sessionId);
    if (!session) {
      session = ContextOS.sessions.createSession(sessionId, contextId);
    }
    return session;
  }
}

export class ContextResolver {
  resolve(contextId: string, sessionId: string): string[] {
    const contexts: string[] = [];
    try {
      const history = ContextOS.sessions.getStateHistory(sessionId);
      contexts.push(`Session state transitions: ${history.map(h => `${h.previousState} -> ${h.currentState}`).join(", ")}`);
      
      const files = ContextOS.workspace.searchFiles(contextId, "");
      contexts.push(`Workspace has ${files.length} indexed files.`);
    } catch (e) {}
    return contexts;
  }
}

export class KnowledgeResolver {
  resolve(prompt: string): string[] {
    const knowledge: string[] = [];
    const p = prompt.toLowerCase();
    if (p.includes("sqlite") || p.includes("db") || p.includes("database")) {
      knowledge.push("Knowledge: SQLite database is located at storage/agathi_cli.db by default. Standard tables include contexts, sessions, state_history, tool_history, and workspace_index.");
    }
    if (p.includes("cli") || p.includes("command")) {
      knowledge.push("Knowledge: Agathi CLI uses Commander.js for option parsing, readline REPL for interactive sessions, and ora/chalk for terminal aesthetics.");
    }
    return knowledge;
  }
}

export class MemoryResolver {
  resolve(sessionId: string): string[] {
    const memories: string[] = [];
    try {
      const recent = memory.history(sessionId, 10);
      for (const m of recent as any[]) {
        memories.push(`[${m.role}] ${m.content}`);
      }
    } catch (e) {}
    return memories;
  }
}

export class EvidenceResolver {
  resolve(contextId: string, executionId: string): string[] {
    const evidence: string[] = [];
    try {
      const toolExecutions = ContextOS.tools.getExecutionHistory(contextId, executionId);
      for (const t of toolExecutions) {
        evidence.push(`Evidence: Tool ${t.toolName} executed with success=${t.success} (duration: ${t.durationMs}ms)`);
      }
    } catch (e) {}
    return evidence;
  }
}

export class PromptClassifier {
  classify(prompt: string): { category: string; riskLevel: "safe" | "restricted" | "privileged" } {
    const p = prompt.toLowerCase();
    let riskLevel: "safe" | "restricted" | "privileged" = "safe";
    
    if (p.includes("delete") || p.includes("remove") || p.includes("rm -rf") || p.includes("rollback")) {
      riskLevel = "restricted";
    }
    if (p.includes("sudo") || p.includes("chmod") || p.includes("deploy") || p.includes("wrangler")) {
      riskLevel = "privileged";
    }
    
    let category = "General";
    if (p.includes("bug") || p.includes("fix") || p.includes("error")) {
      category = "Bug Fix";
    } else if (p.includes("build") || p.includes("compile") || p.includes("pnpm")) {
      category = "Automation";
    } else if (p.includes("search") || p.includes("find")) {
      category = "Research";
    }
    
    return { category, riskLevel };
  }
}

export class PromptContractGenerator {
  generate(id: string, prompt: string, intent: string, classifier: { category: string; riskLevel: string }): PromptContract {
    const execution_mode = classifier.riskLevel === "privileged" ? "autonomous" : "interactive";
    const save_memory = true;
    const verification_required = classifier.riskLevel !== "safe";
    
    const required_tools: string[] = [];
    if (intent === "file_analysis") required_tools.push("search_files", "read_file");
    if (intent === "git") required_tools.push("git_status", "git_log");
    if (intent === "terminal") required_tools.push("run_command");
    
    return {
      id,
      goal: prompt,
      intent,
      priority: "medium",
      execution_mode,
      required_tools,
      required_models: ["coder_pro"],
      required_context: ["workspace", "session_history"],
      required_memory: ["recent_decisions"],
      expected_output: "Successful task execution or status report",
      verification_required,
      save_memory,
      retry_policy: {
        max_retries: 3,
        backoff_ms: 1000
      }
    };
  }
}

export class PromptGraphManager {
  saveNode(node: PromptGraphNode): void {
    memory.database.prepare(`
      insert or replace into prompt_graph (prompt_id, parent_prompt_id, child_prompt_ids, related_prompt_ids, execution_chain, decision_history)
      values (?, ?, ?, ?, ?, ?)
    `).run(
      node.promptId,
      node.parentPromptId || null,
      JSON.stringify(node.childPromptIds),
      JSON.stringify(node.relatedPromptIds),
      JSON.stringify(node.executionChain),
      JSON.stringify(node.decisionHistory)
    );
  }

  getNode(promptId: string): PromptGraphNode | undefined {
    const row: any = memory.database.prepare(`
      select prompt_id as promptId, parent_prompt_id as parentPromptId, child_prompt_ids as childPromptIds, related_prompt_ids as relatedPromptIds, execution_chain as executionChain, decision_history as decisionHistory
      from prompt_graph where prompt_id = ?
    `).get(promptId);

    if (!row) return undefined;

    return {
      promptId: row.promptId,
      parentPromptId: row.parentPromptId || undefined,
      childPromptIds: JSON.parse(row.childPromptIds || "[]"),
      relatedPromptIds: JSON.parse(row.relatedPromptIds || "[]"),
      executionChain: JSON.parse(row.executionChain || "[]"),
      decisionHistory: JSON.parse(row.decisionHistory || "[]")
    };
  }

  addChild(parentPromptId: string, childPromptId: string): void {
    const parentNode = this.getNode(parentPromptId) || {
      promptId: parentPromptId,
      childPromptIds: [],
      relatedPromptIds: [],
      executionChain: [],
      decisionHistory: []
    };
    if (!parentNode.childPromptIds.includes(childPromptId)) {
      parentNode.childPromptIds.push(childPromptId);
    }
    this.saveNode(parentNode);

    const childNode = this.getNode(childPromptId) || {
      promptId: childPromptId,
      parentPromptId: parentPromptId,
      childPromptIds: [],
      relatedPromptIds: [],
      executionChain: [],
      decisionHistory: []
    };
    childNode.parentPromptId = parentPromptId;
    this.saveNode(childNode);
  }
}

export class PromptCompressor {
  compress(history: string[], currentPrompt: string): CompressedHistory {
    const activeDecisions: string[] = [];
    const completedDecisions: string[] = [];
    const pendingDecisions: string[] = [];

    for (const h of history) {
      if (h.includes("Execution") || h.includes("ToolExecution")) {
        activeDecisions.push(`Execute: ${h}`);
      } else if (h.includes("Completed") || h.includes("Success")) {
        completedDecisions.push(`Completed: ${h}`);
      } else {
        pendingDecisions.push(`Pending item: ${h}`);
      }
    }

    return {
      activeDecisions,
      completedDecisions,
      pendingDecisions,
      currentObjective: `Evaluate user prompt: "${currentPrompt}"`
    };
  }
}

export class PromptCacheManager {
  set(key: string, type: "semantic" | "exact" | "recent" | "workspace", value: string): void {
    memory.database.prepare(`
      insert or replace into prompt_cache (cache_key, cache_type, value, timestamp)
      values (?, ?, ?, ?)
    `).run(key, type, value, Date.now());
  }

  get(key: string, type: "semantic" | "exact" | "recent" | "workspace"): string | null {
    const row: any = memory.database.prepare(`
      select value from prompt_cache where cache_key = ? and cache_type = ?
    `).get(key, type);
    return row ? row.value : null;
  }

  getRecent(limit: number = 5): Array<{ key: string; value: string }> {
    const rows: any[] = memory.database.prepare(`
      select cache_key as key, value from prompt_cache order by timestamp desc limit ?
    `).all(limit);
    return rows;
  }
}

export class RuntimeContextBuilder {
  async build(contextId: string, sessionId: string, executionId: string): Promise<RuntimeContext> {
    const workspaceContext: string[] = [];
    const memoryStrings: string[] = [];
    const artifacts: string[] = [];
    const snapshots: string[] = [];
    const evidence: string[] = [];

    try {
      const files = ContextOS.workspace.searchFiles(contextId, "");
      for (const file of files) {
        workspaceContext.push(`File: ${file.path} (Hash: ${file.hash})`);
      }

      const list = ContextOS.sessions.listSessions(contextId);
      for (const s of list) {
        memoryStrings.push(`Session ID: ${s.id}, state=${s.currentState}`);
      }

      const history = ContextOS.tools.getExecutionHistory(contextId, executionId);
      for (const h of history) {
        evidence.push(`Tool execution: ${h.toolName}, success=${h.success}, duration=${h.durationMs}ms`);
      }
    } catch (e) {}

    const toolAvailability = ["search_files", "read_file", "run_command", "git_status", "git_log"];

    return {
      workspaceContext,
      memory: memoryStrings,
      artifacts,
      snapshots,
      evidence,
      plannerState: ContextOS.state.getCurrentState(),
      executionState: ContextOS.state.getCurrentState(),
      toolAvailability
    };
  }
}

export class PromptIntelligenceLayer {
  public identity = new PromptIdentityManager();
  public intent = new IntentAnalyzer();
  public goals = new GoalExtractor();
  public workspace = new WorkspaceResolver();
  public sessions = new SessionResolver();
  public contexts = new ContextResolver();
  public knowledge = new KnowledgeResolver();
  public memory = new MemoryResolver();
  public evidence = new EvidenceResolver();
  public classifier = new PromptClassifier();
  public contracts = new PromptContractGenerator();
  public graph = new PromptGraphManager();
  public compressor = new PromptCompressor();
  public cache = new PromptCacheManager();
  public contextBuilder = new RuntimeContextBuilder();

  constructor() {
    try {
      memory.database.exec(`
        create table if not exists prompt_contracts (
          id text primary key,
          goal text not null,
          intent text not null,
          priority text not null,
          execution_mode text not null,
          required_tools text,
          required_models text,
          required_context text,
          required_memory text,
          expected_output text,
          verification_required boolean,
          save_memory boolean,
          retry_policy text
        );

        create table if not exists prompt_graph (
          prompt_id text primary key,
          parent_prompt_id text,
          child_prompt_ids text,
          related_prompt_ids text,
          execution_chain text,
          decision_history text
        );

        create table if not exists prompt_cache (
          cache_key text primary key,
          cache_type text not null,
          value text not null,
          timestamp integer not null
        );
      `);
    } catch (e) {
      console.error("Failed to initialize PIL database schemas", e);
    }
  }

  async process(prompt: string, options: { sessionId?: string; parentPromptId?: string } = {}): Promise<{
    identity: PromptIdentity;
    contract: PromptContract;
    graphNode: PromptGraphNode;
    context: RuntimeContext;
  }> {
    const sessionId = options.sessionId || `sess-${crypto.randomUUID()}`;
    const contextId = `ctx-${sessionId}`;
    
    this.sessions.resolve(sessionId, contextId);

    const identity = this.identity.createIdentity(sessionId, process.cwd(), ContextOS.state.getCurrentState());
    const analyzedIntent = this.intent.analyze(prompt);
    const goal = this.goals.extract(prompt);
    const classification = this.classifier.classify(prompt);
    const contract = this.contracts.generate(identity.id, prompt, analyzedIntent, classification);
    
    memory.database.prepare(`
      insert or replace into prompt_contracts (id, goal, intent, priority, execution_mode, required_tools, required_models, required_context, required_memory, expected_output, verification_required, save_memory, retry_policy)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      contract.id,
      contract.goal,
      contract.intent,
      contract.priority,
      contract.execution_mode,
      JSON.stringify(contract.required_tools),
      JSON.stringify(contract.required_models),
      JSON.stringify(contract.required_context),
      JSON.stringify(contract.required_memory),
      contract.expected_output,
      contract.verification_required ? 1 : 0,
      contract.save_memory ? 1 : 0,
      JSON.stringify(contract.retry_policy)
    );

    const graphNode: PromptGraphNode = {
      promptId: identity.id,
      parentPromptId: options.parentPromptId,
      childPromptIds: [],
      relatedPromptIds: [],
      executionChain: [ContextOS.state.getCurrentState()],
      decisionHistory: [`Processed prompt: "${prompt.slice(0, 40)}..." with intent: ${analyzedIntent}`]
    };
    this.graph.saveNode(graphNode);

    if (options.parentPromptId) {
      this.graph.addChild(options.parentPromptId, identity.id);
    }

    this.cache.set(prompt, "exact", JSON.stringify(contract));

    const context = await this.contextBuilder.build(contextId, sessionId, identity.id);

    return {
      identity,
      contract,
      graphNode,
      context
    };
  }
}

export const pil = new PromptIntelligenceLayer();
