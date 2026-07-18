import crypto from "node:crypto";
import { eventBus } from "../context_engine/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { ContextOS } from "../context_engine/index.js";

export interface KnowledgeSession {
  id: string;
  promptId: string;
  workspaceId: string;
  executionId: string;
  plannerId: string;
  timestamp: number;
}

export interface KnowledgeSource {
  id: string;
  type: string;
  path: string;
  metadata: Record<string, any>;
}

export interface KnowledgeIndex {
  id: string;
  sourceId: string;
  content: string;
  indexedAt: number;
  expiresAt?: number;
}

export interface KnowledgeEvidence {
  id: string;
  sessionId: string;
  sourceId: string;
  content: string;
  trustScore: number;
  freshnessScore: number;
  citationRef: string;
}

export interface KnowledgeRanking {
  id: string;
  sessionId: string;
  evidenceId: string;
  rankScore: number;
}

export interface KnowledgeTimelineEvent {
  id?: number;
  sessionId: string;
  eventName: string;
  details: string;
  timestamp: number;
}

export interface KnowledgeMetrics {
  sessionId: string;
  retrievalLatency: number;
  rankingLatency: number;
  verificationLatency: number;
  compressionRatio: number;
  cacheHitRate: number;
}

export class KnowledgeIntelligenceLayer {
  constructor() {
    try {
      memory.database.exec(`
        create table if not exists knowledge_sessions (
          id text primary key,
          prompt_id text not null,
          workspace_id text not null,
          execution_id text not null,
          planner_id text not null,
          timestamp integer not null
        );

        create table if not exists knowledge_sources (
          id text primary key,
          type text not null,
          path text not null,
          metadata text not null
        );

        create table if not exists knowledge_indexes (
          id text primary key,
          source_id text not null,
          content text not null,
          indexed_at integer not null,
          expires_at integer,
          foreign key(source_id) references knowledge_sources(id) on delete cascade
        );

        create table if not exists knowledge_evidence (
          id text primary key,
          session_id text not null,
          source_id text not null,
          content text not null,
          trust_score real not null,
          freshness_score real not null,
          citation_ref text not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade,
          foreign key(source_id) references knowledge_sources(id) on delete cascade
        );

        create table if not exists knowledge_rankings (
          id text primary key,
          session_id text not null,
          evidence_id text not null,
          rank_score real not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade,
          foreign key(evidence_id) references knowledge_evidence(id) on delete cascade
        );

        create table if not exists knowledge_cache (
          cache_key text primary key,
          cache_type text not null,
          value text not null,
          timestamp integer not null
        );

        create table if not exists knowledge_timeline (
          id integer primary key autoincrement,
          session_id text not null,
          event_name text not null,
          details text not null,
          timestamp integer not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade
        );

        create table if not exists knowledge_metrics (
          session_id text primary key,
          retrieval_latency integer not null,
          ranking_latency integer not null,
          verification_latency integer not null,
          compression_ratio real not null,
          cache_hit_rate real not null,
          foreign key(session_id) references knowledge_sessions(id) on delete cascade
        );
      `);
    } catch (e) {
      console.error("Failed to initialize KIL database schemas", e);
    }
  }

  async createKnowledgeSession(promptId: string, workspaceId: string, executionId: string, plannerId: string): Promise<string> {
    const id = `ksess-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    
    memory.database.prepare(`
      insert into knowledge_sessions (id, prompt_id, workspace_id, execution_id, planner_id, timestamp)
      values (?, ?, ?, ?, ?, ?)
    `).run(id, promptId, workspaceId, executionId, plannerId, timestamp);

    this.logEvent(id, "KnowledgeSessionCreated", `Session established for prompt: ${promptId}`);

    eventBus.publish({
      type: "Custom",
      contextId: "knowledge",
      sessionId: id,
      executionId,
      metadata: { event: "KnowledgeSessionCreated", promptId, plannerId }
    });

    return id;
  }

  async registerSource(type: string, path: string, metadata: Record<string, any> = {}): Promise<string> {
    const id = `src-${crypto.randomUUID()}`;
    memory.database.prepare(`
      insert or replace into knowledge_sources (id, type, path, metadata)
      values (?, ?, ?, ?)
    `).run(id, type, path, JSON.stringify(metadata));
    return id;
  }

  async indexSource(sourceId: string, content: string, expiresAt?: number): Promise<string> {
    const id = `idx-${crypto.randomUUID()}`;
    const timestamp = Date.now();
    
    memory.database.prepare(`
      insert or replace into knowledge_indexes (id, source_id, content, indexed_at, expires_at)
      values (?, ?, ?, ?, ?)
    `).run(id, sourceId, content, timestamp, expiresAt || null);

    return id;
  }

  planQuery(prompt: string): { semantic: string; keyword: string } {
    const cleaned = prompt.replace(/[?.!]+/g, "").trim();
    return {
      semantic: cleaned,
      keyword: cleaned.split(/\s+/).filter(w => w.length > 4).join(" ")
    };
  }

  async retrieveKnowledge(sessionId: string, query: { semantic: string; keyword: string }): Promise<KnowledgeEvidence[]> {
    const start = Date.now();
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Knowledge session ${sessionId} not found`);

