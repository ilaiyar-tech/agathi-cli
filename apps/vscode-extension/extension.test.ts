import assert from "node:assert";

// Now import the extension safely
import { activate } from "./extension.js";

async function test_extension_activation() {
  const subscriptions: any[] = [];
  const mockContext: any = {
    subscriptions,
    extensionUri: { path: "/mock/path" }
  };

  activate(mockContext);

  // Assert that commands and elements are registered into subscriptions
  assert.ok(subscriptions.length > 0);
  console.log("  test_extension_activation passed.");
}

async function runAll() {
  console.log("Running VS Code Extension tests...");
  await test_extension_activation();
  console.log("VS Code Extension tests passed.");
}

runAll().catch(console.error);
