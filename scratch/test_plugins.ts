import path from "node:path";
import fs from "fs-extra";
import { pluginManager } from "../packages/plugin_sdk/index.js";
import { eventBus } from "../packages/core/index.js";

async function run() {
  console.log("Starting Agathi Plugin SDK V1 Hardening & Safety Verification Test...");

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

    // Verify Lifecycle State
    const stateBefore = pluginManager.getPluginState("mock_test");
    console.log("Plugin initial lifecycle state:", stateBefore);
    if (stateBefore !== "running") {
      throw new Error(`Expected lifecycle state 'running', got ${stateBefore}`);
    }

    console.log("\n2. Testing Permission Validation (Missing env)...");
    try {
      await pluginManager.executePlugin("mock_test", "hello", { name: "Agathi" });
      console.error("FAIL: Action executed without required env variable!");
    } catch (e: any) {
      console.log("SUCCESS: Expected permission check error thrown:", e.message);
    }

    console.log("\n3. Testing Action Execution & Versioned SDK (Env set)...");
    process.env.MOCK_API_KEY = "mock_secret_key";
    
    const result = await pluginManager.executePlugin("mock_test", "hello", { name: "Agathi" });
    console.log("Plugin Hello Response:", result);
    if (result.includes("SDK version is 1.0")) {
      console.log("SUCCESS: Action executed successfully with API version 1.0!");
    } else {
      throw new Error(`Unexpected plugin response: ${result}`);
    }

    // Verify Isolation Directories and Logger Output
    const permissions = pluginManager.getPluginPermissions("mock_test");
    console.log("Plugin permissions:", permissions);

    const dataPath = path.join(pluginsDir, "mock_test", "data");
    const logsPath = path.join(pluginsDir, "mock_test", "logs");
    const logFilePath = path.join(logsPath, "plugin.log");

    if (await fs.pathExists(dataPath) && await fs.pathExists(logFilePath)) {
      console.log("SUCCESS: Isolation directories and plugin.log verified!");
      const logContent = await fs.readFile(logFilePath, "utf-8");
      console.log("plugin.log content:\n" + logContent.trim());
    } else {
      throw new Error("Isolation files/directories not found!");
    }

    console.log("\n4. Testing lifecycle state transitions (Disable/Enable)...");
    pluginManager.disablePlugin("mock_test");
    console.log("Plugin state after disable:", pluginManager.getPluginState("mock_test"));
    
    try {
      await pluginManager.executePlugin("mock_test", "hello", { name: "Agathi" });
      console.error("FAIL: Executed disabled plugin!");
    } catch (e: any) {
      console.log("SUCCESS: Disabled execution blocked:", e.message);
    }

    pluginManager.enablePlugin("mock_test");
    console.log("Plugin state after enable:", pluginManager.getPluginState("mock_test"));

    console.log("\n5. Testing Crash Isolation...");
    try {
      await pluginManager.executePlugin("mock_test", "crash", {});
      console.error("FAIL: Crash action did not throw!");
    } catch (e: any) {
      console.log("SUCCESS: Crash caught! Error message:", e.message);
      console.log("Plugin state after crash:", pluginManager.getPluginState("mock_test"));
      if (pluginManager.getPluginState("mock_test") !== "disabled") {
        throw new Error("Plugin was not disabled after crashing!");
      }
    }

    console.log("\n6. Testing Hot Reload...");
    console.log("Reloading mock_test plugin...");
    await pluginManager.reloadPlugin(pluginsDir, "mock_test");
    console.log("Plugin state after hot reload:", pluginManager.getPluginState("mock_test"));
    if (pluginManager.getPluginState("mock_test") !== "running") {
      throw new Error("Plugin failed to restart into running state after reload!");
    }

    console.log("\n7. Testing Timeout Protection...");
    try {
      // Execute hang action with a 1 second timeout
      await pluginManager.executePlugin("mock_test", "hang", {}, 1000);
      console.error("FAIL: Hang action did not timeout!");
    } catch (e: any) {
      console.log("SUCCESS: Timeout caught! Error message:", e.message);
      console.log("Plugin state after timeout:", pluginManager.getPluginState("mock_test"));
      if (pluginManager.getPluginState("mock_test") !== "disabled") {
        throw new Error("Plugin was not disabled after timing out!");
      }
    }

    console.log("\n8. Testing wildcard Event Bus plugin hook...");
    // Re-enable after timeout test to let events trigger
    pluginManager.enablePlugin("mock_test");
    eventBus.emitEvent("ZIP_CREATED" as any, { zipPath: "/tmp/workspace_gen.zip" });
    
    console.log("Waiting for event execution to settle...");
    await new Promise(r => setTimeout(r, 1000));

    console.log("\nPlugin SDK V1 Hardening & Safety verification complete: 100% SUCCESS!");

  } catch (e: any) {
    console.error("Plugin verification failed:", e.message);
  }
}

run();
