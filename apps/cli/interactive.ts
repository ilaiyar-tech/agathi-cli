import { browserCommands } from "./commands/browser.js";
import chalk from "chalk";
import ora from "ora";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";

import { sessions } from "../../packages/session_manager/index.js";
import { context } from "../../packages/context_engine/index.js";
import { projects } from "../../packages/project_manager/index.js";
import { scheduler } from "../../packages/task_scheduler/index.js";
import { agent_runtime } from "../../packages/agent_runtime/agent_runtime.js";
import { AgentOrchestrationLayer } from "../../packages/agent_orchestration/agent_orchestration.js";
import { memory } from "../../packages/memory/memory_engine.js";
import { get_active_model, set_active_model, list_models } from "../../packages/model_manager/index.js";
import { getModelEndpoint, postModelRequest } from "../../packages/router/index.js";

marked.setOptions({
  renderer: new TerminalRenderer() as any
});

const SERVER = "http://localhost:8100";
const HISTORY_FILE = path.join(os.homedir(), ".tu2pu_history");
const MAX_HISTORY = 500;

const SLASH_COMMANDS = [
  "/help", "/exit", "/quit", "/clear", "/history", "/session", "/new",
  "/models", "/providers", "/projects", "/tools", "/status", "/logs",
  "/config", "/reset", "/attach", "/stream", "/workspace", "/tasks", "/multiline", "/m",
  "/timer", "/schedule", "/subagent", "/cancel"
];

interface ShellState {
  sessionId: string;
  streaming: boolean;
  workspace: string;
}

function printMarkdown(text: string) {
  const result = marked.parse(text) as string;
  console.log(result.trim());
}

