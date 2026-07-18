import crypto from "node:crypto";
import { eventBus } from "../context_engine/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { ContextOS } from "../context_engine/index.js";

export interface ReasoningSession {
  id: string;
  promptId: string;
  plannerId: string;
  executionId: string;
  knowledgeSessionId: string;
  workspaceId: string;
  timestamp: number;
}

export interface ReasoningAssumption {
  id: string;
  sessionId: string;
  description: string;
  type: "implicit" | "explicit" | "unknown" | "unsupported";
}

export interface ReasoningConstraint {
  id: string;
  sessionId: string;
  description: string;
  type: "technical" | "business" | "workspace" | "security" | "time";
}

export interface ReasoningAlternative {
  id: string;
  sessionId: string;
  strategyName: string;
  rankScore: number;
}

export interface ReasoningDecision {
  id: string;
  sessionId: string;
  recommendedStrategy: string;
  rejectedStrategies: string[];
  reasoningSummary: string;
  confidenceScore: number;
}

export interface ReasoningReflection {
  id: string;
  sessionId: string;
  outcome: string;
  lessons: string[];
}

export interface ReasoningTimelineEvent {
  id?: number;
  sessionId: string;
  eventName: string;
  details: string;
  timestamp: number;
}

export interface ReasoningMetrics {
  sessionId: string;
  reasoningLatency: number;
  decisionQuality: number;
  confidenceAccuracy: number;
  reflectionQuality: number;
  cacheHitRate: number;
}

export class ReasoningIntelligenceLayer {
  constructor() {
    try {
      memory.database.exec(`
        create table if not exists reasoning_sessions (
          id text primary key,
          prompt_id text not null,
          planner_id text not null,
          execution_id text not null,
          knowledge_session_id text not null,
          workspace_id text not null,
          timestamp integer not null
        );

        create table if not exists reasoning_assumptions (
          id text primary key,
          session_id text not null,
          description text not null,
          type text not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );

        create table if not exists reasoning_constraints (
          id text primary key,
          session_id text not null,
          description text not null,
          type text not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );

        create table if not exists reasoning_alternatives (
          id text primary key,
          session_id text not null,
          strategy_name text not null,
          rank_score real not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );

        create table if not exists reasoning_decisions (
          id text primary key,
          session_id text not null,
          recommended_strategy text not null,
          rejected_strategies text not null,
          reasoning_summary text not null,
          confidence_score real not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );

        create table if not exists reasoning_reflections (
          id text primary key,
          session_id text not null,
          outcome text not null,
          lessons text not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );

        create table if not exists reasoning_cache (
          cache_key text primary key,
          cache_type text not null,
          value text not null,
          timestamp integer not null
        );

        create table if not exists reasoning_timeline (
          id integer primary key autoincrement,
          session_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );

        create table if not exists reasoning_metrics (
          session_id text primary key,
          reasoning_latency integer not null,
          decision_quality real not null,
          confidence_accuracy real not null,
          reflection_quality real not null,
          cache_hit_rate real not null,
          foreign key(session_id) references reasoning_sessions(id) on delete cascade
        );
      `);
    } catch (e) {
      console.error("Failed to initialize RIL database tables", e);
    }
  }

