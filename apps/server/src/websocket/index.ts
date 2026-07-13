import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { chat_socket } from "./chat.js";
import { terminal_socket } from "./terminal.js";
import { topic_socket, start_topic_streams } from "./topics.js";

const topic_paths=new Set(["/ws/system","/ws/logs","/ws/downloads","/ws/jobs","/ws/queue","/ws/gpu","/ws/provider"]);

export function attach_websockets(server:Server){
  const wss=new WebSocketServer({noServer:true});
  server.on("upgrade",(request,socket,head)=>{const pathname=new URL(request.url??"/",`http://${request.headers.host??"localhost"}`).pathname;if(!topic_paths.has(pathname)&&pathname!=="/ws/chat"&&pathname!=="/ws/terminal")return socket.destroy();wss.handleUpgrade(request,socket,head,(websocket:WebSocket)=>wss.emit("connection",websocket,pathname));});
  wss.on("connection",(socket:WebSocket,pathname:string)=>{if(pathname==="/ws/chat")return chat_socket(socket);if(pathname==="/ws/terminal")return terminal_socket(socket);topic_socket(pathname.replace("/ws/",""),socket);});
  start_topic_streams();
}
