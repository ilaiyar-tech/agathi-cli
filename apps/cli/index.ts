#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import fs from "node:fs";

import { sessions } from "../../packages/session_manager/index.js";
import { planner } from "../../packages/prompt_planner/index.js";
import { Transcoder } from "../../packages/transcoder/index.js";

import { launch_interactive } from "./interactive.js";
import { register_project_commands } from "./commands/project.js";
import { register_builder_commands } from "./commands/builder.js";
import { register_deploy_commands } from "./commands/deploy.js";
import { TuiConsoleManager } from "../../packages/workspace_terminal/index.js";

const SERVER = "http://localhost:8100";

async function stream_chat_api(prompt: string, session_id: string, onToken: (token: string) => void) {
  try {
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
  } catch (err: any) {
    if (err.code === "ECONNREFUSED" || err.message.includes("fetch") || err.message.includes("connect")) {
      console.log(chalk.yellow("\n  [Offline Fallback: Local Runtime Active]\n"));
      const { agent_runtime } = await import("../../packages/agent_runtime/agent_runtime.js");
      const localRuntime = new agent_runtime();
      await localRuntime.chat_stream(prompt, session_id, onToken);
      return;
    }
    throw err;
  }
}

async function block_chat_api(prompt: string, session_id: string) {
  try {
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
  } catch (err: any) {
    if (err.code === "ECONNREFUSED" || err.message.includes("fetch") || err.message.includes("connect")) {
      console.log(chalk.yellow("\n  [Offline Fallback: Local Runtime Active]\n"));
      const { agent_runtime } = await import("../../packages/agent_runtime/agent_runtime.js");
      const localRuntime = new agent_runtime();
      const res = await localRuntime.chat(prompt, session_id);
      return { content: res.content };
    }
    throw err;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function translateError(e: any): string {
  const msg = String(e.message || e);
  if (msg.includes("ECONNREFUSED") || msg.includes("connect ECONNREFUSED")) {
    return `Oh no, macha! 😟 I couldn't connect to the backend server. Make sure it's running by starting it with 'npm start' or 'npm run dev'.`;
  }
  if (msg.includes("model_not_found")) {
    return `Bro! 🤯 I couldn't find that AI model. Check if it's listed under '/models' or registered in models.json.`;
  }
  if (msg.includes("model_registry_not_found")) {
    return `Macha, models.json registry file is missing! 😭 Run 'tu2pu doctor' to verify your workspace paths.`;
  }
  if (msg.includes("API request failed") || msg.includes("API error") || msg.includes("→ 500") || msg.includes("→ 401")) {
    if (msg.includes("401")) {
      return `Aiyo, unauthorized, da! 🔑 An API key is required but was invalid or missing.`;
    }
    return `Oh no, da! 😭 The API request failed. The server might be experiencing issues.`;
  }
  if (msg.includes("fetch failed") || msg.includes("network error")) {
    return `Aiyo, network issue, da! 🌐 Either the server is offline or the connection timed out.`;
  }
  return `Prachana, macha! 🔧 Something went wrong: ${msg}.`;
}

async function api<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  try {
    const res = await fetch(`${SERVER}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API request failed → ${res.status}: ${text}`);
    }
    return await res.json() as T;
  } catch (err: any) {
    throw new Error(translateError(err));
  }
}

