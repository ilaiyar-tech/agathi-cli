import { execa } from "execa";
import crypto from "node:crypto";

export interface TerminalSession {
  id: string;
  command: string;
  process: any;
  output: string;
}

export class terminal_manager {
  private sessions = new Map<string, TerminalSession>();

  start(command: string, cwd: string = process.cwd()): string {
    const id = crypto.randomUUID();
    
    const proc = execa(command, {
      shell: true,
      cwd,
      all: true
    });

    const session: TerminalSession = {
      id,
      command,
      process: proc,
      output: ""
    };

    if (proc.all) {
      proc.all.on("data", (chunk) => {
        session.output += chunk.toString();
      });
    }

    this.sessions.set(id, session);
    
    proc.catch(() => {
      // ignore errors here, let caller handle or just keep output
    });

    return id;
  }

  get_output(id: string): string | undefined {
    const session = this.sessions.get(id);
    return session?.output;
  }

  async kill(id: string): Promise<boolean> {
    const session = this.sessions.get(id);
    if (!session) return false;
    
    session.process.kill();
    this.sessions.delete(id);
    return true;
  }

  list(): string[] {
    return Array.from(this.sessions.keys());
  }
}

export const terminals = new terminal_manager();
