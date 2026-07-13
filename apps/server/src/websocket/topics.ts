import { benchmark } from "../../../../packages/benchmark/index.js";
import { control_events } from "../routes/control_state.js";
import { publish, send, subscribe } from "./shared.js";
import type { WebSocket } from "ws";

export function topic_socket(topic:string,socket:WebSocket){subscribe(topic,socket);send(socket,{type:"connected",topic});}

export function start_topic_streams(){
  for(const topic of ["downloads","jobs","queue","provider"]){control_events.on(topic,(payload:unknown)=>publish(topic,payload));}
  setInterval(()=>{const telemetry=benchmark();publish("system",telemetry);publish("gpu",telemetry.gpu);publish("logs",{time:new Date().toISOString(),message:"system telemetry",gpu:telemetry.gpu});},1000).unref();
}
