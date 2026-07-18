import { FastifyInstance } from "fastify";
import os from "node:os";
import fs from "node:fs";
import { benchmark } from "../../../../packages/benchmark/index.js";

export async function system_routes(
  app: FastifyInstance
){

  app.get(
    "/system",
    async()=>{

      const telemetry=benchmark();

      return{

        cpu:{
          cores:os.cpus().length,
          load:os.loadavg()
        },

        memory:{
          total:os.totalmem(),
          free:os.freemem()
        },

        gpu:telemetry.gpu,

        disk:{
          ai:fs.existsSync("/ai")
        }

      };

    }
  );

}
