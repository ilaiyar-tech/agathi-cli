import { EventEmitter } from "node:events";

export type EventType =
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "TASK_FAILED"
  | "FILE_READ"
  | "FILE_WRITTEN"
  | "BUILD_STARTED"
  | "BUILD_FAILED"
  | "BUILD_SUCCEEDED"
  | "MODEL_SWITCHED"
  | "ZIP_CREATED"
  | "DOWNLOAD_READY"
  | "PLUGIN_TRIGGERED"
  | "TOOL_PROGRESS"
  | "STATUS_UPDATE"
  | "Custom"
  | "ExecutionStarted"
  | "StateChanged"
  | "ExecutionPaused"
  | "ExecutionResumed"
  | "ExecutionCompleted"
  | "ExecutionCancelled"
  | "ExecutionFailed"
  | "RecoveryStarted"
  | "RecoveryCompleted"
  | "SessionCreated"
  | "WorkspaceIndexed"
  | "ToolExecuted"
  | "PromptBuilt"
  | "StateTransitioned"
  | "VerificationFailed"
  | "RecoveryTriggered";

export interface RuntimeEvent {
  type: EventType | string;
  timestamp: string;
  payload: Record<string, any>;
  id?: string;
  parentId?: string;
  metadata?: Record<string, any>;
}

export class CoreEventBus extends EventEmitter {
  private history: RuntimeEvent[] = [];
  private maxHistorySize = 1000;
  private telemetryStats = {
    totalPublished: 0,
    byType: new Map<string, number>(),
    errors: 0
  };

  constructor() {
    super();
    // Allow unlimited listeners
    this.setMaxListeners(0);
  }

  // Unified Publish API
  publish(event: RuntimeEvent): void {
    const enrichedEvent: RuntimeEvent = {
      id: event.id || `evt-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      ...event
    };

    // Log in replay history
    this.history.push(enrichedEvent);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Update telemetry stats
    this.telemetryStats.totalPublished++;
    const count = this.telemetryStats.byType.get(enrichedEvent.type) || 0;
    this.telemetryStats.byType.set(enrichedEvent.type, count + 1);

    // Emit event on EventEmitter
    try {
      this.emit(enrichedEvent.type, enrichedEvent);
      this.emit("*", enrichedEvent);
    } catch (err) {
      this.telemetryStats.errors++;
      console.error(`[CoreEventBus] Error in listener execution:`, err);
    }
  }

  // Async Publish API
  async publishAsync(event: RuntimeEvent): Promise<void> {
    const enrichedEvent: RuntimeEvent = {
      id: event.id || `evt-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: event.timestamp || new Date().toISOString(),
      ...event
    };

    // Log in replay history
    this.history.push(enrichedEvent);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.telemetryStats.totalPublished++;
    const count = this.telemetryStats.byType.get(enrichedEvent.type) || 0;
    this.telemetryStats.byType.set(enrichedEvent.type, count + 1);

    // Call listeners asynchronously and wait for all to settle
    const listeners = this.listeners(enrichedEvent.type).concat(this.listeners("*"));
    const promises = listeners.map(async (listener) => {
      try {
        await listener(enrichedEvent);
      } catch (err) {
        this.telemetryStats.errors++;
        console.error(`[CoreEventBus] Error in async listener execution:`, err);
      }
    });

    await Promise.all(promises);
  }

  // Subscribe API
  subscribe<T extends EventType | string>(
    type: T,
    listener: (event: RuntimeEvent) => void | Promise<void>
  ): () => void {
    this.on(type, listener);
    return () => {
      this.off(type, listener);
    };
  }

  // Event Replay Support
  getHistory(type?: string): RuntimeEvent[] {
    if (type) {
      return this.history.filter(e => e.type === type);
    }
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }

  // Event Tracing (trace causality chain based on parentId)
  getTracingChain(eventId: string): RuntimeEvent[] {
    const chain: RuntimeEvent[] = [];
    let current = this.history.find(e => e.id === eventId);
    while (current) {
      chain.unshift(current);
      if (current.parentId) {
        current = this.history.find(e => e.id === current?.parentId);
      } else {
        break;
      }
    }
    return chain;
  }

  // Telemetry API
  getTelemetry() {
    return {
      totalPublished: this.telemetryStats.totalPublished,
      errors: this.telemetryStats.errors,
      eventsByType: Object.fromEntries(this.telemetryStats.byType.entries())
    };
  }

  // Backward-compatible method
  emitEvent(type: EventType | string, payload: Record<string, any> = {}) {
    this.publish({
      type,
      timestamp: new Date().toISOString(),
      payload
    });
  }
}

export const eventBus = new CoreEventBus();
export const event_bus = CoreEventBus;
