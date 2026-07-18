import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { PATHS } from "../../../../packages/config/index.js";
import { memory } from "../../../../packages/memory/index.js";
import { add_audit, control_state, save_control_state } from "./control_state.js";

export async function backup_routes(app:FastifyInstance){
  app.get("/backups",async()=>control_state.backups);
  app.post("/backups/create",async()=>{
    const id=crypto.randomUUID();const directory=path.join(PATHS.storage,"backups");fs.mkdirSync(directory,{recursive:true});
    const name=`backup-${new Date().toISOString().replace(/[:.]/g,"-")}.json`;const backup={id,name,created_at:new Date().toISOString(),path:path.join(directory,name)};
    fs.writeFileSync(backup.path,JSON.stringify({memory:memory.list(),state:control_state},null,2));
    control_state.backups.unshift(backup);save_control_state();add_audit(`backup.created:${id}`);return backup;
  });
  app.post("/backups/:id/restore",async(request,reply)=>{
    const backup=control_state.backups.find(value=>value.id===(request.params as {id:string}).id);
    if(!backup) return reply.code(404).send({error:"backup_not_found"});
    add_audit(`backup.restore_requested:${String(backup.id)}`);return {restored:false,backup};
  });
}
