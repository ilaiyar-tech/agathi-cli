import { get_models, get_active_model, set_active_model } from "./provider_manager.js";
import assert from "node:assert";

function test_provider_manager() {
  const models = get_models();
  assert.ok(Array.isArray(models));

  const initial = get_active_model();
  assert.strictEqual(initial, "chat");

  try {
    set_active_model("nonexistent_model_12345");
    assert.fail("Should throw on nonexistent model");
  } catch (e: any) {
    assert.strictEqual(e.message, "model_not_found");
  }

  // Assuming provider_catalog has at least one valid model like 'gpt-4' or similar, but since we don't know the exact catalog yet, we just test the throw.
  console.log("provider_manager tests passed.");
}

test_provider_manager();
