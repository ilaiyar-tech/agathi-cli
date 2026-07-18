import path from "path";
import fs from "fs-extra";

export interface SnapshotData {
  snapshotId: string;
  timestamp: string;
  state: any;
  files: Array<{ path: string; content: string | null }>;
}

export class workspace_snapshot {
  private transactionRollbackPoint: string | null = null;

  private async restoreSnapshotInMemory(projectPath: string, snapshotId: string): Promise<SnapshotData> {
    const snapshotsDir = path.join(projectPath, "snapshots");
    const snapshotFiles = (await fs.readdir(snapshotsDir))
      .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
      .sort();
    
    const targetFile = `${snapshotId}.json`;
    const targetIdx = snapshotFiles.indexOf(targetFile);
    if (targetIdx === -1) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    const reconstructedFiles = new Map<string, string>();
    let finalState: any = null;

    for (let i = 0; i <= targetIdx; i++) {
      const snapData: SnapshotData = await fs.readJson(path.join(snapshotsDir, snapshotFiles[i]));
      finalState = snapData.state;
      for (const file of snapData.files) {
        if (file.content !== null) {
          reconstructedFiles.set(file.path, file.content);
        }
      }
    }

    return {
      snapshotId,
      timestamp: new Date().toISOString(),
      state: finalState,
      files: Array.from(reconstructedFiles.entries()).map(([path, content]) => ({ path, content }))
    };
  }

  async saveSnapshot(
    projectPath: string,
    state: any,
    files: Array<{ path: string; content: string }>
  ): Promise<string> {
    const snapshotsDir = path.join(projectPath, "snapshots");
    await fs.ensureDir(snapshotsDir);

    const snapshotFiles = (await fs.readdir(snapshotsDir))
      .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
      .sort();

    const snapshotCount = snapshotFiles.length;
    const snapshotId = `snapshot_${String(snapshotCount + 1).padStart(3, "0")}`;
    const snapshotFile = path.join(snapshotsDir, `${snapshotId}.json`);

    // Incremental logic: only store content if modified from previous snapshot
    const incrementalFiles: Array<{ path: string; content: string | null }> = [];
    
    if (snapshotCount > 0) {
      const prevId = snapshotFiles[snapshotCount - 1].replace(".json", "");
      const prevData = await this.restoreSnapshotInMemory(projectPath, prevId);
      const prevFileMap = new Map(prevData.files.map(f => [f.path, f.content]));

      for (const file of files) {
        const prevContent = prevFileMap.get(file.path);
        if (prevContent === file.content) {
          incrementalFiles.push({ path: file.path, content: null });
        } else {
          incrementalFiles.push({ path: file.path, content: file.content });
        }
      }
    } else {
      // First snapshot is full
      for (const file of files) {
        incrementalFiles.push({ path: file.path, content: file.content });
      }
    }

    const data: SnapshotData = {
      snapshotId,
      timestamp: new Date().toISOString(),
      state,
      files: incrementalFiles
    };

    await fs.writeJson(snapshotFile, data, { spaces: 2 });
    return snapshotId;
  }

  async restoreSnapshot(projectPath: string, snapshotId: string): Promise<SnapshotData> {
    const snapshotsDir = path.join(projectPath, "snapshots");
    const snapshotFiles = (await fs.readdir(snapshotsDir))
      .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
      .sort();
    
    const targetFile = `${snapshotId}.json`;
    const targetIdx = snapshotFiles.indexOf(targetFile);
    if (targetIdx === -1) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    const reconstructedFiles = new Map<string, string>();
    let finalState: any = null;

    for (let i = 0; i <= targetIdx; i++) {
      const snapData: SnapshotData = await fs.readJson(path.join(snapshotsDir, snapshotFiles[i]));
      finalState = snapData.state;
      for (const file of snapData.files) {
        if (file.content !== null) {
          reconstructedFiles.set(file.path, file.content);
        }
      }
    }

    // Restore files back to the project directory
    for (const [filePath, content] of reconstructedFiles.entries()) {
      const fullPath = path.join(projectPath, filePath);
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content);
    }

    // Restore workspace_state.json
    await fs.writeJson(path.join(projectPath, "workspace_state.json"), finalState, { spaces: 2 });

    return {
      snapshotId,
      timestamp: new Date().toISOString(),
      state: finalState,
      files: Array.from(reconstructedFiles.entries()).map(([path, content]) => ({ path, content }))
    };
  }

  async beginTransaction(projectPath: string, currentState: any, currentFiles: Array<{ path: string; content: string }>): Promise<void> {
    // Create a rollback checkpoint snapshot
    const snapshotId = await this.saveSnapshot(projectPath, currentState, currentFiles);
    this.transactionRollbackPoint = snapshotId;
  }

  async rollbackTransaction(projectPath: string): Promise<void> {
    if (!this.transactionRollbackPoint) {
      throw new Error("No active transaction to rollback");
    }
    await this.restoreSnapshot(projectPath, this.transactionRollbackPoint);
    this.transactionRollbackPoint = null;
  }

  async commitTransaction(): Promise<void> {
    this.transactionRollbackPoint = null;
  }

  async listSnapshots(projectPath: string): Promise<string[]> {
    const snapshotsDir = path.join(projectPath, "snapshots");
    if (!(await fs.pathExists(snapshotsDir))) return [];
    const files = await fs.readdir(snapshotsDir);
    return files
      .filter(f => f.startsWith("snapshot_") && f.endsWith(".json"))
      .map(f => f.replace(".json", ""))
      .sort();
  }
}

export const workspaceSnapshot = new workspace_snapshot();
