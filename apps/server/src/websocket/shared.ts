import type { WebSocket } from "ws";

const subscriptions=new Map<string,Set<WebSocket>>();

export function send(socket:WebSocket,payload:unknown){if(socket.readyState===socket.OPEN)socket.send(JSON.stringify(payload));}
export function subscribe(topic:string,socket:WebSocket){const group=subscriptions.get(topic)??new Set<WebSocket>();group.add(socket);subscriptions.set(topic,group);socket.on("close",()=>group.delete(socket));}
export function publish(topic:string,payload:unknown){for(const socket of subscriptions.get(topic)??[])send(socket,payload);}
