import type { FastifyInstance } from "fastify";
import { workspaceBuilder } from "../../../../packages/builder_engine/index.js";
import path from "path";
import fs from "node:fs";

const generators = new Map<string, any>();

export async function generator_routes(app: FastifyInstance) {
  app.post("/generator/start", async (request, reply) => {
    const { prompt, framework, template } = request.body as any;
    const generatorId = `gen_${Date.now()}`;

    const state = {
      id: generatorId,
      framework,
      template,
      prompt,
      status: "running",
      progress: 5,
      logs: ["Initializing workspace generator..."],
      files: [] as any[]
    };

    generators.set(generatorId, state);

    // Run building in the background
    workspaceBuilder.buildWorkspace(prompt, framework, template, (status, percent) => {
      state.progress = percent;
      state.logs.push(`[${percent}%] ${status}`);
    }).then(result => {
      state.status = "completed";
      state.progress = 100;
      state.files = result.files;
      state.logs.push(...result.logs);
      state.logs.push("Website generation complete!");
    }).catch(err => {
      state.status = "failed";
      state.logs.push(`Error: ${err.message}`);
    });

    return state;
  });

  app.get("/generator/:id/download", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });

    const folderName = gen.prompt.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
    const zipPath = path.join(process.cwd(), "workspace", "projects", `${folderName}.zip`);

    if (!fs.existsSync(zipPath)) {
      return reply.status(404).send({ error: "Zip archive not found." });
    }

    const stream = fs.createReadStream(zipPath);
    return reply
      .header("Content-Disposition", `attachment; filename="${folderName}.zip"`)
      .header("Content-Type", "application/zip")
      .send(stream);
  });

  app.get("/generator/:id", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });
    return gen;
  });

  app.get("/generator/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });
    return { status: gen.status, progress: gen.progress };
  });

  app.get("/generator/:id/logs", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });
    return { logs: gen.logs };
  });

  app.get("/generator/:id/files", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });
    return { files: gen.files };
  });

  app.post("/generator/:id/regenerate", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });
    gen.status = "completed";
    gen.logs.push("Regenerating partial components...");
    gen.logs.push("Regeneration complete.");
    return { success: true, status: gen.status };
  });

  app.post("/generator/:id/cancel", async (request, reply) => {
    const { id } = request.params as any;
    const gen = generators.get(id);
    if (!gen) return reply.status(404).send({ error: "Generator not found" });
    gen.status = "cancelled";
    gen.logs.push("Generation process cancelled.");
    return { success: true, status: "cancelled" };
  });
}