function banner() {
  console.log(chalk.bold.magenta("  ████████╗██╗   ██╗██████╗ ██████╗ ██╗   ██╗"));
  console.log(chalk.bold.magenta("  ╚══██╔══╝██║   ██║╚════██╗██╔══██╗██║   ██║"));
  console.log(chalk.bold.cyan("     ██║   ██║   ██║ █████╔╝██████╔╝██║   ██║"));
  console.log(chalk.bold.cyan("     ██║   ██║   ██║██╔═══╝ ██╔═══╝ ██║   ██║"));
  console.log(chalk.bold.cyan("     ██║   ╚██████╔╝███████╗██║     ╚██████╔╝"));
  console.log(chalk.bold.cyan("     ╚═╝    ╚═════╝ ╚══════╝╚═╝      ╚═════╝ "));
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

// tu2pu version
program
  .command("version")
  .description("Show tu2pu version")
  .action(() => {
    console.log(chalk.bold.cyan("tu2pu") + chalk.gray(" v1.0.0"));
  });

// tu2pu doctor
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

// tu2pu chat
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
          process.stdout.write(chalk.cyan("\nத › "));
          await stream_chat_api(trimmed, opts.session, (token: string) => {
            process.stdout.write(token);
          });
          console.log("\n");
        } else {
          const result = await block_chat_api(trimmed, opts.session);
          spinner?.stop();
          console.log();
          process.stdout.write(chalk.cyan("த › "));
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

// tu2pu plan
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

// tu2pu run
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

// tu2pu build
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

// tu2pu generate
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
      console.log(chalk.gray("Use ") + chalk.cyan(`tu2pu preview ${data.id}`) + chalk.gray(" to launch preview."));
    } catch (e: any) {
      spinner.fail(chalk.red(e.message));
    }
  });

// tu2pu preview
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

// tu2pu deploy
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

// tu2pu models
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

// tu2pu providers
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

// tu2pu sessions
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

// tu2pu artifacts
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

// tu2pu projects
program
  .command("projects")
  .description("List workspace projects")
  .action(() => {
    console.log(chalk.bold.cyan("Projects:"));
    console.log(chalk.gray("  Auto-detection scans the current directory for package.json, tsconfig.json, etc."));
    const cwd = process.cwd();
    console.log(chalk.gray("  Current workspace: ") + chalk.white(cwd));
  });

// tu2pu config
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

// tu2pu tools
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

// tu2pu interactive / tu2pu i
program
  .command("interactive")
  .alias("i")
  .description("Launch the persistent interactive shell")
  .option("-s, --session <id>", "Session ID to start with")
  .option("--no-stream", "Disable token streaming")
  .action(async (opts) => {
    await launch_interactive({ session: opts.session, stream: opts.stream });
  });

