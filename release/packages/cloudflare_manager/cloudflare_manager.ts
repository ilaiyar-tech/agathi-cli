import { execa } from "execa";
import path from "path";
import fs from "fs-extra";

export interface CloudflareDeployResult {
  success: boolean;
  url?: string;
  output: string;
}

export class cloudflare_manager {
  async deploy(projectPath: string, projectName: string): Promise<CloudflareDeployResult> {
    const cwd = path.resolve(projectPath);
    
    if (!(await fs.pathExists(path.join(cwd, "wrangler.toml")))) {
      try {
        await fs.writeFile(path.join(cwd, "wrangler.toml"), `name = "${projectName}"\ncompatibility_date = "2024-01-01"\npages_build_output_dir = "./dist"`);
      } catch (e) {
        // ignore
      }
    }

    try {
      const { stdout, stderr } = await execa("npx", ["wrangler", "pages", "deploy", "./dist", "--project-name", projectName, "--commit-dirty=true"], { cwd, all: true });
      
      const output = stdout + (stderr ? "\n" + stderr : "");
      
      // Try to parse URL
      const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.pages\.dev/);
      const url = match ? match[0] : undefined;

      return { success: true, url, output };
    } catch (e: any) {
      return { success: false, output: e.all || e.message };
    }
  }
}

export const cloudflare = new cloudflare_manager();
