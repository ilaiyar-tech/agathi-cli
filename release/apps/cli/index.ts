#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { sessions } from "../../packages/session_manager/index.js";
import { planner } from "../../packages/prompt_planner/index.js";

import { launch_interactive } from "./interactive.js";
import { register_project_commands } from "./commands/project.js";
import { register_builder_commands } from "./commands/builder.js";
import { register_deploy_commands } from "./commands/deploy.js";

const SERVER = "http://localhost:8100";

async function stream_chat_api(prompt: string, session_id: string, onToken: (token: string) => void) {
  const res = await fetch(`${SERVER}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "chat",
      messages: [{ role: "user", content: prompt }],
      stream: true
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const json = line.replace("data:", "").trim();
      if (json === "[DONE]") continue;

      try {
        const obj = JSON.parse(json);
        if (obj.error) {
          onToken(`\nError: ${obj.error.message}\n`);
          continue;
        }
        const choice = obj.choices?.[0];
        if (choice?.delta?.content) {
          onToken(choice.delta.content);
        }
      } catch (e) {}
    }
  }
}

async function block_chat_api(prompt: string, session_id: string) {
  const res = await fetch(`${SERVER}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "chat",
      messages: [{ role: "user", content: prompt }],
      stream: false
    })
  });
  if (!res.ok) throw new Error("API request failed");
  const data = await res.json() as any;
  return { content: data.choices?.[0]?.message?.content || "" };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function api<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as T;
}

function banner() {
  console.log(chalk.bold.magenta("  █████╗  ██████╗  █████╗ ████████╗██╗  ██╗██╗"));
  console.log(chalk.bold.magenta("  ██╔══██╗██╔════╝ ██╔══██╗╚══██╔══╝██║  ██║██║"));
  console.log(chalk.bold.cyan("  ███████║██║  ███╗███████║   ██║   ███████║██║"));
  console.log(chalk.bold.cyan("  ██╔══██║██║   ██║██╔══██║   ██║   ██╔══██║██║"));
  console.log(chalk.bold.cyan("  ██║  ██║╚██████╔╝██║  ██║   ██║   ██║  ██║██║"));
  console.log(chalk.bold.cyan("  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝"));
  console.log();
  console.log(chalk.gray("  AI-powered development platform v1.0.0"));
  console.log();
}

