import { cognitiveMemory } from "./cognitive_memory.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_cognitive_memory() {
  // Clear tables
  memory.database.prepare("delete from cognitive_memories").run();
  memory.database.prepare("delete from memory_tags").run();
  memory.database.prepare("delete from memory_usage").run();

  // Test Store memory
  const m1 = cognitiveMemory.storeMemory({
    id: "mem1",
    contextId: "ctx-1",
    workspaceId: "ws-1",
    goalId: "goal-1",
    executionId: "exec-1",
    category: "Lesson Learned",
    title: "SQL Port Binding",
    summary: "Binding error on SQL server port",
    details: "Failed to bind to port 1433 due to active processes",
    confidence: 0.8,
    importance: 0.9,
    tags: ["network", "db"],
    source: "reflection"
  });

  assert.strictEqual(m1.id, "mem1");
  assert.strictEqual(m1.confidence, 0.8);
  assert.ok(m1.tags.includes("network"));

  // Test Search & Retrieval
  const searchRes = cognitiveMemory.searchMemory("Binding");
  assert.strictEqual(searchRes.length, 1);
  assert.strictEqual(searchRes[0].id, "mem1");

  const retrieval = cognitiveMemory.retrieveRelevantMemory("Lesson Learned", ["db"]);
  assert.strictEqual(retrieval.length, 1);
  // Retrieve relevant promotes usage count
  assert.strictEqual(cognitiveMemory.getMemory("mem1")?.usageCount, 1);

  // Test Merge duplicate collapse
  const m2 = cognitiveMemory.storeMemory({
    id: "mem2",
    contextId: "ctx-1",
    workspaceId: "ws-1",
    goalId: "goal-1",
    executionId: "exec-1",
    category: "Lesson Learned",
    title: "SQL Port Binding",
    summary: "Collapsed copy",
    details: "Alternative revision information",
    confidence: 0.5,
    importance: 0.9,
    tags: ["network", "db"],
    source: "reflection"
  });

  // Returns updated merged record on same ID
  assert.strictEqual(m2.id, "mem1");
  assert.strictEqual(m2.usageCount, 2);
  assert.ok(m2.confidence > 0.8); // Confidence boosted

  // Test Promotion / Decay
  const stats = cognitiveMemory.getStatistics();
  assert.strictEqual(stats.totalRecords, 1);

  cognitiveMemory.applyTimeDecay(0); // Decay all
  assert.ok(cognitiveMemory.getMemory("mem1")!.importance < 0.9);

  console.log("cognitive_memory tests passed.");
}

test_cognitive_memory().catch(console.error);
