import { FastifyInstance } from "fastify";
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "../../../../packages/config/index.js";

export async function agents_routes(app: FastifyInstance) {
  app.get("/agents", async () => {
    const agentsDir = path.join(PATHS.root, "packages", "agents");
    if (!fs.existsSync(agentsDir)) return [];
    
    const agents = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());
    
    return agents.map(name => ({
      name,
      description: `tu2pu ${name} agent`,
      running: true
    }));
  });
}
