import { execa } from "execa";
import path from "path";

export interface BuildResult {
  success: boolean;
  output: string;
}

export class builder_engine {
  async buildNode(projectPath: string, command: string = "npm run build"): Promise<BuildResult> {
    const cwd = path.resolve(projectPath);
    try {
      const { stdout, stderr } = await execa(command, { shell: true, cwd, all: true });
      return { success: true, output: stdout + (stderr ? "\n" + stderr : "") };
    } catch (e: any) {
      return { success: false, output: e.all || e.message };
    }
  }

  async install(projectPath: string, command: string = "npm install"): Promise<BuildResult> {
    const cwd = path.resolve(projectPath);
    try {
      const { stdout, stderr } = await execa(command, { shell: true, cwd, all: true });
      return { success: true, output: stdout + (stderr ? "\n" + stderr : "") };
    } catch (e: any) {
      return { success: false, output: e.all || e.message };
    }
  }
}

export const builder = new builder_engine();
