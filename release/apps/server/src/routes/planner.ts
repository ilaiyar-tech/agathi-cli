import type { FastifyInstance } from "fastify";

export async function planner_routes(app: FastifyInstance) {
  app.post("/planner/plan", async (request, reply) => {
    return { 
      id: "plan_123", 
      status: "planning",
      tasks: [
        { id: "t1", name: "Initialize", deps: [] },
        { id: "t2", name: "Build", deps: ["t1"] }
      ],
      tools: ["file_system", "npm"],
      providers: ["openai", "anthropic"],
      artifacts: ["package.json"]
    };
  });

  app.get("/planner/:id", async (request, reply) => {
    return {
      id: "plan_123",
      status: "completed",
      tasks: [
        { id: "t1", name: "Initialize", deps: [] },
        { id: "t2", name: "Build", deps: ["t1"] }
      ],
      tools: ["file_system", "npm"],
      providers: ["openai", "anthropic"],
      artifacts: ["package.json"]
    };
  });

  app.get("/planner/:id/status", async (request, reply) => {
    return { id: "plan_123", status: "completed", progress: 100 };
  });

  app.post("/planner/:id/resume", async (request, reply) => {
    return { success: true, message: "Plan resumed" };
  });

  app.post("/planner/:id/cancel", async (request, reply) => {
    return { success: true, message: "Plan cancelled" };
  });
}
