import type { FastifyInstance } from "fastify";
import { ENV, PATHS } from "../../../../packages/config/index.js";
import { control_state } from "./control_state.js";

export async function runtime_routes(app:FastifyInstance){
  for(const resource of ["jobs","queue","workflows"] as const) app.get(`/${resource}`,async()=>control_state[resource]);
  app.get("/tasks",async()=>control_state.jobs);
  const services=()=>[{name:"backend",description:"Fastify API server",running:true,port:ENV.PORT},{name:"llama.cpp",description:"Local inference provider",running:false,port:8081},{name:"vllm",description:"OpenAI-compatible inference provider",running:false,port:8000}];
  app.get("/services",async()=>services());app.post("/services/:name/:action",async request=>({accepted:true,...(request.params as Record<string,unknown>)}));
  app.get("/servers",async()=>services());app.post("/server/:name/:action",async request=>({accepted:true,...(request.params as Record<string,unknown>)}));
  app.get("/files",async()=>list_files(PATHS.workspace));
  app.post("/vision",async()=>({content:"Vision analysis requires an active vision provider."}));
}

export function list_files(root:string){
  if(!fs.existsSync(root)) return [];
  const result:Record<string,unknown>[]=[];const visit=(directory:string)=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){if(entry.name==="node_modules"||entry.name===".git")continue;const full=path.join(directory,entry.name);if(entry.isDirectory())visit(full);else{const stat=fs.statSync(full);result.push({name:entry.name,path:full,size:stat.size,type:path.extname(entry.name).slice(1)||"file"});}}};visit(root);return result;
}

import fs from "node:fs";
import path from "node:path";
