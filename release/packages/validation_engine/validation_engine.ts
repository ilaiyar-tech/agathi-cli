import { execa } from "execa";
import path from "path";
import fs from "fs";

export interface ValidationResult {
  valid: boolean;
  skipped?: boolean;
  errors: string[];
}

export interface FullVerificationResult {
  build: ValidationResult;
  test: ValidationResult;
  lint: ValidationResult;
  runtime: ValidationResult;
}

export class validation_engine {
  private hasScript(projectPath: string, scriptName: string): boolean {
    try {
      const pkgPath = path.join(projectPath, "package.json");
      if (!fs.existsSync(pkgPath)) return false;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return !!(pkg.scripts && pkg.scripts[scriptName]);
    } catch {
      return false;
    }
  }

  async verifyAll(projectPath: string): Promise<FullVerificationResult> {
    const cwd = path.resolve(projectPath);
    const result: FullVerificationResult = {
      build: { valid: true, skipped: true, errors: [] },
      test: { valid: true, skipped: true, errors: [] },
      lint: { valid: true, skipped: true, errors: [] },
      runtime: { valid: true, skipped: true, errors: [] }
    };

    if (this.hasScript(projectPath, "build")) {
      try {
        await execa("npm", ["run", "build"], { cwd, all: true });
        result.build = { valid: true, skipped: false, errors: [] };
      } catch (e: any) {
        const output = e.all || e.message;
        result.build = { valid: false, skipped: false, errors: output.split("\n").filter((l: string) => l.trim().length > 0) };
      }
    }

    if (this.hasScript(projectPath, "test")) {
      try {
        await execa("npm", ["run", "test"], { cwd, all: true });
        result.test = { valid: true, skipped: false, errors: [] };
      } catch (e: any) {
        const output = e.all || e.message;
        if (output.includes("no test specified")) {
          result.test = { valid: true, skipped: true, errors: [] };
        } else {
          result.test = { valid: false, skipped: false, errors: output.split("\n").filter((l: string) => l.trim().length > 0) };
        }
      }
    }

    if (this.hasScript(projectPath, "lint")) {
      try {
        await execa("npm", ["run", "lint"], { cwd, all: true });
        result.lint = { valid: true, skipped: false, errors: [] };
      } catch (e: any) {
        const output = e.all || e.message;
        result.lint = { valid: false, skipped: false, errors: output.split("\n").filter((l: string) => l.trim().length > 0) };
      }
    }

    try {
      await execa("npx", ["tsc", "--noEmit"], { cwd, all: true });
      result.runtime = { valid: true, skipped: false, errors: [] };
    } catch (e: any) {
      const output = e.all || e.message;
      if (output.includes("Cannot find tsconfig.json") || output.includes("No inputs were found")) {
        result.runtime = { valid: true, skipped: true, errors: [] };
      } else {
        result.runtime = { valid: false, skipped: false, errors: output.split("\n").filter((l: string) => l.trim().length > 0) };
      }
    }

    return result;
  }
}

export const validator = new validation_engine();
