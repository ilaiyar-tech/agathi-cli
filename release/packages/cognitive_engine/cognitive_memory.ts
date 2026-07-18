import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";

export type MemoryCategory = 
  | "Lesson Learned"
  | "Successful Strategy"
  | "Failed Strategy"
  | "Coding Pattern"
  | "Architecture Pattern"
  | "User Preference"
  | "Project Knowledge"
  | "Execution Statistics"
  | "Recovered Failure";

export interface MemoryRecord {
  id: string;
  contextId: string;
  workspaceId: string;
  goalId: string;
  executionId: string;
  category: MemoryCategory;
  title: string;
  summary: string;
  details: string;
  confidence: number;
  importance: number;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
  usageCount: number;
  embeddingId?: string;
}

export class CognitiveMemory {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists cognitive_memories (
        id text primary key,
        context_id text,
        workspace_id text,
        goal_id text,
        execution_id text,
        category text,
        title text,
        summary text,
        details text,
        confidence real,
        importance real,
        source text,
        created_at text,
        updated_at text,
        last_used text,
        usage_count integer,
        embedding_id text
      );

      create table if not exists memory_tags (
        memory_id text,
        tag text,
        primary key (memory_id, tag)
      );

      create table if not exists memory_usage (
        id text primary key,
        memory_id text,
        used_at text,
        feedback text
      );
    `);
  }

  storeMemory(record: Omit<MemoryRecord, "createdAt" | "updatedAt" | "usageCount">): MemoryRecord {
    // Duplicate Prevention & Merge
    const dup = this.findDuplicate(record.category, record.title);
    if (dup) {
      return this.mergeMemories(dup.id, record);
    }

    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;
    const usageCount = 0;
    const newRecord: MemoryRecord = { ...record, createdAt, updatedAt, usageCount };

    memory.database.prepare(`
      insert into cognitive_memories (id, context_id, workspace_id, goal_id, execution_id, category, title, summary, details, confidence, importance, source, created_at, updated_at, last_used, usage_count, embedding_id)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newRecord.id,
      newRecord.contextId,
      newRecord.workspaceId,
      newRecord.goalId,
      newRecord.executionId,
      newRecord.category,
      newRecord.title,
      newRecord.summary,
      newRecord.details,
      newRecord.confidence,
      newRecord.importance,
      newRecord.source,
      newRecord.createdAt,
      newRecord.updatedAt,
      newRecord.lastUsed || null,
      newRecord.usageCount,
      newRecord.embeddingId || null
    );

    for (const tag of newRecord.tags) {
      memory.database.prepare(`
        insert or ignore into memory_tags (memory_id, tag) values (?, ?)
      `).run(newRecord.id, tag);
    }

    eventBus.publish({
      type: "Custom",
      contextId: newRecord.contextId,
      sessionId: "cog-mem",
      executionId: newRecord.executionId,
      metadata: { event: "MemoryCreated", memoryId: newRecord.id, category: newRecord.category }
    });

    return newRecord;
  }

  updateMemory(id: string, updates: Partial<Omit<MemoryRecord, "id" | "createdAt" | "updatedAt">>): MemoryRecord {
    const existing = this.getMemory(id);
    if (!existing) throw new Error(`Memory record ${id} not found`);

    const updatedAt = new Date().toISOString();
    const updated = { ...existing, ...updates, updatedAt };

    memory.database.prepare(`
      update cognitive_memories set
        category = ?,
        title = ?,
        summary = ?,
        details = ?,
        confidence = ?,
        importance = ?,
        last_used = ?,
        usage_count = ?,
        embedding_id = ?,
        updated_at = ?
      where id = ?
    `).run(
      updated.category,
      updated.title,
      updated.summary,
      updated.details,
      updated.confidence,
      updated.importance,
      updated.lastUsed || null,
      updated.usageCount,
      updated.embeddingId || null,
      updated.updatedAt,
      id
    );

    if (updates.tags) {
      memory.database.prepare(`delete from memory_tags where memory_id = ?`).run(id);
      for (const tag of updates.tags) {
        memory.database.prepare(`
          insert or ignore into memory_tags (memory_id, tag) values (?, ?)
        `).run(id, tag);
      }
    }

    eventBus.publish({
      type: "Custom",
      contextId: updated.contextId,
      sessionId: "cog-mem",
      executionId: updated.executionId,
      metadata: { event: "MemoryUpdated", memoryId: id }
    });

    return updated;
  }

  deleteMemory(id: string): void {
    memory.database.prepare(`delete from cognitive_memories where id = ?`).run(id);
    memory.database.prepare(`delete from memory_tags where memory_id = ?`).run(id);
    memory.database.prepare(`delete from memory_usage where memory_id = ?`).run(id);
  }

  getMemory(id: string): MemoryRecord | undefined {
    const row = memory.database.prepare(`select * from cognitive_memories where id = ?`).get(id) as any;
    if (!row) return undefined;
    return this.mapRowToRecord(row);
  }

  searchMemory(query: string): MemoryRecord[] {
    const rows = memory.database.prepare(`
      select * from cognitive_memories
      where title like ? or summary like ? or details like ?
      order by importance desc
    `).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
    return rows.map(r => this.mapRowToRecord(r));
  }

  retrieveRelevantMemory(category: MemoryCategory, tags: string[]): MemoryRecord[] {
    if (tags.length === 0) {
      const rows = memory.database.prepare(`
        select * from cognitive_memories where category = ? order by importance desc
      `).all(category) as any[];
      return rows.map(r => this.mapRowToRecord(r));
    }

    const placeholders = tags.map(() => "?").join(",");
    const rows = memory.database.prepare(`
      select distinct cm.* from cognitive_memories cm
      join memory_tags mt on cm.id = mt.memory_id
      where cm.category = ? and mt.tag in (${placeholders})
      order by cm.importance desc
    `).all(category, ...tags) as any[];

    // Promote retrieved records by incrementing usage
    for (const row of rows) {
      this.promoteMemory(row.id);
    }

    return rows.map(r => this.mapRowToRecord(r));
  }

  recordLesson(contextId: string, goalId: string, executionId: string, title: string, lesson: string): MemoryRecord {
    return this.storeMemory({
      id: `mem-${Math.random().toString(36).substr(2, 9)}`,
      contextId,
      workspaceId: "default",
      goalId,
      executionId,
      category: "Lesson Learned",
      title,
      summary: lesson.slice(0, 100),
      details: lesson,
      confidence: 0.8,
      importance: 0.7,
      tags: ["lesson"],
      source: "reflection"
    });
  }

  recordSuccessPattern(contextId: string, goalId: string, executionId: string, title: string, pattern: string): MemoryRecord {
    return this.storeMemory({
      id: `mem-${Math.random().toString(36).substr(2, 9)}`,
      contextId,
      workspaceId: "default",
      goalId,
      executionId,
      category: "Successful Strategy",
      title,
      summary: pattern.slice(0, 100),
      details: pattern,
      confidence: 0.9,
      importance: 0.8,
      tags: ["success", "pattern"],
      source: "execution"
    });
  }

  recordFailurePattern(contextId: string, goalId: string, executionId: string, title: string, details: string): MemoryRecord {
    return this.storeMemory({
      id: `mem-${Math.random().toString(36).substr(2, 9)}`,
      contextId,
      workspaceId: "default",
      goalId,
      executionId,
      category: "Failed Strategy",
      title,
      summary: details.slice(0, 100),
      details,
      confidence: 0.9,
      importance: 0.9,
      tags: ["failure", "avoid"],
      source: "execution"
    });
  }

  recordPreference(contextId: string, key: string, val: string): MemoryRecord {
    return this.storeMemory({
      id: `mem-${Math.random().toString(36).substr(2, 9)}`,
      contextId,
      workspaceId: "default",
      goalId: "global",
      executionId: "global",
      category: "User Preference",
      title: `Preference: ${key}`,
      summary: `User configured ${key}`,
      details: val,
      confidence: 1.0,
      importance: 1.0,
      tags: ["preference"],
      source: "user"
    });
  }

  recordArchitecturePattern(contextId: string, name: string, pattern: string): MemoryRecord {
    return this.storeMemory({
      id: `mem-${Math.random().toString(36).substr(2, 9)}`,
      contextId,
      workspaceId: "default",
      goalId: "global",
      executionId: "global",
      category: "Architecture Pattern",
      title: `Arch: ${name}`,
      summary: `Architecture rule ${name}`,
      details: pattern,
      confidence: 0.95,
      importance: 0.9,
      tags: ["architecture"],
      source: "project"
    });
  }

  promoteMemory(id: string) {
    const existing = this.getMemory(id);
    if (existing) {
      const usageCount = existing.usageCount + 1;
      const lastUsed = new Date().toISOString();
      const importance = Math.min(1.0, existing.importance + 0.05); // Boost importance on usage
      this.updateMemory(id, { usageCount, lastUsed, importance });
    }
  }

  applyTimeDecay(thresholdDays: number = 7) {
    const rows = memory.database.prepare(`select id, importance, last_used from cognitive_memories`).all() as any[];
    const now = Date.now();
    for (const row of rows) {
      const lastUsedTime = row.last_used ? new Date(row.last_used).getTime() : now;
      const diffDays = (now - lastUsedTime) / (1000 * 60 * 60 * 24);
      if (diffDays > thresholdDays) {
        const importance = Math.max(0.1, row.importance - 0.1); // Decay importance
        this.updateMemory(row.id, { importance });
      }
    }
  }

  getStatistics(): Record<string, any> {
    const countRow = memory.database.prepare(`select count(*) as count from cognitive_memories`).get() as any;
    const catRows = memory.database.prepare(`
      select category, count(*) as count, avg(confidence) as avg_conf, avg(importance) as avg_imp
      from cognitive_memories group by category
    `).all() as any[];

    return {
      totalRecords: countRow?.count || 0,
      categories: catRows
    };
  }

  private findDuplicate(category: MemoryCategory, title: string): MemoryRecord | undefined {
    const row = memory.database.prepare(`
      select * from cognitive_memories where category = ? and title = ?
    `).get(category, title) as any;
    if (row) return this.mapRowToRecord(row);
    return undefined;
  }

  private mergeMemories(existingId: string, incoming: Omit<MemoryRecord, "createdAt" | "updatedAt" | "usageCount">): MemoryRecord {
    const existing = this.getMemory(existingId);
    if (!existing) throw new Error("Merge failed: existing not found");

    const confidence = Math.min(1.0, existing.confidence + 0.1);
    const details = `${existing.details}\n--- Collapsed Revision ---\n${incoming.details}`;
    const usageCount = existing.usageCount + 1;

    const merged = this.updateMemory(existingId, {
      confidence,
      details,
      usageCount
    });

    eventBus.publish({
      type: "Custom",
      contextId: merged.contextId,
      sessionId: "cog-mem",
      executionId: merged.executionId,
      metadata: { event: "MemoryMerged", memoryId: existingId }
    });

    return merged;
  }

  private mapRowToRecord(row: any): MemoryRecord {
    const tagsRows = memory.database.prepare(`
      select tag from memory_tags where memory_id = ?
    `).all(row.id) as { tag: string }[];
    const tags = tagsRows.map(t => t.tag);

    return {
      id: row.id,
      contextId: row.context_id,
      workspaceId: row.workspace_id,
      goalId: row.goal_id,
      executionId: row.execution_id,
      category: row.category,
      title: row.title,
      summary: row.summary,
      details: row.details,
      confidence: row.confidence,
      importance: row.importance,
      tags,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastUsed: row.last_used || undefined,
      usageCount: row.usage_count,
      embeddingId: row.embedding_id || undefined
    };
  }
}

export const cognitiveMemory = new CognitiveMemory();
