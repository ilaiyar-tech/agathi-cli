import type { FastifyInstance } from "fastify";
import { add_audit, control_state, save_control_state, update_record } from "./control_state.js";

export async function access_routes(app:FastifyInstance){
  app.get("/plugins",async()=>control_state.plugins);
  app.post("/plugins/:name/toggle",async request=>{
    const {name}=request.params as {name:string};
    let plugin=control_state.plugins.find(value=>value.name===name);
    if(!plugin){plugin={name,description:"Local plugin",enabled:true};control_state.plugins.push(plugin);}
    else plugin.enabled=!Boolean(plugin.enabled);
    add_audit(`plugin.${plugin.enabled?"enabled":"disabled"}:${name}`);save_control_state();return plugin;
  });
  app.get("/users",async()=>control_state.users);
  app.post("/users/:id/disable",async(request,reply)=>{
    const user=update_record(control_state.users,(request.params as {id:string}).id,{active:false});
    if(!user) return reply.code(404).send({error:"user_not_found"});
    add_audit(`user.disabled:${String(user.id)}`);return user;
  });
  app.get("/audit",async()=>control_state.audit);
}