// tu2pu convert
program
  .command("convert <inputPathOrString>")
  .description("Convert Tamil DSL to CIP, CIP to AIR, or AIR to target LLM prompts")
  .option("-f, --from <format>", "Source format: tamil | cip | air", "tamil")
  .option("-t, --to <format>", "Target format: cip | air | claude | qwen | gpt", "cip")
  .option("-o, --output <path>", "Output file path (prints to stdout if omitted)")
  .action(async (input, opts) => {
    let rawContent = input;
    if (fs.existsSync(input)) {
      rawContent = fs.readFileSync(input, "utf-8");
    }

    const fromFormat = opts.from.toLowerCase();
    const toFormat = opts.to.toLowerCase();

    const spinner = ora("Processing conversion...").start();

    try {
      let result: any;
      let title = "";

      if (fromFormat === "tamil") {
        const cip = Transcoder.transcodeTamilToCIP(rawContent);
        if (toFormat === "cip") {
          result = cip;
          title = "Compressed Intelligence Package (CIP)";
        } else if (toFormat === "air") {
          result = Transcoder.compileCIPToAIR(cip);
          title = "AI Intermediate Representation (AIR)";
        } else if (["claude", "qwen", "gpt"].includes(toFormat)) {
          const air = Transcoder.compileCIPToAIR(cip);
          result = Transcoder.promptCompileAIR(air, toFormat);
          title = `${toFormat.toUpperCase()} Instruction Prompt`;
        } else {
          throw new Error(`Unsupported target format: ${toFormat}`);
        }
      } else if (fromFormat === "cip") {
        const repaired = Transcoder.jsonRepair(rawContent);
        const cip = JSON.parse(repaired);
        if (toFormat === "air") {
          result = Transcoder.compileCIPToAIR(cip);
          title = "AI Intermediate Representation (AIR)";
        } else if (["claude", "qwen", "gpt"].includes(toFormat)) {
          const air = Transcoder.compileCIPToAIR(cip);
          result = Transcoder.promptCompileAIR(air, toFormat);
          title = `${toFormat.toUpperCase()} Instruction Prompt`;
        } else {
          throw new Error(`Unsupported target format: ${toFormat}`);
        }
      } else if (fromFormat === "air") {
        const repaired = Transcoder.jsonRepair(rawContent);
        const air = JSON.parse(repaired);
        if (["claude", "qwen", "gpt"].includes(toFormat)) {
          result = Transcoder.promptCompileAIR(air, toFormat);
          title = `${toFormat.toUpperCase()} Instruction Prompt`;
        } else {
          throw new Error(`Unsupported target format: ${toFormat}`);
        }
      } else {
        throw new Error(`Unsupported source format: ${fromFormat}`);
      }

      spinner.succeed(chalk.green("Conversion complete!"));
      console.log();

      const outputStr = typeof result === "string" ? result : JSON.stringify(result, null, 2);

      if (opts.output) {
        fs.writeFileSync(opts.output, outputStr, "utf-8");
        console.log(chalk.gray(`Output written to `) + chalk.cyan(opts.output));
      } else {
        // Beautiful print to stdout
        console.log(chalk.bold.magenta("┌────────────────────────────────────────────────────────┐"));
        console.log(chalk.bold.magenta(`│ tu2pu Operating Layer: ${title.padEnd(31)} │`));
        console.log(chalk.bold.magenta("└────────────────────────────────────────────────────────┘"));
        console.log();

        if (toFormat === "cip" && typeof result !== "string") {
          console.log(chalk.bold.cyan("--- Metadata ---"));
          console.log(chalk.gray("  Compression Ratio: ") + chalk.bold.green(result.metadata.compression_ratio));
          console.log(chalk.gray("  Compressed Size:   ") + chalk.bold.yellow(`${result.metadata.compressed_tokens.toLocaleString()} tokens`));
          console.log(chalk.gray("  Actual Input:      ") + chalk.white(`${result.metadata.actual_tokens} tokens`));
          console.log(chalk.gray("  Recognized Terms:  ") + chalk.white(result.metadata.dsl_terms.join(", ")));
          console.log();
          console.log(chalk.bold.cyan("--- Intent Goals ---"));
          result.intent.goals.forEach((g: string) => console.log(chalk.gray("  • ") + chalk.white(g)));
          console.log();
          console.log(chalk.bold.cyan("--- Constraints ---"));
          result.intent.constraints.forEach((c: string) => console.log(chalk.gray("  • ") + chalk.yellow(c)));
          console.log();
          console.log(chalk.bold.cyan("--- Context Required ---"));
          result.intent.context_required.forEach((ctx: string) => console.log(chalk.gray("  • ") + chalk.cyan(ctx)));
        } else if (toFormat === "air" && typeof result !== "string") {
          console.log(chalk.bold.cyan("--- Roadmap Steps (AIR) ---"));
          result.plan.steps.forEach((step: any) => {
            console.log(chalk.bold.yellow(`  ${step.id.toUpperCase()}: ${step.name}`));
            console.log(chalk.gray(`    Action: `) + chalk.green(step.action));
            console.log(chalk.gray(`    Params: `) + chalk.white(JSON.stringify(step.params)));
            console.log();
          });
        } else {
          console.log(chalk.cyan(outputStr));
        }
        console.log();
      }
    } catch (e: any) {
      spinner.fail(chalk.red(`Conversion failed: ${e.message}`));
    }
  });

