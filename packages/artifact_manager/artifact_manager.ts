import path from "path";
import fs from "fs-extra";
import crypto from "node:crypto";

export interface Artifact {
  id: string;
  session_id: string;
  type: string;
  content: string;
  created_at: string;
}

export class artifact_manager {
  private base_dir: string;

  constructor(base_dir: string = path.join(process.cwd(), "artifacts")) {
    this.base_dir = base_dir;
  }

  async save(session_id: string, type: string, content: string): Promise<Artifact> {
    await fs.ensureDir(this.base_dir);
    const id = crypto.randomUUID();
    const artifact: Artifact = {
      id,
      session_id,
      type,
      content,
      created_at: new Date().toISOString(),
    };

    const filePath = path.join(this.base_dir, `${id}.json`);
    await fs.writeJson(filePath, artifact, { spaces: 2 });
    return artifact;
  }

  async get(id: string): Promise<Artifact | null> {
    const filePath = path.join(this.base_dir, `${id}.json`);
    if (await fs.pathExists(filePath)) {
      return fs.readJson(filePath);
    }
    return null;
  }

  async list(session_id?: string): Promise<Artifact[]> {
    if (!(await fs.pathExists(this.base_dir))) return [];

    const files = await fs.readdir(this.base_dir);
    const artifacts: Artifact[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const artifact = await fs.readJson(path.join(this.base_dir, file));
        if (!session_id || artifact.session_id === session_id) {
          artifacts.push(artifact);
        }
      }
    }

    return artifacts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export const artifacts = new artifact_manager();
