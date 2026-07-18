import { eventBus } from "../core/event_bus.js";
import { sessions } from "../session_manager/index.js";
import { scheduler } from "../task_scheduler/index.js";
import { accuracyEngine } from "../accuracy_engine/index.js";
import { get_active_model, model_usage } from "../model_manager/index.js";
import { ConnectionManager } from "./connection_manager.js";

export interface SystemStatusData {
  connection: "Connecting" | "Connected" | "Disconnected" | "Reconnecting" | "Degraded";
  lastConnected: string;
  lastHeartbeat: string;
  latencyMs: number;
  reconnectAttempts: number;
  rss: number;
  activeModel: string;
  modelLoaded: boolean;
  modelFootprint: number;
  sessionCount: number;
  activeSessionId: string;
  sqliteHealth: string;
  runningJobs: number;
  queuedJobs: number;
  workerCount: number;
  accuracy: {
    answerAccuracy: number | null;
    toolSuccessRate: number | null;
    hallucinationRate: number | null;
    agentSuccessRate: number | null;
    memoryRetrievalRate: number | null;
    knowledgePrecision: number | null;
    routingAccuracy: number | null;
  };
}

export class RuntimeStatusService {
  private static interval: NodeJS.Timeout | null = null;
  private static currentStatus: SystemStatusData = this.collectInitialStatus();

  static start(refreshIntervalMs = 3000) {
    if (this.interval) return;

    const check = async () => {
      // 1. Run real connection monitoring
      await ConnectionManager.monitor();
      // 2. Refresh other system telemetry
      this.updateStatus();
    };

    check();
    this.interval = setInterval(check, refreshIntervalMs);
  }

  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  static getStatus(): SystemStatusData {
    return this.currentStatus;
  }

  private static collectInitialStatus(): SystemStatusData {
    return {
      connection: "Connecting",
      lastConnected: "Never",
      lastHeartbeat: "Never",
      latencyMs: 0,
      reconnectAttempts: 0,
      rss: process.memoryUsage().rss,
      activeModel: "unknown",
      modelLoaded: false,
      modelFootprint: 0,
      sessionCount: 0,
      activeSessionId: "default",
      sqliteHealth: "Healthy",
      runningJobs: 0,
      queuedJobs: 0,
      workerCount: 1,
      accuracy: {
        answerAccuracy: null,
        toolSuccessRate: null,
        hallucinationRate: null,
        agentSuccessRate: null,
        memoryRetrievalRate: null,
        knowledgePrecision: null,
        routingAccuracy: null
      }
    };
  }

  private static updateStatus() {
    let activeModel = "unknown";
    let modelLoaded = false;
    let modelFootprint = 0;
    try {
      activeModel = get_active_model();
      const usage = model_usage();
      modelLoaded = usage.loaded;
      modelFootprint = usage.size;
    } catch (e) {}

    let sessionCount = 0;
    let activeSessionId = "default";
    try {
      const list = sessions.list_sessions();
      sessionCount = list.length;
      activeSessionId = list.find((s: any) => s.metadata?.active)?.id || "default";
    } catch (e) {}

    let runningJobs = 0;
    let queuedJobs = 0;
    try {
      const tasksMap = (scheduler as any).tasks as Map<string, any>;
      runningJobs = tasksMap ? tasksMap.size : 0;
      queuedJobs = runningJobs > 0 ? runningJobs : 0;
    } catch (e) {}

    let metrics: any = {
      answerAccuracy: null,
      toolSuccessRate: null,
      hallucinationRate: null,
      agentSuccessRate: null,
      memoryRetrievalRate: null,
      knowledgePrecision: null,
      routingAccuracy: null
    };
    try {
      metrics = accuracyEngine.getMetrics();
    } catch (e) {}

    const conn = ConnectionManager.getStatus();

    this.currentStatus = {
      connection: conn.status,
      lastConnected: conn.lastConnected,
      lastHeartbeat: conn.lastHeartbeat,
      latencyMs: conn.latencyMs,
      reconnectAttempts: conn.reconnectAttempts,
      rss: process.memoryUsage().rss,
      activeModel,
      modelLoaded,
      modelFootprint,
      sessionCount,
      activeSessionId,
      sqliteHealth: "Healthy",
      runningJobs,
      queuedJobs,
      workerCount: 1,
      accuracy: metrics
    };

    eventBus.emitEvent("STATUS_UPDATE", { status: this.currentStatus });
  }
}
