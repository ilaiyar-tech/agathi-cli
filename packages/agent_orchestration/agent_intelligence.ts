import crypto from "node:crypto";
import { eventBus } from "../core/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { accuracyEngine } from "../accuracy_engine/index.js";
import { WidgetRegistry } from "../workspace_terminal/index.js";
import chalk from "chalk";

// Lifecycle & States
export type AgentLifecycleState =
  | "Registered"
  | "Waiting"
  | "Planning"
  | "Running"
  | "Paused"
  | "Waiting For Dependency"
  | "Reviewing"
  | "Completed"
  | "Failed"
  | "Cancelled"
  | "Archived";

export interface IntelligentAgent {
  id: string;
  name: string;
  state: AgentLifecycleState;
  progress: number;
  currentTool: string;
  currentModel: string;
  runningTime: number; // in milliseconds
  confidence: number; // 0 to 100
  parentId?: string;
  childIds: string[];
  workingMemory: Map<string, any>;
  planningNotes: string[];
  reflectionNotes: string[];
  finalOutput?: string;
  retryCount: number;
}

// Communication Bus
export interface CommunicationMessage {
  type: "Request" | "Response" | "Progress" | "Warning" | "Error" | "Result" | "Broadcast";
  senderId: string;
  receiverId: string;
  payload: any;
  timestamp: number;
}

export type MessageListener = (msg: CommunicationMessage) => void;

// Planning Graph
export interface TaskPlanNode {
  id: string;
  description: string;
  dependencies: string[];
  status: "waiting" | "running" | "completed" | "failed";
  toolStrategy?: string;
  modelStrategy?: string;
}

export interface ExecutionPlan {
  goals: string[];
  nodes: TaskPlanNode[];
}

// Reflection Engine
export interface ReflectionReport {
  isValid: boolean;
  missingSteps: string[];
  contradictions: string[];
  retryRecommended: boolean;
  summary: string;
  confidenceScore: number;
}

// Consensus Engine
export interface AgentVote {
  agentId: string;
  proposal: string;
  confidence: number;
  priority: number;
}

export class AgentIntelligenceEngine {
  private static instance: AgentIntelligenceEngine;
  private agents = new Map<string, IntelligentAgent>();
  private messageListeners = new Map<string, Set<MessageListener>>();
  private activePlans = new Map<string, ExecutionPlan>();

  private constructor() {
    this.initDatabase();
  }

  static getInstance(): AgentIntelligenceEngine {
    if (!AgentIntelligenceEngine.instance) {
      AgentIntelligenceEngine.instance = new AgentIntelligenceEngine();
    }
    return AgentIntelligenceEngine.instance;
  }

  private initDatabase() {
    try {
      memory.database.exec(`
        CREATE TABLE IF NOT EXISTS agent_intelligence_telemetry (
          agent_id TEXT PRIMARY KEY,
          execution_time INTEGER,
          queue_time INTEGER,
          cpu_time INTEGER,
          tool_count INTEGER,
          token_usage INTEGER,
          memory_usage INTEGER,
          retry_count INTEGER,
          success_rate REAL,
          failure_rate REAL
        );
      `);
    } catch (e) {
      console.error("Failed to initialize agent_intelligence_telemetry database:", e);
    }
  }

  // --- WIDGET INTEGRATION ---
  private registerWidget(agent: IntelligentAgent) {
    WidgetRegistry.register({
      id: `agent_widget_${agent.id}`,
      title: `🤖 Agent: ${agent.name}`,
      priority: 12,
      preferredWidth: 30,
      preferredHeight: 11,
      visible: true,
      state: "ACTIVE",
      dock: "LEFT",
      render: (width, height) => {
        const stateColor =
          agent.state === "Completed"
            ? chalk.green
            : agent.state === "Running"
            ? chalk.cyan
            : agent.state === "Failed"
            ? chalk.red
            : chalk.yellow;

        const progressChars = Math.round(agent.progress / 10);
        const progressBar = `[${chalk.green("█".repeat(progressChars))}${"░".repeat(10 - progressChars)}]`;

        return [
          `State:      ${stateColor(agent.state)}`,
          `Progress:   ${progressBar} ${agent.progress}%`,
          `Tool:       ${chalk.white(agent.currentTool || "None")}`,
          `Model:      ${chalk.white(agent.currentModel || "None")}`,
          `Runtime:    ${(agent.runningTime / 1000).toFixed(1)}s`,
          `Confidence: ${chalk.green(agent.confidence)}%`,
          `Parent:     ${chalk.gray(agent.parentId || "None")}`,
          `Children:   ${chalk.gray(String(agent.childIds.length))}`
        ];
      }
    });
  }

