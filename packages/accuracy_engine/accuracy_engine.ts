import { memory } from "../memory/memory_engine.js";

export interface TelemetryMetrics {
  answerAccuracy: number | null;
  toolSuccessRate: number | null;
  hallucinationRate: number | null;
  agentSuccessRate: number | null;
  memoryRetrievalRate: number | null;
  knowledgePrecision: number | null;
  routingAccuracy: number | null;
}

export class AccuracyEngine {
  private static instance: AccuracyEngine;

  private constructor() {
    this.initDatabase();
  }

  static getInstance(): AccuracyEngine {
    if (!AccuracyEngine.instance) {
      AccuracyEngine.instance = new AccuracyEngine();
    }
    return AccuracyEngine.instance;
  }

  private initDatabase() {
    try {
      memory.database.exec(`
        CREATE TABLE IF NOT EXISTS accuracy_telemetry (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp INTEGER NOT NULL,
          type TEXT NOT NULL, -- 'chat', 'tool', 'model', 'agent', 'memory', 'knowledge', 'routing'
          success INTEGER NOT NULL,
          accuracy_score REAL NOT NULL,
          hallucination_score REAL NOT NULL,
          latency_ms INTEGER NOT NULL
        );
      `);
    } catch (e) {
      console.error("Failed to initialize accuracy_telemetry table:", e);
    }
  }

  logTelemetry(type: string, success: boolean, accuracy: number, hallucination: number, latencyMs: number) {
    try {
      memory.database.prepare(`
        INSERT INTO accuracy_telemetry (timestamp, type, success, accuracy_score, hallucination_score, latency_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(Date.now(), type, success ? 1 : 0, accuracy, hallucination, latencyMs);
    } catch (e) {
      console.error("Failed to log telemetry:", e);
    }
  }

  verifyResponse(response: string, referenceContext: string): {
    accuracy: number;
    hallucinationRate: number;
    verified: "YES" | "NO";
  } {
    const contextWords = new Set(referenceContext.toLowerCase().split(/\W+/));
    const responseWords = response.toLowerCase().split(/\W+/).filter(w => w.length > 3);

    let matched = 0;
    let total = 0;

    for (const word of responseWords) {
      const isCommon = ["this", "that", "there", "their", "with", "from", "have", "about"].includes(word);
      if (!isCommon) {
        total++;
        if (contextWords.has(word)) {
          matched++;
        }
      }
    }

    const accuracy = total > 0 ? Math.round((matched / total) * 100) : 100;
    const hallucinationRate = 100 - accuracy;
    const verified = accuracy >= 85 ? "YES" : "NO";

    return { accuracy, hallucinationRate, verified };
  }

  getMetrics(): TelemetryMetrics {
    try {
      const getRate = (type: string): number | null => {
        const row = memory.database.prepare(
          "SELECT AVG(success) * 100 as rate FROM accuracy_telemetry WHERE type = ?"
        ).get(type) as any;
        return row && row.rate !== null ? Math.round(row.rate) : null;
      };

      const getAvgScore = (type: string, field: string): number | null => {
        const row = memory.database.prepare(
          `SELECT AVG(${field}) as score FROM accuracy_telemetry WHERE type = ?`
        ).get(type) as any;
        return row && row.score !== null ? Math.round(row.score) : null;
      };

      return {
        answerAccuracy: getAvgScore("chat", "accuracy_score"),
        toolSuccessRate: getRate("tool"),
        hallucinationRate: getAvgScore("chat", "hallucination_score"),
        agentSuccessRate: getRate("agent"),
        memoryRetrievalRate: getRate("memory"),
        knowledgePrecision: getRate("knowledge"),
        routingAccuracy: getRate("routing")
      };
    } catch (e) {
      return {
        answerAccuracy: null,
        toolSuccessRate: null,
        hallucinationRate: null,
        agentSuccessRate: null,
        memoryRetrievalRate: null,
        knowledgePrecision: null,
        routingAccuracy: null
      };
    }
  }
}

export const accuracyEngine = AccuracyEngine.getInstance();
