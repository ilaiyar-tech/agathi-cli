import assert from "node:assert";
import { pil, PromptIdentityManager, IntentAnalyzer, GoalExtractor, PromptClassifier, PromptCompressor } from "./prompt_intelligence.js";

async function test_identity_manager() {
  const manager = new PromptIdentityManager();
  const identity = manager.createIdentity("test-session", "test-workspace", "Task");
  
  assert.ok(identity.id.startsWith("prompt-"));
  assert.strictEqual(identity.sessionId, "test-session");
  assert.strictEqual(identity.workspaceId, "test-workspace");
  assert.strictEqual(identity.executionState, "Task");
  assert.ok(identity.timestamp > 0);
  console.log("  test_identity_manager passed.");
}

async function test_intent_analyzer() {
  const analyzer = new IntentAnalyzer();
  assert.strictEqual(analyzer.analyze("git status"), "git");
  assert.strictEqual(analyzer.analyze("run command npm test"), "terminal");
  assert.strictEqual(analyzer.analyze("search files for keyword"), "file_analysis");
  assert.strictEqual(analyzer.analyze("why did the build fail?"), "investigation");
  assert.strictEqual(analyzer.analyze("deploy the website to wrangler"), "deployment");
  assert.strictEqual(analyzer.analyze("hello there"), "chat");
  console.log("  test_intent_analyzer passed.");
}

async function test_goal_extractor() {
  const extractor = new GoalExtractor();
  assert.strictEqual(extractor.extract("Please fix the typo in index.ts"), "fix the typo in index.ts");
  assert.strictEqual(extractor.extract("My goal is to compile the project"), "compile the project");
  assert.strictEqual(extractor.extract("simple task"), "simple task");
  console.log("  test_goal_extractor passed.");
}

async function test_prompt_classifier() {
  const classifier = new PromptClassifier();
  const res1 = classifier.classify("sudo rm -rf /");
  assert.strictEqual(res1.riskLevel, "privileged");
  
  const res2 = classifier.classify("fix the bug in test.ts");
  assert.strictEqual(res2.category, "Bug Fix");
  assert.strictEqual(res2.riskLevel, "safe");
  
  console.log("  test_prompt_classifier passed.");
}

async function test_prompt_graph() {
  const node1Id = "node-1";
  const node2Id = "node-2";
  
  pil.graph.saveNode({
    promptId: node1Id,
    childPromptIds: [],
    relatedPromptIds: [],
    executionChain: [],
    decisionHistory: []
  });
  
  pil.graph.addChild(node1Id, node2Id);
  
  const node1 = pil.graph.getNode(node1Id);
  const node2 = pil.graph.getNode(node2Id);
  
  assert.ok(node1);
  assert.ok(node2);
  assert.ok(node1.childPromptIds.includes(node2Id));
  assert.strictEqual(node2.parentPromptId, node1Id);
  
  console.log("  test_prompt_graph passed.");
}

async function test_prompt_compressor() {
  const compressor = new PromptCompressor();
  const history = [
    "State changed to Planning",
    "State changed to Execution",
    "State changed to Completed"
  ];
  
  const res = compressor.compress(history, "new query");
  assert.strictEqual(res.completedDecisions.length, 1);
  assert.strictEqual(res.activeDecisions.length, 1);
  assert.strictEqual(res.currentObjective, 'Evaluate user prompt: "new query"');
  
  console.log("  test_prompt_compressor passed.");
}

async function test_prompt_cache() {
  const promptKey = "cache test prompt";
  const cachedVal = "cached value";
  
  pil.cache.set(promptKey, "exact", cachedVal);
  const fetchedVal = pil.cache.get(promptKey, "exact");
  
  assert.strictEqual(fetchedVal, cachedVal);
  console.log("  test_prompt_cache passed.");
}

async function test_pil_process() {
  const result = await pil.process("Please search files for user details", {
    sessionId: "test-pil-session"
  });
  
  assert.ok(result.identity);
  assert.ok(result.contract);
  assert.ok(result.graphNode);
  assert.ok(result.context);
  
  assert.strictEqual(result.contract.intent, "file_analysis");
  assert.ok(result.contract.required_tools.includes("search_files"));
  assert.ok(result.context.toolAvailability.includes("search_files"));
  
  console.log("  test_pil_process passed.");
}

async function runAll() {
  console.log("Running Prompt Intelligence Layer tests...");
  await test_identity_manager();
  await test_intent_analyzer();
  await test_goal_extractor();
  await test_prompt_classifier();
  await test_prompt_graph();
  await test_prompt_compressor();
  await test_prompt_cache();
  await test_pil_process();
  console.log("prompt_intelligence tests passed.");
}

runAll().catch(console.error);
