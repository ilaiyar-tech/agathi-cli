import crypto from "node:crypto";
import pty, { type IPty } from "node-pty";
import type { WebSocket } from "ws";
import { send } from "./shared.js";

const sessions=new Map<string,IPty>();

export function terminal_socket(socket:WebSocket){
  const id=crypto.randomUUID();const shell=process.env.SHELL??"/bin/bash";
  const terminal=pty.spawn(shell,["-i"],{name:"xterm-256color",cols:80,rows:24,cwd:process.cwd(),env:process.env});
  sessions.set(id,terminal);send(socket,{type:"session",id});
  terminal.onData(data=>send(socket,{type:"stdout",data}));
  terminal.onExit(({exitCode})=>{sessions.delete(id);send(socket,{type:"exit",code:exitCode});});
  socket.on("message",raw=>{try{const message=JSON.parse(raw.toString()) as {type:string;data?:string;cols?:number;rows?:number};if(message.type==="stdin"&&message.data)terminal.write(message.data);if(message.type==="resize"&&message.cols&&message.rows)terminal.resize(message.cols,message.rows);}catch{terminal.write(raw.toString());}});
  socket.on("close",()=>{if(sessions.delete(id))terminal.kill();});
}
