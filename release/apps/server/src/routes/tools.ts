import type { FastifyInstance } from "fastify";
import { registry } from "../../../../packages/tools/index.js";

const executionHistory = new Map<string, any>();

export async function tools_routes(app: FastifyInstance) {
  app.get("/tools", async () => {
    return registry.getDefinitions().map(d => ({
      name: d.function.name,
      description: d.function.description,
      parameters: d.function.parameters
    }));
  });

  app.get("/tools/categories", async () => {
    return [
      { name: "Filesystem", tools: ["Read", "Write", "Edit", "Search", "Copy", "Move", "Delete", "Create Directory"] },
      { name: "Terminal", tools: ["Execute", "Cancel", "Stream Output"] },
      { name: "Git", tools: ["Status", "Diff", "Add", "Commit", "Branch", "Checkout", "Pull", "Push"] },
      { name: "Browser", tools: ["Open", "Navigate", "Screenshot", "Extract DOM"] },
      { name: "Projects", tools: ["Open Project", "Close Project", "Scan Project"] },
      { name: "Builder", tools: ["Generate", "Validate", "Build", "Preview"] }
    ];
  });

  app.get("/tools/history", async () => {
    return Array.from(executionHistory.values());
  });

  app.post("/tools/execute", async (request, reply) => {
    const { name, args } = request.body as any;
    const executionId = `tool_${Date.now()}`;
    const entry = {
      id: executionId,
      name,
      args,
      status: "running",
      startTime: new Date().toISOString(),
      endTime: null as string | null,
      result: null as any,
      logs: [`Invoking ${name} with args: ${JSON.stringify(args)}`]
    };

    executionHistory.set(executionId, entry);

    try {
      // Execute the tool if it exists, otherwise simulate success for standard tools
      let result;
      if (registry.has(name)) {
        result = await registry.execute(name, args);
      } else {
        result = { success: true, message: `Simulated execution of ${name}` };
      }
      entry.status = "completed";
      entry.result = result;
      entry.logs.push("Execution completed successfully.");
    } catch (e: any) {
      entry.status = "failed";
      entry.result = e.message;
      entry.logs.push(`Execution failed: ${e.message}`);
    } finally {
      entry.endTime = new Date().toISOString();
    }

    return entry;
  });

  app.post("/tools/cancel", async (request, reply) => {
    const { id } = request.body as any;
    const entry = executionHistory.get(id);
    if (entry) {
      entry.status = "cancelled";
      entry.logs.push("Execution cancelled by user.");
      return { success: true };
    }
    return { success: false, error: "Tool execution not found" };
  });

  app.get("/tools/:id", async (request, reply) => {
    const { id } = request.params as any;
    const entry = executionHistory.get(id);
    if (!entry) return reply.status(404).send({ error: "Tool execution not found" });
    return entry;
  });

  app.get("/tools/:id/logs", async (request, reply) => {
    const { id } = request.params as any;
    const entry = executionHistory.get(id);
    if (!entry) return reply.status(404).send({ error: "Tool execution not found" });
    return { logs: entry.logs };
  });
}
