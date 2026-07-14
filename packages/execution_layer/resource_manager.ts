import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";
import { ResourceLimitExceeded } from "./universal_interface.js";

export interface ResourcePool {
  cpu: number;
  memoryMb: number;
  gpu: number;
  diskMb: number;
  networkAllowed: boolean;
  maxConcurrency: number;
  tokenBudget: number;
  costBudget: number;
}

export interface ResourceReservation {
  id: string;
  contextId: string;
  allocatedPool: Partial<ResourcePool>;
  timestamp: string;
  released: boolean;
}

export class ResourceManager {
  private currentPool: ResourcePool = {
    cpu: 8,
    memoryMb: 16384,
    gpu: 0,
    diskMb: 10240,
    networkAllowed: true,
    maxConcurrency: 10,
    tokenBudget: 1000000,
    costBudget: 10.0
  };

  private reservations = new Map<string, ResourceReservation>();

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists resource_history (
        reservation_id text primary key,
        context_id text,
        allocated_pool text,
        allocated_at text,
        released text,
        released_at text
      );

      create table if not exists resource_snapshots (
        snapshot_id text primary key,
        pool_state text,
        timestamp text
      );

      create table if not exists resource_statistics (
        metric_name text primary key,
        value real
      );
    `);
  }

  getAvailableResources(): ResourcePool {
    const allocated = {
      cpu: 0,
      memoryMb: 0,
      gpu: 0,
      diskMb: 0,
      maxConcurrency: 0,
      tokenBudget: 0,
      costBudget: 0
    };

    for (const res of this.reservations.values()) {
      if (!res.released) {
        allocated.cpu += res.allocatedPool.cpu || 0;
        allocated.memoryMb += res.allocatedPool.memoryMb || 0;
        allocated.gpu += res.allocatedPool.gpu || 0;
        allocated.diskMb += res.allocatedPool.diskMb || 0;
        allocated.maxConcurrency += 1;
        allocated.tokenBudget += res.allocatedPool.tokenBudget || 0;
        allocated.costBudget += res.allocatedPool.costBudget || 0;
      }
    }

    return {
      cpu: Math.max(0, this.currentPool.cpu - allocated.cpu),
      memoryMb: Math.max(0, this.currentPool.memoryMb - allocated.memoryMb),
      gpu: Math.max(0, this.currentPool.gpu - allocated.gpu),
      diskMb: Math.max(0, this.currentPool.diskMb - allocated.diskMb),
      networkAllowed: this.currentPool.networkAllowed,
      maxConcurrency: Math.max(0, this.currentPool.maxConcurrency - allocated.maxConcurrency),
      tokenBudget: Math.max(0, this.currentPool.tokenBudget - allocated.tokenBudget),
      costBudget: Math.max(0, this.currentPool.costBudget - allocated.costBudget)
    };
  }

  registerResource(pool: Partial<ResourcePool>): void {
    this.currentPool = { ...this.currentPool, ...pool };
  }

  validateResources(requested: Partial<ResourcePool>): void {
    const available = this.getAvailableResources();

    if (requested.cpu && requested.cpu > available.cpu) {
      throw new ResourceLimitExceeded("Insufficient CPU resources available");
    }
    if (requested.memoryMb && requested.memoryMb > available.memoryMb) {
      throw new ResourceLimitExceeded("Insufficient RAM memory resources available");
    }
    if (requested.gpu && requested.gpu > available.gpu) {
      throw new ResourceLimitExceeded("Insufficient GPU resources available");
    }
    if (requested.diskMb && requested.diskMb > available.diskMb) {
      throw new ResourceLimitExceeded("Insufficient Disk space resources available");
    }
    if (requested.tokenBudget && requested.tokenBudget > available.tokenBudget) {
      throw new ResourceLimitExceeded("Insufficient Token capacity budget available");
    }
    if (requested.costBudget && requested.costBudget > available.costBudget) {
      throw new ResourceLimitExceeded("Insufficient Financial budget available");
    }
    if (available.maxConcurrency <= 0) {
      throw new ResourceLimitExceeded("Maximum concurrency limit reached");
    }
  }

  reserveResources(contextId: string, requested: Partial<ResourcePool>): ResourceReservation {
    // Validate first (Never partially allocate)
    this.validateResources(requested);

    const id = `res-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const reservation: ResourceReservation = {
      id,
      contextId,
      allocatedPool: requested,
      timestamp,
      released: false
    };

    this.reservations.set(id, reservation);

    memory.database.prepare(`
      insert into resource_history (reservation_id, context_id, allocated_pool, allocated_at, released, released_at)
      values (?, ?, ?, ?, ?, ?)
    `).run(id, contextId, JSON.stringify(requested), timestamp, "false", null);

    eventBus.publish({
      type: "Custom",
      contextId,
      sessionId: "resource",
      executionId: id,
      metadata: { event: "ResourcesReserved", reservationId: id, requested }
    });

    return reservation;
  }

  releaseResources(reservationId: string): void {
    const res = this.reservations.get(reservationId);
    if (res && !res.released) {
      res.released = true;
      const releasedAt = new Date().toISOString();

      memory.database.prepare(`
        update resource_history set released = ?, released_at = ? where reservation_id = ?
      `).run("true", releasedAt, reservationId);

      eventBus.publish({
        type: "Custom",
        contextId: res.contextId,
        sessionId: "resource",
        executionId: reservationId,
        metadata: { event: "ResourcesReleased", reservationId }
      });
    }
  }

  createSnapshot(snapshotId: string): void {
    const timestamp = new Date().toISOString();
    const state = {
      pool: this.currentPool,
      reservations: Array.from(this.reservations.entries())
    };

    memory.database.prepare(`
      insert or replace into resource_snapshots (snapshot_id, pool_state, timestamp)
      values (?, ?, ?)
    `).run(snapshotId, JSON.stringify(state), timestamp);

    eventBus.publish({
      type: "Custom",
      contextId: "resource",
      sessionId: "resource",
      executionId: snapshotId,
      metadata: { event: "SnapshotCreated", snapshotId }
    });
  }

  restoreSnapshot(snapshotId: string): void {
    const row = memory.database.prepare(`
      select pool_state from resource_snapshots where snapshot_id = ?
    `).get(snapshotId) as any;

    if (!row) throw new Error(`Resource snapshot '${snapshotId}' not found`);
    const state = JSON.parse(row.pool_state);

    this.currentPool = state.pool;
    this.reservations = new Map(state.reservations);

    eventBus.publish({
      type: "Custom",
      contextId: "resource",
      sessionId: "resource",
      executionId: snapshotId,
      metadata: { event: "SnapshotRestored", snapshotId }
    });
  }

  updateUsage(metricName: string, value: number) {
    memory.database.prepare(`
      insert or replace into resource_statistics (metric_name, value)
      values (?, ?)
    `).run(metricName, value);
  }

  getResourceStatistics(): Record<string, number> {
    const rows = memory.database.prepare(`select * from resource_statistics`).all() as any[];
    const stats: Record<string, number> = {};
    for (const row of rows) {
      stats[row.metric_name] = row.value;
    }
    return stats;
  }
}

export const resourceManager = new ResourceManager();
