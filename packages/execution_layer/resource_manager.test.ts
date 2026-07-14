import { resourceManager } from "./resource_manager.js";
import { memory } from "../memory/memory_engine.js";
import { ResourceLimitExceeded } from "./universal_interface.js";
import assert from "node:assert";

async function test_resource_manager() {
  // Clear tables
  memory.database.prepare("delete from resource_history").run();
  memory.database.prepare("delete from resource_snapshots").run();
  memory.database.prepare("delete from resource_statistics").run();

  // 1. Initial State Checks
  const initial = resourceManager.getAvailableResources();
  assert.strictEqual(initial.cpu, 8);
  assert.strictEqual(initial.memoryMb, 16384);

  // 2. Reservation & Allocation Checks
  const res = resourceManager.reserveResources("ctx1", { cpu: 4, memoryMb: 4096 });
  assert.ok(res.id);
  assert.strictEqual(res.released, false);

  const afterReservation = resourceManager.getAvailableResources();
  assert.strictEqual(afterReservation.cpu, 4);
  assert.strictEqual(afterReservation.memoryMb, 12288);

  // 3. Limit Exceeded Check
  await assert.throws(() => {
    resourceManager.reserveResources("ctx2", { cpu: 6 });
  }, ResourceLimitExceeded);

  // 4. Release Check
  resourceManager.releaseResources(res.id);
  const afterRelease = resourceManager.getAvailableResources();
  assert.strictEqual(afterRelease.cpu, 8);
  assert.strictEqual(afterRelease.memoryMb, 16384);

  // 5. Snapshot & Restore check
  const res2 = resourceManager.reserveResources("ctx1", { cpu: 2 });
  resourceManager.createSnapshot("snap1");
  resourceManager.releaseResources(res2.id);

  assert.strictEqual(resourceManager.getAvailableResources().cpu, 8);

  resourceManager.restoreSnapshot("snap1");
  assert.strictEqual(resourceManager.getAvailableResources().cpu, 6); // Restored state has res2 active

  console.log("resource_manager tests passed.");
}

test_resource_manager().catch(console.error);
