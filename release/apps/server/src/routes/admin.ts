import type { FastifyInstance } from "fastify";
import { APP_VERSION, ENV } from "../../../../packages/config/index.js";
import { add_audit } from "./control_state.js";

export async function admin_routes(app:FastifyInstance){
  app.get("/health",async()=>({status:"ok",uptime:process.uptime()}));
  app.get("/version",async()=>({version:APP_VERSION}));
  app.get("/config",async()=>({environment:ENV.NODE_ENV,port:ENV.PORT}));
  app.get("/metrics",async()=>({requests:0,tokens:0,latency:0,uptime:Math.round(process.uptime())}));
  app.post("/admin/cache/clear",async()=>{add_audit("admin.cache_cleared");return {cleared:true};});
  app.post("/admin/restart",async()=>({accepted:true,action:"restart"}));
  app.post("/admin/shutdown",async()=>({accepted:true,action:"shutdown"}));
}
