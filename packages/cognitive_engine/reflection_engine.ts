import { eventBus } from "../context_engine/event_bus.js";
import { cognitiveMemory, MemoryRecord } from "./cognitive_memory.js";

export interface ReflectionContext {
  goalId: string;
  contextId: string;
  executionId: string;
  goalTitle: string;
  success: boolean;
  toolOutputs: string[];
  verificationIssues: string[];
  workspaceDiff?: string;
}

export interface ReflectionResult {
  summary: string;
  success: boolean;
  rootCauses: string[];
  lessons: string[];
  patterns: string[];
  recommendations: string[];
  confidence: number;
  memoryCandidates: Omit<MemoryRecord, "createdAt" | "updatedAt" | "usageCount">[];
}

export class ReflectionEngine {
  analyzeOutcome(ctx: ReflectionContext): { rating: number; success: boolean } {
    const success = ctx.success && ctx.verificationIssues.length === 0;
    const rating = success ? 1.0 : 0.2;
    return { rating, success };
  }

  analyzeRootCause(ctx: ReflectionContext): string[] {
    const causes: string[] = [];
    if (ctx.verificationIssues.length > 0) {
      causes.push("Verification Failures");
    }
    const toolsStr = ctx.toolOutputs.join(" ").toLowerCase();
    if (toolsStr.includes("error") || toolsStr.includes("fail") || toolsStr.includes("exit code: 1")) {
      causes.push("Execution Errors");
    }
    return causes;
  }

  generateLessons(ctx: ReflectionContext, causes: string[]): string[] {
    const lessons: string[] = [];
    if (!ctx.success) {
      lessons.push(`Goal '${ctx.goalTitle}' failed. Ensure verification checks cover: ${ctx.verificationIssues.join(", ") || "execution outcomes"}`);
    } else {
      lessons.push(`Goal '${ctx.goalTitle}' succeeded. Capture the tool configurations as a successful pattern.`);
    }
    for (const cause of causes) {
      lessons.push(`Mitigate cause '${cause}' in subsequent planning loops by checking environment constraints.`);
    }
    return lessons;
  }

  detectPatterns(ctx: ReflectionContext): string[] {
    const patterns: string[] = [];
    const lowerTitle = ctx.goalTitle.toLowerCase();
    if (lowerTitle.includes("server") || lowerTitle.includes("listen")) {
      patterns.push("Architecture Patterns (Port Bindings)");
    }
    if (lowerTitle.includes("db") || lowerTitle.includes("database")) {
      patterns.push("Coding Patterns (Data Layer Connection)");
    }
    return patterns;
  }

  buildMemoryRecommendations(
    ctx: ReflectionContext,
    lessons: string[],
    patterns: string[]
  ): Omit<MemoryRecord, "createdAt" | "updatedAt" | "usageCount">[] {
    const list: Omit<MemoryRecord, "createdAt" | "updatedAt" | "usageCount">[] = [];

    // Map lessons learned candidate
    for (let i = 0; i < lessons.length; i++) {
      list.push({
        id: `rec-lesson-${ctx.goalId}-${i}`,
        contextId: ctx.contextId,
        workspaceId: "default",
        goalId: ctx.goalId,
        executionId: ctx.executionId,
        category: "Lesson Learned",
        title: `Lesson: ${ctx.goalTitle} [Part ${i + 1}]`,
        summary: lessons[i].slice(0, 100),
        details: lessons[i],
        confidence: 0.85,
        importance: 0.75,
        tags: ["reflection", "lesson"],
        source: "reflection_pipeline"
      });
    }

    // Map successful / failed patterns candidates
    for (let i = 0; i < patterns.length; i++) {
      list.push({
        id: `rec-pattern-${ctx.goalId}-${i}`,
        contextId: ctx.contextId,
        workspaceId: "default",
        goalId: ctx.goalId,
        executionId: ctx.executionId,
        category: ctx.success ? "Successful Strategy" : "Failed Strategy",
        title: `Strategy: ${patterns[i]}`,
        summary: `Reflected pattern for: ${patterns[i]}`,
        details: `Goal context details: Title: ${ctx.goalTitle}, outcome success: ${ctx.success}`,
        confidence: 0.90,
        importance: 0.80,
        tags: ["pattern", ctx.success ? "success" : "failure"],
        source: "reflection_pipeline"
      });
    }

    return list;
  }

  reflect(ctx: ReflectionContext): ReflectionResult {
    const startTime = Date.now();

    eventBus.publish({
      type: "Custom",
      contextId: ctx.contextId,
      sessionId: "reflection",
      executionId: ctx.executionId,
      metadata: { event: "ReflectionStarted", goalId: ctx.goalId }
    });

    const { success } = this.analyzeOutcome(ctx);
    const rootCauses = this.analyzeRootCause(ctx);
    const lessons = this.generateLessons(ctx, rootCauses);
    
    eventBus.publish({
      type: "Custom",
      contextId: ctx.contextId,
      sessionId: "reflection",
      executionId: ctx.executionId,
      metadata: { event: "LessonsGenerated", goalId: ctx.goalId, count: lessons.length }
    });

    const patterns = this.detectPatterns(ctx);

    eventBus.publish({
      type: "Custom",
      contextId: ctx.contextId,
      sessionId: "reflection",
      executionId: ctx.executionId,
      metadata: { event: "PatternsDetected", goalId: ctx.goalId, count: patterns.length }
    });

    const memoryCandidates = this.buildMemoryRecommendations(ctx, lessons, patterns);

    eventBus.publish({
      type: "Custom",
      contextId: ctx.contextId,
      sessionId: "reflection",
      executionId: ctx.executionId,
      metadata: { event: "MemoryRecommendationsCreated", goalId: ctx.goalId, candidatesCount: memoryCandidates.length }
    });

    // Commit memory recommendations to Cognitive Memory Database
    for (const candidate of memoryCandidates) {
      cognitiveMemory.storeMemory(candidate);
    }

    const duration = Date.now() - startTime;

    eventBus.publish({
      type: "Custom",
      contextId: ctx.contextId,
      sessionId: "reflection",
      executionId: ctx.executionId,
      metadata: { event: "ReflectionCompleted", goalId: ctx.goalId, reflectionTimeMs: duration }
    });

    return {
      summary: `Reflection compiled successfully for goal: ${ctx.goalTitle}`,
      success,
      rootCauses,
      lessons,
      patterns,
      recommendations: memoryCandidates.map(c => c.title),
      confidence: success ? 0.95 : 0.70,
      memoryCandidates
    };
  }
}

export const reflectionEngine = new ReflectionEngine();
