import { WidgetRegistry, WorkspaceWidget } from "./widget_registry.js";
import { LayoutEngine } from "./layout_engine.js";
import { TerminalRenderer } from "./terminal_renderer.js";
import { get_active_model, model_usage } from "../model_manager/index.js";
import { whatsapp } from "../whatsapp_manager/index.js";
import { scheduler } from "../task_scheduler/index.js";
import { sessions } from "../session_manager/index.js";
import { eventBus } from "../core/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { accuracyEngine } from "../accuracy_engine/index.js";
import chalk from "chalk";

export class TuiConsoleManager {
  private static scrollback: string[] = [];
  private static activeWorkspace: string = "default";
  private static activeAgentNode: string = "User";

  static addLog(msg: string) {
    this.scrollback.push(msg);
    this.draw();
  }

  static getScrollback(): string[] {
    return this.scrollback;
  }

  private static initDatabase() {
    try {
      memory.database.exec(`
        CREATE TABLE IF NOT EXISTS tui_workspaces (
          workspace_id TEXT,
          widget_id TEXT,
          visible INTEGER,
          dock TEXT,
          PRIMARY KEY (workspace_id, widget_id)
        );
      `);
    } catch (e) {
      console.error("Failed to initialize tui_workspaces table:", e);
    }
  }

  static saveLayout(workspaceId: string) {
    try {
      const widgets = WidgetRegistry.getWidgets();
      for (const w of widgets) {
        memory.database.prepare(`
          INSERT OR REPLACE INTO tui_workspaces (workspace_id, widget_id, visible, dock)
          VALUES (?, ?, ?, ?)
        `).run(workspaceId, w.id, w.visible ? 1 : 0, w.dock);
      }
    } catch (e) {
      console.error("Failed to save layout:", e);
    }
  }

  static loadLayout(workspaceId: string) {
    try {
      const rows = memory.database.prepare(
        "SELECT widget_id, visible, dock FROM tui_workspaces WHERE workspace_id = ?"
      ).all(workspaceId) as any[];

      for (const r of rows) {
        const w = WidgetRegistry.getWidget(r.widget_id);
        if (w) {
          w.visible = r.visible === 1;
          w.dock = r.dock;
        }
      }
    } catch (e) {
      // Default to registry defaults if load fails
    }
  }

  static registerDefaultWidgets() {
    this.initDatabase();

    // 1. Models Widget
    WidgetRegistry.register({
      id: "models_widget",
      title: "🤖 Models",
      priority: 10,
      preferredWidth: 30,
      preferredHeight: 6,
      visible: true,
      state: "ACTIVE",
      dock: "LEFT",
      render: (width, height) => {
        const active = get_active_model();
        const usage = model_usage();
        return [
          `Active:   ${chalk.green(active)}`,
          `Status:   ${usage.loaded ? chalk.cyan("Loaded") : chalk.yellow("Unloaded")}`,
          `Footprint: ${(usage.size / 1024 / 1024 / 1024).toFixed(2)} GB`
        ];
      }
    });

    // 2. Memory Widget
    WidgetRegistry.register({
      id: "memory_widget",
      title: "🧠 Memory",
      priority: 8,
      preferredWidth: 30,
      preferredHeight: 5,
      visible: true,
      state: "ACTIVE",
      dock: "LEFT",
      render: (width, height) => {
        const list = sessions.list_sessions();
        return [
          `Sessions: ${chalk.white(String(list.length))}`,
          `Active ID: ${chalk.white(list.find(s => s.metadata?.active)?.id || "default")}`,
          `Memory:   SQLite Healthy`
        ];
      }
    });

    // 3. WhatsApp Status Widget
    WidgetRegistry.register({
      id: "whatsapp_widget",
      title: "💬 WhatsApp",
      priority: 4,
      preferredWidth: 30,
      preferredHeight: 5,
      visible: true,
      state: "ACTIVE",
      dock: "RIGHT",
      render: (width, height) => {
        const status = whatsapp.getStatus();
        return [
          `Number: ${chalk.gray(status.adminNumber)}`,
          `Status: ${status.status === "Connected" ? chalk.green("Connected") : chalk.red(status.status)}`
        ];
      }
    });

    // 4. Tasks Scheduler Widget
    WidgetRegistry.register({
      id: "tasks_widget",
      title: "⏰ Scheduler",
      priority: 6,
      preferredWidth: 30,
      preferredHeight: 5,
      visible: true,
      state: "ACTIVE",
      dock: "RIGHT",
      render: (width, height) => {
        const tasksMap = (scheduler as any).tasks as Map<string, any>;
        const size = tasksMap ? tasksMap.size : 0;
        return [
          `Running:  ${chalk.cyan(String(size))}`,
          `Queue:    ${size === 0 ? "Idle" : `${size} active`}`
        ];
      }
    });

    // 5. Agent Flow Visualization Widget (Unique Highlight)
    WidgetRegistry.register({
      id: "agent_flow_widget",
      title: "🔗 Agent Relationships",
      priority: 9,
      preferredWidth: 80,
      preferredHeight: 6,
      visible: true,
      state: "ACTIVE",
      dock: "BOTTOM",
      render: (width, height) => {
        const nodeColor = (name: string) => {
          return this.activeAgentNode === name ? chalk.bold.green(name) : chalk.gray(name);
        };
        const edgeColor = (nodeA: string, nodeB: string) => {
          return (this.activeAgentNode === nodeA || this.activeAgentNode === nodeB)
            ? chalk.bold.green("──►")
            : chalk.gray("──►");
        };

        return [
          `  ${nodeColor("User")} ${edgeColor("User", "Main Agent")} ${nodeColor("Main Agent")} ${edgeColor("Main Agent", "Planner")} ${nodeColor("Planner")} ${edgeColor("Planner", "Model")} ${nodeColor("Model")}`,
          `                 │              │`,
          `                 ▼              ▼`,
          `              ${nodeColor("Memory")}         ${nodeColor("Browser")}`
        ];
      }
    });

    // 6. Platform Accuracy Dashboard Widget
    WidgetRegistry.register({
      id: "accuracy_widget",
      title: "🎯 Accuracy Engine",
      priority: 7,
      preferredWidth: 30,
      preferredHeight: 9,
      visible: true,
      state: "ACTIVE",
      dock: "RIGHT",
      render: (width, height) => {
        const metrics = accuracyEngine.getMetrics();
        return [
          `Answer Acc:    ${chalk.green(metrics.answerAccuracy)}%`,
          `Tool Success:  ${chalk.green(metrics.toolSuccessRate)}%`,
          `Hallucination: ${chalk.red(metrics.hallucinationRate)}%`,
          `Agent Success: ${chalk.green(metrics.agentSuccessRate)}%`,
          `Memory Ret:    ${chalk.cyan(metrics.memoryRetrievalRate)}%`,
          `Knowledge Prc: ${chalk.cyan(metrics.knowledgePrecision)}%`,
          `Routing Acc:   ${chalk.green(metrics.routingAccuracy)}%`
        ];
      }
    });
  }

