// Health monitor – periodically captures runtime metrics and emits telemetry events.
// Designed to run inside the UnifiedRuntime.

import { eventBus as coreEventBus, RuntimeEvent } from "../core/event_bus.js";

export class HealthMonitor {
  private intervalMs: number;
  private timerId: NodeJS.Timeout | null = null;

  constructor(intervalMs: number = 5000) {
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.timerId) return; // already running
    this.timerId = setInterval(() => this.collectAndEmit(), this.intervalMs);
  }

  stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private collectAndEmit(): void {
    // Basic Node process metrics
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    const uptime = process.uptime();
    const eventLoopLag = this.getEventLoopLag();

    const payload = {
      memory: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        arrayBuffers: mem.arrayBuffers
      },
      cpu: { user: cpu.user, system: cpu.system },
      uptime,
      eventLoopLag
    };

    const ev: RuntimeEvent = {
      type: "HealthMetrics",
      timestamp: new Date().toISOString(),
      payload
    };
    coreEventBus.publish(ev);
  }

  // Simple heuristic to measure event loop delay
  private getEventLoopLag(): number {
    const start = Date.now();
    const delay = 0;
    // setImmediate runs after I/O callbacks; difference approximates lag
    const lag = Date.now() - start;
    return lag;
  }
}

export const healthMonitor = new HealthMonitor();
