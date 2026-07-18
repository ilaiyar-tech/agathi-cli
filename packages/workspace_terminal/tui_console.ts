import { WidgetRegistry, WorkspaceWidget } from "./widget_registry.js";
import { whatsapp } from "../whatsapp_manager/index.js";
import { eventBus } from "../core/event_bus.js";
import { memory } from "../memory/memory_engine.js";
import { RenderManager } from "./render_manager.js";
import { PROMPT_PREFIX } from "../core/index.js";
import { RuntimeStatusService } from "./runtime_status_service.js";
import chalk from "chalk";

export class TuiConsoleManager {
  private static activeWorkspace: string = "default";
  private static activeAgentNode: string = "User";
  private static isEventBusSubscribed = false;

  static addLog(msg: string) {
    RenderManager.addLog(msg);
  }

  static getScrollback(): string[] {
    return RenderManager.getScrollback();
  }

  static draw() {
    RenderManager.queueDraw();
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
      RenderManager.addLog(`[TUI DB Error] Failed to initialize tui_workspaces table: ${e}`);
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
      RenderManager.addLog(`[TUI Error] Failed to save layout: ${e}`);
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

    // 1. System Widget
    WidgetRegistry.register({
      id: "system_widget",
      title: "System",
      priority: 10,
      preferredWidth: 30,
      preferredHeight: 7,
      visible: true,
      state: "ACTIVE",
      dock: "LEFT",
      render: (width, height) => {
        const status = RuntimeStatusService.getStatus();
        const modelName = status.activeModel && status.activeModel !== "unknown" ? status.activeModel : "Qwen2.5-7B-Instruct";
        
        let connColor = chalk.red;
        let connText: string = status.connection;
        if (status.connection === "Connected") {
          connColor = chalk.green;
          connText = "Ready";
        } else if (status.connection === "Connecting" || status.connection === "Reconnecting") {
          connColor = chalk.yellow;
        }
        
        return [
          `Model      : ${chalk.green(modelName)}`,
          `Provider   : ${chalk.cyan("llama.cpp")}`,
          `Session    : ${chalk.white(status.activeSessionId)}`,
          `Runtime    : ${connColor(connText)}`,
          `Memory     : ${chalk.cyan((status.rss / 1024 / 1024).toFixed(1) + " MB")}`
        ];
      }
    });

    // 2. Memory Widget
    WidgetRegistry.register({
      id: "memory_widget",
      title: "Memory",
      priority: 8,
      preferredWidth: 30,
      preferredHeight: 5,
      visible: true,
      state: "ACTIVE",
      dock: "LEFT",
      render: (width, height) => {
        const status = RuntimeStatusService.getStatus();
        return [
          `Sessions   : ${chalk.white(String(status.sessionCount))}`,
          `Active ID  : ${chalk.white(status.activeSessionId)}`,
          `Memory     : ${chalk.green("SQLite Healthy")}`
        ];
      }
    });

    // 3. WhatsApp Status Widget (Hidden by default in sample.png)
    WidgetRegistry.register({
      id: "whatsapp_widget",
      title: "💬 WhatsApp",
      priority: 4,
      preferredWidth: 30,
      preferredHeight: 5,
      visible: false,
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

    // 4. Tasks Scheduler Widget (Scheduler)
    WidgetRegistry.register({
      id: "tasks_widget",
      title: "Scheduler",
      priority: 6,
      preferredWidth: 30,
      preferredHeight: 5,
      visible: true,
      state: "ACTIVE",
      dock: "RIGHT",
      render: (width, height) => {
        const status = RuntimeStatusService.getStatus();
        return [
          `Running    : ${chalk.cyan(String(status.runningJobs))}`,
          `Queue      : ${status.runningJobs === 0 ? "Idle" : "Running"}`
        ];
      }
    });

    // 5. Agent Flow Visualization Widget (Hidden by default in sample.png)
    WidgetRegistry.register({
      id: "agent_flow_widget",
      title: "🔗 Agent Relationships",
      priority: 9,
      preferredWidth: 80,
      preferredHeight: 6,
      visible: false,
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
          `  ${nodeColor("User")} ${edgeColor("User", "Main Agent")} ${nodeColor("Main Agent")} ${edgeColor("Main Agent", "Planner")} ${nodeColor("Main Agent")} ${edgeColor("Main Agent", "Model")} ${nodeColor("Model")}`,
          `                 │              │`,
          `                 ▼              ▼`,
          `              ${nodeColor("Memory")}         ${nodeColor("Browser")}`
        ];
      }
    });

    // 6. Platform Accuracy Dashboard Widget
    WidgetRegistry.register({
      id: "accuracy_widget",
      title: "Accuracy Engine",
      priority: 7,
      preferredWidth: 30,
      preferredHeight: 9,
      visible: true,
      state: "ACTIVE",
      dock: "RIGHT",
      render: (width, height) => {
        const status = RuntimeStatusService.getStatus();
        const metrics = status.accuracy;
        const fmt = (val: number | null, colorFn: (s: string) => string) => {
          return val !== null ? colorFn(`${val}%`) : chalk.gray("Collecting...");
        };
        return [
          `Answer Acc    : ${fmt(metrics.answerAccuracy, chalk.green)}`,
          `Tool Success  : ${fmt(metrics.toolSuccessRate, chalk.green)}`,
          `Hallucination : ${fmt(metrics.hallucinationRate, chalk.red)}`,
          `Agent Success : ${fmt(metrics.agentSuccessRate, chalk.green)}`,
          `Memory Ret.   : ${fmt(metrics.memoryRetrievalRate, chalk.cyan)}`,
          `Knowledge Prc.: ${fmt(metrics.knowledgePrecision, chalk.cyan)}`,
          `Routing Acc.  : ${fmt(metrics.routingAccuracy, chalk.green)}`
        ];
      }
    });
  }