  static draw() {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;

    const cells = LayoutEngine.computeLayout(width, height);
    const output = TerminalRenderer.drawBuffer(cells, width, height, this.scrollback);

    process.stdout.write("\x1b[H\x1b[2J");
    process.stdout.write(output);

    const termCell = cells.find(c => c.id === "terminal");
    if (termCell) {
      const promptY = termCell.y + termCell.height - 2;
      const promptX = termCell.x + 4;
      process.stdout.write(`\x1b[${promptY + 1};${promptX + 1}H`);
    }
  }

  static setupEventBusSubscriptions() {
    // Event-driven reactive UI updates
    eventBus.on("*", (event) => {
      const type = event.type;
      
      if (type === "MODEL_SWITCHED") {
        WidgetRegistry.updateWidgetState("models_widget", "UPDATING");
        this.activeAgentNode = "Model";
        this.addLog(`[TUI Event] Model switched to: ${event.payload.model}`);
      } else if (type === "TASK_STARTED") {
        WidgetRegistry.updateWidgetState("tasks_widget", "ACTIVE");
        WidgetRegistry.updateWidgetPriority("tasks_widget", 15); // Scale priority
        this.activeAgentNode = "Planner";
        this.addLog(`[TUI Event] Task started: ${event.payload.taskId}`);
      } else if (type === "TASK_COMPLETED") {
        WidgetRegistry.updateWidgetState("tasks_widget", "ACTIVE");
        WidgetRegistry.updateWidgetPriority("tasks_widget", 6); // Shrink priority
        this.activeAgentNode = "Main Agent";
        this.addLog(`[TUI Event] Task completed: ${event.payload.taskId}`);
      } else if (type === "FILE_WRITTEN") {
        this.activeAgentNode = "Memory";
      }

      this.draw();
    });
  }

  static async launch(workspaceId = "default") {
    this.activeWorkspace = workspaceId;
    this.registerDefaultWidgets();
    this.loadLayout(workspaceId);
    this.setupEventBusSubscriptions();

    this.addLog(` ${chalk.bold.magenta("tu2pu")} Workspace Console launched [Workspace: ${workspaceId}]`);
    this.addLog(` Type your prompt below. Try 'doctor', 'models', or chat directly.`);

    process.stdout.on("resize", () => {
      this.draw();
    });

    setInterval(() => {
      this.draw();
    }, 5000);

    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const { agent_runtime } = await import("../agent_runtime/agent_runtime.js");
    const runtime = new agent_runtime();

    while (true) {
      this.draw();
      const input = await rl.question(chalk.magenta("த › "));
      const trimmed = input.trim();

      if (!trimmed) continue;

      if (trimmed === "exit" || trimmed === "quit" || trimmed === "/exit" || trimmed === "/quit") {
        this.addLog(chalk.gray("Goodbye!"));
        break;
      }

      if (trimmed === "clear" || trimmed === "/clear") {
        this.scrollback = [];
        this.addLog(" Console logs cleared.");
        continue;
      }

      this.addLog(`${chalk.magenta("you ›")} ${trimmed}`);
      this.draw();

      try {
        const response = await runtime.chat(trimmed, workspaceId);
        this.addLog(`${chalk.cyan("த ›")} ${response.content}`);
      } catch (e: any) {
        this.addLog(`${chalk.red("Error ›")} ${e.message}`);
      }
    }

    rl.close();
    process.exit(0);
  }
}
