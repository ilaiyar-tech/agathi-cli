import { skillProfileManager } from "./skill_profiles.js";
import { SkillCategory, SkillProfile } from "./skill_registry.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_skill_profiles() {
  // Clear tables
  memory.database.prepare("delete from skill_profiles").run();
  memory.database.prepare("delete from profile_versions").run();

  const manager = skillProfileManager;
  manager.registerBuiltInProfiles();

  // 1. Validate built-ins list
  const list = manager.listProfiles();
  assert.ok(list.length >= 10);
  const debugProfile = manager.getProfile("debugger");
  assert.ok(debugProfile);
  assert.strictEqual(debugProfile.category, SkillCategory.TESTING);

  // 2. Validate loops check validation
  const invalidProfile: SkillProfile = {
    id: "loop-profile",
    name: "Loop Profile",
    category: SkillCategory.CUSTOM,
    version: "1.0.0",
    description: "Loop check",
    policies: debugProfile.policies,
    dependencies: [],
    inherits: "loop-profile",
    tags: [],
    enabled: true
  };

  await assert.throws(() => {
    manager.createProfile(invalidProfile);
  }, /Circular inheritance/);

  console.log("skill_profiles tests passed.");
}

test_skill_profiles().catch(console.error);