    const timelineEvent = "Retrieval";
    this.logEvent(sessionId, timelineEvent, `Query plan: semantic="${query.semantic}", keyword="${query.keyword}"`);

    // Search indexes matching keyword or semantic query keywords
    const keywords = query.keyword.split(/\s+/);
    const resolvedEvidence: KnowledgeEvidence[] = [];

    const sources: any[] = memory.database.prepare("select id, type, path, metadata from knowledge_sources").all();

    for (const source of sources) {
      const idxs: any[] = memory.database.prepare("select content from knowledge_indexes where source_id = ?").all(source.id);
      for (const idx of idxs) {
        const matchesKeyword = keywords.some(k => idx.content.toLowerCase().includes(k.toLowerCase()));
        if (matchesKeyword || idx.content.toLowerCase().includes(query.semantic.toLowerCase())) {
          // Score calculations
          const trustScore = 0.9;
          const freshnessScore = 1.0;
          const citationRef = `${source.type}://${source.path}`;

          const id = `ev-${crypto.randomUUID()}`;
          const ev: KnowledgeEvidence = {
            id,
            sessionId,
            sourceId: source.id,
            content: idx.content,
            trustScore,
            freshnessScore,
            citationRef
          };

          resolvedEvidence.push(ev);
        }
      }
    }

    // Batch insert in a single transaction
    memory.database.transaction(() => {
      for (const ev of resolvedEvidence) {
        memory.database.prepare(`
          insert or replace into knowledge_evidence (id, session_id, source_id, content, trust_score, freshness_score, citation_ref)
          values (?, ?, ?, ?, ?, ?, ?)
        `).run(ev.id, ev.sessionId, ev.sourceId, ev.content, ev.trustScore, ev.freshnessScore, ev.citationRef);
      }
    })();

    // Deduplicate
    const uniqueEvidence = this.deduplicateEvidence(resolvedEvidence);

    eventBus.publish({
      type: "Custom",
      contextId: "knowledge",
      sessionId,
      executionId: session.executionId,
      metadata: { event: "KnowledgeRetrieved", count: uniqueEvidence.length }
    });

