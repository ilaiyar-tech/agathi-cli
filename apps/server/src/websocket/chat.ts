import type { WebSocket } from "ws";
import { runtime } from "../../../../packages/agent_runtime/index.js";
import { send } from "./shared.js";

export function chat_socket(socket:WebSocket){
  socket.on("message",async raw=>{
    try{const body=JSON.parse(raw.toString()) as {prompt:string;session_id?:string};const result=await runtime.chat_stream(body.prompt,body.session_id??"default",token=>send(socket,{type:"token",token}));send(socket,{type:"done",id:result.id,session_id:result.session_id});}
    catch(error){send(socket,{type:"error",message:error instanceof Error?error.message:"chat_failed"});}
  });
}