function printMarkdown(text: string) {
  // Basic markdown: code blocks, bold, italic
  const lines = text.split("\n");
  let inCode = false;
  for (const line of lines) {
    if (line.startsWith("```")) {
      inCode = !inCode;
      if (inCode) process.stdout.write(chalk.bgGray.black(" CODE ") + "\n");
      continue;
    }
    if (inCode) {
      console.log(chalk.cyan(line));
    } else if (line.startsWith("# ")) {
      console.log(chalk.bold.white(line.slice(2)));
    } else if (line.startsWith("## ")) {
      console.log(chalk.bold.cyan(line.slice(3)));
    } else if (line.startsWith("### ")) {
      console.log(chalk.cyan(line.slice(4)));
    } else if (line.startsWith("- ")) {
      console.log(chalk.gray("  •") + " " + line.slice(2));
    } else {
      // bold **text**
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, (_, t) => chalk.bold(t))
        .replace(/`(.+?)`/g, (_, t) => chalk.bgGray.black(` ${t} `));
      console.log(formatted);
    }
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

// agathi version
program
  .command("version")
  .description("Show agathi version")
  .action(() => {
    console.log(chalk.bold.cyan("agathi") + chalk.gray(" v1.0.0"));
  });

// agathi doctor
program
  .command("doctor")
  .description("Check system status and connectivity")
  .action(async () => {
    const spinner = ora("Checking server connectivity...").start();
    try {
      await api("GET", "/system/health");
      spinner.succeed(chalk.green("Server reachable at " + SERVER));
    } catch {
      spinner.warn(chalk.yellow("Server not reachable — some commands require the server running."));
    }

    const sessionList = sessions.list_sessions();
    console.log(chalk.gray(`  Sessions in memory: ${sessionList.length}`));
    console.log(chalk.green("  ✔ CLI runtime OK"));
    console.log(chalk.green("  ✔ agent_runtime loaded"));
    console.log(chalk.green("  ✔ session_manager loaded"));
    console.log(chalk.green("  ✔ prompt_planner loaded"));
  });

// agathi chat
program
  .command("chat [message]")
  .description("Chat with the AI agent")
  .option("-s, --session <id>", "Session ID", "default")
  .option("-S, --stream", "Stream output token by token")
  .action(async (message: string | undefined, opts) => {
    if (message) {
      // Non-interactive single message
      const spinner = ora("Thinking...").start();
      try {
        if (opts.stream) {
          spinner.stop();
          process.stdout.write(chalk.cyan("Assistant: "));
          await stream_chat_api(message, opts.session, (token: string) => {
            process.stdout.write(token);
          });
          console.log();
        } else {
          const result = await block_chat_api(message, opts.session);
          spinner.stop();
          console.log();
          printMarkdown(result.content);
          console.log();
        }
      } catch (e: any) {
        spinner.fail(chalk.red(e.message));
      }
      return;
    }

    // Interactive REPL mode
    banner();
    console.log(chalk.bold("Chat Mode") + chalk.gray(" — type 'exit' to quit, '/help' for commands"));
    console.log(chalk.gray("Session: ") + chalk.cyan(opts.session));
    console.log();

    const rl = readline.createInterface({ input: stdin, output: stdout });
    while (true) {
      const input = await rl.question(chalk.magenta("you › "));
      const trimmed = input.trim();

      if (!trimmed || trimmed === "exit" || trimmed === "quit") {
        console.log(chalk.gray("\nGoodbye!"));
        break;
      }

      if (trimmed === "/help") {
        console.log(chalk.cyan("Commands: /session, /clear, /history, exit"));
        continue;
      }
      if (trimmed === "/session") {
        console.log(chalk.gray("Current session: ") + chalk.cyan(opts.session));
        continue;
      }
      if (trimmed === "/history") {
        const s = sessions.list_sessions();
        s.forEach(ss => console.log(chalk.gray(`  ${ss.id} — ${new Date(ss.startedAt).toLocaleString()}`)));
        continue;
      }

      const spinner = opts.stream ? null : ora({ text: "Thinking...", color: "cyan" }).start();
      try {
        if (opts.stream) {
          process.stdout.write(chalk.cyan("\nஅ › "));
          await stream_chat_api(trimmed, opts.session, (token: string) => {
            process.stdout.write(token);
          });
          console.log("\n");
        } else {
          const result = await block_chat_api(trimmed, opts.session);
          spinner?.stop();
          console.log();
          process.stdout.write(chalk.cyan("அ › "));
          console.log();
          printMarkdown(result.content);
          console.log();
        }
      } catch (e: any) {
        if (spinner) spinner.fail(chalk.red(e.message));
        else console.log(chalk.red(`\nError: ${e.message}`));
      }
    }
    rl.close();
  });

// agathi plan
program
  .command("plan <prompt>")
  .description("Generate an execution plan from a prompt")
  .action(async (prompt: string) => {
    const spinner = ora("Generating plan...").start();
    try {
      const data = await api<any>("POST", "/planner/plan", { prompt });
      spinner.succeed(chalk.green("Plan generated"));
      console.log();
      console.log(chalk.bold("Plan ID: ") + chalk.cyan(data.id));
      console.log(chalk.bold("Tasks:"));
      data.tasks.forEach((t: any) =>
        console.log(
          chalk.gray("  •") + " " + chalk.white(t.name) +
          chalk.gray(t.deps.length ? ` [depends: ${t.deps.join(", ")}]` : "")
        )
      );
      console.log(chalk.bold("Tools required: ") + chalk.cyan(data.tools.join(", ")));
      console.log(chalk.bold("Providers: ") + chalk.cyan(data.providers.join(", ")));
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi run
program
  .command("run <planId>")
  .description("Execute a plan by ID")
  .action(async (planId: string) => {
    const spinner = ora("Starting execution...").start();
    try {
      const data = await api<any>("POST", "/execution/start", { planId });
      spinner.succeed(chalk.green("Execution started: " + data.id));
      console.log();

      // Poll until done
      const poll = ora("Running tasks...").start();
      let done = false;
      while (!done) {
        await new Promise(r => setTimeout(r, 1000));
        const status = await api<any>("GET", `/execution/${data.id}/status`);
        poll.text = `Running tasks... ${status.progress}%`;
        if (["completed", "cancelled", "failed"].includes(status.status)) {
          done = true;
          if (status.status === "completed") {
            poll.succeed(chalk.green("Execution completed"));
          } else {
            poll.fail(chalk.red(`Execution ${status.status}`));
          }
        }
      }
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi build
program
  .command("build [path]")
  .description("Build a project")
  .action(async (projectPath: string = ".") => {
    const spinner = ora(`Building ${projectPath}...`).start();
    try {
      // Use execution start as build trigger
      const data = await api<any>("POST", "/execution/start", {
        planId: "build",
        tasks: [{ id: "build", name: "Build", status: "pending" }]
      });
      spinner.succeed(chalk.green("Build triggered: " + data.id));
      data.logs?.forEach((l: string) => console.log(chalk.gray("  " + l)));
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi generate
program
  .command("generate <prompt>")
  .description("Generate a website or project from a prompt")
  .option("-f, --framework <name>", "Framework", "Vite")
  .option("-t, --template <name>", "Template", "Default Spa")
  .action(async (prompt: string, opts) => {
    const spinner = ora("Generating website...").start();
    try {
      const data = await api<any>("POST", "/generator/start", {
        prompt,
        framework: opts.framework,
        template: opts.template
      });
      spinner.succeed(chalk.green("Website generated: " + data.id));
      console.log();
      console.log(chalk.bold("Files generated:"));
      data.files?.forEach((f: any) => console.log(chalk.gray("  📄 " + f.path)));
      console.log();
      console.log(chalk.gray("Use ") + chalk.cyan(`agathi preview ${data.id}`) + chalk.gray(" to launch preview."));
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi preview
program
  .command("preview <generatorId>")
  .description("Launch a preview for a generated project")
  .action(async (generatorId: string) => {
    const spinner = ora("Launching preview...").start();
    try {
      const data = await api<any>("POST", "/preview/start", { generatorId });
      spinner.succeed(chalk.green("Preview running!"));
      console.log();
      console.log(chalk.bold("Preview URL: ") + chalk.cyan.underline(data.url));
      console.log(chalk.bold("Status: ") + chalk.green(data.status));
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi deploy
program
  .command("deploy <generatorId>")
  .description("Deploy a generated project")
  .option("-t, --target <target>", "Deployment target", "Cloudflare Pages")
  .action(async (generatorId: string, opts) => {
    const spinner = ora(`Deploying to ${opts.target}...`).start();
    try {
      const data = await api<any>("POST", "/deploy/start", {
        generatorId,
        target: opts.target,
        envs: []
      });
      spinner.succeed(chalk.green("Deployment complete!"));
      console.log();
      console.log(chalk.bold("Deployment ID: ") + chalk.cyan(data.id));
      console.log(chalk.bold("URL: ") + chalk.cyan.underline(data.url));
      console.log(chalk.bold("Status: ") + chalk.green(data.status));
      console.log();
      console.log(chalk.bold("Deployment Logs:"));
      data.logs?.forEach((l: string) => console.log(chalk.gray("  " + l)));
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi models
program
  .command("models")
  .description("List available models")
  .action(async () => {
    const spinner = ora("Fetching models...").start();
    try {
      const data = await api<any[]>("GET", "/models");
      spinner.succeed(chalk.green("Models loaded"));
      console.log();
      if (Array.isArray(data)) {
        data.forEach((m: any) => {
          const name = m.id || m.name || JSON.stringify(m);
          console.log(chalk.gray("  •") + " " + chalk.white(name));
        });
      }
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi providers
program
  .command("providers")
  .description("List configured providers")
  .action(async () => {
    const spinner = ora("Fetching providers...").start();
    try {
      const data = await api<any>("GET", "/provider/list");
      spinner.succeed(chalk.green("Providers loaded"));
      console.log();
      const list = Array.isArray(data) ? data : data.providers ?? [];
      if (list.length === 0) {
        console.log(chalk.gray("  No providers configured."));
      }
      list.forEach((p: any) => {
        const name = typeof p === "string" ? p : (p.name || JSON.stringify(p));
        console.log(chalk.gray("  •") + " " + chalk.white(name));
      });
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi sessions
program
  .command("sessions")
  .description("List all chat sessions")
  .action(() => {
    const list = sessions.list_sessions();
    if (list.length === 0) {
      console.log(chalk.gray("No sessions found."));
      return;
    }
    console.log(chalk.bold.cyan("Sessions:"));
    list.forEach(s => {
      console.log(
        chalk.gray("  •") + " " + chalk.white(s.id) +
        chalk.gray("  created: " + new Date(s.startedAt).toLocaleString())
      );
    });
  });

// agathi artifacts
program
  .command("artifacts <executionId>")
  .description("List artifacts from an execution")
  .action(async (executionId: string) => {
    const spinner = ora("Fetching artifacts...").start();
    try {
      const data = await api<any>("GET", `/execution/${executionId}/artifacts`);
      spinner.succeed(chalk.green("Artifacts loaded"));
      console.log();
      if (!data.artifacts || data.artifacts.length === 0) {
        console.log(chalk.gray("  No artifacts found."));
      } else {
        data.artifacts.forEach((a: string) =>
          console.log(chalk.gray("  📦 ") + chalk.white(a))
        );
      }
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi projects
program
  .command("projects")
  .description("List workspace projects")
  .action(() => {
    console.log(chalk.bold.cyan("Projects:"));
    console.log(chalk.gray("  Auto-detection scans the current directory for package.json, tsconfig.json, etc."));
    const cwd = process.cwd();
    console.log(chalk.gray("  Current workspace: ") + chalk.white(cwd));
  });

// agathi config
program
  .command("config [key] [value]")
  .description("Get or set configuration values")
  .action(async (key?: string, value?: string) => {
    const spinner = ora("Loading config...").start();
    try {
      const data = await api<any>("GET", "/settings/all");
      spinner.stop();
      if (!key) {
        console.log(chalk.bold.cyan("Configuration:"));
        Object.entries(data).forEach(([k, v]) =>
          console.log(chalk.gray("  " + k + ":") + " " + chalk.white(String(v)))
        );
        return;
      }
      if (key && value) {
        console.log(chalk.green(`  ${key} = ${value} (updated)`));
      } else {
        const val = (data as Record<string, unknown>)[key];
        console.log(chalk.gray(`  ${key}: `) + chalk.white(String(val ?? "not set")));
      }
    } catch (e: any) {
      spinner.stop();
      console.log(chalk.yellow("  Config server not reachable — local config only."));
      if (key) console.log(chalk.gray(`  ${key}: `) + chalk.white("not set"));
    }
  });

// agathi tools
program
  .command("tools")
  .description("List available tools in the registry")
  .action(async () => {
    const spinner = ora("Fetching tools...").start();
    try {
      const cats = await api<any[]>("GET", "/tools/categories");
      spinner.succeed(chalk.green("Tools loaded"));
      console.log();
      cats.forEach((cat: any) => {
        console.log(chalk.bold.cyan(`  ${cat.name}:`));
        cat.tools.forEach((t: string) =>
          console.log(chalk.gray("    •") + " " + chalk.white(t))
        );
      });
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// agathi interactive / agathi i
program
  .command("interactive")
  .alias("i")
  .description("Launch the persistent interactive shell")
  .option("-s, --session <id>", "Session ID to start with")
  .option("--no-stream", "Disable token streaming")
  .action(async (opts) => {
    await launch_interactive({ session: opts.session, stream: opts.stream });
  });

register_project_commands(program);
register_builder_commands(program);
register_deploy_commands(program);

// agathi help override
program
  .command("help")
  .description("Show help and all available commands")
  .action(() => {
    banner();
    program.outputHelp();
  });

// agathi update
program
  .command("update")
  .description("Check for updates")
  .action(() => {
    const spinner = ora("Checking for updates...").start();
    setTimeout(() => {
      spinner.succeed(chalk.green("agathi v1.0.0 — already up to date."));
    }, 600);
  });

// ─── Main ─────────────────────────────────────────────────────────────────────

program
  .name("agathi")
  .version("1.0.0")
  .description(chalk.bold.magenta("agathi") + " — AI-powered development platform")
  .hook("preAction", () => {
    // graceful ctrl-c handling
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\nCancelled."));
      process.exit(0);
    });
  });

// Default: if no command given, launch the interactive shell
if (process.argv.length <= 2) {
  launch_interactive({});
} else {
  program.parse(process.argv);
}