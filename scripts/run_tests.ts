import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import chalk from "chalk";

const ROOT = process.cwd();
const PACKAGES_DIR = path.join(ROOT, "packages");

function findTestFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTestFiles(filePath));
    } else if (file.endsWith(".test.ts")) {
      results.push(filePath);
    }
  }
  return results;
}

async function runTest(file: string): Promise<boolean> {
  const relPath = path.relative(ROOT, file);
  console.log(chalk.cyan(`\nRunning test: ${relPath}...`));
  return new Promise((resolve) => {
    // Run tests directly via npx tsx
    const child = spawn("npx", ["tsx", file], { stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(chalk.green(`✔ ${relPath} passed.`));
        resolve(true);
      } else {
        console.log(chalk.red(`✘ ${relPath} failed with code ${code}.`));
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log(chalk.bold.magenta("========================================"));
  console.log(chalk.bold.magenta("   tu2pu Global Test Runner (DX)     "));
  console.log(chalk.bold.magenta("========================================\n"));

  const testFiles = findTestFiles(PACKAGES_DIR);
  console.log(chalk.yellow(`Found ${testFiles.length} test suites under packages/.\n`));

  let passedCount = 0;
  let failedCount = 0;
  const failedFiles: string[] = [];

  for (const file of testFiles) {
    const passed = await runTest(file);
    if (passed) {
      passedCount++;
    } else {
      failedCount++;
      failedFiles.push(path.relative(ROOT, file));
    }
  }

  console.log("\n" + chalk.bold.magenta("========================================"));
  console.log(chalk.bold.magenta("            Test Summary                "));
  console.log(chalk.bold.magenta("========================================"));
  console.log(chalk.green(`  Passed: ${passedCount}`));
  console.log(failedCount > 0 ? chalk.red(`  Failed: ${failedCount}`) : chalk.green(`  Failed: ${failedCount}`));
  
  if (failedFiles.length > 0) {
    console.log(chalk.red("\nFailed test suites:"));
    failedFiles.forEach(f => console.log(chalk.red(`  • ${f}`)));
    process.exit(1);
  } else {
    console.log(chalk.green("\nAll test suites executed successfully! 🎉"));
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
