import { execa } from "execa";
import path from "path";
import fs from "fs-extra";

export class git_manager {
  private repo_path: string;

  constructor(repo_path: string = process.cwd()) {
    this.repo_path = path.resolve(repo_path);
  }

  async init(): Promise<void> {
    await execa("git", ["init"], { cwd: this.repo_path });
  }

  async status(): Promise<string> {
    const { stdout } = await execa("git", ["status", "--short"], { cwd: this.repo_path });
    return stdout;
  }

  async add(files: string[] = ["."]): Promise<void> {
    await execa("git", ["add", ...files], { cwd: this.repo_path });
  }

  async commit(message: string): Promise<void> {
    await execa("git", ["commit", "-m", message], { cwd: this.repo_path });
  }

  async log(limit: number = 10): Promise<string> {
    const { stdout } = await execa("git", ["log", `-n`, limit.toString(), "--oneline"], { cwd: this.repo_path });
    return stdout;
  }

  async is_repo(): Promise<boolean> {
    return fs.pathExists(path.join(this.repo_path, ".git"));
  }
}

export const git = new git_manager();
