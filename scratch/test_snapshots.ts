import path from "path";
import fs from "fs-extra";
import { workspaceBuilder, workspaceSnapshot } from "../packages/builder_engine/index.js";

async function run() {
  console.log("Starting Workspace Snapshots & Recovery Test...");

  const prompt = "Landing Page for Snapshots Demo";
  const folderName = "landing-page-for-snapshots-demo";
  const projectPath = path.join(process.cwd(), "workspace", "projects", folderName);

  // Clean any previous runs
  await fs.remove(projectPath);

  try {
    console.log("Triggering workspace build...");
    await workspaceBuilder.buildWorkspace(
      prompt,
      "static",
      "vanilla-html",
      (status, percent) => {
        console.log(`Building: ${status} (${percent}%)`);
      }
    );

    console.log("\n--- Listing Snapshots ---");
    const snapshots = await workspaceSnapshot.listSnapshots(projectPath);
    console.log("Available Snapshots:", snapshots);

    console.log("\n--- Corrupting a generated file to simulate a bad modification ---");
    const targetFile = path.join(projectPath, "index.html");
    const originalContent = await fs.readFile(targetFile, "utf-8");
    console.log("Original index.html snippet:", originalContent.slice(0, 100));

    await fs.writeFile(targetFile, "CORRUPTED CONTENT: System crash during write!");
    console.log("File corrupted successfully.");

    console.log("\n--- Restoring Snapshot 002 (Build Complete) ---");
    await workspaceSnapshot.restoreSnapshot(projectPath, "snapshot_002");
    console.log("Snapshot 002 restored successfully!");

    const restoredContent = await fs.readFile(targetFile, "utf-8");
    console.log("Restored index.html snippet:", restoredContent.slice(0, 100));

    if (restoredContent === originalContent) {
      console.log("\nSUCCESS! Pristine state was fully recovered from the snapshot!");
    } else {
      console.error("\nFAILURE: File contents do not match original.");
    }

  } catch (e: any) {
    console.error("Test failed with error:", e.message);
  }
}

run();
