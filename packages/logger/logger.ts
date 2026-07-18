import pino from "pino";
import path from "node:path";
import fs from "node:fs";

// Ensure storage directory exists
const logDir = path.join(process.cwd(), "storage");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
const logFile = path.join(logDir, "thudupu.log");

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info"
  },
  pino.destination({ dest: logFile, sync: true })
);
