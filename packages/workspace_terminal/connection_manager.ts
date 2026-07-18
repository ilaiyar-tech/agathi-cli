import axios from "axios";
import { memory } from "../memory/memory_engine.js";

export interface ConnectionStatusInfo {
  status: "Connecting" | "Connected" | "Reconnecting" | "Disconnected" | "Degraded";
  lastConnected: string;
  lastHeartbeat: string;
  latencyMs: number;
  reconnectAttempts: number;
}

export class ConnectionManager {
  private static status: ConnectionStatusInfo = {
    status: "Connecting",
    lastConnected: "Never",
    lastHeartbeat: "Never",
    latencyMs: 0,
    reconnectAttempts: 0
  };

  private static backendUrl = process.env.BACKEND_URL || "http://localhost:8100";
  private static connectTime: Date | null = null;
  private static heartbeatTime: Date | null = null;

  static getStatus(): ConnectionStatusInfo {
    return this.status;
  }

  static async monitor(): Promise<ConnectionStatusInfo> {
    const startTime = Date.now();
    let apiHealthy = false;
    let providerHealthy = false;
    let dbHealthy = false;

    try {
      const apiRes = await axios.get(`${this.backendUrl}/health`, { timeout: 1000 });
      if (apiRes.status === 200) {
        apiHealthy = true;
      }
    } catch (e) {}

    try {
      const provRes = await axios.get(`${this.backendUrl}/providers/health`, { timeout: 1000 });
      if (provRes.status === 200) {
        providerHealthy = true;
      }
    } catch (e) {}

    try {
      const testRow = memory.database.prepare("SELECT 1").get();
      if (testRow) {
        dbHealthy = true;
      }
    } catch (e) {}

    const latency = Date.now() - startTime;
    const prevStatus = this.status.status;
    let currentStatus: "Connecting" | "Connected" | "Reconnecting" | "Disconnected" | "Degraded" = "Disconnected";

    if (apiHealthy && providerHealthy && dbHealthy) {
      currentStatus = "Connected";
      if (!this.connectTime) {
        this.connectTime = new Date();
      }
      this.heartbeatTime = new Date();
      this.status.reconnectAttempts = 0;
    } else if (apiHealthy || providerHealthy || dbHealthy) {
      currentStatus = "Degraded";
      this.heartbeatTime = new Date();
    } else {
      if (prevStatus === "Connected" || prevStatus === "Degraded") {
        currentStatus = "Reconnecting";
        this.status.reconnectAttempts++;
      } else {
        currentStatus = "Disconnected";
        this.status.reconnectAttempts++;
      }
    }

    this.status = {
      status: currentStatus,
      lastConnected: this.connectTime ? this.connectTime.toLocaleTimeString() : "Never",
      lastHeartbeat: this.heartbeatTime ? this.heartbeatTime.toLocaleTimeString() : "Never",
      latencyMs: latency,
      reconnectAttempts: this.status.reconnectAttempts
    };

    return this.status;
  }
}
