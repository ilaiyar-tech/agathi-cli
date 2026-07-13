import { FastifyInstance } from "fastify";
import { knowledge } from "../../../../packages/knowledge_engine/index.js";

export async function knowledge_routes(app: FastifyInstance) {
  app.get("/knowledge", async () => {
    return knowledge.list_documents();
  });
}
