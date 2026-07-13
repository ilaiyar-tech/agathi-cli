import { FastifyInstance } from "fastify";

import {
  auto_chat
} from "../../../../packages/auto_router/index.js";

export async function auto_chat_routes(
  app:FastifyInstance
){

  app.post(
    "/auto_chat",
    async(request)=>{

      const body=request.body as{
        prompt:string;
      };

      return auto_chat(
        body.prompt
      );

    }
  );

}
