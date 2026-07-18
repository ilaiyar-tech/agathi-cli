import path from "path";
import fs from "fs-extra";

export interface ProjectConfig {
  name: string;
  rootPath: string;
}

export class project_manager {
  private activeProject: ProjectConfig | null = null;

  async initProject(rootPath: string): Promise<ProjectConfig> {
    const fullPath = path.resolve(rootPath);
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      await fs.ensureDir(fullPath);
    }
    this.activeProject = {
      name: path.basename(fullPath),
      rootPath: fullPath
    };
    return this.activeProject;
  }

  getActiveProject(): ProjectConfig | null {
    return this.activeProject;
  }

  async getProjectFiles(): Promise<string[]> {
    if (!this.activeProject) return [];
    
    // Simplistic scan ignoring node_modules for testability
    const results: string[] = [];
    async function scan(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(full);
        } else {
          results.push(full);
        }
      }
    }
    
    await scan(this.activeProject.rootPath);
    return results;
  }
}

export const projects = new project_manager();
