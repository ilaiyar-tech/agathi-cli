import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");
const APPS_DIR = path.join(ROOT, "apps");

interface Rule {
  name: string;
  sourcePattern: string; // Directory matching source files
  forbiddenPattern: string; // String to scan in import targets
  description: string;
}

const RULES: Rule[] = [
  {
    name: "Runtime Isolation",
    sourcePattern: "packages",
    forbiddenPattern: "/apps/cli|/apps/server",
    description: "Core packages must never import from host applications (CLI or server)."
  },
  {
    name: "Memory Layering Isolation",
    sourcePattern: "packages/memory",
    forbiddenPattern: "/packages/providers|/packages/provider_manager",
    description: "Memory engine must not import from provider systems."
  },
  {
    name: "Provider Layering Isolation",
    sourcePattern: "packages/providers",
    forbiddenPattern: "/packages/agents|/packages/agent_orchestration",
    description: "Provider modules must not import from high-level agent systems."
  },
  {
    name: "Plugin Sandboxing",
    sourcePattern: "plugins",
    forbiddenPattern: "/packages/agent_runtime|/packages/reasoning_engine",
    description: "Plugins must not bypass services by directly importing internal engines."
  }
];

function findTsFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTsFiles(filePath));
    } else if (file.endsWith(".ts") && !file.endsWith(".d.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

function checkImports(file: string, content: string): { rule: Rule; forbiddenImport: string }[] {
  const violations: { rule: Rule; forbiddenImport: string }[] = [];
  const lines = content.split("\n");

  // Regex to extract import paths
  const importRegex = /import\s+.*?\s+from\s+["'](.*?)["']/g;
  const requireRegex = /import\s*\(["'](.*?)["']\)/g;

  const checkPath = (importPath: string) => {
    // Resolve absolute path or standard platform structure format
    for (const rule of RULES) {
      const relFile = path.relative(ROOT, file);
      if (relFile.includes(rule.sourcePattern)) {
        const regex = new RegExp(rule.forbiddenPattern);
        if (regex.test(importPath)) {
          violations.push({ rule, forbiddenImport: importPath });
        }
      }
    }
  };

  for (const line of lines) {
    let match;
    // Reset regex indices
    importRegex.lastIndex = 0;
    requireRegex.lastIndex = 0;

    while ((match = importRegex.exec(line)) !== null) {
      checkPath(match[1]);
    }
    while ((match = requireRegex.exec(line)) !== null) {
      checkPath(match[1]);
    }
  }

  return violations;
}

function main() {
  console.log(chalk.bold.magenta("========================================"));
  console.log(chalk.bold.magenta("   tu2pu Architecture Validator     "));
  console.log(chalk.bold.magenta("========================================\n"));

  const allFiles = [...findTsFiles(PACKAGES_DIR), ...findTsFiles(APPS_DIR)];
  console.log(chalk.yellow(`Scanning ${allFiles.length} TypeScript files for dependency rule violations...\n`));

  let violationCount = 0;

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, "utf8");
      const fileViolations = checkImports(file, content);
      for (const v of fileViolations) {
        const relFile = path.relative(ROOT, file);
        console.log(chalk.red(`[VIOLATION] ${v.rule.name}`));
        console.log(chalk.gray(`  File:      `) + chalk.white(relFile));
        console.log(chalk.gray(`  Import:    `) + chalk.yellow(v.forbiddenImport));
        console.log(chalk.gray(`  Rule:      `) + chalk.cyan(v.rule.description));
        console.log();
        violationCount++;
      }
    } catch (e: any) {
      console.error(`Error reading ${file}:`, e.message);
    }
  }

  console.log(chalk.bold.magenta("========================================"));
  console.log(chalk.bold.magenta("            Validation Summary          "));
  console.log(chalk.bold.magenta("========================================"));
  
  if (violationCount > 0) {
    console.log(chalk.red(`  Failed: ${violationCount} architecture violations found.`));
    process.exit(1);
  } else {
    console.log(chalk.green("  Success: 0 architecture violations found. Dependency graph is clean! 🎉"));
    process.exit(0);
  }
}

main();