async function api<T>(method: string, apiPath: string, body?: unknown): Promise<T> {
  const res = await fetch(`${SERVER}${apiPath}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(`API ${method} ${apiPath} → ${res.status}`);
  return res.json() as T;
}

async function load_history(): Promise<string[]> {
  try {
    if (!(await fs.pathExists(HISTORY_FILE))) return [];
    const content = await fs.readFile(HISTORY_FILE, "utf-8");
    return content.split("\n").filter(Boolean).slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

async function save_history(lines: string[]): Promise<void> {
  try {
    await fs.writeFile(HISTORY_FILE, lines.slice(-MAX_HISTORY).join("\n") + "\n");
  } catch {
    // best-effort only
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
  console.log(chalk.gray("  Interactive Mode — type /help for commands, /exit to quit"));
  console.log();
}

function print_help() {
  const rows: [string, string][] = [
    ["/help", "Show this table"],
    ["/exit, /quit", "Save history and exit"],
    ["/clear", "Clear the screen"],
    ["/history", "Show last 20 REPL entries"],
    ["/session [id]", "Show sessions or switch to one"],
    ["/new", "Create a new session"],
    ["/models [name]", "List models, optionally switch"],
    ["/providers [name]", "List providers, optionally switch"],
    ["/projects", "Show workspace/project detection"],
    ["/tools", "List tool categories"],
    ["/status", "Show shell + session state"],
    ["/logs", "Fetch recent server logs"],
    ["/config", "Show config from settings API"],
    ["/reset", "Clear context and start a new session"],
    ["/attach <path>", "Add a file to context_engine"],
    ["/stream", "Toggle streaming responses on/off"],
    ["/workspace <dir>", "Switch active workspace directory"],
    ["/tasks", "Show task queue visibility"],
    ["/multiline, /m", "Enter multiline input mode"],
    ["/timer <sec> <msg>", "Schedule a prompt execution after <sec> delay"],
    ["/schedule <sec> <msg>", "Schedule recurring prompt execution every <sec>"],
    ["/cancel <task_id>", "Cancel a scheduled recurring or one-shot task"],
    ["/subagent <action> [args]", "Manage sub-agents (actions: spawn, list, send, history, status)"]
  ];
  console.log(chalk.bold.cyan("Available commands:"));
  const width = Math.max(...rows.map(([c]) => c.length));
  rows.forEach(([cmd, desc]) => {
    console.log("  " + chalk.magenta(cmd.padEnd(width + 2)) + chalk.gray(desc));
  });
}

async function isServerOnline(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 300);
    const res = await fetch(`${SERVER}/system/health`, { signal: controller.signal });
    clearTimeout(id);
    return res.ok;
  } catch {
    return false;
  }
}

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
  if (msg.includes("API request failed") || msg.includes("API error")) {
    return `Oh no, da! 😭 The API request failed. The server might be experiencing issues. Let me fall back to local routing.`;
  }
  if (msg.includes("fetch failed") || msg.includes("network error")) {
    return `Aiyo, network issue, da! 🌐 Either the server is offline or the connection timed out.`;
  }
  return `Prachana, macha! 🔧 Something went wrong: ${msg}. Let's inspect the logs to trace it.`;
}

export async function launch_interactive(opts: {
  session?: string;
  stream?: boolean;
} = {}): Promise<void> {
  const state: ShellState = {
    sessionId: opts.session || "default",
    streaming: opts.stream ?? true,
    workspace: process.cwd()
  };

  const historyLines = await load_history();

  console.clear();
  banner();
  console.log(chalk.gray("  session: ") + chalk.cyan(state.sessionId) + chalk.gray("  streaming: ") + chalk.cyan(String(state.streaming)));
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    history: historyLines.slice().reverse(),
    historySize: MAX_HISTORY,
    removeHistoryDuplicates: true,
    completer: (line: string) => {
      if (line.startsWith("/attach ")) {
        const prefix = line.slice(8);
        const dir = path.dirname(prefix) || ".";
        let matches: string[] = [];
        try {
          matches = fs
            .readdirSync(dir)
            .map((f) => path.join(dir, f))
            .filter((f) => f.startsWith(prefix));
        } catch {
          matches = [];
        }
        return [matches.length ? matches : [line], line];
      }
      const hits = SLASH_COMMANDS.filter((c) => c.startsWith(line));
      return [hits.length ? hits : SLASH_COMMANDS, line];
    }
  });

  let currentTask: AbortController | null = null;
  let sigintCount = 0;

  rl.on("SIGINT", () => {
    if (currentTask) {
      currentTask.abort();
      currentTask = null;
      console.log(chalk.yellow("\n  Task cancelled."));
      rl.prompt();
      return;
    }
    sigintCount++;
    if (sigintCount >= 2) {
      console.log(chalk.gray("\nGoodbye!"));
      rl.close();
      return;
    }
    console.log(chalk.yellow("\n  (press Ctrl-C again to exit)"));
    rl.prompt();
  });

  const prompt_label = () => chalk.magenta("த › ");
  rl.setPrompt(prompt_label());
  rl.prompt();

  const allLines: string[] = historyLines.slice();
  const chatHistory: any[] = [];

  let isExecuting = false;
  let isMultiline = false;
  let multilineBuffer: string[] = [];

  rl.on("line", async (raw: string) => {
    sigintCount = 0;
    
    if (isMultiline) {
      const trimmedMulti = raw.trim();
      if (trimmedMulti === ".done") {
        isMultiline = false;
        const finalInput = multilineBuffer.join("\n");
        multilineBuffer = [];
        rl.setPrompt(prompt_label());
        await processMessage(finalInput);
      } else if (trimmedMulti === ".cancel") {
        isMultiline = false;
        multilineBuffer = [];
        rl.setPrompt(prompt_label());
        console.log(chalk.yellow("  Multiline input cancelled."));
        rl.prompt();
      } else {
        multilineBuffer.push(raw);
        rl.prompt();
      }
      return;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }
    if (isExecuting) {
      return; // Discard concurrent inputs to prevent token mixing glitches
    }
    isExecuting = true;
    allLines.push(trimmed);

    if (trimmed === "/exit" || trimmed === "/quit") {
      await save_history(allLines);
      console.log(chalk.gray("Goodbye!"));
      rl.close();
      return;
    }

    const firstWord = trimmed.split(" ")[0];
    if (trimmed.startsWith("/") && SLASH_COMMANDS.includes(firstWord)) {
      if (trimmed === "/m" || trimmed === "/multiline") {
        isExecuting = false;
        isMultiline = true;
        console.log(chalk.cyan("  Entering multiline mode. Type '.done' to submit, '.cancel' to abort."));
        rl.setPrompt(chalk.magenta("... "));
        rl.prompt();
        return;
      }
      await handle_slash_command(trimmed, state, rl, processMessage);
      isExecuting = false;
      rl.setPrompt(prompt_label());
      rl.prompt();
      return;
    }

    await processMessage(trimmed);
  });

  async function processMessage(trimmed: string) {
    isExecuting = true;
    currentTask = new AbortController();
    const spinner = state.streaming ? null : ora({ text: "Thinking...", color: "cyan" }).start();
    try {
      chatHistory.push({ role: "user", content: trimmed });
      let currentLoaderText = "Thinking...";

      // --- OFFLINE FALLBACK ---
      const isOnline = await isServerOnline();
      if (!isOnline) {
        if (state.streaming) {
          process.stdout.write(chalk.cyan("\nத (Local) › "));
          let assistantContent = "";
          const localRuntime = new agent_runtime();
          await localRuntime.chat_stream(trimmed, state.sessionId, (token: string) => {
            process.stdout.write(token);
            assistantContent += token;
          });
          chatHistory.push({ role: "assistant", content: assistantContent });
          console.log("\n");
        } else {
          const localSpinner = ora({ text: "Thinking locally...", color: "cyan" }).start();
          const localRuntime = new agent_runtime();
          const res = await localRuntime.chat(trimmed, state.sessionId);
          localSpinner.stop();
          console.log();
          console.log(chalk.cyan("த (Local) ›"));
          printMarkdown(res.content);
          console.log();
          chatHistory.push({ role: "assistant", content: res.content });
        }
        isExecuting = false;
        rl.prompt();
        return;
      }
      // --- END OFFLINE FALLBACK ---

      if (state.streaming) {
        let loaderTimer: any = null;
        const loaderFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        let frameIdx = 0;

        const updateLoader = () => {
          if (loaderTimer) {
              process.stdout.write("\r\x1b[K" + chalk.cyan("த › ") + chalk.gray(loaderFrames[frameIdx] + " " + currentLoaderText));
          }
        };
 
        process.stdout.write("\n" + chalk.cyan("த › ") + chalk.gray(loaderFrames[frameIdx] + " " + currentLoaderText));
        loaderTimer = setInterval(() => {
          frameIdx = (frameIdx + 1) % loaderFrames.length;
          updateLoader();
        }, 80);
 
        const clearLoader = () => {
          if (loaderTimer) {
            clearInterval(loaderTimer);
            loaderTimer = null;
             process.stdout.write("\r\x1b[K" + chalk.cyan("த › "));
          }
        };

        const res = await fetch(`${SERVER}/v1/chat/completions`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-session-id": state.sessionId 
          },
          body: JSON.stringify({
            model: "chat",
            messages: chatHistory,
            stream: true
          }),
          signal: currentTask.signal
        });

        if (!res.ok) {
          clearLoader();
          const errText = await res.text();
          throw new Error(`API error: ${errText}`);
        }

        const reader = res.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          let buffer = "";
          let assistantContent = "";
          let inToolContext = false;

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              clearLoader();
              chatHistory.push({ role: "assistant", content: assistantContent });
              break;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const json = line.replace("data:", "").trim();
              if (json === "[DONE]") {
                continue;
              }

              try {
                const obj = JSON.parse(json);
                if (obj.error) {
                  clearLoader();
                  process.stdout.write(`\nError: ${obj.error.message}\n`);
                  continue;
                }
                const choice = obj.choices?.[0];
                if (choice?.delta?.content) {
                  const txt = choice.delta.content;
                  assistantContent += txt;
                  
                  if (txt.includes("⚡ Bash:")) {
                    currentLoaderText = "Running Bash...";
                    inToolContext = true;
                  } else if (txt.includes("📖 Read:")) {
                    currentLoaderText = "Reading File...";
                    inToolContext = true;
                  } else if (txt.includes("🔍 Search:")) {
                    currentLoaderText = "Searching...";
                    inToolContext = true;
                  } else if (txt.includes("✍ Write:")) {
                    currentLoaderText = "Writing File...";
                    inToolContext = true;
                  } else if (txt.includes("⚙ Tool:")) {
                    currentLoaderText = "Executing Tool...";
                    inToolContext = true;
                  }

                  if (inToolContext) {
                     clearLoader();
                     process.stdout.write(txt);
                     if (txt.endsWith("\n")) {
                       loaderTimer = setInterval(() => {
                          frameIdx = (frameIdx + 1) % loaderFrames.length;
                          updateLoader();
                        }, 80);
                     }
                  } else {
                     clearLoader();
                     process.stdout.write(txt);
                  }
                }
              } catch (e) {}
            }
          }
        }
        console.log("\n");
      } else {
        const res = await fetch(`${SERVER}/v1/chat/completions`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-session-id": state.sessionId
          },
          body: JSON.stringify({
            model: "chat",
            messages: chatHistory,
            stream: false
          }),
          signal: currentTask.signal
        });
        
        if (!res.ok) throw new Error("API request failed");
        const data = await res.json() as any;
        const replyContent = data.choices?.[0]?.message?.content || "";
        chatHistory.push({ role: "assistant", content: replyContent });
        
        spinner?.stop();
        console.log();
        console.log(chalk.cyan("த ›"));
        printMarkdown(replyContent);
        console.log();
      }
    } catch (e: any) {
      const friendly = translateError(e);
      if (spinner) {
        spinner.fail(chalk.red(friendly));
      } else {
        console.log(chalk.red(`\n${friendly}`));
      }
    } finally {
      currentTask = null;
      isExecuting = false;
    }

    rl.prompt();
  }

  rl.on("close", async () => {
    await save_history(allLines);
    process.exit(0);
  });
}

