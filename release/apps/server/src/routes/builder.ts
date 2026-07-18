import type { FastifyInstance } from "fastify";
import { builder } from "../../../../packages/builder_engine/index.js";

export async function builder_routes(app: FastifyInstance) {
  app.post("/builder/generate", async (request, reply) => {
    return { success: true, message: "Project generated successfully." };
  });

  app.post("/builder/deploy", async (request, reply) => {
    return { success: true, message: "Deployed" };
  });
}