  private updateWidget(agent: IntelligentAgent) {
    const w = WidgetRegistry.getWidget(`agent_widget_${agent.id}`);
    if (w) {
      w.update?.();
    } else {
      this.registerWidget(agent);
    }
  }

  private removeWidget(agentId: string) {
    WidgetRegistry.unregister(`agent_widget_${agentId}`);
  }

  // --- LIFECYCLE ---
  registerAgent(id: string, name: string, parentId?: string): IntelligentAgent {
    const agent: IntelligentAgent = {
      id,
      name,
      state: "Registered",
      progress: 0,
      currentTool: "",
      currentModel: "",
      runningTime: 0,
      confidence: 100,
      parentId,
      childIds: [],
      workingMemory: new Map(),
      planningNotes: [],
      reflectionNotes: [],
      retryCount: 0
    };

    if (parentId) {
      const parent = this.agents.get(parentId);
      if (parent && !parent.childIds.includes(id)) {
        parent.childIds.push(id);
        this.updateWidget(parent);
      }
    }

    this.agents.set(id, agent);
    this.registerWidget(agent);
    this.transitionState(id, "Waiting");
    return agent;
  }

  transitionState(id: string, state: AgentLifecycleState) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.state = state;
      this.updateWidget(agent);
      
      eventBus.emitEvent("TASK_STARTED", { agentId: id, state });
    }
  }

  updateMetrics(id: string, updates: Partial<IntelligentAgent>) {
    const agent = this.agents.get(id);
    if (agent) {
      Object.assign(agent, updates);
      this.updateWidget(agent);
    }
  }

  getAgent(id: string): IntelligentAgent | undefined {
    return this.agents.get(id);
  }

  // --- PLANNING ENGINE ---
  createPlan(id: string, request: string): ExecutionPlan {
    this.transitionState(id, "Planning");
    
    // Decompose request into sub-tasks (sequential and parallel detection)
    const goals = [`Analyze intention: ${request}`];
    const nodes: TaskPlanNode[] = [];

    if (request.toLowerCase().includes("test") && request.toLowerCase().includes("code")) {
      nodes.push(
        {
          id: "task-code",
          description: "Generate implementation code",
          dependencies: [],
          status: "waiting",
          toolStrategy: "write_file",
          modelStrategy: "coder_pro"
        },
        {
          id: "task-test",
          description: "Run automated tests verification",
          dependencies: ["task-code"],
          status: "waiting",
          toolStrategy: "run_command",
          modelStrategy: "coder_pro"
        }
      );
    } else {
      nodes.push({
        id: "task-basic",
        description: "Analyze and reply",
        dependencies: [],
        status: "waiting",
        toolStrategy: "read_file",
        modelStrategy: "chat"
      });
    }

    const plan: ExecutionPlan = { goals, nodes };
    this.activePlans.set(id, plan);
    
    const agent = this.agents.get(id);
    if (agent) {
      agent.planningNotes.push(`Decomposed into ${nodes.length} plan nodes.`);
      this.updateWidget(agent);
    }

    return plan;
  }

  // --- COMMUNICATION BUS ---
  subscribe(receiverId: string, listener: MessageListener) {
    if (!this.messageListeners.has(receiverId)) {
      this.messageListeners.set(receiverId, new Set());
    }
    this.messageListeners.get(receiverId)!.add(listener);
  }

  unsubscribe(receiverId: string, listener: MessageListener) {
    const listeners = this.messageListeners.get(receiverId);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  sendMessage(msg: Omit<CommunicationMessage, "timestamp">) {
    const fullMsg: CommunicationMessage = {
      ...msg,
      timestamp: Date.now()
    };

    const listeners = this.messageListeners.get(msg.receiverId);
    if (listeners) {
      for (const listener of listeners) {
        listener(fullMsg);
      }
    }

    // Broadcast compatibility
    if (msg.type === "Broadcast" || msg.receiverId === "") {
      for (const [recId, set] of this.messageListeners.entries()) {
        if (recId !== msg.senderId) {
          for (const listener of set) {
            listener(fullMsg);
          }
        }
      }
    }
  }

  // --- REFLECTION ENGINE & ACCURACY INTEGRATION ---
  reflect(id: string, output: string, context: string): ReflectionReport {
    this.transitionState(id, "Reviewing");
    
    // Call existing AccuracyEngine for hallucination checks
    const accResult = accuracyEngine.verifyResponse(output, context);

    const missingSteps: string[] = [];
    const contradictions: string[] = [];

    if (accResult.accuracy < 80) {
      contradictions.push("Response lacks high similarity alignment with reference context words.");
    }

    const retryRecommended = accResult.verified === "NO";
    const report: ReflectionReport = {
      isValid: accResult.verified === "YES",
      missingSteps,
      contradictions,
      retryRecommended,
      summary: `Reflection analysis: Accuracy is ${accResult.accuracy}%, Hallucination index is ${accResult.hallucinationRate}%.`,
      confidenceScore: accResult.accuracy
    };

    const agent = this.agents.get(id);
    if (agent) {
      agent.reflectionNotes.push(report.summary);
      agent.confidence = report.confidenceScore;
      agent.finalOutput = output;
      this.updateWidget(agent);

      // Persist results into SQLite Telemetry
      accuracyEngine.logTelemetry(
        "agent",
        report.isValid,
        report.confidenceScore,
        accResult.hallucinationRate,
        agent.runningTime
      );

      // Complete lifecycle state
      if (report.isValid) {
        this.transitionState(id, "Completed");
      } else {
        this.transitionState(id, "Failed");
      }
    }

    return report;
  }

  // --- CONSENSUS ENGINE ---
  resolveConsensus(votes: AgentVote[]): { consensus: string; confidence: number } {
    const weightedProposals = new Map<string, { weight: number; count: number }>();
    
    for (const vote of votes) {
      const current = weightedProposals.get(vote.proposal) || { weight: 0, count: 0 };
      const increment = vote.confidence * (vote.priority / 10);
      weightedProposals.set(vote.proposal, {
        weight: current.weight + increment,
        count: current.count + 1
      });
    }

    let bestProposal = "";
    let maxWeight = -1;

    for (const [prop, data] of weightedProposals.entries()) {
      if (data.weight > maxWeight) {
        maxWeight = data.weight;
        bestProposal = prop;
      }
    }

    const confidence = maxWeight > 0 ? Math.min(100, Math.round(maxWeight)) : 80;

    return { consensus: bestProposal, confidence };
  }

  // --- FAILURE RECOVERY ---
  async executeWithRecovery(
    id: string,
    action: () => Promise<string>,
    context: string,
    maxRetries = 2
  ): Promise<string> {
    const agent = this.agents.get(id);
    if (!agent) return action();

    this.transitionState(id, "Running");
    const startTime = Date.now();

    while (agent.retryCount <= maxRetries) {
      try {
        const output = await action();
        agent.runningTime += Date.now() - startTime;
        
        // Reflect and verify accuracy
        const report = this.reflect(id, output, context);
        if (report.isValid) {
          this.logTelemetry(id, true);
          return output;
        }

        // Recovery path
        if (agent.retryCount < maxRetries) {
          agent.retryCount++;
          agent.planningNotes.push(`Retry attempt #${agent.retryCount} due to verification fail.`);
          this.transitionState(id, "Waiting");
          await new Promise(r => setTimeout(r, 100));
          this.transitionState(id, "Running");
        } else {
          break;
        }
      } catch (err) {
        if (agent.retryCount < maxRetries) {
          agent.retryCount++;
          agent.planningNotes.push(`Exception recovery retry #${agent.retryCount}`);
          await new Promise(r => setTimeout(r, 100));
        } else {
          this.transitionState(id, "Failed");
          this.logTelemetry(id, false);
          throw err;
        }
      }
    }

    this.transitionState(id, "Failed");
    this.logTelemetry(id, false);
    throw new Error(`Agent execution failed validation after ${maxRetries} retries.`);
  }

  // --- TELEMETRY PERSISTENCE ---
  private logTelemetry(agentId: string, success: boolean) {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    try {
      memory.database.prepare(`
        INSERT OR REPLACE INTO agent_intelligence_telemetry (
          agent_id, execution_time, queue_time, cpu_time, tool_count, token_usage, memory_usage, retry_count, success_rate, failure_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        agentId,
        agent.runningTime,
        15, // queue_time average placeholder
        50, // cpu_time benchmark
        2,  // tool_count
        500, // token_usage
        256 * 1024, // memory_usage bytes
        agent.retryCount,
        success ? 1.0 : 0.0,
        success ? 0.0 : 1.0
      );
    } catch (e) {
      console.error("Failed to persist telemetry:", e);
    }
  }

  getTelemetry(agentId: string): any {
    try {
      return memory.database.prepare(
        "SELECT * FROM agent_intelligence_telemetry WHERE agent_id = ?"
      ).get(agentId);
    } catch (e) {
      return undefined;
    }
  }

  clean(agentId: string) {
    this.removeWidget(agentId);
    this.agents.delete(agentId);
    this.activePlans.delete(agentId);
  }
}

export const aie = AgentIntelligenceEngine.getInstance();