  async createReasoningSession(promptId: string, plannerId: string, executionId: string, knowledgeSessionId: string, workspaceId: string): Promise<string> {
    const id = `rsess-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    
    memory.database.prepare(`
      insert into reasoning_sessions (id, prompt_id, planner_id, execution_id, knowledge_session_id, workspace_id, timestamp)
      values (?, ?, ?, ?, ?, ?, ?)
    `).run(id, promptId, plannerId, executionId, knowledgeSessionId, workspaceId, timestamp);

    this.logEvent(id, "ReasoningSessionCreated", `Reasoning session initiated for planner ${plannerId}`);

    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId: id,
      executionId,
      metadata: { event: "ReasoningSessionCreated", promptId, plannerId }
    });

    return id;
  }

  async validateGoal(sessionId: string, prompt: string): Promise<{ complete: boolean; issues: string[] }> {
    const issues: string[] = [];
    const p = prompt.toLowerCase();
    
    if (prompt.trim().length < 10) {
      issues.push("Goal prompt is too short or ambiguous");
    }
    if (p.includes("impossible") || p.includes("divide by zero") || p.includes("infinite loop")) {
      issues.push("Goal implies an impossible or hazardous logical request");
    }

    const complete = issues.length === 0;

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "GoalValidated", complete, issues }
    });

    this.logEvent(sessionId, "GoalValidated", `Goal completeness: ${complete}, issues found: ${issues.length}`);

    return { complete, issues };
  }

  async analyzeAssumptions(sessionId: string, prompt: string): Promise<ReasoningAssumption[]> {
    const assumptions: ReasoningAssumption[] = [];
    const p = prompt.toLowerCase();

    // Deduce assumptions from keywords
    if (p.includes("git")) {
      assumptions.push({
        id: `as-${crypto.randomUUID()}`,
        sessionId,
        description: "Assumes git is installed and repository is initialized.",
        type: "explicit"
      });
    }
    if (p.includes("run") || p.includes("build") || p.includes("npm")) {
      assumptions.push({
        id: `as-${crypto.randomUUID()}`,
        sessionId,
        description: "Assumes project dependencies are installed.",
        type: "implicit"
      });
    }

    memory.database.transaction(() => {
      for (const as of assumptions) {
        memory.database.prepare(`
          insert or replace into reasoning_assumptions (id, session_id, description, type)
          values (?, ?, ?, ?)
        `).run(as.id, as.sessionId, as.description, as.type);
      }
    })();

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "AssumptionsAnalyzed", count: assumptions.length }
    });

    this.logEvent(sessionId, "AssumptionsAnalyzed", `Analyzed ${assumptions.length} assumptions`);

    return assumptions;
  }

  async analyzeConstraints(sessionId: string, prompt: string): Promise<ReasoningConstraint[]> {
    const constraints: ReasoningConstraint[] = [];
    const p = prompt.toLowerCase();

    if (p.includes("security") || p.includes("sudo") || p.includes("password")) {
      constraints.push({
        id: `cn-${crypto.randomUUID()}`,
        sessionId,
        description: "Execution boundary locked to non-privileged commands.",
        type: "security"
      });
    }

    memory.database.transaction(() => {
      for (const cn of constraints) {
        memory.database.prepare(`
          insert or replace into reasoning_constraints (id, session_id, description, type)
          values (?, ?, ?, ?)
        `).run(cn.id, cn.sessionId, cn.description, cn.type);
      }
    })();

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "ConstraintsAnalyzed", count: constraints.length }
    });

    this.logEvent(sessionId, "ConstraintsAnalyzed", `Analyzed ${constraints.length} constraints`);

    return constraints;
  }

  async generateAlternatives(sessionId: string, intent: string): Promise<ReasoningAlternative[]> {
    const alternatives: ReasoningAlternative[] = [];

    if (intent === "file_analysis") {
      alternatives.push({
        id: `alt-${crypto.randomUUID()}`,
        sessionId,
        strategyName: "Use ripgrep index search",
        rankScore: 0.9
      });
      alternatives.push({
        id: `alt-${crypto.randomUUID()}`,
        sessionId,
        strategyName: "Scan all directories linearly",
        rankScore: 0.4
      });
    } else {
      alternatives.push({
        id: `alt-${crypto.randomUUID()}`,
        sessionId,
        strategyName: "Standard linear step execution",
        rankScore: 0.8
      });
    }

    memory.database.transaction(() => {
      for (const alt of alternatives) {
        memory.database.prepare(`
          insert or replace into reasoning_alternatives (id, session_id, strategy_name, rank_score)
          values (?, ?, ?, ?)
        `).run(alt.id, alt.sessionId, alt.strategyName, alt.rankScore);
      }
    })();

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "AlternativesGenerated", count: alternatives.length }
    });

    this.logEvent(sessionId, "AlternativesGenerated", `Generated ${alternatives.length} alternatives`);

    return alternatives;
  }

  async evaluateRisk(prompt: string): Promise<number> {
    const p = prompt.toLowerCase();
    let risk = 0.1;
    if (p.includes("delete") || p.includes("force") || p.includes("sudo") || p.includes("rm") || p.includes("remove")) {
      risk = 0.8;
    }
    return risk;
  }

  async estimateCost(prompt: string): Promise<{ executionTimeMs: number; modelUsageTokens: number }> {
    const p = prompt.toLowerCase();
    let executionTimeMs = 500;
    if (p.includes("build") || p.includes("install")) {
      executionTimeMs = 5000;
    }
    return {
      executionTimeMs,
      modelUsageTokens: prompt.length * 4
    };
  }

  calculateConfidence(goalValid: boolean, risk: number, cost: number): number {
    if (!goalValid) return 0.1;
    // confidence decreases with higher risks/costs
    const base = 0.95;
    return Math.max(0.2, base - (risk * 0.4) - (cost > 4000 ? 0.2 : 0.05));
  }

  buildReasoning(assumptions: ReasoningAssumption[], constraints: ReasoningConstraint[]): string {
    return `Reasoning: Plan relies on ${assumptions.length} assumptions and is bounded by ${constraints.length} constraints.`;
  }

  async makeDecision(sessionId: string, recommended: string, rejected: string[], summary: string, confidence: number): Promise<ReasoningDecision> {
    const id = `dec-${crypto.randomUUID()}`;
    const dec: ReasoningDecision = {
      id,
      sessionId,
      recommendedStrategy: recommended,
      rejectedStrategies: rejected,
      reasoningSummary: summary,
      confidenceScore: confidence
    };

    memory.database.prepare(`
      insert or replace into reasoning_decisions (id, session_id, recommended_strategy, rejected_strategies, reasoning_summary, confidence_score)
      values (?, ?, ?, ?, ?, ?)
    `).run(dec.id, dec.sessionId, dec.recommendedStrategy, JSON.stringify(dec.rejectedStrategies), dec.reasoningSummary, dec.confidenceScore);

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "DecisionMade", recommended }
    });

    this.logEvent(sessionId, "DecisionMade", `Decision: ${recommended}, confidence: ${confidence}`);

    return dec;
  }

  async reflect(sessionId: string, outcome: string, lessons: string[]): Promise<ReasoningReflection> {
    const id = `ref-${crypto.randomUUID()}`;
    const ref: ReasoningReflection = {
      id,
      sessionId,
      outcome,
      lessons
    };

    memory.database.prepare(`
      insert or replace into reasoning_reflections (id, session_id, outcome, lessons)
      values (?, ?, ?, ?)
    `).run(ref.id, ref.sessionId, ref.outcome, JSON.stringify(ref.lessons));

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "ReflectionCompleted", outcome }
    });

    this.logEvent(sessionId, "ReflectionCompleted", `Outcome: ${outcome}, lessons learned: ${lessons.length}`);

    return ref;
  }

  async critique(sessionId: string): Promise<string[]> {
    const critiques: string[] = [];
    const reflections = memory.database.prepare("select outcome, lessons from reasoning_reflections where session_id = ?").all(sessionId) as any[];
    
    for (const r of reflections) {
      if (r.outcome.includes("failed")) {
        critiques.push("The strategy encountered task execution failure. Strongly recommend alternate search indexing patterns.");
      }
    }

    const session = await this.getReasoning(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "reasoning",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "SelfCritiqueCompleted", count: critiques.length }
    });

    return critiques;
  }

  async cacheReasoning(key: string, type: string, value: string): Promise<void> {
    memory.database.prepare(`
      insert or replace into reasoning_cache (cache_key, cache_type, value, timestamp)
      values (?, ?, ?, ?)
    `).run(key, type, value, Date.now());
  }

  async getCache(key: string, type: string): Promise<string | null> {
    const row: any = memory.database.prepare("select value from reasoning_cache where cache_key = ? and cache_type = ?").get(key, type);
    return row ? row.value : null;
  }

  async getReasoning(sessionId: string): Promise<ReasoningSession | undefined> {
    const row: any = memory.database.prepare(`
      select id, prompt_id as promptId, planner_id as plannerId, execution_id as executionId, knowledge_session_id as knowledgeSessionId, workspace_id as workspaceId, timestamp
      from reasoning_sessions where id = ?
    `).get(sessionId);

    if (!row) return undefined;
    return {
      id: row.id,
      promptId: row.promptId,
      plannerId: row.plannerId,
      executionId: row.executionId,
      knowledgeSessionId: row.knowledgeSessionId,
      workspaceId: row.workspaceId,
      timestamp: row.timestamp
    };
  }

  async getTimeline(sessionId: string): Promise<ReasoningTimelineEvent[]> {
    const rows: any[] = memory.database.prepare(`
      select id, session_id as sessionId, event_name as eventName, details, timestamp
      from reasoning_timeline where session_id = ? order by id asc
    `).all(sessionId);

    return rows.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      eventName: r.eventName,
      details: r.details,
      timestamp: r.timestamp
    }));
  }

  async getMetrics(sessionId: string): Promise<ReasoningMetrics | undefined> {
    const r: any = memory.database.prepare(`
      select session_id as sessionId, reasoning_latency as reasoningLatency, decision_quality as decisionQuality, confidence_accuracy as confidenceAccuracy, reflection_quality as reflectionQuality, cache_hit_rate as cacheHitRate
      from reasoning_metrics where session_id = ?
    `).get(sessionId);

    if (!r) return undefined;
    return {
      sessionId: r.sessionId,
      reasoningLatency: r.reasoningLatency,
      decisionQuality: r.decisionQuality,
      confidenceAccuracy: r.confidenceAccuracy,
      reflectionQuality: r.reflectionQuality,
      cacheHitRate: r.cacheHitRate
    };
  }

  async saveMetrics(metrics: ReasoningMetrics): Promise<void> {
    memory.database.prepare(`
      insert or replace into reasoning_metrics (session_id, reasoning_latency, decision_quality, confidence_accuracy, reflection_quality, cache_hit_rate)
      values (?, ?, ?, ?, ?, ?)
    `).run(metrics.sessionId, metrics.reasoningLatency, metrics.decisionQuality, metrics.confidenceAccuracy, metrics.reflectionQuality, metrics.cacheHitRate);
  }

  private logEvent(sessionId: string, eventName: string, details: string): void {
    memory.database.prepare(`
      insert into reasoning_timeline (session_id, event_name, details, timestamp)
      values (?, ?, ?, ?)
    `).run(sessionId, eventName, details, Date.now());
  }
}

export const ril = new ReasoningIntelligenceLayer();
