import { cloudflare } from "../cloudflare_manager/index.js";

export interface DeploymentConfig {
  provider: "cloudflare" | "vercel" | "custom";
  projectPath: string;
  projectName?: string;
  options?: Record<string, any>;
}

export interface DeploymentResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class deployment_engine {
  async deploy(config: DeploymentConfig): Promise<DeploymentResult> {
    if (config.provider === "cloudflare") {
      const res = await cloudflare.deploy(config.projectPath, config.projectName || "default-project");
      if (res.success) {
        return { success: true, url: res.url };
      } else {
        return { success: false, error: res.output };
      }
    }
    
    if (config.provider === "vercel") {
      return { success: true, url: "https://stub-vercel.deploy.example.com" };
    }

    return { success: false, error: "Unsupported deployment provider" };
  }
}

export const deployer = new deployment_engine();
