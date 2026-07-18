import type { FastifyPluginAsync } from "fastify";
import { BrowserManager } from "../../../../packages/browser/browser_manager.js";

const browser = new BrowserManager();

const browser_routes: FastifyPluginAsync = async (app) => {

  app.post("/text", async (req: any) => {
    return {
      text: await browser.extractCleanText(req.body.url)
    };
  });

  app.post("/dom", async (req: any) => {
    return {
      tree: await browser.getDOMTree(req.body.url)
    };
  });

  app.post("/screenshot", async (req: any) => {
    await browser.captureScreenshot(req.body.url, req.body.path);
    return { success: true };
  });

};

export default browser_routes;
