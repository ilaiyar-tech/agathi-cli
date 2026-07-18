import { BrowserManager } from "./browser_manager.js";

async function test() {
  const manager = new BrowserManager();
  await manager.init();
  await manager.captureScreenshot('https://example.com', 'test-screenshot.png');
  console.log('Screenshot captured successfully.');
  await manager.close();
}

test().catch(console.error);
