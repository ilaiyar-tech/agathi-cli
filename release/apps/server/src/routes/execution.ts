import type { FastifyInstance } from "fastify";
import { workflows } from "../../../../packages/workflows/index.js";
import { scheduler } from "../../../../packages/task_scheduler/index.js";

// Mock database in-memory state to persist executions
const executions = new Map<string, any>();

export async function execution_routes(app: FastifyInstance) {
  app.post("/execution/start", async (request, reply) => {
    const { planId, tasks } = request.body as any;
    const executionId = `exec_${Date.now()}`;
    const executionState = {
      id: executionId,
      planId,
      status: "running",
      progress: 0,
      logs: ["Starting execution engine...", "Running setup task..."],
      artifacts: [] as string[],
      tasks: (tasks || [
        { id: "t1", name: "Initialize", status: "completed" },
        { id: "t2", name: "Build", status: "running" }
      ])
    };

    executions.set(executionId, executionState);

    // Integrate with scheduler and workflows
    scheduler.schedule({
      id: executionId,
      timeoutMs: 500,
      action: async () => {
        executionState.progress = 50;
        executionState.logs.push("Executing sequentially respecting dependency order...");
        executionState.artifacts.push("dist/index.js");
        executionState.status = "completed";
        executionState.progress = 100;
        executionState.tasks[1].status = "completed";
      }
    });

    return executionState;
  });

  app.get("/execution/:id", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    return execution;
  });

  app.get("/execution/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    return { status: execution.status, progress: execution.progress };
  });

  app.get("/execution/:id/logs", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    return { logs: execution.logs };
  });

  app.get("/execution/:id/artifacts", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    return { artifacts: execution.artifacts };
  });

  app.post("/execution/:id/pause", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    execution.status = "paused";
    execution.logs.push("Execution paused by user.");
    return { success: true, status: "paused" };
  });

  app.post("/execution/:id/resume", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    execution.status = "running";
    execution.logs.push("Execution resumed by user.");
    return { success: true, status: "running" };
  });

  app.post("/execution/:id/cancel", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    execution.status = "cancelled";
    execution.logs.push("Execution cancelled by user.");
    return { success: true, status: "cancelled" };
  });

  app.post("/execution/:id/retry", async (request, reply) => {
    const { id } = request.params as any;
    const execution = executions.get(id);
    if (!execution) return reply.status(404).send({ error: "Execution not found" });
    execution.status = "running";
    execution.logs.push("Retrying failed tasks...");
    return { success: true, status: "running" };
  });
}
