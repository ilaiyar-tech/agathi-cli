import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";

export interface ExecutionPolicy {
  maxRetries: number;
  verificationPolicy: "strict" | "loose" | "none";
  parallelAllowed: boolean;
  toolPreferences: string[];
  plannerPreferences: string[];
  reflectionRequired: boolean;
}

export interface StrategyDecision {
  strategyId: string;
  strategyName: string;
  confidence: number;
  reason: string;
  executionPolicy: ExecutionPolicy;
  parallelism: boolean;
  riskLevel: "low" | "medium" | "high";
  fallbackStrategies: string[];
}

export class StrategyEngine {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists strategy_history (
        goal_id text primary key,
        strategy_id text,
        outcome text,
        retries integer,
        duration integer,
        timestamp text
      );

      create table if not exists strategy_statistics (
        strategy_id text primary key,
        success_count integer,
        failure_count integer,
        avg_duration real,
        avg_retries real
      );
    `);
  }

  evaluateGoal(goal: string): { riskLevel: "low" | "medium" | "high"; category: string } {
    const lower = goal.toLowerCase();
    let riskLevel: "low" | "medium" | "high" = "low";
    let category = "Automation";

    if (lower.includes("build") || lower.includes("create") || lower.includes("write")) {
      riskLevel = "medium";
      category = "Feature Development";
    }
    if (lower.includes("refactor") || lower.includes("optimize")) {
      riskLevel = "high";
      category = "Code Refactor";
    }
    if (lower.includes("fix") || lower.includes("bug") || lower.includes("error")) {
      riskLevel = "medium";
      category = "Bug Fix";
    }
    if (lower.includes("test") || lower.includes("lint")) {
      riskLevel = "low";
      category = "Testing";
    }

    return { riskLevel, category };
  }

  evaluateWorkspace(): { sizeClass: "small" | "large" } {
    return { sizeClass: "small" };
  }

  evaluateHistory(strategyId: string): { successRate: number; avgRetries: number } {
    const row = memory.database.prepare(`
      select * from strategy_statistics where strategy_id = ?
    `).get(strategyId) as any;

    if (!row) return { successRate: 1.0, avgRetries: 0 };
    const total = row.success_count + row.failure_count;
    const successRate = total > 0 ? row.success_count / total : 1.0;
    return { successRate, avgRetries: row.avg_retries };
  }

  rankStrategies(category: string, riskLevel: string, successRate: number): string[] {
    const list = [category];
    
    // Ranked list of general categories to fall back to
    const alternates = [
      "Bug Fix",
      "Feature Development",
      "Code Refactor",
      "Testing",
      "Automation"
    ].filter(c => c !== category);

    list.push(...alternates);
    return list;
  }

  selectStrategy(ranked: string[]): string {
    if (ranked.length === 0) throw new Error("StrategyEngine: Ranked list is empty");
    return ranked[0];
  }

  getFallbackStrategies(ranked: string[]): string[] {
    return ranked.slice(1);
  }

  buildExecutionPolicy(strategyId: string, riskLevel: "low" | "medium" | "high"): ExecutionPolicy {
    const maxRetries = riskLevel === "high" ? 5 : riskLevel === "medium" ? 3 : 2;
    const verificationPolicy = riskLevel === "high" ? "strict" : "loose";
    const parallelAllowed = riskLevel !== "high";

    const toolPreferences = ["read_file", "search_files"];
    if (strategyId === "Feature Development" || strategyId === "Code Refactor") {
      toolPreferences.push("write_file", "replace_file_content");
    }

    return {
      maxRetries,
      verificationPolicy,
      parallelAllowed,
      toolPreferences,
      plannerPreferences: ["default"],
      reflectionRequired: true
    };
  }

  recordStrategyResult(goalId: string, strategyId: string, outcome: "success" | "failure", retries: number, duration: number) {
    const timestamp = new Date().toISOString();
    
    memory.database.prepare(`
      insert or replace into strategy_history (goal_id, strategy_id, outcome, retries, duration, timestamp)
      values (?, ?, ?, ?, ?, ?)
    `).run(goalId, strategyId, outcome, retries, duration, timestamp);

    // Update Statistics
    const row = memory.database.prepare(`
      select * from strategy_statistics where strategy_id = ?
    `).get(strategyId) as any;

    let success_count = outcome === "success" ? 1 : 0;
    let failure_count = outcome === "failure" ? 1 : 0;
    let avg_duration = duration;
    let avg_retries = retries;

    if (row) {
      const prevTotal = row.success_count + row.failure_count;
      success_count += row.success_count;
      failure_count += row.failure_count;
      const newTotal = prevTotal + 1;
      avg_duration = (row.avg_duration * prevTotal + duration) / newTotal;
      avg_retries = (row.avg_retries * prevTotal + retries) / newTotal;
    }

    memory.database.prepare(`
      insert or replace into strategy_statistics (strategy_id, success_count, failure_count, avg_duration, avg_retries)
      values (?, ?, ?, ?, ?)
    `).run(strategyId, success_count, failure_count, avg_duration, avg_retries);

    eventBus.publish({
      type: "Custom",
      contextId: "strategy",
      sessionId: "strategy",
      executionId: "strategy",
      metadata: { event: "StrategyCompleted", goalId, strategyId, outcome }
    });
  }

  decide(goalId: string, goal: string): StrategyDecision {
    eventBus.publish({
      type: "Custom",
      contextId: "strategy",
      sessionId: "strategy",
      executionId: "strategy",
      metadata: { event: "StrategyEvaluationStarted", goalId }
    });

    const { riskLevel, category } = this.evaluateGoal(goal);
    const history = this.evaluateHistory(category);

    const ranked = this.rankStrategies(category, riskLevel, history.successRate);
    const strategyId = this.selectStrategy(ranked);
    const fallbackStrategies = this.getFallbackStrategies(ranked);
    const executionPolicy = this.buildExecutionPolicy(strategyId, riskLevel);

    eventBus.publish({
      type: "Custom",
      contextId: "strategy",
      sessionId: "strategy",
      executionId: "strategy",
      metadata: { event: "StrategySelected", goalId, strategyId }
    });

    if (fallbackStrategies.length > 0) {
      eventBus.publish({
        type: "Custom",
        contextId: "strategy",
        sessionId: "strategy",
        executionId: "strategy",
        metadata: { event: "FallbackGenerated", goalId, fallbacksCount: fallbackStrategies.length }
      });
    }

    return {
      strategyId,
      strategyName: strategyId,
      confidence: history.successRate,
      reason: `Evaluated goal type '${category}' with risk level '${riskLevel}'`,
      executionPolicy,
      parallelism: executionPolicy.parallelAllowed,
      riskLevel,
      fallbackStrategies
    };
  }
}

export const strategyEngine = new StrategyEngine();
