import { eventBus } from "../packages/core/index.js";
import { workspaceBuilder } from "../packages/builder_engine/index.js";

async function run() {
  console.log("Subscribing to Agathi Event Bus...");
  
  // Listen to all events
  eventBus.on("*", (event) => {
    console.log(`\x1b[36m[EVENT] [${event.timestamp}] ${event.type}\x1b[0m`, JSON.stringify(event.payload));
  });

  console.log("Triggering mock workspace generation build...");
  try {
    // Generate a simple static page workspace to trigger build lifecycle events quickly
    await workspaceBuilder.buildWorkspace(
      "Fast Event Bus Test Landing Page",
      "static",
      "vanilla-html",
      (status, percent) => {
        console.log(`Progress callback: ${status} (${percent}%)`);
      }
    );
    console.log("Test finished!");
  } catch (e: any) {
    console.error("Test execution failed:", e.message);
  }
}

run();
