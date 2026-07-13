import type { FastifyInstance } from "fastify";

import { access_routes } from "./access.js";
import { admin_routes } from "./admin.js";
import { backup_routes } from "./backups.js";
import { data_routes } from "./data.js";
import { runtime_routes } from "./runtime.js";

export async function control_routes(app: FastifyInstance) {
  await admin_routes(app);
  await access_routes(app);
  await backup_routes(app);
  await runtime_routes(app);
  await data_routes(app);
}
