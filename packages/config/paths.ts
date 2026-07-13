import path from "path";

export const ROOT = process.cwd();

export const PATHS = {
  root: ROOT,

  workspace: path.join(ROOT, "workspace"),

  projects: path.join(ROOT, "workspace/projects"),

  output: path.join(ROOT, "workspace/output"),

  temp: path.join(ROOT, "workspace/temp"),

  storage: path.join(ROOT, "storage"),

  logs: path.join(ROOT, "logs"),

  ai: "/ai",

  models: "/ai/models",

  cache: "/ai/cache",

  datasets: "/ai/datasets",

  services: "/ai/services"
};