  static setupEventBusSubscriptions() {
    if (this.isEventBusSubscribed) return;
    this.isEventBusSubscribed = true;

    eventBus.on("*", (event) => {
      const type = event.type;
      
      if (type === "STATUS_UPDATE") {
        RenderManager.queueDraw();
      } else if (type === "MODEL_SWITCHED") {
        WidgetRegistry.updateWidgetState("system_widget", "UPDATING");
        this.activeAgentNode = "Model";
        this.addLog(`[TUI Event] Model switched to: ${event.payload.model}`);
      } else if (type === "TASK_STARTED") {
        WidgetRegistry.updateWidgetState("tasks_widget", "ACTIVE");
        WidgetRegistry.updateWidgetPriority("tasks_widget", 15);
        this.activeAgentNode = "Planner";
        this.addLog(`[TUI Event] Task started: ${event.payload.taskId}`);
      } else if (type === "TASK_COMPLETED") {
        WidgetRegistry.updateWidgetState("tasks_widget", "ACTIVE");
        WidgetRegistry.updateWidgetPriority("tasks_widget", 6);
        this.activeAgentNode = "Main Agent";
        this.addLog(`[TUI Event] Task completed: ${event.payload.taskId}`);
      } else if (type === "FILE_WRITTEN") {
        this.activeAgentNode = "Memory";
        RenderManager.forceRedraw();
      }
    });
  }

  static async launch(workspaceId = "default") {
    this.activeWorkspace = workspaceId;
    this.registerDefaultWidgets();
    this.loadLayout(workspaceId);
    this.setupEventBusSubscriptions();

    // Start health monitor service
    const refreshInterval = Number(process.env.REFRESH_INTERVAL || "3000");
    RuntimeStatusService.start(refreshInterval);

    this.addLog(` ${chalk.bold.magenta("tu2pu")} Workspace Console launched [Workspace: ${workspaceId}]`);
    this.addLog(` Type your prompt below. Try 'doctor', 'models', or chat directly.`);

    RenderManager.forceRedraw();

    process.stdout.on("resize", () => {
      RenderManager.handleResize();
    });

    const readline = await import("node:readline/promises");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    RenderManager.setActiveRl(rl);

    const { agent_runtime } = await import("../agent_runtime/agent_runtime.js");
    const runtime = new agent_runtime();

    while (true) {
      const input = await rl.question(chalk.magenta(PROMPT_PREFIX + " "));
      
      RenderManager.forceRedraw();

      const trimmed = input.trim();
      if (!trimmed) continue;

      if (trimmed === "exit" || trimmed === "quit" || trimmed === "/exit" || trimmed === "/quit") {
        this.addLog(chalk.gray("Goodbye!"));
        break;
      }

      if (trimmed === "clear" || trimmed === "/clear") {
        RenderManager.clearScrollback();
        continue;
      }

      this.addLog(`${chalk.magenta("you ›")} ${trimmed}`);

      try {
        const response = await runtime.chat(trimmed, workspaceId);
        this.addLog(`${chalk.cyan(PROMPT_PREFIX)} ${response.content}`);
      } catch (e: any) {
        this.addLog(`${chalk.red("Error ›")} ${e.message}`);
      }
    }

    rl.close();
    RuntimeStatusService.stop();
    process.exit(0);
  }
}
