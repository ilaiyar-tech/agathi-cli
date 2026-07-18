import Fastify from "fastify";
import cors from "@fastify/cors";
import axios from "axios";
import fs from "node:fs";

import { router } from "../../../packages/router/index.js";
import { runtime } from "../../../packages/agent_runtime/index.js";
import { tools_router } from "../../../packages/tool_router/index.js";
import { workflow } from "../../../packages/tool_router/workflow_manager.js";
import { models_routes } from "./routes/models.js";
import { system_routes } from "./routes/system.js";
import { benchmark_routes } from "./routes/benchmark.js";
import { provider_routes } from "./routes/provider.js";
import { auto_chat_routes } from "./routes/auto_chat.js";
import browser_routes from "./routes/browser.js";
import { control_routes } from "./routes/index.js";
import { chats_routes } from "./routes/chats.js";
import { attach_websockets } from "./websocket/index.js";

import { memory } from "../../../packages/memory/index.js";
import { settings_routes } from "./routes/settings.js";
import { knowledge_routes } from "./routes/knowledge.js";
import { agents_routes } from "./routes/agents.js";
import { builder_routes } from "./routes/builder.js";
import { planner_routes } from "./routes/planner.js";
import { execution_routes } from "./routes/execution.js";
import { tools_routes } from "./routes/tools.js";
import { generator_routes } from "./routes/generator.js";
import { preview_routes } from "./routes/preview.js";
import { deploy_routes } from "./routes/deploy.js";
import { whatsapp_routes } from "./routes/whatsapp.js";

const app = Fastify({
  requestTimeout: 0,
  connectionTimeout: 0,
  keepAliveTimeout: 0
});

await app.register(cors, { origin: true });

await models_routes(app);
await system_routes(app);
await benchmark_routes(app);
await provider_routes(app);
await auto_chat_routes(app);
  await app.register(browser_routes, { prefix: "/browser" });
console.log("--- DEBUG: Routes Registered ---"); console.log(app.printRoutes());
await control_routes(app);
await chats_routes(app);
await settings_routes(app);
await knowledge_routes(app);
await whatsapp_routes(app);
await agents_routes(app);
await builder_routes(app);
await planner_routes(app);
await execution_routes(app);
await tools_routes(app);
await generator_routes(app);
await preview_routes(app);
await deploy_routes(app);

// --- OPENAI COMPATIBILITY ROUTING LAYER (STAGE 5 CRITICAL ACTION ITEM) ---

/**
 * GET /v1/models
 * Resolves available platform roles matching the verified model registry layout
 */
app.get("/v1/models", async (request, reply) => {
  try {
    const registry_path = "/ai/models/router/models.json";
    let registry: Record<string, any> = {};
    if (fs.existsSync(registry_path)) {
      registry = JSON.parse(fs.readFileSync(registry_path, "utf8"));
    }
    const models_list = Object.keys(registry).map((model_name) => ({
      id: model_name,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "tu2pu_engine"
    }));

    return reply.status(200).send({
      object: "list",
      data: models_list
    });
  } catch (error) {
    return reply.status(500).send({ error: "failed_to_retrieve_models" });
  }
});

/**
 * POST /v1/chat/completions
 * Interfaces standard third-party CLI input directly into the native runtime pipeline
 */
app.post("/v1/chat/completions", async (request, reply) => {
  // API Key validation (Cloud Gatekeeper)
  try {
    const keysCount = memory.database.prepare("SELECT count(*) as count FROM api_keys").get() as any;
    if (keysCount && keysCount.count > 0) {
      const authHeader = request.headers["authorization"];
      if (!authHeader) {
        return reply.status(401).send({ error: { message: "Authentication required. Please provide a Bearer token API key.", type: "invalid_request_error" } });
      }
      const key = authHeader.replace("Bearer ", "").trim();
      const row = memory.database.prepare("SELECT key FROM api_keys WHERE key = ? AND status = 'active'").get(key) as any;
      if (!row) {
        return reply.status(401).send({ error: { message: "Invalid API key provided", type: "invalid_request_error" } });
      }
    }
  } catch (dbErr) {}

  const body = request.body as {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    temperature?: number;
  };

  const parsed_messages = body.messages || [];
  const latest_message = parsed_messages[parsed_messages.length - 1]?.content || "";
  const active_session_id = (request.headers["x-session-id"] as string) || "aider_integration_session";

  if (body.stream) {
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });

    try {
      await runtime.chat_stream(latest_message, active_session_id, (token_chunk) => {
        const stream_chunk = {
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: body.model,
          choices: [{
            index: 0,
            delta: { content: token_chunk },
            finish_reason: null
          }]
        };
        reply.raw.write(`data: ${JSON.stringify(stream_chunk)}\n\n`);
      });

      const termination_chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: body.model,
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
      };
      reply.raw.write(`data: ${JSON.stringify(termination_chunk)}\n\n`);
      reply.raw.write("data: [DONE]\n\n");
    } catch (stream_error: any) {
      const error_chunk = {
        error: { message: stream_error.message, type: "api_error" }
      };
      reply.raw.write(`data: ${JSON.stringify(error_chunk)}\n\n`);
    }

    reply.raw.end();
    return reply;
  }

  try {
    const runtime_output = await runtime.chat(latest_message, active_session_id);
    return reply.status(200).send({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: body.model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: runtime_output.content
        },
        finish_reason: "stop"
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    });
  } catch (execution_error: any) {
    return reply.status(500).send({
      error: { message: execution_error.message, type: "api_error" }
    });
  }
});

/**
 * POST /v1/embeddings
 * Routes local vector space metrics out to standard indexing layouts
 */
app.post("/v1/embeddings", async (request, reply) => {
  try {
    return reply.status(200).send({
      object: "list",
      data: [{ object: "embedding", embedding: new Array(1536).fill(0.0), index: 0 }],
      model: "nomic-embed-text",
      usage: { prompt_tokens: 0, total_tokens: 0 }
    });
  } catch (embedding_error) {
    return reply.status(500).send({
      error: { message: "embedding_generation_failed", type: "api_error" }
    });
  }
});

// --- EXISTING TU2PU NATIVE ENDPOINTS ---

app.post(
  "/chat",
  async (request) => {
    const body = request.body as {
      prompt: string;
      session_id?: string;
    };

    return runtime.chat(
      body.prompt,
      body.session_id ?? "default"
    );
  }
);

app.post(
  "/chat/stream",
  async (request, reply) => {
    const body = request.body as { prompt: string; session_id?: string };
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    try {
      const result = await runtime.chat_stream(body.prompt, body.session_id ?? "default", token => {
        reply.raw.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      });
      reply.raw.write(`event: done\ndata: ${JSON.stringify({ id: result.id, session_id: result.session_id })}\n\n`);
    } catch (error) {
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "chat_failed" })}\n\n`);
    }
    reply.raw.end();
    return reply;
  }
);

await app.listen({
  host: "0.0.0.0",
  port: 8100
});

attach_websockets(app.server);

memory.clear("default");

console.log("server_started");
