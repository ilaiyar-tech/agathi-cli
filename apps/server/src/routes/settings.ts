import { FastifyInstance } from "fastify";
import { control_state, save_control_state } from "./control_state.js";

export async function settings_routes(app: FastifyInstance) {
  app.get("/settings", async () => {
    return control_state.settings;
  });

  app.put("/settings", async (request: any) => {
    const body = request.body;
    control_state.settings = { ...control_state.settings, ...body };
    save_control_state();
    return control_state.settings;
  });
}
