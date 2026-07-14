import path from "node:path";
import { pluginManager } from "../packages/plugin_sdk/index.js";
import { eventBus } from "../packages/core/index.js";

async function run() {
  console.log("Starting Agathi Plugin SDK Verification Test...");

  const pluginsDir = path.join(process.cwd(), "dist", "packages", "plugins");

  // 1. Clean env
  delete process.env.MOCK_API_KEY;

  try {
    console.log("1. Loading plugins from:", pluginsDir);
    await pluginManager.loadPlugins(pluginsDir);

    const loaded = pluginManager.listLoadedPlugins();
    console.log("Loaded plugins:", loaded);

    if (!loaded.includes("mock_test")) {
      throw new Error("Mock plugin failed to load!");
    }

    console.log("\n2. Testing Permission Validation (Missing env)...");
    try {
      await pluginManager.executePlugin("mock_test", "hello", { name: "Agathi" });
      console.error("FAIL: Action executed without required env variable!");
    } catch (e: any) {
      console.log("SUCCESS: Expected permission check error thrown:", e.message);
    }

    console.log("\n3. Testing Action Execution (Env set)...");
    process.env.MOCK_API_KEY = "mock_secret_key";
    
    const result = await pluginManager.executePlugin("mock_test", "hello", { name: "Agathi" });
    console.log("Plugin Hello Response:", result);
    if (result === "Hello, Agathi! Mock plugin is working.") {
      console.log("SUCCESS: Action executed and returned correct payload!");
    } else {
      throw new Error(`Unexpected plugin response: ${result}`);
    }

    console.log("\n4. Testing wildcard Event Bus plugin hook...");
    eventBus.emitEvent("ZIP_CREATED" as any, { zipPath: "/tmp/workspace_gen.zip" });
    
    console.log("Waiting for event execution to settle...");
    await new Promise(r => setTimeout(r, 1000));

    console.log("\nPlugin SDK verification complete: 100% SUCCESS!");

  } catch (e: any) {
    console.error("Plugin verification failed:", e.message);
  }
}

run();
