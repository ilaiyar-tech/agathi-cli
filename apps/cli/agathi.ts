#!/usr/bin/env node
import chalk from "chalk";
import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

console.warn(chalk.bold.yellow("⚠️  WARNING: 'agathi' is deprecated. Please use 'tu2pu' instead.\n"));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tu2puPath = path.join(__dirname, "index.js");

const args = process.argv.slice(2);
const child = fork(tu2puPath, args, {
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
