import { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { control_state, save_control_state } from "./control_state.js";

export async function chats_routes(app: FastifyInstance) {
  app.get("/chats", async () => {
    return control_state.chats.sort((a, b) => 
      new Date(String(b.updatedAt || 0)).getTime() - new Date(String(a.updatedAt || 0)).getTime()
    );
  });

  app.get("/chats/:id", async (request: any) => {
    const chat = control_state.chats.find(c => c.id === request.params.id);
    if (!chat) throw new Error("chat_not_found");
    return chat;
  });

  app.post("/chats", async (request: any) => {
    const body = request.body as { name?: string };
    const chat = {
      id: crypto.randomUUID(),
      name: body.name || "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    control_state.chats.unshift(chat);
    save_control_state();
    return chat;
  });

  app.put("/chats/:id", async (request: any) => {
    const chat = control_state.chats.find(c => c.id === request.params.id);
    if (!chat) throw new Error("chat_not_found");

    const body = request.body as { name?: string; messages?: any[] };
    if (body.name !== undefined) chat.name = body.name;
    if (body.messages !== undefined) chat.messages = body.messages;
    
    chat.updatedAt = new Date().toISOString();
    save_control_state();
    return chat;
  });

  app.delete("/chats/:id", async (request: any) => {
    const index = control_state.chats.findIndex(c => c.id === request.params.id);
    if (index !== -1) {
      control_state.chats.splice(index, 1);
      save_control_state();
    }
    return { success: true };
  });
}
