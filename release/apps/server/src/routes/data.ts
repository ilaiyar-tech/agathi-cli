import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";

import { memory } from "../../../../packages/memory/index.js";
import { model_usage, unload_active_model } from "../../../../packages/model_manager/index.js";
import { downloads } from "../../../../packages/download_manager/index.js";
import { control_events, control_state, save_control_state } from "./control_state.js";
import { list_files } from "./runtime.js";
import { PATHS } from "../../../../packages/config/index.js";

export async function data_routes(app: FastifyInstance) {

  app.get("/memory", async () => memory.list());

  app.get("/memory/sessions", async () => memory.sessions());

  app.get("/downloads", async () => downloads.list());

  app.post("/downloads", async (request) => {
    const body = (request.body ?? {}) as {
      model?: string;
      url?: string;
    };

    if (!body.url) {
      return [];
    }

    const item = downloads.start(body.model ?? "model", body.url);

    control_events.emit("downloads", downloads.list());

    return item;
  });

  app.post("/downloads/:id/cancel", async (request) => {
    const item = downloads.cancel((request.params as { id: string }).id);

    control_events.emit("downloads", downloads.list());

    return item ?? {};
  });

  app.get("/rag/status", async () => {
    const documents = control_state.workflows.filter(
      value => value.kind === "document"
    );

    return {
      documents: documents.length,
      chunks: documents.reduce(
        (sum, value) => sum + Number(value.chunks ?? 0),
        0
      ),
      embedding: "unconfigured",
      reranker: "unconfigured",
      status: "ready"
    };
  });

  app.post("/rag/rebuild", async () => {
    const documents = list_files(PATHS.workspace).filter(file =>
      ["txt", "md", "pdf", "json", "ts", "tsx"].includes(String(file.type))
    );

    control_state.workflows = control_state.workflows
      .filter(value => value.kind !== "document")
      .concat(
        documents.map(file => ({
          id: crypto.randomUUID(),
          kind: "document",
          name: file.name,
          path: file.path,
          chunks: 1,
          status: "indexed"
        }))
      );

    save_control_state();

    return {
      queued: false,
      documents: documents.length
    };
  });

  app.get("/rag/search", async request => {
    const query = String(
      (request.query as { q?: string }).q ?? ""
    ).toLowerCase();

    return control_state.workflows.filter(
      value =>
        String(value.name ?? "").toLowerCase().includes(query) ||
        String(value.path ?? "").toLowerCase().includes(query)
    );
  });

  app.get("/models/usage", async () => model_usage());

  app.post("/models/unload", async () => unload_active_model());

  app.get("/models/queue", async () =>
    control_state.queue.filter(value => value.kind === "model")
  );
}
