import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "node:path";
import fs from "fs-extra";

import { deployer } from "../../../packages/deployment_engine/index.js";
import { projects } from "../../../packages/project_manager/index.js";

/**
 * Deploy Commands (Stage 5 — CLI Product)
 *
 * Pure client of deployment_engine — deploys the active project (or an
 * explicit path) directly, without needing the generator/preview pipeline
 * or the server running. Keeps a small local history log so `history`,
 * `status`, and `rollback` have something to work with offline.
 *
 * Note: this is distinct from the top-level `tu2pu deploy <generatorId>`
 * command, which deploys artifacts produced by the AI Builder pipeline via
 * the server API. This group (`tu2pu deployment ...`) deploys any local
 * project directly.
 */

const HISTORY_FILE = path.join(process.cwd(), "storage", "deployment_history.json");

interface DeploymentRecord {
  id: string;
  provider: string;
  projectName: string;
  projectPath: string;
  url?: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

async function read_history(): Promise<DeploymentRecord[]> {
  try {
    const exists = await fs.pathExists(HISTORY_FILE);
    if (!exists) return [];
    return await fs.readJSON(HISTORY_FILE);
  } catch {
    return [];
  }
}

async function write_history(records: DeploymentRecord[]): Promise<void> {
  await fs.ensureDir(path.dirname(HISTORY_FILE));
  await fs.writeJSON(HISTORY_FILE, records, { spaces: 2 });
}

async function append_history(record: DeploymentRecord): Promise<void> {
  const records = await read_history();
  records.unshift(record);
  await write_history(records.slice(0, 100)); // cap history at 100 entries
}

function resolve_target(explicitPath?: string): { cwd: string; name: string } {
  const active = projects.getActiveProject();
  const cwd = explicitPath || (active ? active.rootPath : process.cwd());
  const name = path.basename(cwd);
  return { cwd, name };
}

export function register_deploy_commands(program: Command) {
  const group = program
    .command("deployment")
    .alias("deploy-local")
    .description("Deploy local projects directly and manage deployment history");

  // tu2pu deployment run [path]
  group
    .command("run [path]")
    .description("Deploy a local project directly (defaults to active project or cwd)")
    .option("-p, --provider <name>", "Deployment provider (cloudflare | vercel)", "cloudflare")
    .option("-n, --name <name>", "Project name for the deployment")
    .action(async (targetPath: string | undefined, opts) => {
      const { cwd, name } = resolve_target(targetPath);
      const projectName = opts.name || name;
      const spinner = ora(`Deploying ${projectName} to ${opts.provider}...`).start();

      const result = await deployer.deploy({
        provider: opts.provider,
        projectPath: cwd,
        projectName
      });

      const record: DeploymentRecord = {
        id: `dep_${Date.now().toString(36)}`,
        provider: opts.provider,
        projectName,
        projectPath: cwd,
        url: result.url,
        success: result.success,
        error: result.error,
        timestamp: Date.now()
      };
      await append_history(record);

      if (result.success) {
        spinner.succeed(chalk.green("Deployment complete"));
        console.log(chalk.gray("  ID: ") + chalk.white(record.id));
        if (result.url) console.log(chalk.gray("  URL: ") + chalk.cyan.underline(result.url));
      } else {
        spinner.fail(chalk.red("Deployment failed"));
        if (result.error) console.log(chalk.gray("  " + result.error));
      }
    });

  // tu2pu deployment history
  group
    .command("history")
    .description("Show recent local deployments")
    .option("-n, --limit <n>", "Number of records to show", "20")
    .action(async (opts) => {
      const records = await read_history();
      if (records.length === 0) {
        console.log(chalk.gray("No deployments recorded yet."));
        return;
      }
      const limit = Number(opts.limit) || 20;
      console.log(chalk.bold.cyan("Recent Deployments:"));
      records.slice(0, limit).forEach((r) => {
        const status = r.success ? chalk.green("✔ success") : chalk.red("✘ failed");
        console.log(
          chalk.gray("  •") + " " + chalk.white(r.id) +
          chalk.gray(`  [${r.provider}]`) + " " + status +
          chalk.gray("  " + new Date(r.timestamp).toLocaleString())
        );
        console.log(chalk.gray(`      project: ${r.projectName}`) + (r.url ? chalk.gray("  url: ") + chalk.cyan(r.url) : ""));
      });
    });

  // tu2pu deployment status <id>
  group
    .command("status <id>")
    .description("Show details for a specific local deployment")
    .action(async (id: string) => {
      const records = await read_history();
      const record = records.find((r) => r.id === id);
      if (!record) {
        console.log(chalk.yellow(`No deployment found with ID ${id}`));
        return;
      }
      console.log(chalk.bold.cyan("Deployment: ") + chalk.white(record.id));
      console.log(chalk.gray("  Provider: ") + chalk.white(record.provider));
      console.log(chalk.gray("  Project: ") + chalk.white(record.projectName));
      console.log(chalk.gray("  Path: ") + chalk.white(record.projectPath));
      console.log(chalk.gray("  Status: ") + (record.success ? chalk.green("success") : chalk.red("failed")));
      if (record.url) console.log(chalk.gray("  URL: ") + chalk.cyan.underline(record.url));
      if (record.error) console.log(chalk.gray("  Error: ") + chalk.red(record.error));
      console.log(chalk.gray("  Deployed: ") + chalk.white(new Date(record.timestamp).toLocaleString()));
    });

  // tu2pu deployment rollback <id>
  group
    .command("rollback <id>")
    .description("Redeploy an earlier local deployment's project path")
    .action(async (id: string) => {
      const records = await read_history();
      const record = records.find((r) => r.id === id);
      if (!record) {
        console.log(chalk.yellow(`No deployment found with ID ${id}`));
        return;
      }
      const spinner = ora(`Rolling back to deployment ${id} (${record.projectName})...`).start();
      const result = await deployer.deploy({
        provider: record.provider as any,
        projectPath: record.projectPath,
        projectName: record.projectName
      });

      const newRecord: DeploymentRecord = {
        id: `dep_${Date.now().toString(36)}`,
        provider: record.provider,
        projectName: record.projectName,
        projectPath: record.projectPath,
        url: result.url,
        success: result.success,
        error: result.error,
        timestamp: Date.now()
      };
      await append_history(newRecord);

      if (result.success) {
        spinner.succeed(chalk.green(`Rollback deployed as ${newRecord.id}`));
        if (result.url) console.log(chalk.gray("  URL: ") + chalk.cyan.underline(result.url));
      } else {
        spinner.fail(chalk.red("Rollback deployment failed"));
        if (result.error) console.log(chalk.gray("  " + result.error));
      }
    });
}
