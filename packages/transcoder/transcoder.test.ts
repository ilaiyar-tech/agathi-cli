import { Transcoder } from "./transcoder.js";
import assert from "node:assert";

async function test_transcoder() {
  console.log("Starting Transcoder tests...");

  // 1. Test Tamil DSL -> CIP Conversion
  const dslInput = "Our system needs robust architecture (vei marul panai thol) and integration (koodal).";
  const cip = Transcoder.transcodeTamilToCIP(dslInput);
  
  assert.strictEqual(cip.version, "1.0.0", "CIP version must be 1.0.0");
  assert.ok(cip.metadata.dsl_terms.includes("வேய் மருள் பனை தோள்"), "Should identify Vei Marul Panai Thol");
  assert.ok(cip.metadata.dsl_terms.includes("கூடல்"), "Should identify Koodal");
  assert.ok(cip.intent.goals.length > 3, "Should aggregate goals from both terms");
  assert.ok(cip.intent.constraints.length > 3, "Should aggregate constraints");
  assert.ok(cip.intent.context_required.includes("project_structure"), "Should include project_structure context");
  assert.ok(cip.intent.context_required.includes("api_gateway"), "Should include api_gateway context");
  assert.strictEqual(cip.metadata.compressed_tokens, 25000 + 18000, "Should add expanded token values");
  console.log("✔ Tamil DSL -> CIP Conversion: PASSED");

  // 2. Test CIP -> AIR Translation
  const air = Transcoder.compileCIPToAIR(cip);
  assert.strictEqual(air.version, "1.0.0", "AIR version must be 1.0.0");
  assert.ok(air.plan.steps.length > 0, "AIR must contain plan steps");
  
  // Verify order: context_lookup first, then plan_tasks, then execute_tool, then trust_audit
  const stepActions = air.plan.steps.map(s => s.action);
  assert.strictEqual(stepActions[0], "context_lookup", "First steps must be Context OS lookup");
  assert.ok(stepActions.includes("plan_tasks"), "Must contain task planning step");
  assert.ok(stepActions.includes("execute_tool"), "Must contain execution steps");
  assert.strictEqual(stepActions[stepActions.length - 1], "trust_audit", "Final step must be trust audit / verification");
  console.log("✔ CIP -> AIR Translation: PASSED");

  // 3. Test AIR -> Model Syntax (Prompt Compiler)
  const claudePrompt = Transcoder.promptCompileAIR(air, 'claude');
  assert.ok(claudePrompt.startsWith("<instruction_plan"), "Claude prompt should be XML format");
  assert.ok(claudePrompt.includes("<step id="), "Claude prompt should include step details");

  const qwenPrompt = Transcoder.promptCompileAIR(air, 'qwen');
  assert.ok(qwenPrompt.startsWith("# Instruction Plan"), "Qwen prompt should be Markdown format");
  assert.ok(qwenPrompt.includes("## Step 1"), "Qwen prompt should include markdown step headings");
  console.log("✔ AIR -> Model Prompt Compilers: PASSED");

  // 4. Test JSON Repair (Stateful Normalizer)
  const brokenJson = '{"version": "1.0.0", "metadata": {"dsl_terms": ["tamil"], "count": 2';
  const repaired = Transcoder.jsonRepair(brokenJson);
  const parsed = JSON.parse(repaired);
  assert.strictEqual(parsed.version, "1.0.0");
  assert.strictEqual(parsed.metadata.count, 2);
  assert.deepStrictEqual(parsed.metadata.dsl_terms, ["tamil"]);
  console.log("✔ JSON Repair (Stateful Normalizer): PASSED");

  // 5. Test Trust Protocol Simulation
  let callCount = 0;
  const errorAction = async () => {
    callCount++;
    if (callCount < 3) {
      throw new Error("Temporary DB socket failure");
    }
    return "DB operations verified";
  };
  const recoveryAction = async (err: any) => {
    return "Recovery setup complete";
  };

  const protocolResult = await Transcoder.executeTrustProtocol(errorAction, recoveryAction);
  assert.strictEqual(protocolResult.status, "success");
  assert.strictEqual(protocolResult.stage, "self_correction");
  assert.strictEqual(protocolResult.output, "Recovery setup complete");
  console.log("✔ Trust Protocol Simulation: PASSED");

  console.log("All Transcoder tests passed successfully!");
}

test_transcoder().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
