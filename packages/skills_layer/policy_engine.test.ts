import { skillPolicyEngine } from "./policy_engine.js";
import { skillProfileManager } from "./skill_profiles.js";
import { SkillCategory, SkillProfile } from "./skill_registry.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_policy_engine() {
  // Clear tables
  memory.database.prepare("delete from skill_profiles").run();
  memory.database.prepare("delete from profile_versions").run();
  memory.database.prepare("delete from policy_resolution_history").run();
  memory.database.prepare("delete from policy_statistics").run();

  const manager = skillProfileManager;
  manager.registerBuiltInProfiles();

  // 1. Standard Inheritance Check (Software Engineer as parent, custom Coder child inheriting from it)
  const coderChild: SkillProfile = {
    id: "typescript-expert",
    name: "TypeScript Expert",
    category: SkillCategory.ENGINEERING,
    version: "1.0.0",
    description: "Expert level engineer override",
    policies: {
      planner: { mode: "sequential", maxParallelism: 4 },
      reasoning: { mode: "Linear", evalDepth: 5 },
      strategy: { mode: "Aggressive", riskTolerance: "medium" },
      capabilities: { allowedCategories: ["custom"], securityLevelLimit: "privileged" },
      verification: { strictness: "Strict" },
      reflection: { depth: "StrictLessons" },
      output: { style: "Technical" }
    },
    dependencies: [],
    inherits: "software-engineer",
    tags: ["ts"],
    enabled: true
  };
  manager.createProfile(coderChild);

  const resolved = skillPolicyEngine.resolvePolicies("typescript-expert");
  assert.strictEqual(resolved.planner.mode, "sequential"); // Overriden by child
  assert.strictEqual(resolved.planner.maxParallelism, 4);

  // 2. Composition overlay test
  const reviewOverlay: SkillProfile = {
    id: "reviewer-overlay",
    name: "Reviewer Overlay",
    category: SkillCategory.TESTING,
    version: "1.0.0",
    description: "Composition test",
    policies: {
      planner: { mode: "kahn", maxParallelism: 1 },
      reasoning: { mode: "DeepSearch", evalDepth: 2 },
      strategy: { mode: "Conservative", riskTolerance: "low" },
      capabilities: { allowedCategories: ["vcs"], securityLevelLimit: "safe" },
      verification: { strictness: "Conversational" },
      reflection: { depth: "MetricsOnly" },
      output: { style: "Concise" }
    },
    dependencies: [],
    tags: [],
    enabled: true
  };
  manager.createProfile(reviewOverlay);

  const composedPolicy = skillPolicyEngine.resolvePolicies("typescript-expert", ["reviewer-overlay"]);
  assert.strictEqual(composedPolicy.planner.mode, "kahn"); // Composed values takes priority over child
  assert.strictEqual(composedPolicy.output.style, "Concise");

  console.log("policy_engine tests passed.");
}

test_policy_engine().catch(console.error);
