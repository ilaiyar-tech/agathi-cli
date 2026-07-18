import crypto from "node:crypto";
import http from "node:http";
import { memory } from "../memory/memory_engine.js";
import { eventBus } from "../context_engine/event_bus.js";

export interface DeveloperToken {
  token: string;
  owner: string;
  createdAt: number;
  status: "active" | "revoked";
}

export interface DxpConfig {
  port: number;
  host: string;
  logLevel: string;
  telemetryEnabled: boolean;
  tokenValidationEnabled: boolean;
}

export class DeveloperExperiencePlatform {
  private server: http.Server | null = null;
  private config: DxpConfig = {
    port: 9988,
    host: "127.0.0.1",
    logLevel: "info",
    telemetryEnabled: false,
    tokenValidationEnabled: true
  };

  constructor() {
    try {
      memory.database.exec(`
        create table if not exists dxp_tokens (
          token text primary key,
          owner text not null,
          created_at integer not null,
          status text not null
        );

        create table if not exists dxp_diagnostics (
          id integer primary key autoincrement,
          type text not null,
          details text not null,
          timestamp integer not null
        );

        create table if not exists dxp_administrators (
          email text primary key,
          name text not null,
          password_hash text not null,
          company text not null,
          workspace text not null,
          timestamp integer not null
        );

        create table if not exists dxp_developers (
          email text primary key,
          name text not null,
          status text not null,
          token text not null,
          created_at integer not null
        );
      `);
    } catch (e) {
      console.error("Failed to initialize DXP tables", e);
    }
  }

  // Configuration management
  loadConfig(overrides: Partial<DxpConfig> = {}): DxpConfig {
    // Mimic loading from config.json / environment variables
    const envPort = process.env.ILAIYAR_PORT ? parseInt(process.env.ILAIYAR_PORT) : undefined;
    const envHost = process.env.ILAIYAR_HOST;
    
    this.config = {
      port: overrides.port ?? envPort ?? 9988,
      host: overrides.host ?? envHost ?? "127.0.0.1",
      logLevel: overrides.logLevel ?? "info",
      telemetryEnabled: overrides.telemetryEnabled ?? false,
      tokenValidationEnabled: overrides.tokenValidationEnabled ?? true
    };

    return this.config;
  }

  // Developer authentication APIs
  async createDeveloperToken(owner: string): Promise<string> {
    const token = `il_pat_${crypto.randomBytes(24).toString("hex")}`;
    const timestamp = Date.now();

    memory.database.prepare(`
      insert into dxp_tokens (token, owner, created_at, status)
      values (?, ?, ?, 'active')
    `).run(token, owner, timestamp);

    this.logDiagnostic("auth", `Token created for owner: ${owner}`);
    return token;
  }

  async validateToken(token: string): Promise<boolean> {
    if (!this.config.tokenValidationEnabled) return true;
    
    const row: any = memory.database.prepare("select status from dxp_tokens where token = ?").get(token);
    return row ? row.status === "active" : false;
  }

  async revokeDeveloperToken(token: string): Promise<void> {
    memory.database.prepare("update dxp_tokens set status = 'revoked' where token = ?").run(token);
    this.logDiagnostic("auth", `Token revoked`);
  }

  async hasAdmin(): Promise<boolean> {
    const row: any = memory.database.prepare("select count(*) as count from dxp_administrators").get();
    return row ? row.count > 0 : false;
  }

  async initializeAdmin(name: string, email: string, passwordHash: string, company: string, workspace: string): Promise<string> {
    const timestamp = Date.now();
    memory.database.prepare(`
      insert or replace into dxp_administrators (email, name, password_hash, company, workspace, timestamp)
      values (?, ?, ?, ?, ?, ?)
    `).run(email, name, passwordHash, company, workspace, timestamp);

    const token = await this.createDeveloperToken(email);
    this.logDiagnostic("setup", `Admin account created for: ${email}`);
    return token;
  }

  async createDeveloper(name: string, email: string): Promise<string> {
    const token = await this.createDeveloperToken(email);
    const timestamp = Date.now();

    memory.database.prepare(`
      insert or replace into dxp_developers (email, name, status, token, created_at)
      values (?, ?, 'active', ?, ?)
    `).run(email, name, token, timestamp);

    this.logDiagnostic("mgmt", `Developer profile registered: ${email}`);
    return token;
  }

  async disableDeveloper(email: string): Promise<void> {
    const dev: any = memory.database.prepare("select token from dxp_developers where email = ?").get(email);
    if (dev) {
      await this.revokeDeveloperToken(dev.token);
    }
    memory.database.prepare("update dxp_developers set status = 'disabled' where email = ?").run(email);
    this.logDiagnostic("mgmt", `Developer status disabled: ${email}`);
  }

  async deleteDeveloper(email: string): Promise<void> {
    const dev: any = memory.database.prepare("select token from dxp_developers where email = ?").get(email);
    if (dev) {
      memory.database.prepare("delete from dxp_tokens where token = ?").run(dev.token);
    }
    memory.database.prepare("delete from dxp_developers where email = ?").run(email);
    this.logDiagnostic("mgmt", `Developer profile deleted: ${email}`);
  }

  async listDevelopers(): Promise<any[]> {
    const rows = memory.database.prepare("select email, name, status, token, created_at as createdAt from dxp_developers").all();
    return rows;
  }

