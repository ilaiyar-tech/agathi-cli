import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";
import { SkillId } from "./skill_registry.js";

export interface SkillMemoryRecord {
  id: string;
  skillId: SkillId;
  category: "BestPractice" | "CodingPattern" | "ArchitecturePattern" | "DesignPattern" | "DebugPattern" | "SecurityPattern" | "DocumentationPattern" | "ResearchPattern" | "Preference" | "Template";
  title: string;
  content: string;
  confidence: number;
  importance: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export class SkillMemory {
  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    memory.database.exec(`
      create table if not exists skill_memories (
        id text primary key,
        skill_id text,
        category text,
        title text,
        content text,
        confidence real,
        importance real,
        usage_count integer,
        created_at text,
        updated_at text
      );

      create table if not exists skill_memory_tags (
        memory_id text,
        tag text,
        primary key (memory_id, tag)
      );

      create table if not exists skill_memory_usage (
        memory_id text,
        accessed_at text
      );
    `);
  }

  recordMemory(rec: Omit<SkillMemoryRecord, "id" | "usageCount" | "createdAt" | "updatedAt">, tags: string[] = []): string {
    // Duplicate check and auto-merge
    const duplicate = memory.database.prepare(`
      select * from skill_memories where skill_id = ? and category = ? and content = ?
    `).get(rec.skillId, rec.category, rec.content) as any;

    if (duplicate) {
      const newImportance = Math.min(1.0, duplicate.importance + 0.1);
      const newConfidence = (duplicate.confidence + rec.confidence) / 2;
      const newUsage = duplicate.usage_count + 1;
      const updatedAt = new Date().toISOString();

      memory.database.prepare(`
        update skill_memories set 
          importance = ?, confidence = ?, usage_count = ?, updated_at = ?
        where id = ?
      `).run(newImportance, newConfidence, newUsage, updatedAt, duplicate.id);

      eventBus.publish({
        type: "Custom",
        contextId: "skills",
        sessionId: "memory",
        executionId: duplicate.id,
        metadata: { event: "SkillMemoryUpdated", memoryId: duplicate.id }
      });

      return duplicate.id;
    }

    const id = `sm-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    memory.database.prepare(`
      insert into skill_memories (id, skill_id, category, title, content, confidence, importance, usage_count, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, rec.skillId, rec.category, rec.title, rec.content, rec.confidence, rec.importance, 1, now, now);

    for (const tag of tags) {
      memory.database.prepare(`
        insert or ignore into skill_memory_tags (memory_id, tag) values (?, ?)
      `).run(id, tag);
    }

    eventBus.publish({
      type: "Custom",
      contextId: "skills",
      sessionId: "memory",
      executionId: id,
      metadata: { event: "SkillMemoryRecorded", memoryId: id }
    });

    return id;
  }

  getMemory(id: string): SkillMemoryRecord | undefined {
    const row = memory.database.prepare(`select * from skill_memories where id = ?`).get(id) as any;
    if (!row) return undefined;

    return {
      id: row.id,
      skillId: row.skill_id,
      category: row.category as any,
      title: row.title,
      content: row.content,
      confidence: row.confidence,
      importance: row.importance,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  promoteMemory(id: string): void {
    const rec = this.getMemory(id);
    if (rec) {
      const newImportance = Math.min(1.0, rec.importance + 0.15);
      const newUsage = rec.usageCount + 1;
      const now = new Date().toISOString();

      memory.database.prepare(`
        update skill_memories set importance = ?, usage_count = ?, updated_at = ? where id = ?
      `).run(newImportance, newUsage, now, id);

      memory.database.prepare(`
        insert into skill_memory_usage (memory_id, accessed_at) values (?, ?)
      `).run(id, now);

      eventBus.publish({
        type: "Custom",
        contextId: "skills",
        sessionId: "memory",
        executionId: id,
        metadata: { event: "SkillMemoryPromoted", memoryId: id, newImportance }
      });
    }
  }

  decayMemory(decayRate: number = 0.05): void {
    const rows = memory.database.prepare(`select id, importance from skill_memories`).all() as any[];
    for (const row of rows) {
      const newImportance = Math.max(0.0, row.importance - decayRate);
      memory.database.prepare(`update skill_memories set importance = ? where id = ?`).run(newImportance, row.id);

      eventBus.publish({
        type: "Custom",
        contextId: "skills",
        sessionId: "memory",
        executionId: row.id,
        metadata: { event: "SkillMemoryDecayed", memoryId: row.id, newImportance }
      });
    }
  }

  searchMemory(skillId: SkillId, query: string): SkillMemoryRecord[] {
    const rows = memory.database.prepare(`
      select * from skill_memories where skill_id = ? and (title like ? or content like ?) order by importance desc
    `).all(skillId, `%${query}%`, `%${query}%`) as any[];

    return rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      category: row.category as any,
      title: row.title,
      content: row.content,
      confidence: row.confidence,
      importance: row.importance,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  listMemories(skillId: SkillId): SkillMemoryRecord[] {
    const rows = memory.database.prepare(`
      select * from skill_memories where skill_id = ? order by importance desc
    `).all(skillId) as any[];

    return rows.map(row => ({
      id: row.id,
      skillId: row.skill_id,
      category: row.category as any,
      title: row.title,
      content: row.content,
      confidence: row.confidence,
      importance: row.importance,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  deleteMemory(id: string): void {
    memory.database.prepare(`delete from skill_memories where id = ?`).run(id);
    memory.database.prepare(`delete from skill_memory_tags where memory_id = ?`).run(id);
  }

  getStatistics(): Record<string, any> {
    const totalCount = memory.database.prepare(`select count(*) as cnt from skill_memories`).get() as any;
    return {
      totalCount: totalCount?.cnt || 0
    };
  }
}

export const skillMemory = new SkillMemory();
