import crypto from "node:crypto";
import { PromptContext, ConversationMessage, WorkspaceChunk, ToolChunk, MemoryChunk, ArtifactChunk } from "../context/context_interfaces.js";
import { sessionMemory } from "../memory/session_memory.js";
import { workspaceMemory } from "../memory/workspace_memory.js";
import { toolMemory } from "../memory/tool_memory.js";
import { stateMachine } from "./state_machine.js";

// Helper token estimator (approx 4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface CacheEntry {
  context: PromptContext;
  timestamp: number;
}

export class PromptCache {
  private cache = new Map<string, CacheEntry>();

  get(key: string): PromptContext | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    return entry.context;
  }

  set(key: string, context: PromptContext): void {
    this.cache.set(key, { context, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const promptCache = new PromptCache();

// 1. Collector
export class Collector {
  collect(params: {
    contextId: string;
    sessionId: string;
    executionId: string;
    userPrompt: string;
    systemPrompts?: string[];
    policies?: string[];
  }) {
    const session = sessionMemory.getSession(params.sessionId);
    const currentState = stateMachine.getCurrentState();

    // Pull from databases
    const sessionHistory = sessionMemory.getStateHistory(params.sessionId);
    const dbMessages = sessionMemory.listSessions(params.contextId);
    
    // Read workspace
    const workspaceFiles = workspaceMemory.searchFiles(params.contextId, "");
    
    // Read tool executions
    const toolHistory = toolMemory.getExecutionHistory(params.contextId, params.executionId);

    // Format outputs
    const conversation: ConversationMessage[] = dbMessages.map(s => ({
      role: "user",
      content: s.metadata.prompt || ""
    }));

    const workspace: WorkspaceChunk[] = workspaceFiles.map(f => ({
      path: f.path,
      content: f.content,
      hash: f.hash,
      mimeType: f.mimeType
    }));

    const toolOutputs: ToolChunk[] = toolHistory.map(t => ({
      name: t.toolName,
      args: t.args,
      output: t.output || "",
      success: t.success,
      durationMs: t.durationMs
    }));

    const memory: MemoryChunk[] = sessionHistory.map((s, idx) => ({
      id: `state-${idx}`,
      type: "state_transition",
      content: `Transitioned from ${s.previousState} to ${s.currentState} because: ${s.transitionReason || "automatic"}`,
      timestamp: s.timestamp
    }));

    return {
      system: params.systemPrompts || ["You are Agathi AI coding assistant."],
      runtimePolicies: params.policies || ["Never bypass verification pipelines."],
      execution: [`Current state is: ${currentState}`, `User prompt: ${params.userPrompt}`],
      conversation,
      workspace,
      toolOutputs,
      memory,
      artifacts: [] as ArtifactChunk[]
    };
  }
}

// 2. Prioritizer
export class Prioritizer {
  prioritize(data: ReturnType<Collector["collect"]>): Record<number, any[]> {
    return {
      1: data.execution,
      2: [...data.system, ...data.runtimePolicies],
      3: data.conversation,
      4: data.workspace,
      5: data.toolOutputs,
      6: data.memory,
      7: data.artifacts
    };
  }
}

// 3. Compressor
export class Compressor {
  compress(priorities: Record<number, any[]>): { priorities: Record<number, any[]>; stats: any } {
    const stats = {
      collectedTokens: 0,
      removedTokens: 0,
      compressionRatio: 1.0
    };

    // Compact tool outputs (Priority 5)
    if (priorities[5]) {
      priorities[5] = priorities[5].map((t: ToolChunk) => {
        const estTokens = estimateTokens(t.output);
        stats.collectedTokens += estTokens;
        if (t.output.length > 500) {
          const compressedOutput = t.output.slice(0, 500) + "\n... [Truncated by Context OS Tool Compressor]";
          stats.removedTokens += (estTokens - estimateTokens(compressedOutput));
          return { ...t, output: compressedOutput };
        }
        return t;
      });
    }

    // Compact workspace files (Priority 4)
    if (priorities[4]) {
      priorities[4] = priorities[4].map((w: WorkspaceChunk) => {
        const estTokens = estimateTokens(w.content);
        stats.collectedTokens += estTokens;
        if (w.content.length > 2000) {
          const compressed = w.content.slice(0, 2000) + "\n... [Truncated by Context OS Workspace Compressor]";
          stats.removedTokens += (estTokens - estimateTokens(compressed));
          return { ...w, content: compressed };
        }
        return w;
      });
    }

    stats.compressionRatio = stats.collectedTokens > 0 
      ? Number(((stats.collectedTokens - stats.removedTokens) / stats.collectedTokens).toFixed(2)) 
      : 1.0;

    return { priorities, stats };
  }
}

// 4. Budget Allocator
export class BudgetAllocator {
  allocate(priorities: Record<number, any[]>, budget: number): { allocated: Record<number, any[]>; usedTokens: number; remainingTokens: number } {
    let usedTokens = 0;
    const allocated: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };

    // Calculate system prompts and execution context first (Priority 1 & 2)
    const p1_p2 = [...(priorities[1] || []), ...(priorities[2] || [])];
    for (const item of p1_p2) {
      const text = typeof item === "string" ? item : JSON.stringify(item);
      usedTokens += estimateTokens(text);
    }
    allocated[1] = priorities[1] || [];
    allocated[2] = priorities[2] || [];

    // Allocate others based on priority list
    const order = [3, 4, 5, 6, 7];
    for (const p of order) {
      const list = priorities[p] || [];
      for (const item of list) {
        const text = typeof item === "string" ? item : JSON.stringify(item);
        const itemTokens = estimateTokens(text);
        if (usedTokens + itemTokens <= budget) {
          allocated[p].push(item);
          usedTokens += itemTokens;
        }
      }
    }

    return {
      allocated,
      usedTokens,
      remainingTokens: Math.max(0, budget - usedTokens)
    };
  }
}

// 5. Prompt Serializer
export class PromptSerializer {
  serialize(allocated: Record<number, any[]>, budget: number, usedTokens: number, remainingTokens: number, compressionStats: any): PromptContext {
    const priorityStats: Record<number, number> = {};
    for (const p of [1, 2, 3, 4, 5, 6, 7]) {
      priorityStats[p] = (allocated[p] || []).length;
    }

    return {
      system: allocated[2].filter((item): item is string => typeof item === "string"),
      runtimePolicies: allocated[2].filter((item): item is string => typeof item === "string"),
      execution: allocated[1],
      conversation: allocated[3],
      workspace: allocated[4],
      toolOutputs: allocated[5],
      memory: allocated[6],
      artifacts: allocated[7],
      metadata: {},
      tokenBudget: budget,
      usedTokens,
      remainingTokens,
      compressionStats,
      priorityStats
    };
  }
}

export class PromptBuilder {
  private collector = new Collector();
  private prioritizer = new Prioritizer();
  private compressor = new Compressor();
  private allocator = new BudgetAllocator();
  private serializer = new PromptSerializer();

  async build(params: {
    contextId: string;
    sessionId: string;
    executionId: string;
    userPrompt: string;
    tokenBudget: number;
    systemPrompts?: string[];
    policies?: string[];
  }): Promise<PromptContext> {
    const startTime = Date.now();

    // Cache key computation must include tokenBudget
    const cacheKey = crypto.createHash("sha256").update(
      `${params.contextId}:${params.sessionId}:${params.executionId}:${params.userPrompt}:${params.tokenBudget}`
    ).digest("hex");

    const cached = promptCache.get(cacheKey);
    if (cached) {
      cached.metadata.cacheHit = true;
      cached.metadata.metrics = {
        totalTimeMs: Date.now() - startTime,
        cache: "HIT"
      };
      return cached;
    }

    // Pipeline
    const collected = this.collector.collect(params);
    const prioritized = this.prioritizer.prioritize(collected);
    const { priorities: compressed, stats: compressionStats } = this.compressor.compress(prioritized);
    const { allocated, usedTokens, remainingTokens } = this.allocator.allocate(compressed, params.tokenBudget);
    const context = this.serializer.serialize(allocated, params.tokenBudget, usedTokens, remainingTokens, compressionStats);

    context.metadata.cacheHit = false;
    context.metadata.metrics = {
      totalTimeMs: Date.now() - startTime,
      cache: "MISS"
    };

    promptCache.set(cacheKey, context);
    return context;
  }
}

export const promptBuilder = new PromptBuilder();
