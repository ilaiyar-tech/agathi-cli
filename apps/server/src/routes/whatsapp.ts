import type { FastifyInstance } from "fastify";
import { whatsapp } from "../../../../packages/whatsapp_manager/index.js";

export async function whatsapp_routes(app: FastifyInstance) {
  app.get("/whatsapp/status", async () => {
    return whatsapp.getStatus();
  });

  app.post("/whatsapp/link", async () => {
    return whatsapp.startLinking();
  });

  app.post("/whatsapp/unlink", async () => {
    whatsapp.unlink();
    return { success: true };
  });

  app.post("/whatsapp/test", async () => {
    const success = whatsapp.sendAlert(
      "Manual Test",
      "This is a test notification sent manually from the Ilaiyar Console dashboard! Everything is looking green. 🚀"
    );
    return { success };
  });
}
