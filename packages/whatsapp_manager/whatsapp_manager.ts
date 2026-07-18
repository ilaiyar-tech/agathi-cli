import { memory } from "../memory/memory_engine.js";
import { ENV } from "../config/index.js";

export class WhatsAppManager {
  private static instance: WhatsAppManager;
  private status: "Connected" | "Disconnected" | "Connecting" = "Disconnected";
  private adminNumber: string;

  private constructor() {
    this.adminNumber = process.env.WHATSAPP_ADMIN_NUMBER || "9698921693";
    this.initDatabase();
    this.loadSession();
  }

  static getInstance(): WhatsAppManager {
    if (!WhatsAppManager.instance) {
      WhatsAppManager.instance = new WhatsAppManager();
    }
    return WhatsAppManager.instance;
  }

  private initDatabase() {
    try {
      memory.database.exec(`
        CREATE TABLE IF NOT EXISTS whatsapp_sessions (
          id TEXT PRIMARY KEY,
          session_data TEXT NOT NULL,
          status TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);
    } catch (e) {
      console.error("Failed to initialize whatsapp_sessions table:", e);
    }
  }

  private loadSession() {
    try {
      const session = memory.database.prepare(
        "SELECT status FROM whatsapp_sessions ORDER BY updated_at DESC LIMIT 1"
      ).get() as any;
      if (session) {
        this.status = session.status as any;
      }
    } catch (e) {
      this.status = "Disconnected";
    }
  }

  getStatus(): { status: string; adminNumber: string } {
    return {
      status: this.status,
      adminNumber: this.adminNumber.startsWith("+") ? this.adminNumber : `+91 ${this.adminNumber.replace(/^(\+91|91)/, "").replace(/(\d{5})(\d{5})/, "$1 $2")}`
    };
  }

  startLinking(): { qrCode: string } {
    this.status = "Connecting";
    // Returns a mock QR code image URL that simulates scan linking
    const sessionToken = Math.random().toString(36).substring(7);
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=ilaiyar_whatsapp_link_${sessionToken}`;
    
    // Simulate auto-scan by scanning after 4 seconds (for testing and automation UX)
    setTimeout(() => {
      if (this.status === "Connecting") {
        this.confirmLink(sessionToken);
      }
    }, 4000);

    return { qrCode };
  }

  confirmLink(token: string) {
    this.status = "Connected";
    try {
      memory.database.prepare(`
        INSERT OR REPLACE INTO whatsapp_sessions (id, session_data, status, updated_at)
        VALUES ('admin_session', ?, 'Connected', ?)
      `).run(JSON.stringify({ token, linkedAt: Date.now() }), Date.now());
      this.sendAlert("System Startup", "🟢 WhatsApp integration linked successfully inside Ilaiyar Console!");
    } catch (e) {
      console.error("Failed to save WhatsApp session:", e);
    }
  }

  unlink() {
    this.status = "Disconnected";
    try {
      memory.database.prepare("DELETE FROM whatsapp_sessions WHERE id = 'admin_session'").run();
    } catch (e) {
      console.error("Failed to delete WhatsApp session:", e);
    }
  }

  sendAlert(type: string, message: string): boolean {
    const formattedMessage = `*🤖 Ilaiyar Admin Notification*\n*Type:* ${type}\n*Time:* ${new Date().toLocaleString()}\n\n${message}`;
    console.log(`[WhatsApp Alert to ${this.adminNumber}]:\n${formattedMessage}`);
    
    if (this.status !== "Connected") {
      console.warn("WhatsApp is not linked; alert not sent to device.");
      return false;
    }
    return true;
  }
}

export const whatsapp = WhatsAppManager.getInstance();
