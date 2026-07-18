import assert from "node:assert";
import { wil, WorkflowCompiler, WorkflowValidator } from "./workflow_intelligence.js";

async function test_compiler_and_validator() {
  const definition = {
    nodes: [
      { id: "node-A", type: "sequential", action: "Step A" },
      { id: "node-B", type: "sequential", action: "Step B" }
    ],
    edges: [
      { from: "node-A", to: "node-B" }
    ]
  };

  const compiled = WorkflowCompiler.compile(definition);
  assert.strictEqual(compiled.nodes.length, 2);
  assert.strictEqual(compiled.edges.length, 1);

  const val1 = WorkflowValidator.validate(compiled.nodes, compiled.edges);
  assert.strictEqual(val1.valid, true);

  // Cycle check
  const cycleNodes = [
    { id: "node-A", workflowId: "1", nodeType: "sequential" as const, action: "A", status: "waiting" as const },
    { id: "node-B", workflowId: "1", nodeType: "sequential" as const, action: "B", status: "waiting" as const }
  ];
  const cycleEdges = [
    { workflowId: "1", fromNodeId: "node-A", toNodeId: "node-B" },
    { workflowId: "1", fromNodeId: "node-B", toNodeId: "node-A" }
  ];
  const val2 = WorkflowValidator.validate(cycleNodes, cycleEdges);
  assert.strictEqual(val2.valid, false);
  assert.ok(val2.errors[0].includes("Circular"));

  console.log("  test_compiler_and_validator passed.");
}

async function test_workflow_scheduler() {
  const workflowId = await wil.createWorkflow("workspace-1", "user-1", "1.0");
  const definition = {
    nodes: [
      { id: "node-A", type: "sequential", action: "Step A" },
      { id: "node-B", type: "sequential", action: "Step B" }
    ],
    edges: [
      { from: "node-A", to: "node-B" }
    ]
  };

  await wil.compileWorkflow(workflowId, definition);
  const val = await wil.validateWorkflow(workflowId);
  assert.strictEqual(val.valid, true);

  await wil.startWorkflow(workflowId);
  const nodes = await wil.getNodes(workflowId);
  assert.strictEqual(nodes[0].status, "completed");
  assert.strictEqual(nodes[1].status, "completed");

  console.log("  test_workflow_scheduler passed.");
}

async function test_branch_and_merge() {
  const workflowId = await wil.createWorkflow("workspace-1", "user-1", "1.0");
  const definition = {
    nodes: [{ id: "node-A", type: "sequential", action: "Step A" }],
    edges: []
  };
  await wil.compileWorkflow(workflowId, definition);

  const branchId = await wil.branchWorkflow(workflowId, "dev-branch");
  await wil.compileWorkflow(branchId, {
    nodes: [{ id: "node-A", type: "sequential", action: "Step A (Updated)" }],
    edges: []
  });

  await wil.mergeWorkflow(workflowId, branchId);
  const nodes = await wil.getNodes(workflowId);
  assert.strictEqual(nodes[0].action, "Step A (Updated)");

  console.log("  test_branch_and_merge passed.");
}

async function test_human_approval() {
  const workflowId = await wil.createWorkflow("workspace-approval", "user-approval", "1.0");
  const definition = {
    nodes: [
      { id: "node-A", type: "sequential", action: "Step A" },
      { id: "approval-1", type: "approval", action: "Ask for merge approval" },
      { id: "node-B", type: "sequential", action: "Step B" }
    ],
    edges: [
      { from: "node-A", to: "approval-1" },
      { from: "approval-1", to: "node-B" }
    ]
  };

  await wil.compileWorkflow(workflowId, definition);
  await wil.startWorkflow(workflowId);

  const nodesBefore = await wil.getNodes(workflowId);
  assert.strictEqual(nodesBefore[0].status, "completed");
  assert.strictEqual(nodesBefore[1].status, "running"); // waiting on approval
  assert.strictEqual(nodesBefore[2].status, "waiting");

  // Approve
  await wil.approveWorkflow(workflowId, "approval-1");

  const nodesAfter = await wil.getNodes(workflowId);
  assert.strictEqual(nodesAfter[1].status, "completed");
  assert.strictEqual(nodesAfter[2].status, "completed");

  console.log("  test_human_approval passed.");
}

async function test_checkpoint_recovery() {
  const workflowId = await wil.createWorkflow("workspace-1", "user-1", "1.0");
  const definition = {
    nodes: [
      { id: "node-A", type: "sequential", action: "Step A" },
      { id: "node-B", type: "sequential", action: "Step B" }
    ],
    edges: [{ from: "node-A", to: "node-B" }]
  };
  await wil.compileWorkflow(workflowId, definition);

  // Set node-A status completed manually for checkpoint
  const { memory } = await import("../memory/memory_engine.js");
  memory.database.prepare("update workflow_nodes set status = 'completed' where id = 'node-A'").run();

  const checkpointId = await wil.createCheckpoint(workflowId);

  // Reset to waiting
  memory.database.prepare("update workflow_nodes set status = 'waiting'").run();

  await wil.restoreCheckpoint(checkpointId);
  const nodes = await wil.getNodes(workflowId);
  const nodeA = nodes.find(n => n.id === "node-A")!;
  assert.strictEqual(nodeA.status, "completed");

  console.log("  test_checkpoint_recovery passed.");
}

async function test_stress_performance() {
  const workflowId = await wil.createWorkflow("workspace-perf", "user-perf", "1.0");
  
  // Compile 100 sequential nodes
  const nodesList = [];
  const edgesList = [];
  for (let i = 0; i < 100; i++) {
    nodesList.push({ id: `node-${i}`, type: "sequential", action: `Step ${i}` });
    if (i > 0) {
      edgesList.push({ from: `node-${i-1}`, to: `node-${i}` });
    }
  }

  await wil.compileWorkflow(workflowId, { nodes: nodesList, edges: edgesList });

  const start = Date.now();
  await wil.startWorkflow(workflowId);
  const duration = Date.now() - start;

  assert.ok(duration < 200, `Running 100 sequential workflow nodes took ${duration}ms, must be under 200ms`);

  console.log("  test_stress_performance passed.");
}

async function runAll() {
  console.log("Running Workflow Intelligence Layer tests...");
  await test_compiler_and_validator();
  await test_workflow_scheduler();
  await test_branch_and_merge();
  await test_human_approval();
  await test_checkpoint_recovery();
  await test_stress_performance();
  console.log("workflow_intelligence tests passed.");
}

runAll().catch(console.error);
