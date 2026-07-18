import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";

import { builder } from "../../../packages/builder_engine/index.js";
import { projects } from "../../../packages/project_manager/index.js";

/**
 * Builder Commands (Stage 5 — CLI Product)
 *
 * Pure client of builder_engine — runs installs/builds locally against the
 * active project (or an explicit path), without needing the server running.
 */
function resolve_target(explicitPath?: string): string {
  if (explicitPath) return explicitPath;
  const active = projects.getActiveProject();
  return active ? active.rootPath : process.cwd();
}

export function register_builder_commands(program: Command) {
  const build_group = program
    .command("builder")
    .description("Install dependencies and build projects locally");

  // agathi builder install [path]
  build_group
    .command("install [path]")
    .description("Install dependencies for a project (defaults to active project or cwd)")
    .option("-c, --command <cmd>", "Install command", "npm install")
    .action(async (targetPath: string | undefined, opts) => {
      const cwd = resolve_target(targetPath);
      const spinner = ora(`Installing dependencies in ${cwd}...`).start();
      try {
        const result = await builder.install(cwd, opts.command);
        if (result.success) {
          spinner.succeed(chalk.green("Install complete"));
        } else {
          spinner.fail(chalk.red("Install failed"));
        }
        if (result.output.trim()) {
          console.log();
          console.log(chalk.gray(result.output.trim()));
        }
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });

  // agathi builder run [path]
  build_group
    .command("run [path]")
    .description("Build a project (defaults to active project or cwd)")
    .option("-c, --command <cmd>", "Build command", "npm run build")
    .action(async (targetPath: string | undefined, opts) => {
      const cwd = resolve_target(targetPath);
      const spinner = ora(`Building ${cwd}...`).start();
      try {
        const result = await builder.buildNode(cwd, opts.command);
        if (result.success) {
          spinner.succeed(chalk.green("Build succeeded"));
        } else {
          spinner.fail(chalk.red("Build failed"));
        }
        if (result.output.trim()) {
          console.log();
          console.log(chalk.gray(result.output.trim()));
        }
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
    });

  // agathi builder all [path]  — install then build in one shot
  build_group
    .command("all [path]")
    .description("Install dependencies and then build, in sequence")
    .option("-i, --install-command <cmd>", "Install command", "npm install")
    .option("-b, --build-command <cmd>", "Build command", "npm run build")
    .action(async (targetPath: string | undefined, opts) => {
      const cwd = resolve_target(targetPath);

      const installSpinner = ora(`Installing dependencies in ${cwd}...`).start();
      const installResult = await builder.install(cwd, opts.installCommand);
      if (!installResult.success) {
        installSpinner.fail(chalk.red("Install failed"));
        if (installResult.output.trim()) console.log(chalk.gray(installResult.output.trim()));
        return;
      }
      installSpinner.succeed(chalk.green("Install complete"));

      const buildSpinner = ora(`Building ${cwd}...`).start();
      const buildResult = await builder.buildNode(cwd, opts.buildCommand);
      if (!buildResult.success) {
        buildSpinner.fail(chalk.red("Build failed"));
        if (buildResult.output.trim()) console.log(chalk.gray(buildResult.output.trim()));
        return;
      }
      buildSpinner.succeed(chalk.green("Build succeeded"));
      if (buildResult.output.trim()) console.log(chalk.gray(buildResult.output.trim()));
    });
}
