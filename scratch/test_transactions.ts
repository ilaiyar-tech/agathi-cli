import path from "path";
import fs from "fs-extra";
import { workspaceBuilder, workspaceSnapshot } from "../packages/builder_engine/index.js";

async function run() {
  console.log("Starting Workspace Transactional Execution & Rollback Test...");

  const prompt = "Transactional Execution Demo";
  const folderName = "transactional-execution-demo";
  const projectPath = path.join(process.cwd(), "workspace", "projects", folderName);

  await fs.remove(projectPath);

  try {
    console.log("1. Building clean workspace...");
    await workspaceBuilder.buildWorkspace(
      prompt,
      "static",
      "vanilla-html",
      (status, percent) => {}
    );

    let targetFile = path.join(projectPath, "index.html");
    if (!(await fs.pathExists(targetFile))) {
      targetFile = path.join(projectPath, "src/index.html");
    }
    const originalContent = await fs.readFile(targetFile, "utf-8");

    const stateFile = path.join(projectPath, "workspace_state.json");
    const originalState = await fs.readJson(stateFile);

    // Reconstruct list of current files for snapshot comparison
    const files = [
      { path: "index.html", content: originalContent }
    ];

    console.log("\n2. Beginning Workspace Transaction...");
    await workspaceSnapshot.beginTransaction(projectPath, originalState, files);

    console.log("\n3. Performing aggressive/failing file edits (simulating bad compilation)...");
    await fs.writeFile(targetFile, "COMPILER ERROR: Failed to parse index.html template!");

    console.log("\n4. Workspace build failed! Initiating Automatic Rollback...");
    await workspaceSnapshot.rollbackTransaction(projectPath);
    console.log("Rollback completed successfully!");

    const restoredContent = await fs.readFile(targetFile, "utf-8");
    if (restoredContent === originalContent) {
      console.log("\nSUCCESS! Transaction Rollback successfully restored the pristine state!");
    } else {
      console.error("\nFAILURE: Rollback content does not match original.");
    }

    console.log("\n5. Testing Transaction Commit...");
    await workspaceSnapshot.beginTransaction(projectPath, originalState, files);
    console.log("Applying successful modifications...");
    const modifiedContent = originalContent + "\n<!-- Added by transaction -->";
    await fs.writeFile(targetFile, modifiedContent);
    await workspaceSnapshot.commitTransaction();
    console.log("Transaction committed!");

    const finalContent = await fs.readFile(targetFile, "utf-8");
    if (finalContent === modifiedContent) {
      console.log("\nSUCCESS! Transaction Commit successfully applied modifications!");
    } else {
      console.error("\nFAILURE: Committed content does not match.");
    }

  } catch (e: any) {
    console.error("Test execution failed:", e.message);
  }
}

run();
