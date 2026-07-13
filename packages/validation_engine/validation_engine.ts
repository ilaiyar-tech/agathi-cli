import { execa } from "execa";
import path from "path";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class validation_engine {
  async validateTypes(projectPath: string): Promise<ValidationResult> {
    const cwd = path.resolve(projectPath);
    try {
      await execa("npx", ["tsc", "--noEmit"], { cwd, all: true });
      return { valid: true, errors: [] };
    } catch (e: any) {
      const output = e.all || e.message;
      return { valid: false, errors: output.split("\n").filter((l: string) => l.trim().length > 0) };
    }
  }

  async validateTests(projectPath: string): Promise<ValidationResult> {
    const cwd = path.resolve(projectPath);
    try {
      await execa("npm", ["test"], { cwd, all: true });
      return { valid: true, errors: [] };
    } catch (e: any) {
      const output = e.all || e.message;
      return { valid: false, errors: output.split("\n").filter((l: string) => l.trim().length > 0) };
    }
  }
}

export const validator = new validation_engine();
