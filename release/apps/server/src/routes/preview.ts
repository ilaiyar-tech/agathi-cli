import type { FastifyInstance } from "fastify";
import { deployer } from "../../../../packages/deployment_engine/index.js";

const previews = new Map<string, any>();

export async function preview_routes(app: FastifyInstance) {
  app.post("/preview/start", async (request, reply) => {
    const { generatorId } = request.body as any;
    const previewId = `prev_${Date.now()}`;
    const state = {
      id: previewId,
      generatorId,
      status: "running",
      url: `http://localhost:3000/preview/${previewId}`,
      logs: ["Starting preview server...", "Loading compiled bundle...", "Hot reload active."],
      errors: [] as string[],
      snapshots: ["Initial Render"],
      consoleLogs: ["Console: app initialized."],
      networkRequests: ["GET /api/v1/data - 200 OK"]
    };
    previews.set(previewId, state);
    return state;
  });

  app.get("/preview/:id", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    return prev;
  });

  app.get("/preview/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    return { status: prev.status };
  });

  app.get("/preview/:id/logs", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    return { logs: prev.logs };
  });

  app.get("/preview/:id/url", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    return { url: prev.url };
  });

  app.get("/preview/:id/errors", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    return { errors: prev.errors };
  });

  app.post("/preview/:id/restart", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    prev.status = "running";
    prev.logs.push("Restarting preview container...");
    prev.logs.push("Preview restarted.");
    return { success: true, status: prev.status };
  });

  app.post("/preview/:id/stop", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    prev.status = "stopped";
    prev.logs.push("Preview container stopped.");
    return { success: true, status: prev.status };
  });

  app.delete("/preview/:id", async (request, reply) => {
    const { id } = request.params as any;
    const prev = previews.get(id);
    if (!prev) return reply.status(404).send({ error: "Preview not found" });
    previews.delete(id);
    return { success: true };
  });
}
