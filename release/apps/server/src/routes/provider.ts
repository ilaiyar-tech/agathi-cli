import { FastifyInstance } from "fastify";

import {
  get_models,
  get_active_model,
  set_active_model,
  provider_health
} from "../../../../packages/provider_manager/index.js";

import { control_events } from "./control_state.js";

export async function provider_routes(app: FastifyInstance) {

  app.get("/provider", async () => ({
    active: get_active_model()
  }));

  app.get("/providers", async () => get_models());

  app.get("/providers/active", async () => ({
    active: get_active_model()
  }));

  app.post("/providers/:name", async (request) => {
    const { name } = request.params as { name: string };

    const loaded = set_active_model(name);

    control_events.emit("provider", {
      active: loaded
    });

    return { loaded };
  });

  app.post("/providers/:name/activate", async (request) => {
    const { name } = request.params as { name: string };

    const loaded = set_active_model(name);

    control_events.emit("provider", {
      active: loaded
    });

    return { loaded };
  });

  app.get("/providers/health", async () => provider_health());

}
