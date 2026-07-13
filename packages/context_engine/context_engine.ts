import { memory } from "../memory/index.js";
import { read_file } from "../filesystem/index.js";
import { projects } from "../project_manager/index.js";
import { git_manager } from "../git/index.js";
import { terminals } from "../terminal_manager/index.js";

export interface ContextItem {
  type: "file" | "memory" | "system";
  content: string;
}

export class context_engine {
  private active_files = new Set<string>();

  add_file(path: string) {
    this.active_files.add(path);
  }

  remove_file(path: string) {
    this.active_files.delete(path);
  }

  clear_active_files() {
    this.active_files.clear();
  }

  async build_context(session_id: string): Promise<string[]> {
    const context: string[] = [];

    const activeProj = projects.getActiveProject();
    if (activeProj) {
      context.push(`Active Project: ${activeProj.name} (${activeProj.rootPath})`);
      
      const gm = new git_manager(activeProj.rootPath);
      if (await gm.is_repo()) {
        try {
          const status = await gm.status();
          // Truncate git status to avoid prompt bloat
          const truncatedStatus = status.length > 1000 ? status.slice(0, 1000) + "\n... (truncated status)" : status;
          context.push(`Git Status:\n${truncatedStatus || "Clean workspace"}`);
        } catch (e: any) {
          context.push(`Git Status: Error - ${e.message}`);
        }
      }
    }

    const running_terminals = terminals.list();
    if (running_terminals.length > 0) {
      context.push(`Active Terminals: ${running_terminals.length}`);
      for (const id of running_terminals) {
        const output = terminals.get_output(id) || "";
        const truncated = output.length > 400 ? "..." + output.slice(-400) : output;
        context.push(`Terminal (${id}) Output:\n${truncated}`);
      }
    }

    // Add active files context
    for (const file of this.active_files) {
      try {
        const content = await read_file(file);
        // Truncate file content to avoid context window explosion
        const maxLen = 2000;
        const truncated = content.length > maxLen ? content.slice(0, maxLen) + "\n... (truncated)" : content;
        context.push(`File (${file}):\n` + truncated);
      } catch (e: any) {
        context.push(`File (${file}): Could not read file - ${e.message}`);
      }
    }

    return context;
  }
}

export const context = new context_engine();
