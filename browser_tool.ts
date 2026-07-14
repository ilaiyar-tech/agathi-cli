import { BrowserManager } from './packages/browser/browser_manager';

async function execute() {
  const manager = new BrowserManager();
  console.log("Initializing browser...");
  await manager.init();
  
  console.log("Extracting text...");
  const text = await manager.extractCleanText('https://example.com');
  console.log("Success! Extracted:", text.substring(0, 50));
  
  await manager.close();
  console.log("Cleanup complete.");
}

execute().catch(console.error);
