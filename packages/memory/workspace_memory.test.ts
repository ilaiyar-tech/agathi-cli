import { workspaceMemory } from "./workspace_memory.js";
import { memory } from "./memory_engine.js";
import assert from "node:assert";

async function test_workspace_memory() {
  // Use in-memory SQLite for testing to isolate from local storage
  const testDb = new (memory as any).constructor(":memory:");
  Object.defineProperty(memory, "database", { value: testDb.database });

  // Test registration
  workspaceMemory.registerProject("ctx-789", "ws-456", "agent-1");

  // Test File indexing
  workspaceMemory.indexFile("ctx-789", {
    path: "src/index.ts",
    content: "console.log('hello');",
    workspaceId: "ws-456",
    agentId: "agent-1",
    indexedBy: "test"
  });

  const file = workspaceMemory.getFile("ctx-789", "src/index.ts");
  assert.ok(file);
  assert.strictEqual(file.path, "src/index.ts");
  assert.strictEqual(file.content, "console.log('hello');");
  assert.strictEqual(file.mimeType, "text/typescript");

  // Test change detection
  const changed = workspaceMemory.hasFileChanged("ctx-789", "src/index.ts", "console.log('world');");
  assert.strictEqual(changed, true);
  const unchanged = workspaceMemory.hasFileChanged("ctx-789", "src/index.ts", "console.log('hello');");
  assert.strictEqual(unchanged, false);

  // Test search
  const searchResults = workspaceMemory.searchFiles("ctx-789", "hello");
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].path, "src/index.ts");

  // Test stats
  const stats = workspaceMemory.getWorkspaceStats("ctx-789");
  assert.strictEqual(stats.filesCount, 1);
  assert.strictEqual(stats.languages["typescript"], 1);

  // Test build history
  workspaceMemory.recordBuild("ctx-789", "exec-111", "success", "All clear", "agent-1");
  const buildHistory = workspaceMemory.getBuildHistory("ctx-789");
  assert.strictEqual(buildHistory.length, 1);
  assert.strictEqual(buildHistory[0].executionId, "exec-111");
  assert.strictEqual(buildHistory[0].status, "success");

  // Test Snapshots
  workspaceMemory.createSnapshot("ctx-789", "snap-1");
  
  // Index a new file
  workspaceMemory.indexFile("ctx-789", {
    path: "src/app.tsx",
    content: "const App = () => <div>Hello</div>",
    workspaceId: "ws-456"
  });
  
  workspaceMemory.createSnapshot("ctx-789", "snap-2");

  // Compare snapshots
  const comparison = workspaceMemory.compareSnapshots("ctx-789", "snap-1", "snap-2");
  assert.strictEqual(comparison.added.length, 1);
  assert.strictEqual(comparison.added[0], "src/app.tsx");

  // Restore snapshot
  workspaceMemory.restoreSnapshot("ctx-789", "snap-1");
  const restoredStats = workspaceMemory.getWorkspaceStats("ctx-789");
  assert.strictEqual(restoredStats.filesCount, 1); // should only have index.ts now
  assert.strictEqual(workspaceMemory.getFile("ctx-789", "src/app.tsx"), undefined);

  console.log("workspace_memory tests passed.");
}

test_workspace_memory().catch(console.error);