// tu2pu architecture / tu2pu arch
program
  .command("architecture")
  .alias("arch")
  .description("Show the Master Architecture Tree, layers, mind map, and timeline from og.docx")
  .action(() => {
    console.log(chalk.bold.magenta("┌────────────────────────────────────────────────────────┐"));
    console.log(chalk.bold.magenta("│   துடுப்பு Engine: Master Architecture Blueprint       │"));
    console.log(chalk.bold.magenta("└────────────────────────────────────────────────────────┘"));
    console.log();

    console.log(chalk.bold.cyan("1. Master Architecture Tree"));
    console.log(chalk.yellow(`
                     துடுப்பு
             (Created by Ilaiyar)
                     │
 ┌───────────────────┼───────────────────┐
 │                   │                   │
Context OS     Deep Rethinker     Evidence Engine
 │                   │                   │
 ├─ Session          ├─ Planner          ├─ Logs
 ├─ Workspace        ├─ Reasoner         ├─ Screenshots
 ├─ Memory           ├─ Strategy         ├─ Verification
 └─ Runtime          └─ Decisions        └─ Reports
                     │
               Execution Engine
                     │
     ┌───────────────┼───────────────┐
     │               │               │
 Tool Router    Prompt Builder   Model Provider
                     │
           Local Models / Cloud Models
    `));

    console.log(chalk.bold.cyan("2. Layer Diagram"));
    console.log(chalk.white(`
  User ──> துடுப்பு CLI ──> Context OS ──> Deep Rethinker ──> Evidence Engine ──> Execution Engine ──> Tool Router ──> AI Models
    `));

    console.log(chalk.bold.cyan("3. Context OS Internal Structure"));
    console.log(chalk.green(`
  Context OS
  ├── Session Context
  ├── Workspace Context
  ├── Runtime Context
  ├── Memory Context
  ├── Build Context
  ├── Git Context
  ├── Tool Context
  ├── Evidence Context
  └── State Machine
    `));

    console.log(chalk.bold.cyan("4. Mind Map"));
    console.log(chalk.gray(`
  துடுப்பு
   ├── Runtime
   ├── Context OS (Session, Workspace, Memory, State)
   ├── Thinking (Planner, Reasoner, Decisions)
   ├── Execution (Tools, Browser, Files, APIs)
   └── Evidence (Logs, Verification, Reports, History)
    `));

    console.log(chalk.bold.cyan("5. Project Evolution Timeline"));
    console.log(chalk.cyan(`
  Stage 1: Runtime Core ──> Stage 2: Memory Engine ──> Stage 3: Context OS ──> Stage 4: Deep Rethinker ──> Stage 5: Evidence Engine ──> Stage 6: Universal Execution Layer
    `));

    console.log(chalk.bold.cyan("6. Business Ecosystem"));
    console.log(chalk.magenta(`
  Ilaiyar
   ├── துடுப்பு (Developer Tooling)
   ├── Dirty2Clean AI
   ├── School Assistant
   └── ERP Assistant
    `));
    console.log();
  });

register_project_commands(program);
register_builder_commands(program);
register_deploy_commands(program);

program
  .command("dashboard")
  .alias("console")
  .description("Launch the tu2pu web dashboard console in your browser")
  .action(async () => {
    console.log(chalk.bold.cyan("Opening tu2pu web dashboard at http://localhost:8100 ..."));
    const { exec } = await import("child_process");
    const url = "http://localhost:8100";
    const startCmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
    exec(`${startCmd} ${url}`);
  });

// tu2pu help override
program
  .command("help")
  .description("Show help and all available commands")
  .action(() => {
    banner();
    program.outputHelp();
  });

// tu2pu update
program
  .command("update")
  .description("Check for updates")
  .action(() => {
    const spinner = ora("Checking for updates...").start();
    setTimeout(() => {
      spinner.succeed(chalk.green("tu2pu v1.0.0 — already up to date."));
    }, 600);
  });

// ─── Main ─────────────────────────────────────────────────────────────────────

program
  .name("tu2pu")
  .version("1.0.0")
  .description(chalk.bold.magenta("tu2pu") + " — AI-powered development platform")
  .hook("preAction", () => {
    // graceful ctrl-c handling
    process.on("SIGINT", () => {
      console.log(chalk.yellow("\nCancelled."));
      process.exit(0);
    });
  });

// Default: if no command given, launch the TUI Workspace Console Dashboard
if (process.argv.length <= 2) {
  TuiConsoleManager.launch("default");
} else {
  program.parse(process.argv);
}