    return uniqueEvidence;
  }

  deduplicateEvidence(evidenceList: KnowledgeEvidence[]): KnowledgeEvidence[] {
    const map = new Map<string, KnowledgeEvidence>();
    for (const ev of evidenceList) {
      const key = `${ev.sourceId}:${ev.content.trim()}`;
      if (!map.has(key)) {
        map.set(key, ev);
      } else {
        // Merge scores
        const existing = map.get(key)!;
        existing.trustScore = Math.max(existing.trustScore, ev.trustScore);
        existing.freshnessScore = Math.max(existing.freshnessScore, ev.freshnessScore);
      }
    }
    return Array.from(map.values());
  }

  async rankEvidence(sessionId: string, evidenceList: KnowledgeEvidence[]): Promise<KnowledgeRanking[]> {
    const rankings: KnowledgeRanking[] = [];
    
    for (const ev of evidenceList) {
      // rankScore = 0.6 * relevance + 0.3 * trust + 0.1 * freshness
      const relevance = 0.8;
      const rankScore = (relevance * 0.6) + (ev.trustScore * 0.3) + (ev.freshnessScore * 0.1);
      
      const id = `rank-${crypto.randomUUID()}`;
      const ranking: KnowledgeRanking = {
        id,
        sessionId,
        evidenceId: ev.id,
        rankScore
      };

      memory.database.prepare(`
        insert or replace into knowledge_rankings (id, session_id, evidence_id, rank_score)
        values (?, ?, ?, ?)
      `).run(ranking.id, ranking.sessionId, ranking.evidenceId, ranking.rankScore);

      rankings.push(ranking);
    }

    rankings.sort((a, b) => b.rankScore - a.rankScore);
    
    const session = await this.getSession(sessionId);
    eventBus.publish({
      type: "Custom",
      contextId: "knowledge",
      sessionId,
      executionId: session ? session.executionId : "default",
      metadata: { event: "EvidenceRanked", count: rankings.length }
    });

    return rankings;
  }

  detectConflicts(evidenceList: KnowledgeEvidence[]): Array<{ ev1: KnowledgeEvidence; ev2: KnowledgeEvidence; reason: string }> {
    const conflicts: Array<{ ev1: KnowledgeEvidence; ev2: KnowledgeEvidence; reason: string }> = [];
    
    // Look for contradictory assertions (e.g. true vs false, enable vs disable)
    for (let i = 0; i < evidenceList.length; i++) {
      for (let j = i + 1; j < evidenceList.length; j++) {
        const ev1 = evidenceList[i];
        const ev2 = evidenceList[j];
        
        if (ev1.content.includes("enable") && ev2.content.includes("disable")) {
          conflicts.push({
            ev1,
            ev2,
            reason: "One evidence suggests enabling a feature, while the other suggests disabling it."
          });
        }
      }
    }

    return conflicts;
  }

  async verifyKnowledge(sessionId: string, evidenceList: KnowledgeEvidence[]): Promise<boolean> {
    const start = Date.now();
    const session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    let verified = true;
    for (const ev of evidenceList) {
      if (!ev.citationRef || ev.content.length === 0) {
        verified = false;
      }
    }

    eventBus.publish({
      type: "Custom",
      contextId: "knowledge",
      sessionId,
      executionId: session.executionId,
      metadata: { event: "KnowledgeVerified", verified }
    });

    return verified;
  }

  compressKnowledge(evidenceList: KnowledgeEvidence[]): string[] {
    // Keep only essential facts (non-empty items with high relevance)
    return evidenceList
      .filter(ev => ev.content.length > 5 && ev.trustScore > 0.5)
      .map(ev => ev.content.trim());
  }

  async cacheKnowledge(key: string, type: string, value: string): Promise<void> {
    memory.database.prepare(`
      insert or replace into knowledge_cache (cache_key, cache_type, value, timestamp)
      values (?, ?, ?, ?)
    `).run(key, type, value, Date.now());
  }

  async getCache(key: string, type: string): Promise<string | null> {
    const row: any = memory.database.prepare("select value from knowledge_cache where cache_key = ? and cache_type = ?").get(key, type);
    
    if (row) {
      eventBus.publish({
        type: "Custom",
        contextId: "knowledge",
        sessionId: "cache",
        executionId: "cache",
        metadata: { event: "CacheHit", key }
      });
      return row.value;
    }

    eventBus.publish({
      type: "Custom",
      contextId: "knowledge",
      sessionId: "cache",
      executionId: "cache",
      metadata: { event: "CacheMiss", key }
    });
    return null;
  }

  async getSession(sessionId: string): Promise<KnowledgeSession | undefined> {
    const row: any = memory.database.prepare(`
      select id, prompt_id as promptId, workspace_id as workspaceId, execution_id as executionId, planner_id as plannerId, timestamp
      from knowledge_sessions where id = ?
    `).get(sessionId);

    if (!row) return undefined;
    return {
      id: row.id,
      promptId: row.promptId,
      workspaceId: row.workspaceId,
      executionId: row.executionId,
      plannerId: row.plannerId,
      timestamp: row.timestamp
    };
  }

  async getEvidence(sessionId: string): Promise<KnowledgeEvidence[]> {
    const rows: any[] = memory.database.prepare(`
      select id, session_id as sessionId, source_id as sourceId, content, trust_score as trustScore, freshness_score as freshnessScore, citation_ref as citationRef
      from knowledge_evidence where session_id = ?
    `).all(sessionId);

    return rows.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      sourceId: r.sourceId,
      content: r.content,
      trustScore: r.trustScore,
      freshnessScore: r.freshnessScore,
      citationRef: r.citationRef
    }));
  }

  async getTimeline(sessionId: string): Promise<KnowledgeTimelineEvent[]> {
    const rows: any[] = memory.database.prepare(`
      select id, session_id as sessionId, event_name as eventName, details, timestamp
      from knowledge_timeline where session_id = ? order by id asc
    `).all(sessionId);

    return rows.map(r => ({
      id: r.id,
      sessionId: r.sessionId,
      eventName: r.eventName,
      details: r.details,
      timestamp: r.timestamp
    }));
  }

  async getMetrics(sessionId: string): Promise<KnowledgeMetrics | undefined> {
    const r: any = memory.database.prepare(`
      select session_id as sessionId, retrieval_latency as retrievalLatency, ranking_latency as rankingLatency, verification_latency as verificationLatency, compression_ratio as compressionRatio, cache_hit_rate as cacheHitRate
      from knowledge_metrics where session_id = ?
    `).get(sessionId);

    if (!r) return undefined;
    return {
      sessionId: r.sessionId,
      retrievalLatency: r.retrievalLatency,
      rankingLatency: r.rankingLatency,
      verificationLatency: r.verificationLatency,
      compressionRatio: r.compressionRatio,
      cacheHitRate: r.cacheHitRate
    };
  }

  // Save metrics helper
  async saveMetrics(metrics: KnowledgeMetrics): Promise<void> {
    memory.database.prepare(`
      insert or replace into knowledge_metrics (session_id, retrieval_latency, ranking_latency, verification_latency, compression_ratio, cache_hit_rate)
      values (?, ?, ?, ?, ?, ?)
    `).run(metrics.sessionId, metrics.retrievalLatency, metrics.rankingLatency, metrics.verificationLatency, metrics.compressionRatio, metrics.cacheHitRate);
  }

  private logEvent(sessionId: string, eventName: string, details: string): void {
    memory.database.prepare(`
      insert into knowledge_timeline (session_id, event_name, details, timestamp)
      values (?, ?, ?, ?)
    `).run(sessionId, eventName, details, Date.now());
  }
}

export const kil = new KnowledgeIntelligenceLayer();
