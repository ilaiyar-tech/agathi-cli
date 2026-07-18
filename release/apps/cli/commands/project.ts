import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "node:path";

import { projects } from "../../../packages/project_manager/index.js";
import { git_manager } from "../../../packages/git/index.js";

/**
 * Project Commands (Stage 5 — CLI Product)
 *
 * Pure client of project_manager / git packages — no server round-trip
 * required, so these commands work fully offline.
 */
export function register_project_commands(program: Command) {
  const project = program
    .command("project")
    .alias("proj")
    .description("Manage the active project workspace");

  // agathi project init [path]
  project
    .command("init [path]")
    .description("Initialize (or attach to) a project at the given path")
    .action(async (targetPath: string = ".") => {
      const spinner = ora(`Initializing project at ${targetPath}...`).start();
      try {
        const config = await projects.initProject(targetPath);
        spinner.succeed(chalk.green(`Project ready: ${config.name}`));
        console.log(chalk.gray("  Root: ") + chalk.white(config.rootPath));

        const gm = new git_manager(config.rootPath);
        if (await gm.is_repo()) {
          console.log(chalk.gray("  Git: ") + chalk.green("repository detected"));
        } else {
          console.log(chalk.gray("  Git: ") + chalk.yellow("no repository (run 'agathi project git-init' to create one)"));
        }
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });

  // agathi project info
  project
    .command("info")
    .description("Show the currently active project")
    .action(() => {
      const active = projects.getActiveProject();
      if (!active) {
        console.log(chalk.yellow("No active project. Run 'agathi project init [path]' first."));
        return;
      }
      console.log(chalk.bold.cyan("Active Project"));
      console.log(chalk.gray("  Name: ") + chalk.white(active.name));
      console.log(chalk.gray("  Root: ") + chalk.white(active.rootPath));
    });

  // agathi project files
  project
    .command("files")
    .description("List all files tracked in the active project")
    .option("-l, --limit <n>", "Limit number of files printed", "200")
    .action(async (opts) => {
      const active = projects.getActiveProject();
      if (!active) {
        console.log(chalk.yellow("No active project. Run 'agathi project init [path]' first."));
        return;
      }
      const spinner = ora("Scanning project files...").start();
      try {
        const files = await projects.getProjectFiles();
        spinner.succeed(chalk.green(`${files.length} files found`));
        const limit = Number(opts.limit) || 200;
        files.slice(0, limit).forEach((f) =>
          console.log(chalk.gray("  •") + " " + chalk.white(path.relative(active.rootPath, f)))
        );
        if (files.length > limit) {
          console.log(chalk.gray(`  ... and ${files.length - limit} more (use --limit to see more)`));
        }
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });

  // agathi project status
  project
    .command("status")
    .description("Show active project + git status")
    .action(async () => {
      const active = projects.getActiveProject();
      if (!active) {
        console.log(chalk.yellow("No active project. Run 'agathi project init [path]' first."));
        return;
      }
      console.log(chalk.bold.cyan("Project: ") + chalk.white(active.name));
      console.log(chalk.gray("  Root: ") + chalk.white(active.rootPath));

      const gm = new git_manager(active.rootPath);
      const spinner = ora("Checking git status...").start();
      try {
        if (!(await gm.is_repo())) {
          spinner.warn(chalk.yellow("Not a git repository"));
          return;
        }
        const status = await gm.status();
        spinner.succeed(chalk.green("Git status loaded"));
        console.log();
        console.log(status.trim().length ? status : chalk.gray("  Clean working tree"));
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });

  // agathi project git-init
  project
    .command("git-init")
    .description("Initialize a git repository in the active project")
    .action(async () => {
      const active = projects.getActiveProject();
      if (!active) {
        console.log(chalk.yellow("No active project. Run 'agathi project init [path]' first."));
        return;
      }
      const spinner = ora("Initializing git repository...").start();
      try {
        const gm = new git_manager(active.rootPath);
        if (await gm.is_repo()) {
          spinner.info(chalk.gray("Repository already exists"));
          return;
        }
        await gm.init();
        spinner.succeed(chalk.green("Git repository initialized"));
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });

  // agathi project log
  project
    .command("log")
    .description("Show recent commit log for the active project")
    .option("-n, --limit <n>", "Number of commits", "10")
    .action(async (opts) => {
      const active = projects.getActiveProject();
      if (!active) {
        console.log(chalk.yellow("No active project. Run 'agathi project init [path]' first."));
        return;
      }
      const spinner = ora("Fetching commit log...").start();
      try {
        const gm = new git_manager(active.rootPath);
        if (!(await gm.is_repo())) {
          spinner.warn(chalk.yellow("Not a git repository"));
          return;
        }
        const log = await gm.log(Number(opts.limit) || 10);
        spinner.succeed(chalk.green("Log loaded"));
        console.log();
        console.log(log.trim().length ? log : chalk.gray("  No commits yet"));
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });
}
