import { get_models, get_active_model, set_active_model } from "./provider_manager.js";
import { unload_active_model } from "../model_manager/index.js";
import assert from "node:assert";

function test_provider_manager() {
  unload_active_model(); // reset state for testing
  
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

  console.log("provider_manager tests passed.");
}

test_provider_manager();
