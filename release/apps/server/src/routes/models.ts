import { FastifyInstance } from "fastify";

import {
  list_models,
  get_active_model,
  set_active_model,
  delete_model
} from "../../../../packages/model_manager/index.js";

export async function models_routes(
  app: FastifyInstance
) {

  app.get(
    "/models",
    async () => {
      return list_models();
    }
  );

  app.get(
    "/models/active",
    async () => {
      return {
        active: get_active_model()
      };
    }
  );

  app.post(
    "/model/:name",
    async (request: any) => {
      return set_active_model(
        request.params.name
      );
    }
  );

  app.delete(
    "/model/:name",
    async (request: any) => {
      return delete_model(
        request.params.name
      );
    }
  );

}
