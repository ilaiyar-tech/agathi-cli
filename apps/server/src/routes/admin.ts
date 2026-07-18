import type { FastifyInstance } from "fastify";
import { APP_VERSION, ENV } from "../../../../packages/config/index.js";
import { add_audit } from "./control_state.js";
import crypto from "node:crypto";
import { memory } from "../../../../packages/memory/memory_engine.js";

// Initialize database table
try {
  memory.database.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      key TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      status TEXT NOT NULL
    );
  `);
} catch (e) {
  console.error("Failed to initialize api_keys table:", e);
}

export async function admin_routes(app:FastifyInstance){
  app.get("/health",async()=>({status:"ok",uptime:process.uptime()}));
  app.get("/version",async()=>({version:APP_VERSION}));
  app.get("/config",async()=>({environment:ENV.NODE_ENV,port:ENV.PORT}));
  app.get("/metrics",async()=>({requests:0,tokens:0,latency:0,uptime:Math.round(process.uptime())}));
  app.post("/admin/cache/clear",async()=>{add_audit("admin.cache_cleared");return {cleared:true};});
  app.post("/admin/restart",async()=>({accepted:true,action:"restart"}));
  app.post("/admin/shutdown",async()=>({accepted:true,action:"shutdown"}));

  app.get("/admin/apikeys", async () => {
    try {
      const rows = memory.database.prepare("SELECT key, name, created_at as createdAt, status FROM api_keys ORDER BY created_at DESC").all();
      return { keys: rows };
    } catch (e: any) {
      return { error: e.message };
    }
  });

  app.post("/admin/apikeys", async (request: any, reply) => {
    const { name } = request.body as { name: string };
    if (!name || name.trim() === "") {
      return reply.status(400).send({ error: "Name is required" });
    }
    try {
      const key = `sk_tu2pu_${crypto.randomBytes(16).toString("hex")}`;
      const createdAt = Date.now();
      memory.database.prepare("INSERT INTO api_keys (key, name, created_at, status) VALUES (?, ?, ?, 'active')").run(key, name, createdAt);
      add_audit(`apikey_generated:${name}`);
      return { key, name, createdAt, status: "active" };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  app.delete("/admin/apikeys/:key", async (request: any, reply) => {
    const { key } = request.params as { key: string };
    try {
      memory.database.prepare("DELETE FROM api_keys WHERE key = ?").run(key);
      add_audit(`apikey_deleted`);
      return { success: true };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
