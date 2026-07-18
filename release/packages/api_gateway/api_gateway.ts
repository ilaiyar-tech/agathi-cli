import { createServer, IncomingMessage, ServerResponse } from "http";
import { runtime } from "../agent_runtime/index.js";
import { sessions } from "../session_manager/index.js";
import { get_models } from "../provider_manager/index.js";

export class api_gateway {
  handleRequest = async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url === "/v1/chat" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk.toString());
      req.on("end", async () => {
        try {
          const payload = JSON.parse(body);
          const response = await runtime.chat(payload.prompt, payload.session_id);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(response));
        } catch (e: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }

    if (req.url === "/v1/providers" && req.method === "GET") {
      const all = get_models();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(all));
      return;
    }

    if (req.url === "/v1/sessions" && req.method === "GET") {
      const list = sessions.list_sessions();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(list));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  };

  listen(port: number) {
    const server = createServer(this.handleRequest);
    server.listen(port, () => {
      // console.log(`API Gateway listening on port ${port}`);
    });
    return server;
  }
}

export const gateway = new api_gateway();
