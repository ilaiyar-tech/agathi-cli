import fs from "fs-extra";
import path from "path";

export async function path_exists(target_path: string): Promise<boolean> {
  return fs.pathExists(target_path);
}

export async function ensure_directory(target_path: string): Promise<void> {
  await fs.ensureDir(target_path);
}

export async function read_file(target_path: string): Promise<string> {
  return fs.readFile(target_path, "utf8");
}

export async function write_file(
  target_path: string,
  content: string
): Promise<void> {
  await fs.outputFile(target_path, content, "utf8");
}

export async function append_file(
  target_path: string,
  content: string
): Promise<void> {
  await fs.appendFile(target_path, content, "utf8");
}

export async function delete_file(target_path: string): Promise<void> {
  if (await fs.pathExists(target_path)) {
    await fs.remove(target_path);
  }
}

export async function list_directory(
  target_path: string
): Promise<string[]> {
  return fs.readdir(target_path);
}

export function resolve_path(...parts: string[]): string {
  return path.resolve(...parts);
}
