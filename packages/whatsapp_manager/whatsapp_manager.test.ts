import { whatsapp } from "./whatsapp_manager.js";
import assert from "node:assert";

console.log("Running WhatsApp Manager tests...");

async function runTests() {
  const statusBefore = whatsapp.getStatus();
  assert.strictEqual(statusBefore.status, "Disconnected");
  assert.ok(statusBefore.adminNumber);

  // Link
  const { qrCode } = whatsapp.startLinking();
  assert.ok(qrCode);
  
  const statusAfterStart = whatsapp.getStatus();
  assert.strictEqual(statusAfterStart.status, "Connecting");

  // Wait 4.5 seconds for auto-linking simulation
  await new Promise(r => setTimeout(r, 4500));

  const statusConnected = whatsapp.getStatus();
  assert.strictEqual(statusConnected.status, "Connected");

  // Test Alert
  const sent = whatsapp.sendAlert("Test Service", "All engines running normally.");
  assert.strictEqual(sent, true);

  // Unlink
  whatsapp.unlink();
  const statusDisconnected = whatsapp.getStatus();
  assert.strictEqual(statusDisconnected.status, "Disconnected");

  console.log("WhatsApp Manager tests passed.");
}

runTests().catch(err => {
  console.error("WhatsApp Manager tests failed:", err);
  process.exit(1);
});
