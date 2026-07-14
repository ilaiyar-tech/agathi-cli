import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";

export type ConnectorHealthStatus = "healthy" | "degraded" | "offline" | "unknown";
export type AuthType = "none" | "ApiKey" | "BearerToken" | "OAuth2" | "BasicAuth" | "SSHKey" | "Custom";

export interface ConnectorManifest {
  id: string;
  name: string;
  type: string;
  authType: AuthType;
  metadata: Record<string, any>;
}

export interface ConnectorRequest {
  connectorId: string;
  operation: string;
  parameters: Record<string, any>;
  timeout: number;
  metadata?: Record<string, any>;
}

export interface ConnectorResponse {
  success: boolean;
  status: "Completed" | "Failed" | "TimedOut";
  data: Record<string, any>;
  artifacts: string[];
  logs: string[];
  metrics: {
    durationMs: number;
  };
  duration: number;
  error?: string;
}

export interface UniversalConnector {
  manifest: ConnectorManifest;
  initialize(): Promise<void>;
  connect(authMetadata: Record<string, any>): Promise<void>;
  healthCheck(): Promise<ConnectorHealthStatus>;
  execute(req: ConnectorRequest): Promise<ConnectorResponse>;
  disconnect(): Promise<void>;
  cleanup(): Promise<void>;
  shutdown(): Promise<void>;
}

export class ConnectorFramework {
  private connectors = new Map<string, UniversalConnector>();

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists connector_registry (
        connector_id text primary key,
        name text,
        type text,
        health_status text,
        metadata text
      );

      create table if not exists connector_history (
        id text primary key,
        connector_id text,
        operation text,
        success text,
        duration integer,
        timestamp text
      );

      create table if not exists connector_statistics (
        connector_id text primary key,
        success_count integer,
        failure_count integer
      );
    `);
  }

  registerConnector(connectorId: string, conn: UniversalConnector): void {
    this.connectors.set(connectorId, conn);

    memory.database.prepare(`
      insert or replace into connector_registry (connector_id, name, type, health_status, metadata)
      values (?, ?, ?, ?, ?)
    `).run(
      connectorId,
      conn.manifest.name,
      conn.manifest.type,
      "unknown",
      JSON.stringify(conn.manifest.metadata)
    );

    eventBus.publish({
      type: "Custom",
      contextId: "connector",
      sessionId: "connector",
      executionId: connectorId,
      metadata: { event: "ConnectorRegistered", connectorId }
    });
  }

  unregisterConnector(connectorId: string): void {
    this.connectors.delete(connectorId);
    memory.database.prepare(`delete from connector_registry where connector_id = ?`).run(connectorId);
  }

  async connect(connectorId: string, authMetadata: Record<string, any>): Promise<void> {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error(`Connector '${connectorId}' not found`);

    await conn.connect(authMetadata);

    eventBus.publish({
      type: "Custom",
      contextId: "connector",
      sessionId: "connector",
      executionId: connectorId,
      metadata: { event: "ConnectorConnected", connectorId }
    });
  }

  async disconnect(connectorId: string): Promise<void> {
    const conn = this.connectors.get(connectorId);
    if (conn) {
      await conn.disconnect();
      eventBus.publish({
        type: "Custom",
        contextId: "connector",
        sessionId: "connector",
        executionId: connectorId,
        metadata: { event: "ConnectorDisconnected", connectorId }
      });
    }
  }

  async healthCheck(connectorId: string): Promise<ConnectorHealthStatus> {
    const conn = this.connectors.get(connectorId);
    if (!conn) return "unknown";

    const status = await conn.healthCheck();

    memory.database.prepare(`
      update connector_registry set health_status = ? where connector_id = ?
    `).run(status, connectorId);

    eventBus.publish({
      type: "Custom",
      contextId: "connector",
      sessionId: "connector",
      executionId: connectorId,
      metadata: { event: "ConnectorHealthChanged", connectorId, healthStatus: status }
    });

    return status;
  }

  async execute(connectorId: string, req: ConnectorRequest): Promise<ConnectorResponse> {
    const conn = this.connectors.get(connectorId);
    if (!conn) throw new Error(`Connector '${connectorId}' not registered`);

    eventBus.publish({
      type: "Custom",
      contextId: "connector",
      sessionId: "connector",
      executionId: connectorId,
      metadata: { event: "ConnectorExecutionStarted", connectorId, operation: req.operation }
    });

    const startTime = Date.now();
    try {
      const response = await conn.execute(req);
      const duration = Date.now() - startTime;

      const finalizedRes = {
        ...response,
        duration,
        metrics: { durationMs: duration }
      };

      this.recordResult(connectorId, req.operation, finalizedRes.success, duration);

      eventBus.publish({
        type: "Custom",
        contextId: "connector",
        sessionId: "connector",
        executionId: connectorId,
        metadata: { event: "ConnectorExecutionCompleted", connectorId, operation: req.operation }
      });

      return finalizedRes;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordResult(connectorId, req.operation, false, duration);

      eventBus.publish({
        type: "Custom",
        contextId: "connector",
        sessionId: "connector",
        executionId: connectorId,
        metadata: { event: "ConnectorExecutionFailed", connectorId, operation: req.operation, error: error instanceof Error ? error.message : "Unknown error" }
      });

      return {
        success: false,
        status: "Failed",
        data: {},
        artifacts: [],
        logs: [],
        metrics: { durationMs: duration },
        duration,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  getConnector(connectorId: string): UniversalConnector | undefined {
    return this.connectors.get(connectorId);
  }

  listConnectors(): UniversalConnector[] {
    return Array.from(this.connectors.values());
  }

  validateRequest(connectorId: string, req: ConnectorRequest): boolean {
    const conn = this.connectors.get(connectorId);
    if (!conn) return false;
    return !!req.operation && !!req.parameters;
  }

  private recordResult(connectorId: string, operation: string, success: boolean, duration: number) {
    const id = `rec-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    memory.database.prepare(`
      insert into connector_history (id, connector_id, operation, success, duration, timestamp)
      values (?, ?, ?, ?, ?, ?)
    `).run(id, connectorId, operation, success ? "true" : "false", duration, timestamp);

    // Update Statistics
    const row = memory.database.prepare(`
      select * from connector_statistics where connector_id = ?
    `).get(connectorId) as any;

    let success_count = success ? 1 : 0;
    let failure_count = success ? 0 : 1;

    if (row) {
      success_count += row.success_count;
      failure_count += row.failure_count;
    }

    memory.database.prepare(`
      insert or replace into connector_statistics (connector_id, success_count, failure_count)
      values (?, ?, ?)
    `).run(connectorId, success_count, failure_count);
  }
}

export const connectorFramework = new ConnectorFramework();
