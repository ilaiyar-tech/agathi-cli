import { logger } from "../logger/index.js";

export interface TelemetryRecord {
  sessionId: string;
  intent: string;
  executionDurationMs: number;
  plannerDurationMs: number;
  toolDurationMs: number;
  verificationDurationMs: number;
  failures: number;
  retries: number;
  cancellations: number;
  timeouts: number;
  success: boolean;
}

export class RuntimeTelemetry {
  private static records: TelemetryRecord[] = [];

  static record(data: TelemetryRecord) {
    this.records.push(data);
    logger.info({ telemetry: data }, "Telemetry recorded");
  }

  static getRecords(): TelemetryRecord[] {
    return this.records;
  }

  static getAverageDuration(intent: string): number {
    const matching = this.records.filter(r => r.intent === intent);
    if (matching.length === 0) return 0;
    const sum = matching.reduce((acc, r) => acc + r.executionDurationMs, 0);
    return sum / matching.length;
  }
}
