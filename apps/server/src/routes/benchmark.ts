import { FastifyInstance } from "fastify";

import {
  benchmark
} from "../../../../packages/benchmark/index.js";

export async function benchmark_routes(
  app:FastifyInstance
){

  app.get(
    "/benchmark",
    async()=>{

      return benchmark();

    }
  );

}
