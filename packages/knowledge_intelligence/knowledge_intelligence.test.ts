import assert from "node:assert";
import { kil, KnowledgeEvidence } from "./knowledge_intelligence.js";

async function test_retriever_and_sources() {
  const sourceId = await kil.registerSource("Documentation", "docs/sqlite_guide.md", { version: "1.0" });
  await kil.indexSource(sourceId, "SQLite is configured to support parallel database operations.");

  const sessionId = await kil.createKnowledgeSession("prompt-1", "workspace-1", "exec-1", "planner-1");
  const query = kil.planQuery("How is SQLite configured?");

  const evidence = await kil.retrieveKnowledge(sessionId, query);
  assert.ok(evidence.length > 0);
  const found = evidence.find(e => e.sourceId === sourceId);
  assert.ok(found);
  assert.ok(found.content.includes("parallel database operations"));

  console.log("  test_retriever_and_sources passed.");
}

async function test_ranking_and_trust() {
  const sessionId = await kil.createKnowledgeSession("prompt-rank", "workspace-rank", "exec-rank", "planner-rank");
  const sourceId = await kil.registerSource("doc", "path/to/doc");
  
  const ev1: KnowledgeEvidence = {
    id: "ev-rank-1",
    sessionId,
    sourceId,
    content: "High trust evidence",
    trustScore: 0.9,
    freshnessScore: 1.0,
    citationRef: "doc://1"
  };

  const ev2: KnowledgeEvidence = {
    id: "ev-rank-2",
    sessionId,
    sourceId,
    content: "Low trust evidence",
    trustScore: 0.3,
    freshnessScore: 0.8,
    citationRef: "doc://2"
  };

  const { memory } = await import("../memory/memory_engine.js");
  memory.database.prepare(`
    insert or replace into knowledge_evidence (id, session_id, source_id, content, trust_score, freshness_score, citation_ref)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(ev1.id, ev1.sessionId, ev1.sourceId, ev1.content, ev1.trustScore, ev1.freshnessScore, ev1.citationRef);

  memory.database.prepare(`
    insert or replace into knowledge_evidence (id, session_id, source_id, content, trust_score, freshness_score, citation_ref)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(ev2.id, ev2.sessionId, ev2.sourceId, ev2.content, ev2.trustScore, ev2.freshnessScore, ev2.citationRef);

  const rankings = await kil.rankEvidence(sessionId, [ev1, ev2]);
  assert.strictEqual(rankings.length, 2);
  assert.ok(rankings[0].rankScore > rankings[1].rankScore);

  console.log("  test_ranking_and_trust passed.");
}

async function test_conflict_detector() {
  const sessionId = "sess-conflict";
  const evidenceList: KnowledgeEvidence[] = [
    { id: "ev-1", sessionId, sourceId: "src-1", content: "Please enable experimental features", trustScore: 0.9, freshnessScore: 1.0, citationRef: "doc://1" },
    { id: "ev-2", sessionId, sourceId: "src-2", content: "Please disable experimental features", trustScore: 0.9, freshnessScore: 1.0, citationRef: "doc://2" }
  ];

  const conflicts = kil.detectConflicts(evidenceList);
  assert.strictEqual(conflicts.length, 1);
  assert.ok(conflicts[0].reason.includes("enabling"));

  console.log("  test_conflict_detector passed.");
}

async function test_verification_and_compression() {
  const sessionId = await kil.createKnowledgeSession("prompt-verify", "workspace-verify", "exec-verify", "planner-verify");
  const evidenceList: KnowledgeEvidence[] = [
    { id: "ev-1", sessionId, sourceId: "src-1", content: "Valid evidence text", trustScore: 0.9, freshnessScore: 1.0, citationRef: "doc://1" }
  ];

  const verified = await kil.verifyKnowledge(sessionId, evidenceList);
  assert.strictEqual(verified, true);

  const facts = kil.compressKnowledge(evidenceList);
  assert.strictEqual(facts.length, 1);
  assert.strictEqual(facts[0], "Valid evidence text");

  console.log("  test_verification_and_compression passed.");
}

async function test_cache_hits_misses() {
  const cacheKey = "sqlite configuration details " + Math.random();
  const cacheValue = "JSON structure details";
  
  const initialGet = await kil.getCache(cacheKey, "semantic");
  assert.strictEqual(initialGet, null);

  await kil.cacheKnowledge(cacheKey, "semantic", cacheValue);
  const secondGet = await kil.getCache(cacheKey, "semantic");
  assert.strictEqual(secondGet, cacheValue);

  console.log("  test_cache_hits_misses passed.");
}

async function test_stress_performance() {
  // Index 100 articles
  const uniqueKeyword = "match" + Math.floor(Math.random() * 1000000);
  const sourceId = await kil.registerSource("Repo", "src/core.ts", { type: "code" });
  for (let i = 0; i < 100; i++) {
    await kil.indexSource(sourceId, `Article ${uniqueKeyword} number ${i} describing development policies`);
  }

  const sessionId = await kil.createKnowledgeSession("prompt-perf", "workspace-perf", "exec-perf", "planner-perf");
  const query = kil.planQuery(uniqueKeyword);

  const start = Date.now();
  const evidence = await kil.retrieveKnowledge(sessionId, query);
  const duration = Date.now() - start;

  assert.strictEqual(evidence.length, 100);
  assert.ok(duration < 100, `Retrieving 100 documents took ${duration}ms, must be under 100ms`);

  console.log("  test_stress_performance passed.");
}

async function runAll() {
  console.log("Running Knowledge Intelligence Layer tests...");
  await test_retriever_and_sources();
  await test_ranking_and_trust();
  await test_conflict_detector();
  await test_verification_and_compression();
  await test_cache_hits_misses();
  await test_stress_performance();
  console.log("knowledge_intelligence tests passed.");
}

runAll().catch(console.error);