async function handle_slash_command(
  cmd: string,
  state: ShellState,
  _rl: readline.Interface,
  processMessage: (trimmed: string) => Promise<void>
): Promise<void> {
  const [name, ...rest] = cmd.split(" ");
  const arg = rest.join(" ").trim();

  switch (name) {
    case "/help":
      print_help();
      return;

    case "/clear":
      console.clear();
      return;

    case "/history": {
      const lines = await load_history();
      lines.slice(-20).forEach((l) => console.log(chalk.gray("  " + l)));
      return;
    }

    case "/session": {
      if (!arg) {
        const list = sessions.list_sessions();
        if (list.length === 0) {
          console.log(chalk.gray("  No sessions yet."));
          return;
        }
        console.log(chalk.bold.cyan("Sessions:"));
        list.forEach((s) =>
          console.log(
            chalk.gray("  •") + " " + chalk.white(s.id) +
            chalk.gray("  created: " + new Date(s.startedAt).toLocaleString())
          )
        );
        return;
      }
      state.sessionId = arg;
      console.log(chalk.green(`  Switched to session: ${arg}`));
      return;
    }

    case "/new": {
      const s = sessions.create_session({ active: true });
      state.sessionId = s.id;
      console.log(chalk.green(`  New session created: ${s.id}`));
      return;
    }

    case "/models": {
      const spinner = ora("Fetching models...").start();
      try {
        const isOnline = await isServerOnline();
        if (isOnline) {
          const data = await api<any[]>("GET", "/models");
          spinner.succeed(chalk.green("Models loaded"));
          if (arg) {
            await api("POST", `/model/${arg}`);
            console.log(chalk.green(`  Switched active model to: ${arg}`));
          } else if (Array.isArray(data)) {
            data.forEach((m: any) => {
              const activeLabel = get_active_model() === m.name ? chalk.bold.green(" (active)") : "";
              console.log(chalk.gray("  •") + " " + chalk.white(m.name || m.id) + activeLabel + chalk.gray(` [${m.provider}]`));
            });
          }
        } else {
          spinner.stop();
          console.log(chalk.yellow("  [Offline Fallback: Local model_manager active]"));
          const data = list_models();
          if (arg) {
            set_active_model(arg);
            console.log(chalk.green(`  Switched active model locally to: ${arg}`));
          } else {
            console.log(chalk.bold.cyan("Models (Local):"));
            data.forEach((m: any) => {
              const activeLabel = get_active_model() === m.name ? chalk.bold.green(" (active)") : "";
              console.log(chalk.gray("  •") + " " + chalk.white(m.name) + activeLabel + chalk.gray(` [${m.provider}]`));
            });
          }
        }
      } catch (e: any) {
        spinner.fail(chalk.red(`Failed to fetch or switch models: ${e.message}`));
      }
      return;
    }

    case "/providers": {
      const spinner = ora("Fetching providers...").start();
      try {
        const data = await api<any>("GET", "/provider/list");
        spinner.succeed(chalk.green("Providers loaded"));
        if (arg) {
          console.log(chalk.green(`  Switched active provider to: ${arg}`));
        } else {
          const list = Array.isArray(data) ? data : data.providers ?? [];
          list.forEach((p: any) => console.log(chalk.gray("  •") + " " + chalk.white(typeof p === "string" ? p : p.name)));
        }
      } catch {
        spinner.fail(chalk.yellow("Server not reachable — cannot fetch providers"));
      }
      return;
    }

    case "/projects": {
      const active = projects.getActiveProject();
      console.log(chalk.bold.cyan("Workspace: ") + chalk.white(state.workspace));
      if (active) {
        console.log(chalk.gray("  Active project: ") + chalk.white(active.name) + chalk.gray(` (${active.rootPath})`));
      } else {
        console.log(chalk.gray("  No active project — run 'tu2pu project init' outside the shell, or /workspace <dir>."));
      }
      return;
    }

    case "/tools": {
      const spinner = ora("Fetching tools...").start();
      try {
        const cats = await api<any[]>("GET", "/tools/categories");
        spinner.succeed(chalk.green("Tools loaded"));
        cats.forEach((cat: any) => {
          console.log(chalk.bold.cyan(`  ${cat.name}:`));
          cat.tools.forEach((t: string) => console.log(chalk.gray("    •") + " " + chalk.white(t)));
        });
      } catch {
        spinner.fail(chalk.yellow("Server not reachable — cannot fetch tools"));
      }
      return;
    }

    case "/status": {
      console.log(chalk.bold.cyan("Shell status:"));
      console.log(chalk.gray("  Session: ") + chalk.white(state.sessionId));
      console.log(chalk.gray("  Streaming: ") + chalk.white(String(state.streaming)));
      console.log(chalk.gray("  Workspace: ") + chalk.white(state.workspace));
      console.log(chalk.gray("  Sessions in memory: ") + chalk.white(String(sessions.list_sessions().length)));
      return;
    }

    case "/logs": {
      const spinner = ora("Fetching server logs...").start();
      try {
        const data = await api<any>("GET", "/system/logs");
        spinner.succeed(chalk.green("Logs loaded"));
        const lines: string[] = data.logs ?? data ?? [];
        (Array.isArray(lines) ? lines : []).slice(-30).forEach((l: string) => console.log(chalk.gray("  " + l)));
      } catch {
        spinner.fail(chalk.yellow("Server not reachable — cannot fetch logs"));
      }
      return;
    }

    case "/tasks": {
      const tasksMap = (scheduler as any).tasks as Map<string, any>;
      if (!tasksMap || tasksMap.size === 0) {
        console.log(chalk.gray("  No tasks currently in queue."));
      } else {
        console.log(chalk.bold.cyan("Task Queue:"));
        tasksMap.forEach((task, id) => {
          const statusColor = task.status === "running" ? chalk.green : (task.status === "idle" ? chalk.yellow : chalk.gray);
          console.log(chalk.gray("  •") + " " + chalk.white(id) + " - " + statusColor(task.status));
        });
      }
      return;
    }

    case "/config": {
      const spinner = ora("Loading config...").start();
      try {
        const data = await api<any>("GET", "/settings/all");
        spinner.succeed(chalk.green("Config loaded"));
        Object.entries(data).forEach(([k, v]) => console.log(chalk.gray("  " + k + ":") + " " + chalk.white(String(v))));
      } catch {
        spinner.fail(chalk.yellow("Server not reachable — no config available"));
      }
      return;
    }

    case "/reset": {
      const s = sessions.create_session({ active: true });
      state.sessionId = s.id;
      console.log(chalk.green(`  Context cleared. New session: ${s.id}`));
      return;
    }

    case "/attach": {
      if (!arg) {
        console.log(chalk.yellow("  Usage: /attach <path>"));
        return;
      }
      try {
        const exists = await fs.pathExists(arg);
        if (!exists) {
          console.log(chalk.red(`  File not found: ${arg}`));
          return;
        }
        context.add_file(arg);
        console.log(chalk.green(`  Attached: ${arg}`));
      } catch (e: any) {
        console.log(chalk.red("  " + e.message));
      }
      return;
    }

    case "/stream": {
      state.streaming = !state.streaming;
      console.log(chalk.green(`  Streaming ${state.streaming ? "enabled" : "disabled"}`));
      return;
    }

    case "/workspace": {
      if (!arg) {
        console.log(chalk.gray("  Current workspace: ") + chalk.white(state.workspace));
        return;
      }
      try {
        const config = await projects.initProject(arg);
        state.workspace = config.rootPath;
        console.log(chalk.green(`  Workspace switched to: ${config.rootPath}`));
      } catch (e: any) {
        console.log(chalk.red("  " + e.message));
      }
      return;
    }

    case "/timer": {
      const seconds = parseInt(arg.split(" ")[0]);
      const promptText = arg.split(" ").slice(1).join(" ").trim();
      if (isNaN(seconds) || !promptText) {
        console.log(chalk.yellow("  Usage: /timer <seconds> <message>"));
        return;
      }
      const taskId = `timer_${Date.now()}`;
      console.log(chalk.green(`  Scheduled task '${taskId}' in ${seconds}s...`));
      scheduler.schedule({
        id: taskId,
        timeoutMs: seconds * 1000,
        action: async () => {
          console.log(chalk.bold.magenta(`\n\n[Timer Fired: ${taskId}]`) + chalk.cyan(` Running: ${promptText}\n`));
          await processMessage(promptText);
        }
      });
      return;
    }

    case "/schedule": {
      const seconds = parseInt(arg.split(" ")[0]);
      const promptText = arg.split(" ").slice(1).join(" ").trim();
      if (isNaN(seconds) || !promptText) {
        console.log(chalk.yellow("  Usage: /schedule <interval_seconds> <message>"));
        return;
      }
      const taskId = `schedule_${Date.now()}`;
      console.log(chalk.green(`  Scheduled recurring task '${taskId}' every ${seconds}s...`));
      scheduler.schedule({
        id: taskId,
        intervalMs: seconds * 1000,
        action: async () => {
          console.log(chalk.bold.magenta(`\n\n[Schedule Fired: ${taskId}]`) + chalk.cyan(` Running: ${promptText}\n`));
          await processMessage(promptText);
        }
      });
      return;
    }

    case "/cancel": {
      if (!arg) {
        console.log(chalk.yellow("  Usage: /cancel <task_id>"));
        return;
      }
      scheduler.cancel(arg);
      console.log(chalk.green(`  Cancelled scheduled task: ${arg}`));
      return;
    }

    case "/subagent": {
      const aol = new AgentOrchestrationLayer();
      const parts = arg.split(" ");
      const subAction = parts[0].toLowerCase();
      const subArg = parts.slice(1).join(" ").trim();

      if (subAction === "spawn") {
        const name = subArg.split(" ")[0];
        const prompt = subArg.split(" ").slice(1).join(" ").trim();
        if (!name || !prompt) {
          console.log(chalk.yellow("  Usage: /subagent spawn <name> <instruction>"));
          return;
        }
        const agentId = `sub_${name}`;
        await aol.registerAgent(agentId, name, "remote", ["chat", "reasoning"]);
        const sessId = await aol.createAgentSession(agentId, "interactive_workflow", state.workspace, "execution_0", "user");
        await aol.delegateTask(sessId, agentId, prompt);
        console.log(chalk.green(`  Spawned sub-agent '${name}' with ID '${agentId}'.`));
        return;
      }

      if (subAction === "list") {
        const list = await aol.discoverAgents([]);
        if (list.length === 0) {
          console.log(chalk.gray("  No sub-agents registered."));
        } else {
          console.log(chalk.bold.cyan("Sub-Agents:"));
          for (const agent of list) {
            console.log(chalk.gray("  •") + " " + chalk.white(agent.name) + chalk.gray(` (${agent.id})`) + " - status: " + chalk.green(agent.status));
          }
        }
        return;
      }

      if (subAction === "send") {
        const name = subArg.split(" ")[0];
        const message = subArg.split(" ").slice(1).join(" ").trim();
        if (!name || !message) {
          console.log(chalk.yellow("  Usage: /subagent send <name> <message>"));
          return;
        }
        const agentId = `sub_${name}`;
        // Find session
        const sessRow = memory.database.prepare(
          "select id from agent_sessions where agent_id = ? order by timestamp desc limit 1"
        ).get(agentId) as any;
        if (!sessRow) {
          console.log(chalk.red(`  No active session found for sub-agent: ${name}`));
          return;
        }
        const sessId = sessRow.id;
        // Send user message
        await aol.sendMessage(sessId, "user", agentId, message);
        console.log(chalk.gray(`  Message sent to '${name}'...`));
        
        // Get sub-agent background prompt/task
        const taskRow = memory.database.prepare(
          "select description from agent_tasks where session_id = ? order by id desc limit 1"
        ).get(sessId) as any;
        const subagentInstruction = taskRow ? taskRow.description : "You are a helpful assistant.";

        // Asynchronously execute sub-agent reasoning
        setTimeout(async () => {
          try {
            const systemPrompt = `You are a specialized sub-agent named ${name}. Your instructions are: "${subagentInstruction}". Respond to the user message.`;
            const response = await postModelRequest("/v1/chat/completions", {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
              ],
              temperature: 0.2
            });
            const reply = response.data.choices?.[0]?.message?.content || "";
            await aol.sendMessage(sessId, agentId, "user", reply);
            console.log(chalk.bold.green(`\n\n[Sub-Agent ${name} Replied]`) + chalk.cyan(` (type '/subagent history ${name}' to view replies)`));
          } catch (err: any) {
            console.error(`\nSub-agent ${name} execution error:`, err.message);
          }
        }, 200);
        return;
      }

      if (subAction === "history") {
        const name = subArg;
        if (!name) {
          console.log(chalk.yellow("  Usage: /subagent history <name>"));
          return;
        }
        const agentId = `sub_${name}`;
        const sessRow = memory.database.prepare(
          "select id from agent_sessions where agent_id = ? order by timestamp desc limit 1"
        ).get(agentId) as any;
        if (!sessRow) {
          console.log(chalk.red(`  No active session found for sub-agent: ${name}`));
          return;
        }
        const sessId = sessRow.id;
        const rows = memory.database.prepare(
          "select sender_id, receiver_id, content, timestamp from agent_messages where session_id = ? order by timestamp asc"
        ).all(sessId) as any[];
        if (rows.length === 0) {
          console.log(chalk.gray(`  No messages in history for '${name}'.`));
        } else {
          console.log(chalk.bold.cyan(`Conversation History with sub-agent '${name}':`));
          rows.forEach((r) => {
            const sender = r.sender_id === "user" ? chalk.magenta("You") : chalk.green(name);
            console.log(chalk.bold(`  ${sender}:`) + " " + r.content);
          });
          console.log();
        }
        return;
      }

      if (subAction === "status") {
        const name = subArg;
        if (!name) {
          console.log(chalk.yellow("  Usage: /subagent status <name>"));
          return;
        }
        const agentId = `sub_${name}`;
        const health = memory.database.prepare(
          "select latency, success_rate, load, availability from agent_health where agent_id = ?"
        ).get(agentId) as any;
        if (!health) {
          console.log(chalk.red(`  No status metrics available for '${name}'.`));
        } else {
          console.log(chalk.bold.cyan(`Status Metrics for sub-agent '${name}':`));
          console.log(chalk.gray("  Latency:      ") + chalk.white(`${health.latency}ms`));
          console.log(chalk.gray("  Success Rate: ") + chalk.white(`${Math.round(health.success_rate * 100)}%`));
          console.log(chalk.gray("  Current Load: ") + chalk.white(`${Math.round(health.load * 100)}%`));
          console.log(chalk.gray("  Availability: ") + (health.availability === 1 ? chalk.green("Online") : chalk.red("Offline")));
        }
        return;
      }

      console.log(chalk.yellow("  Usage: /subagent <spawn | list | send | history | status> [args]"));
      return;
    }

    default:
      console.log(chalk.yellow(`  Unknown command: ${name} (try /help)`));
  }
}