  async resetDeveloperToken(email: string): Promise<string> {
    const dev: any = memory.database.prepare("select token from dxp_developers where email = ?").get(email);
    if (dev) {
      memory.database.prepare("delete from dxp_tokens where token = ?").run(dev.token);
    }
    const token = await this.createDeveloperToken(email);
    memory.database.prepare("update dxp_developers set token = ? where email = ?").run(token, email);
    this.logDiagnostic("mgmt", `Developer PAT token reset: ${email}`);
    return token;
  }

  async verifyConnection(url: string, token: string): Promise<boolean> {
    const isValid = await this.validateToken(token);
    this.logDiagnostic("onboarding", `Connection validation status: ${isValid}`);
    return isValid;
  }

  // API Gateway
  async startApiGateway(): Promise<void> {
    if (this.server) return;

    this.server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      // Check token authentication
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.replace("Bearer ", "").trim();
      const authenticated = await this.validateToken(token);

      if (this.config.tokenValidationEnabled && !authenticated && req.url !== "/health") {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized: Invalid or missing token" }));
        return;
      }

      // Routes
      if (req.url === "/health" && req.method === "GET") {
        const status = await this.health();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(status));
      } else if (req.url === "/v1/models" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          object: "list",
          data: [
            {
              id: "ilaiyar-runtime",
              object: "model",
              created: 1718640000,
              owned_by: "ilaiyar"
            },
            {
              id: "default",
              object: "model",
              created: 1718640000,
              owned_by: "ilaiyar"
            }
          ]
        }));
      } else if (req.url === "/v1/embeddings" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              object: "list",
              data: [
                {
                  object: "embedding",
                  index: 0,
                  embedding: [0.0023064255, -0.009327923, 0.01579734]
                }
              ],
              model: "text-embedding-ada-002",
              usage: {
                prompt_tokens: 8,
                total_tokens: 8
              }
            }));
          } catch (e: any) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid request payload: " + e.message }));
          }
        });
      } else if (req.url === "/v1/chat/completions" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => { body += chunk; });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            
            if (payload.stream) {
              res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive"
              });

              const id = `chatcmpl-${crypto.randomUUID()}`;
              const text = "Hello from Ilaiyar Developer Experience Platform!";
              const words = text.split(" ");
              
              let currentWordIndex = 0;
              const sendChunk = () => {
                if (currentWordIndex >= words.length) {
                  res.write("data: [DONE]\n\n");
                  res.end();
                  return;
                }
                
                const deltaWord = words[currentWordIndex] + (currentWordIndex === words.length - 1 ? "" : " ");
                const chunk = {
                  id,
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now() / 1000),
                  model: payload.model || "ilaiyar-runtime",
                  choices: [
                    {
                      index: 0,
                      delta: {
                        content: deltaWord
                      },
                      finish_reason: null
                    }
                  ]
                };

                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                currentWordIndex++;
                setTimeout(sendChunk, 50);
              };

              sendChunk();
            } else {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({
                id: `chatcmpl-${crypto.randomUUID()}`,
                object: "chat.completion",
                created: Math.floor(Date.now() / 1000),
                model: payload.model || "ilaiyar-runtime",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: "Hello from Ilaiyar Developer Experience Platform!"
                    },
                    finish_reason: "stop"
                  }
                ]
              }));
            }
          } catch (e: any) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON payload: " + e.message }));
          }
        });
      } else if (req.url === "/diagnostics" && req.method === "GET") {
        const diag = await this.diagnostics();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(diag));
      } else if (req.url === "/metrics" && req.method === "GET") {
        const met = await this.metrics();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(met));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      }
    });

    return new Promise((resolve) => {
      this.server!.listen(this.config.port, this.config.host, () => {
        this.logDiagnostic("gateway", `API Gateway server running on http://${this.config.host}:${this.config.port}`);
        resolve();
      });
    });
  }

  async stopApiGateway(): Promise<void> {
    if (!this.server) return;
    return new Promise((resolve) => {
      this.server!.close(() => {
        this.server = null;
        resolve();
      });
    });
  }

  // Diagnostics and Health Checks
  async health(): Promise<{ status: string; uptime: number; databaseConnected: boolean }> {
    let dbStatus = false;
    try {
      const row = memory.database.prepare("select 1").get();
      if (row) dbStatus = true;
    } catch {
      dbStatus = false;
    }

    return {
      status: "healthy",
      uptime: process.uptime(),
      databaseConnected: dbStatus
    };
  }

  async diagnostics(): Promise<any[]> {
    const rows = memory.database.prepare("select type, details, timestamp from dxp_diagnostics order by timestamp desc limit 50").all();
    return rows;
  }

  async metrics(): Promise<{ requestCount: number; activeConnections: number }> {
    return {
      requestCount: 42, // Mocked stats representation
      activeConnections: this.server ? 1 : 0
    };
  }

  logDiagnostic(type: string, details: string): void {
    try {
      memory.database.prepare("insert into dxp_diagnostics (type, details, timestamp) values (?, ?, ?)")
        .run(type, details, Date.now());
    } catch (e) {
      console.error("Failed to log DXP diagnostic entry", e);
    }
  }
}

export const dxp = new DeveloperExperiencePlatform();
