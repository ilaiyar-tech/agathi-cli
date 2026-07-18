import { skillRegistry, SkillCategory, SkillProfile } from "./skill_registry.js";
import { memory } from "../memory/memory_engine.js";
import assert from "node:assert";

async function test_skill_registry() {
  // Clear tables
  memory.database.prepare("delete from skill_registry").run();
  skillRegistry.clear();

  const engineer: SkillProfile = {
    id: "software-engineer",
    name: "Software Engineer",
    category: SkillCategory.ENGINEERING,
    version: "1.0.0",
    description: "Implements clean, tested features in the workspace",
    policies: {
      planner: { mode: "kahn", maxParallelism: 2 },
      reasoning: { mode: "CandidateEvaluation", evalDepth: 3 },
      strategy: { mode: "Conservative", riskTolerance: "low" },
      capabilities: { allowedCategories: ["vcs", "custom"], securityLevelLimit: "restricted" },
      verification: { strictness: "Strict" },
      reflection: { depth: "StrictLessons" },
      output: { style: "Technical" }
    },
    dependencies: [],
    tags: ["typescript", "testing"],
    enabled: true
  };

  skillRegistry.registerSkill(engineer);

  const testGet = skillRegistry.getSkill("software-engineer");
  assert.ok(testGet);
  assert.strictEqual(testGet.name, "Software Engineer");
  assert.strictEqual(testGet.policies.planner.mode, "kahn");

  const search = skillRegistry.searchSkills("features");
  assert.strictEqual(search.length, 1);
  assert.strictEqual(search[0].id, "software-engineer");

  // Validate duplicate registration errors
  await assert.throws(() => {
    skillRegistry.registerSkill(engineer);
  }, /already registered/);

  // Validate updates
  skillRegistry.updateSkillStatus("software-engineer", false);
  assert.strictEqual(skillRegistry.getSkill("software-engineer")?.enabled, false);

  console.log("skill_registry tests passed.");
}

test_skill_registry().catch(console.error);
